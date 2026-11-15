// Undoing a saved link change runs the exact inverse writes, for every kind of link: a key
// field goes back to its old value (a moved record to its old owner), a removed link row is
// added again and an added one removed. Undo and redo take turns; a refused step says why.
import { describe, expect, it, vi } from 'vitest';

import type { RelationModel, TableModel } from '@constructive-io/data';

import {
	applyRelationChanges,
	invertRelationChanges,
	planBelongsTo,
	planHasLinks,
	planJunctionLinks,
	type RelationChange,
} from '../relation-changes';
import { relationHistoryEntry } from '../relation-undo';

const model = (key: string, columns: string[], primaryKey = ['id'], fixed: string[] = []) =>
	({
		key,
		primaryKey,
		columns: columns.map((name) => ({ name, write: { create: !fixed.includes(name), update: true } })),
	}) as unknown as TableModel;

const target = { primaryKey: ['id'], labelFields: ['name'] };
const task = model('Task', ['id', 'title', 'projectId']);
const project = model('Project', ['id', 'name']);
const member = model('ProjectMember', ['id', 'projectId', 'personId', 'role'], ['id'], ['id']);

const belongsTo = { kind: 'belongsTo', fieldName: 'project', keys: [{ local: 'projectId', remote: 'id' }], target } as unknown as RelationModel;
const hasMany = { kind: 'hasMany', fieldName: 'tasks', keys: [{ local: 'id', remote: 'projectId' }], target } as unknown as RelationModel;
const manyToMany = {
	kind: 'manyToMany',
	fieldName: 'people',
	keys: [],
	target,
	junction: { left: [{ local: 'id', junction: 'projectId' }], right: [{ remote: 'id', junction: 'personId' }] },
} as unknown as RelationModel;

const writes = (changes: readonly RelationChange[]) =>
	changes.map((change) =>
		change.op === 'update' ? ['update', change.model.key, change.key, change.patch] : change.op === 'create' ? ['create', change.model.key, change.values] : ['delete', change.model.key, change.key],
	);

const plan = (result: ReturnType<typeof planBelongsTo>) => {
	if (!result.ok) throw new Error(result.reason);
	return result.changes;
};

describe('undoing link changes', () => {
	it('belongsTo writes the old key back; a moved record goes back to its old owner', async () => {
		const relink = plan(planBelongsTo(belongsTo, task, { id: 't1' }, { id: 'p2', name: 'Two' }, { id: 't1', projectId: 'p1' }));
		const undo = invertRelationChanges(await applyRelationChanges(relink, async () => undefined));
		expect(undo.ok && writes(undo.changes)).toEqual([['update', 'Task', { id: 't1' }, { projectId: 'p1' }]]);

		const linked = { key: 't9', record: { id: 't9', name: 'Moved', projectId: 'p7' } };
		const removed = { key: 't3', record: { id: 't3', name: 'Old', projectId: 'p1' } };
		const changes = plan(planHasLinks(hasMany, task, { id: 'p1' }, { added: [linked], removed: [removed] }));
		const back = invertRelationChanges(await applyRelationChanges(changes, async () => undefined));
		// Last change first: the moved task goes back to p7, then the removed one comes back here.
		expect(back.ok && writes(back.changes)).toEqual([
			['update', 'Task', { id: 't9' }, { projectId: 'p7' }],
			['update', 'Task', { id: 't3' }, { projectId: 'p1' }],
		]);
	});

	it('manyToMany adds a removed link row again and removes the one it created', async () => {
		const removed = { key: 'u1', record: { id: 'u1', name: 'Ann' }, junctionRow: { id: 'm1', projectId: 'p1', personId: 'u1', role: 'lead' } };
		const added = { key: 'u2', record: { id: 'u2', name: 'Bo' } };
		const changes = plan(planJunctionLinks(manyToMany, member, { id: 'p1' }, { added: [added], removed: [removed] }));
		const run = async (change: RelationChange) => (change.op === 'create' ? { id: 'm2', ...change.values } : undefined);
		const undo = invertRelationChanges(await applyRelationChanges(changes, run));
		// The old link row keeps its role; its generated key is the server's to give again.
		expect(undo.ok && writes(undo.changes)).toEqual([
			['delete', 'ProjectMember', { id: 'm2' }],
			['create', 'ProjectMember', { projectId: 'p1', personId: 'u1', role: 'lead' }],
		]);
	});

	it('refuses a change whose old values were not read', async () => {
		const relink = plan(planBelongsTo(belongsTo, task, { id: 't1' }, { id: 'p2' }, { id: 't1' }));
		expect(invertRelationChanges(await applyRelationChanges(relink, async () => undefined))).toEqual({
			ok: false,
			reason: 'The values this link change replaced are not known.',
		});
	});

	it('takes turns between undo and redo, and a refused step changes nothing and says why', async () => {
		const state: Record<string, unknown> = { projectId: 'p2' };
		const run = vi.fn(async (change: RelationChange) => {
			if (change.op !== 'update') return;
			if (state.locked) throw new Error('Permission denied');
			Object.assign(state, change.patch);
		});
		const refresh = vi.fn(async () => {});
		const onDone = vi.fn();
		const onFailed = vi.fn();
		const relink = plan(planBelongsTo(belongsTo, task, { id: 't1' }, { id: 'p2' }, { id: 't1', projectId: 'p1' }));
		const entry = relationHistoryEntry(await applyRelationChanges(relink, async () => undefined), { run, refresh, onDone, onFailed })!;

		await entry.undo();
		expect(state.projectId).toBe('p1');
		expect(onDone).toHaveBeenLastCalledWith('Link change undone');
		await entry.redo();
		expect(state.projectId).toBe('p2');
		expect(refresh).toHaveBeenCalledTimes(2);

		state.locked = true;
		await expect(entry.undo()).rejects.toThrow();
		expect(state.projectId).toBe('p2');
		expect(onFailed).toHaveBeenCalledWith('The link change could not be undone', ['Could not unlink "p2": Permission denied']);
		// Still the same step: once allowed, it undoes.
		state.locked = false;
		await entry.undo();
		expect(state.projectId).toBe('p1');
	});
});

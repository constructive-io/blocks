/**
 * The writes that turn an edited link set into server state, and running
 * them one by one so a partial failure can be reported per change. Every
 * write names its table model and the exact key and values; the adapter
 * builds the documents from the model.
 */
import { getHumanReadableError, type RelationModel, type TableModel } from '@constructive-io/data';

import type { SheetsBackendAdapter } from '../adapter/sheets-adapter';
import type { SheetsExecuteFn } from '../context/sheets-execute';
import type { SheetsRowIdentifier } from '../row-identity';
import {
	belongsToClearPatch,
	belongsToLinkPatch,
	hasLinkPatch,
	hasUnlinkPatch,
	junctionLinkValues,
	linkKey,
	primaryKeyValues,
	type FieldValues,
	type RecordValues,
} from './relation-keys';
import { relationRecordLabel } from './relation-label';

interface ChangeBase {
	/** The table the write goes to. */
	model: TableModel;
	/** Whether the write adds or removes a link. */
	action: 'link' | 'unlink';
	/** Label of the related record, for messages. */
	label: string;
	/** Identity of the related record (see `linkKey`), or '' when a link is cleared. */
	linkKey: string;
}

/**
 * `prior` is what the write replaces (the patched fields' values before an update, the whole
 * row before a delete), so the change can be undone; null or absent when it was not known.
 */
export type RelationChange =
	| (ChangeBase & { op: 'update'; key: SheetsRowIdentifier; patch: FieldValues; prior?: FieldValues | null })
	| (ChangeBase & { op: 'create'; values: FieldValues })
	| (ChangeBase & { op: 'delete'; key: SheetsRowIdentifier; prior?: RecordValues | null });

/** A planned set of writes, or why the edit cannot be written. */
export type RelationPlan = { ok: true; changes: RelationChange[] } | { ok: false; reason: string };

export interface RelationChangeFailure {
	change: RelationChange;
	message: string;
}

export interface RelationChangeOutcome {
	applied: RelationChange[];
	failed: RelationChangeFailure[];
	/** Changes not attempted because an earlier one they depend on failed. */
	skipped: RelationChange[];
	/** The row each applied create made, when the server returned it. */
	created: Map<RelationChange, RecordValues>;
}

/** The values of `fields` on `record`, or null when one of them was not read. */
function priorValues(record: RecordValues | null | undefined, fields: readonly string[]): FieldValues | null {
	if (!record) return null;
	const prior: FieldValues = {};
	for (const field of fields) {
		if (!(field in record)) return null;
		prior[field] = record[field];
	}
	return prior;
}

/** A record removed from or added to a list relation. */
export interface LinkedRecord {
	/** Comparable identity (see `linkKey`). */
	key: string;
	/** The related record. */
	record: RecordValues;
	/** For manyToMany: the junction row that holds the link. */
	junctionRow?: RecordValues | null;
}

/** belongsTo on a server row: one update of this row's local key fields. `row` holds their values now. */
export function planBelongsTo(
	relation: RelationModel,
	table: TableModel,
	rowKey: SheetsRowIdentifier,
	record: RecordValues | null,
	row: RecordValues | null = null,
): RelationPlan {
	if (!record) {
		const patch = belongsToClearPatch(relation);
		return {
			ok: true,
			changes: [
				{ op: 'update', model: table, key: rowKey, patch, prior: priorValues(row, Object.keys(patch)), action: 'unlink', label: '', linkKey: '' },
			],
		};
	}
	const patch = belongsToLinkPatch(relation, record);
	if (!patch) return { ok: false, reason: 'The chosen record has no value to link by.' };
	return {
		ok: true,
		changes: [
			{
				op: 'update',
				model: table,
				key: rowKey,
				patch,
				prior: priorValues(row, Object.keys(patch)),
				action: 'link',
				label: relationRecordLabel(relation, record),
				linkKey: linkKey(relation, record) ?? '',
			},
		],
	};
}

/**
 * hasOne/hasMany: detach the removed records, then point the added records
 * at this row. Each write updates one related record by its primary key.
 */
export function planHasLinks(
	relation: RelationModel,
	target: TableModel,
	row: RecordValues,
	change: { added: readonly LinkedRecord[]; removed: readonly LinkedRecord[] },
): RelationPlan {
	const linkPatch = hasLinkPatch(relation, row);
	if (!linkPatch) return { ok: false, reason: 'This record has no value to link by yet.' };
	const changes: RelationChange[] = [];
	for (const entry of [...change.removed, ...change.added]) {
		const key = primaryKeyValues(target, entry.record);
		const label = relationRecordLabel(relation, entry.record);
		if (!key) return { ok: false, reason: `"${label || 'A record'}" cannot be identified, so its link cannot be changed.` };
		const removing = change.removed.includes(entry);
		const patch = removing ? hasUnlinkPatch(relation) : linkPatch;
		changes.push({
			op: 'update',
			model: target,
			key: key as SheetsRowIdentifier,
			patch,
			// A record linked elsewhere goes back to its old owner on undo.
			prior: priorValues(entry.record, Object.keys(patch)),
			action: removing ? 'unlink' : 'link',
			label,
			linkKey: entry.key,
		});
	}
	return { ok: true, changes };
}

/**
 * manyToMany: delete the junction rows of removed links (by the junction's
 * primary key), then create one junction row per added link.
 */
export function planJunctionLinks(
	relation: RelationModel,
	junction: TableModel,
	row: RecordValues,
	change: { added: readonly LinkedRecord[]; removed: readonly LinkedRecord[] },
): RelationPlan {
	const changes: RelationChange[] = [];
	for (const entry of change.removed) {
		const label = relationRecordLabel(relation, entry.record);
		const key = entry.junctionRow ? primaryKeyValues(junction, entry.junctionRow) : null;
		if (!key) return { ok: false, reason: `The link to "${label || 'a record'}" cannot be identified, so it cannot be removed.` };
		changes.push({ op: 'delete', model: junction, key: key as SheetsRowIdentifier, prior: entry.junctionRow, action: 'unlink', label, linkKey: entry.key });
	}
	for (const entry of change.added) {
		const label = relationRecordLabel(relation, entry.record);
		const values = junctionLinkValues(relation, row, entry.record);
		if (!values) return { ok: false, reason: `"${label || 'A record'}" has no value to link by.` };
		changes.push({ op: 'create', model: junction, values, action: 'link', label, linkKey: entry.key });
	}
	return { ok: true, changes };
}

/** Runs one change; a create resolves to the row it made, when the server returns it. */
export type RelationChangeRunner = (change: RelationChange) => Promise<RecordValues | null | void>;

/** Run one change through the host's adapter. */
export function adapterChangeRunner(adapter: SheetsBackendAdapter, execute: SheetsExecuteFn): RelationChangeRunner {
	return async (change) => {
		const ctx = { model: change.model, tableName: change.model.key };
		if (change.op === 'update') await adapter.updateRow(ctx, change.key, change.patch, execute);
		else if (change.op === 'create') return adapter.createRow<RecordValues>(ctx, change.values, execute);
		else await adapter.deleteRow(ctx, change.key, execute);
	};
}

/**
 * Run changes in order. With `dependent`, the first failure stops the rest
 * (a single link is replaced by removing the old one first); otherwise every
 * change is tried and each failure is reported.
 */
export async function applyRelationChanges(
	changes: readonly RelationChange[],
	run: RelationChangeRunner,
	options: { dependent?: boolean } = {},
): Promise<RelationChangeOutcome> {
	const outcome: RelationChangeOutcome = { applied: [], failed: [], skipped: [], created: new Map() };
	for (const change of changes) {
		if (options.dependent && outcome.failed.length > 0) {
			outcome.skipped.push(change);
			continue;
		}
		try {
			const row = await run(change);
			outcome.applied.push(change);
			if (change.op === 'create' && row) outcome.created.set(change, row);
		} catch (error) {
			outcome.failed.push({ change, message: getHumanReadableError(error) });
		}
	}
	return outcome;
}

/** One sentence per failure, naming the record and the server's message. */
export function describeFailures(outcome: RelationChangeOutcome): string[] {
	const lines = outcome.failed.map(({ change, message }) => {
		const verb = change.action === 'link' ? 'link' : 'unlink';
		return change.label ? `Could not ${verb} "${change.label}": ${message}` : `Could not ${verb}: ${message}`;
	});
	if (outcome.skipped.length > 0) lines.push(`${outcome.skipped.length} more change${outcome.skipped.length === 1 ? ' was' : 's were'} not tried.`);
	return lines;
}

const flip = (action: RelationChange['action']): RelationChange['action'] => (action === 'link' ? 'unlink' : 'link');

/**
 * The writes that undo applied changes, last first: an update writes back what it replaced, a
 * removed link row is created again from its old values, and a created one is deleted. Not
 * possible (with the reason) when a change did not keep what it replaced.
 */
export function invertRelationChanges(outcome: Pick<RelationChangeOutcome, 'applied' | 'created'>): RelationPlan {
	const changes: RelationChange[] = [];
	for (const change of [...outcome.applied].reverse()) {
		const base = { model: change.model, action: flip(change.action), label: change.label, linkKey: change.linkKey };
		if (change.op === 'update') {
			if (!change.prior) return { ok: false, reason: 'The values this link change replaced are not known.' };
			changes.push({ ...base, op: 'update', key: change.key, patch: change.prior, prior: change.patch });
		} else if (change.op === 'delete') {
			if (!change.prior) return { ok: false, reason: 'The removed link is not known, so it cannot be added again.' };
			const values: FieldValues = {};
			for (const column of change.model.columns) {
				if (column.write.create && change.prior[column.name] !== undefined) values[column.name] = change.prior[column.name];
			}
			changes.push({ ...base, op: 'create', values });
		} else {
			const row = outcome.created.get(change) ?? change.values;
			const key = primaryKeyValues(change.model, row);
			if (!key) return { ok: false, reason: 'The added link cannot be identified, so it cannot be removed.' };
			changes.push({ ...base, op: 'delete', key: key as SheetsRowIdentifier, prior: row });
		}
	}
	return { ok: true, changes };
}

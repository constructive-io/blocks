// What a draft still needs, in the grid's terms: a required foreign key is filled through its
// link column, a composite key is one link, and the labels match the headers.
import { describe, expect, it } from 'vitest';

import type { TableModel } from '@constructive-io/data';

import { draftColumnToFill, incompleteDraftErrors, incompleteDraftMessage, missingDraftFields } from '../draft-guidance';

const column = (name: string, requiredOnCreate: boolean) =>
	({ name, write: { create: true, update: true, requiredOnCreate } }) as unknown as TableModel['columns'][number];

const model = {
	columns: [
		column('id', false),
		column('title', true),
		column('projectId', true),
		column('warehouseCode', true),
		column('sku', true),
		column('notes', false),
	],
	relations: [
		{ kind: 'belongsTo', fieldName: 'project', keys: [{ local: 'projectId', remote: 'id' }] },
		{ kind: 'belongsTo', fieldName: 'warehouseItem', keys: [{ local: 'warehouseCode', remote: 'warehouseCode' }, { local: 'sku', remote: 'sku' }] },
	],
} as unknown as TableModel;

describe('draft guidance', () => {
	it('names each missing field by the column that fills it, a composite key once', () => {
		const gaps = missingDraftFields({ title: '', projectId: null, sku: 'A-1' }, model);
		expect(gaps.map((gap) => gap.columnKey)).toEqual(['title', 'project', 'warehouseItem']);
		expect(incompleteDraftMessage(gaps)).toBe('Fill in Title, Project and Warehouse item to save this row.');
	});

	it('marks the hidden key field and its visible link column, and keeps the row reason', () => {
		const errors = incompleteDraftErrors(missingDraftFields({ title: 'x' }, model));
		expect(errors.projectId).toBe('Project needs a value.');
		expect(errors.project).toBe('Project needs a value.');
		expect(errors.submit).toBe('Fill in Project and Warehouse item to save this row.');
	});

	it('puts the cursor on the first column to fill in display order, else the first fillable one', () => {
		const gaps = missingDraftFields({ title: 'x' }, model);
		const keys = ['id', 'project', 'title', 'warehouseItem', 'notes'];
		expect(draftColumnToFill(keys, gaps, (key) => key !== 'id')).toBe('project');
		expect(draftColumnToFill(keys, gaps, (key) => key === 'notes' || key === 'title')).toBe('title');
		expect(draftColumnToFill(keys, [], (key) => key !== 'id')).toBe('project');
		expect(draftColumnToFill(keys, gaps, () => false)).toBeNull();
	});
});

// A copied link cell reads as the linked records' labels in another app, never as JSON.
import { describe, expect, it } from 'vitest';

import type { TableModel } from '@constructive-io/data';

import { cellCopyText } from '../cell-copy-text';

const target = { primaryKey: ['id'], labelFields: ['name'] };
const model = {
	columns: [{ name: 'title', value: { kind: 'text', isArray: false, options: null } }],
	relations: [
		{ kind: 'belongsTo', fieldName: 'project', keys: [{ local: 'projectId', remote: 'id' }], target, junction: null },
		{ kind: 'manyToMany', fieldName: 'labels', keys: [], target, junction: { left: [], right: [{ remote: 'id', junction: 'labelId' }] } },
	],
} as unknown as TableModel;

describe('cellCopyText', () => {
	it('copies a link as its label and a list as its labels', () => {
		expect(cellCopyText(model, 'project', { id: 1, name: 'Analytical Engine' })).toBe('Analytical Engine');
		expect(cellCopyText(model, 'labels', [{ id: 1, name: 'backend' }, { id: 2, name: 'urgent' }])).toBe('backend, urgent');
		expect(cellCopyText(model, 'project', null)).toBe('');
		expect(cellCopyText(model, 'title', 'Plain')).toBe('Plain');
	});
});

// Records that share a label get what tells them apart: their other label fields, else their key.
import { describe, expect, it } from 'vitest';

import type { RelationModel } from '@constructive-io/data';

import { relationRecordDistinction, relationRecordLabel, sharedLabels } from '../relation-label';

const relation = (labelFields: string[], primaryKey: string[]) =>
	({ fieldName: 'assignee', keys: [], target: { labelFields, primaryKey } }) as unknown as RelationModel;

describe('telling records with the same label apart', () => {
	it('finds the labels more than one record shares', () => {
		expect([...sharedLabels(['An', 'Ada', 'An', 'Bo', 'An'])]).toEqual(['An']);
	});

	it('uses the other label fields, else the key', () => {
		const byNameThenEmail = relation(['fullName', 'email'], ['id']);
		const record = { id: 'p-1', fullName: 'Nguyễn Văn An', email: 'an@acme.io' };
		expect(relationRecordLabel(byNameThenEmail, record)).toBe('Nguyễn Văn An');
		expect(relationRecordDistinction(byNameThenEmail, record)).toBe('an@acme.io');
		expect(relationRecordDistinction(relation(['fullName'], ['id']), record)).toBe('p-1');
	});

	it('adds nothing when the label is the key itself', () => {
		expect(relationRecordDistinction(relation(['code'], ['code']), { code: 'VN' })).toBe('');
	});
});

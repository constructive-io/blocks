import { describe, expect, it } from 'vitest';

import { attachDraftMeta, getDraftMeta, isDraftRow, type DraftMeta } from '../row-model';

const META: DraftMeta = { isDraft: true, draftRowId: 'draft:abc', status: 'idle', errors: null };

describe('row-model draft metadata', () => {
	it('attaches and reads metadata without enumerable keys', () => {
		const row = attachDraftMeta({ id: 'draft:abc', name: 'x' }, META);
		expect(getDraftMeta(row)).toEqual(META);
		expect(isDraftRow(row)).toBe(true);
		// The symbol key is non-enumerable: invisible to Object.keys and JSON.
		expect(Object.keys(row)).toEqual(['id', 'name']);
		expect(JSON.stringify(row)).toBe('{"id":"draft:abc","name":"x"}');
	});
});

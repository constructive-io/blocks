import { describe, expect, it } from 'vitest';

import { attachDraftMeta, copyDraftMeta, getDraftMeta, isDraftRow, type DraftMeta } from '../row-model';

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

	it('returns undefined / false for a normal row and for nullish input', () => {
		expect(getDraftMeta({ id: 1 })).toBeUndefined();
		expect(isDraftRow({ id: 1 })).toBe(false);
		expect(getDraftMeta(null)).toBeUndefined();
		expect(isDraftRow(undefined)).toBe(false);
	});

	it('does NOT survive a shallow spread (documented); copyDraftMeta restores it', () => {
		const row = attachDraftMeta({ id: 'draft:1' }, META);
		const spread = { ...row };
		expect(getDraftMeta(spread)).toBeUndefined();
		expect(getDraftMeta(copyDraftMeta(row, { ...row }))).toEqual(META);
	});

	it('preserves error metadata for failed drafts', () => {
		const errMeta: DraftMeta = { isDraft: true, draftRowId: 'draft:2', status: 'error', errors: { name: 'required' } };
		const row = attachDraftMeta({ id: 'draft:2' }, errMeta);
		expect(getDraftMeta(row)?.errors).toEqual({ name: 'required' });
		expect(getDraftMeta(row)?.status).toBe('error');
	});
});

/**
 * Fill-math edge cases not already covered by command integration: offset seeds,
 * missing source values, multi-cell bulk edits, and out-of-bounds column slots.
 *
 * SCOPE — value replication only; numeric/date SERIES detection is DEFERRED (every fill
 * is a verbatim copy of the seed), so no series assertions here.
 */

import { describe, expect, it } from 'vitest';

import { bulkEditWrites, fillDownWrites, fillRightWrites } from '../fill';
import type { SelectionRect } from '../selection-model';

const COLS = ['id', 'name', 'active'];
const ROWS = [
	{ id: 'r0', name: 'Alpha', active: true },
	{ id: 'r1', name: 'Beta', active: false },
	{ id: 'r2', name: 'Gamma', active: true },
];

describe('fillDownWrites', () => {

	it('seeds from the rect top row (y), not from row 0', () => {
		const range: SelectionRect = { x: 1, y: 1, width: 1, height: 2 };
		expect(fillDownWrites(range, ROWS, COLS)).toEqual([{ rowIndex: 2, colKey: 'name', value: 'Beta' }]);
	});

	it('reads an unfetched proxy row / out-of-range cell as null', () => {
		const sparse = [{ id: 'r0' }]; // name/active absent
		const range: SelectionRect = { x: 1, y: 0, width: 1, height: 2 };
		expect(fillDownWrites(range, sparse, COLS)).toEqual([{ rowIndex: 1, colKey: 'name', value: null }]);
	});
});

describe('fillRightWrites', () => {

	it('seeds each row from the rect left column (x), per-row', () => {
		const range: SelectionRect = { x: 1, y: 0, width: 2, height: 2 };
		expect(fillRightWrites(range, ROWS, COLS)).toEqual([
			{ rowIndex: 0, colKey: 'active', value: 'Alpha' },
			{ rowIndex: 1, colKey: 'active', value: 'Beta' },
		]);
	});

});

describe('bulkEditWrites', () => {
	it('fans one value across every cell of a multi-row × multi-col rect (incl. the active cell)', () => {
		const range: SelectionRect = { x: 1, y: 0, width: 2, height: 2 };
		expect(bulkEditWrites(range, 'X', COLS)).toEqual([
			{ rowIndex: 0, colKey: 'name', value: 'X' },
			{ rowIndex: 0, colKey: 'active', value: 'X' },
			{ rowIndex: 1, colKey: 'name', value: 'X' },
			{ rowIndex: 1, colKey: 'active', value: 'X' },
		]);
	});

	it('skips out-of-bounds column slots', () => {
		// width spills past the 3 columns — the 4th slot has no key and is dropped.
		expect(bulkEditWrites({ x: 2, y: 0, width: 2, height: 1 }, 'v', COLS)).toEqual([
			{ rowIndex: 0, colKey: 'active', value: 'v' },
		]);
	});
});

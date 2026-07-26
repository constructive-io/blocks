/**
 * Pure fill-math spec (P4 Phase 3). Asserts fillDownWrites replicates the TOP row of a
 * rect across the rows below it, fillRightWrites replicates the LEFT column rightward,
 * single-row/single-col rects yield no writes, and reads are null-safe.
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
	it('replicates the top row across a 3-row × 2-col rect', () => {
		const range: SelectionRect = { x: 1, y: 0, width: 2, height: 3 };
		expect(fillDownWrites(range, ROWS, COLS)).toEqual([
			{ rowIndex: 1, colKey: 'name', value: 'Alpha' },
			{ rowIndex: 1, colKey: 'active', value: true },
			{ rowIndex: 2, colKey: 'name', value: 'Alpha' },
			{ rowIndex: 2, colKey: 'active', value: true },
		]);
	});

	it('seeds from the rect top row (y), not from row 0', () => {
		const range: SelectionRect = { x: 1, y: 1, width: 1, height: 2 };
		expect(fillDownWrites(range, ROWS, COLS)).toEqual([{ rowIndex: 2, colKey: 'name', value: 'Beta' }]);
	});

	it('yields no writes for a single-row rect (nothing below the seed)', () => {
		expect(fillDownWrites({ x: 0, y: 0, width: 3, height: 1 }, ROWS, COLS)).toEqual([]);
	});

	it('reads an unfetched proxy row / out-of-range cell as null', () => {
		const sparse = [{ id: 'r0' }]; // name/active absent
		const range: SelectionRect = { x: 1, y: 0, width: 1, height: 2 };
		expect(fillDownWrites(range, sparse, COLS)).toEqual([{ rowIndex: 1, colKey: 'name', value: null }]);
	});
});

describe('fillRightWrites', () => {
	it('replicates the left column across a 2-row × 3-col rect', () => {
		const range: SelectionRect = { x: 0, y: 0, width: 3, height: 2 };
		expect(fillRightWrites(range, ROWS, COLS)).toEqual([
			{ rowIndex: 0, colKey: 'name', value: 'r0' },
			{ rowIndex: 0, colKey: 'active', value: 'r0' },
			{ rowIndex: 1, colKey: 'name', value: 'r1' },
			{ rowIndex: 1, colKey: 'active', value: 'r1' },
		]);
	});

	it('seeds each row from the rect left column (x), per-row', () => {
		const range: SelectionRect = { x: 1, y: 0, width: 2, height: 2 };
		expect(fillRightWrites(range, ROWS, COLS)).toEqual([
			{ rowIndex: 0, colKey: 'active', value: 'Alpha' },
			{ rowIndex: 1, colKey: 'active', value: 'Beta' },
		]);
	});

	it('yields no writes for a single-col rect (nothing to the right of the seed)', () => {
		expect(fillRightWrites({ x: 0, y: 0, width: 1, height: 3 }, ROWS, COLS)).toEqual([]);
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

	it('fans down a single-column range (the clean per-column coercion case)', () => {
		const range: SelectionRect = { x: 1, y: 0, width: 1, height: 3 };
		expect(bulkEditWrites(range, 'hi', COLS)).toEqual([
			{ rowIndex: 0, colKey: 'name', value: 'hi' },
			{ rowIndex: 1, colKey: 'name', value: 'hi' },
			{ rowIndex: 2, colKey: 'name', value: 'hi' },
		]);
	});

	it('emits exactly one write for a 1×1 rect (single-cell selection)', () => {
		expect(bulkEditWrites({ x: 1, y: 1, width: 1, height: 1 }, 'solo', COLS)).toEqual([
			{ rowIndex: 1, colKey: 'name', value: 'solo' },
		]);
	});

	it('skips out-of-bounds column slots', () => {
		// width spills past the 3 columns — the 4th slot has no key and is dropped.
		expect(bulkEditWrites({ x: 2, y: 0, width: 2, height: 1 }, 'v', COLS)).toEqual([
			{ rowIndex: 0, colKey: 'active', value: 'v' },
		]);
	});
});

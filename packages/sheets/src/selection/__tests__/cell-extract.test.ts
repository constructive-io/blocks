/**
 * Spec for the pure range-value extractor (cell-extract.ts). Covers rect → matrix,
 * out-of-range / null (unfetched proxy) rows → empty cells, and toTSV shape.
 */

import { describe, expect, it } from 'vitest';

import { getCellsInRange, toTSV } from '../cell-extract';
import type { SelectionRect } from '../selection-model';

const COLS = ['id', 'name', 'active'];
const ROWS = [
	{ id: 'r0', name: 'Alpha', active: true },
	{ id: 'r1', name: 'Beta', active: false },
	{ id: 'r2', name: 'Gamma', active: true },
];

describe('getCellsInRange', () => {
	it('extracts a sub-rect as a row×col matrix with aligned row indices + col keys', () => {
		const rect: SelectionRect = { x: 1, y: 0, width: 2, height: 2 };
		const out = getCellsInRange(rect, ROWS, COLS);
		expect(out.cols).toEqual(['name', 'active']);
		expect(out.rows).toEqual([0, 1]);
		expect(out.values).toEqual([
			['Alpha', true],
			['Beta', false],
		]);
	});

	it('reads a single cell', () => {
		const rect: SelectionRect = { x: 2, y: 2, width: 1, height: 1 };
		const out = getCellsInRange(rect, ROWS, COLS);
		expect(out.values).toEqual([[true]]);
		expect(out.rows).toEqual([2]);
		expect(out.cols).toEqual(['active']);
	});

	it('null (unfetched proxy) rows yield null cells', () => {
		const sparse = [ROWS[0], null, ROWS[2]];
		const rect: SelectionRect = { x: 0, y: 0, width: 2, height: 3 };
		const out = getCellsInRange(rect, sparse, COLS);
		expect(out.values).toEqual([
			['r0', 'Alpha'],
			[null, null],
			['r2', 'Gamma'],
		]);
	});

	it('out-of-range columns + rows read as null (never enumerates the array)', () => {
		const rect: SelectionRect = { x: 2, y: 2, width: 2, height: 2 };
		const out = getCellsInRange(rect, ROWS, COLS);
		// col x=3 is out of range -> undefined colKey -> null; row y=3 is past the array -> null.
		expect(out.cols).toEqual(['active', undefined]);
		expect(out.values).toEqual([
			[true, null],
			[null, null],
		]);
	});

	it('applies getDisplay when supplied', () => {
		const rect: SelectionRect = { x: 1, y: 0, width: 1, height: 2 };
		const out = getCellsInRange(rect, ROWS, COLS, (v) => `<${String(v)}>`);
		expect(out.values).toEqual([['<Alpha>'], ['<Beta>']]);
	});
});

describe('toTSV', () => {
	it('joins cols with tabs and rows with newlines, stringifying values', () => {
		expect(
			toTSV([
				['a', 1, true],
				['b', 2, false],
			]),
		).toBe('a\t1\ttrue\nb\t2\tfalse');
	});

	it('renders null / undefined as empty cells', () => {
		expect(toTSV([[null, undefined, 'x']])).toBe('\t\tx');
	});
});

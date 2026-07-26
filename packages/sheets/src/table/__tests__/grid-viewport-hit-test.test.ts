/**
 * Spec for the pure {@link hitTestCell} geometry that the fill-handle nub drag uses to map a
 * client pointer position to a `[col,row]` cell index over the virtualized body. Pure — no DOM.
 */

import { describe, expect, it } from 'vitest';

import { hitTestCell } from '../grid-viewport';

// 3 columns @ 100px, a 40px marker, a 34px sticky header, 34px rows, 10 rows.
const GEOM = {
	rect: { left: 0, top: 0 },
	scrollLeft: 0,
	scrollTop: 0,
	markerWidth: 40,
	headerHeight: 34,
	rowHeight: 34,
	colWidths: [100, 100, 100],
	rowCount: 10
};

describe('hitTestCell', () => {
	it('maps a point over the first body cell to [0, 0]', () => {
		// x just past the marker, y just past the header.
		expect(hitTestCell(45, 40, GEOM)).toEqual([0, 0]);
	});

	it('walks column widths (x in the 2nd column band -> col 1)', () => {
		// localX = 40+150-40 = 150 -> inside col 1 (100..200).
		expect(hitTestCell(190, 40, GEOM)).toEqual([1, 0]);
	});

	it('floors the row by rowHeight under the header', () => {
		// localY = 34 + 2*34 + 5 - 34 = 73 -> floor(73/34) = 2.
		expect(hitTestCell(45, 34 + 2 * 34 + 5, GEOM)).toEqual([0, 2]);
	});

	it('accounts for scroll offset', () => {
		// scrollTop shifts the content up; a same client-y lands on a lower row.
		expect(hitTestCell(45, 40, { ...GEOM, scrollTop: 34 * 3 })).toEqual([0, 3]);
	});

	it('clamps past the right/bottom edges to the last cell', () => {
		expect(hitTestCell(9999, 9999, GEOM)).toEqual([2, 9]);
	});

	it('clamps above/left of the grid to [0, 0]', () => {
		expect(hitTestCell(-100, -100, GEOM)).toEqual([0, 0]);
	});
});

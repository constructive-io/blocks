/**
 * Behavioral spec for the pure interaction helpers in `selection-model.ts` — the
 * plain / ctrl / shift row-click logic glide used to own internally. Asserts row
 * selection, active-cell parking, and immutability.
 */

import { describe, expect, it } from 'vitest';

import {
	clear,
	computeKeyNavTarget,
	emptySheetsSelection,
	extendRangeToCell,
	moveActive,
	selectAllCells,
	selectCell,
	selectRange,
	selectRow,
	toggleRow,
} from '../selection-model';

describe('selection-model interaction helpers', () => {
	describe('selectRow (plain click)', () => {
		it('replaces the selection with a single row and parks the active cell on it', () => {
			const next = selectRow(emptySheetsSelection, 5);
			expect(next.rows.toArray()).toEqual([5]);
			expect(next.current).toEqual({ cell: [0, 5] });
			expect(next.columns.toArray()).toEqual([]);
		});

		it('discards a previous multi-row selection', () => {
			const prior = { ...emptySheetsSelection, rows: emptySheetsSelection.rows.add([1, 4]) };
			const next = selectRow(prior, 8);
			expect(next.rows.toArray()).toEqual([8]);
		});

		it('does not mutate the input selection', () => {
			const next = selectRow(emptySheetsSelection, 2);
			expect(emptySheetsSelection.rows.toArray()).toEqual([]);
			expect(next).not.toBe(emptySheetsSelection);
		});
	});

	describe('toggleRow (ctrl/cmd click)', () => {
		it('adds an absent row to the existing selection', () => {
			const start = selectRow(emptySheetsSelection, 2);
			const next = toggleRow(start, 5);
			expect(next.rows.toArray()).toEqual([2, 5]);
			expect(next.current).toEqual({ cell: [0, 5] });
		});

		it('removes a present row from the selection', () => {
			const start = { ...emptySheetsSelection, rows: emptySheetsSelection.rows.add([2, 6]) };
			const next = toggleRow(start, 3);
			expect(next.rows.toArray()).toEqual([2, 4, 5]);
			expect(next.current).toEqual({ cell: [0, 3] });
		});

		it('toggling the same row twice returns to the original membership', () => {
			const start = selectRow(emptySheetsSelection, 1);
			const added = toggleRow(start, 4);
			const removed = toggleRow(added, 4);
			expect(removed.rows.toArray()).toEqual([1]);
		});
	});

	describe('selectRange (shift click)', () => {
		it('selects the contiguous block from anchor up to index (inclusive)', () => {
			const next = selectRange(emptySheetsSelection, 2, 5);
			expect(next.rows.toArray()).toEqual([2, 3, 4, 5]);
			expect(next.current).toEqual({ cell: [0, 5] });
		});

		it('handles a reversed range (index below anchor)', () => {
			const next = selectRange(emptySheetsSelection, 6, 3);
			expect(next.rows.toArray()).toEqual([3, 4, 5, 6]);
			expect(next.current).toEqual({ cell: [0, 3] });
		});

		it('anchor equal to index selects exactly that row', () => {
			const next = selectRange(emptySheetsSelection, 4, 4);
			expect(next.rows.toArray()).toEqual([4]);
		});

		it('replaces any prior selection', () => {
			const prior = { ...emptySheetsSelection, rows: emptySheetsSelection.rows.add([10, 12]) };
			const next = selectRange(prior, 0, 2);
			expect(next.rows.toArray()).toEqual([0, 1, 2]);
		});
	});

	describe('selectCell (cell nav)', () => {
		it('parks the active cell and drops any prior range', () => {
			const start = extendRangeToCell(emptySheetsSelection, 0, 0, 3, 4);
			const next = selectCell(start, 2, 7);
			expect(next.current).toEqual({ cell: [2, 7] });
		});

		it('leaves rows and columns untouched (preserves checkbox selection)', () => {
			const prior = { ...emptySheetsSelection, rows: emptySheetsSelection.rows.add([1, 4]) };
			const next = selectCell(prior, 3, 2);
			expect(next.rows).toBe(prior.rows);
			expect(next.columns).toBe(prior.columns);
			expect(next.rows.toArray()).toEqual([1, 2, 3]);
		});

		it('does not mutate the input selection', () => {
			const next = selectCell(emptySheetsSelection, 1, 1);
			expect(emptySheetsSelection.current).toBeUndefined();
			expect(next).not.toBe(emptySheetsSelection);
		});
	});

	describe('moveActive (arrow nav)', () => {
		it('starts from [0,0] when no active cell exists', () => {
			const next = moveActive(emptySheetsSelection, 1, 1, 10, 10);
			expect(next.current).toEqual({ cell: [1, 1] });
		});

		it('moves relative to the existing active cell', () => {
			const start = selectCell(emptySheetsSelection, 3, 4);
			const next = moveActive(start, -1, 2, 10, 10);
			expect(next.current).toEqual({ cell: [2, 6] });
		});

		it('clamps at all four bounds', () => {
			const colCount = 5;
			const rowCount = 8;
			// left / top bound from origin
			expect(moveActive(emptySheetsSelection, -3, -3, colCount, rowCount).current).toEqual({ cell: [0, 0] });
			// right bound
			const atRight = selectCell(emptySheetsSelection, colCount - 1, 0);
			expect(moveActive(atRight, 5, 0, colCount, rowCount).current).toEqual({ cell: [colCount - 1, 0] });
			// bottom bound
			const atBottom = selectCell(emptySheetsSelection, 0, rowCount - 1);
			expect(moveActive(atBottom, 0, 5, colCount, rowCount).current).toEqual({ cell: [0, rowCount - 1] });
		});

		it('preserves rows/columns', () => {
			const prior = { ...emptySheetsSelection, rows: emptySheetsSelection.rows.add(2) };
			const next = moveActive(prior, 1, 1, 10, 10);
			expect(next.rows.toArray()).toEqual([2]);
		});
	});

	describe('extendRangeToCell (shift nav)', () => {
		it('normalizes a forward (down-right) range', () => {
			const next = extendRangeToCell(emptySheetsSelection, 4, 6, 1, 2);
			expect(next.current).toEqual({ cell: [4, 6], range: { x: 1, y: 2, width: 4, height: 5 } });
		});

		it('normalizes a backward (up-left) range', () => {
			const next = extendRangeToCell(emptySheetsSelection, 1, 2, 4, 6);
			expect(next.current).toEqual({ cell: [1, 2], range: { x: 1, y: 2, width: 4, height: 5 } });
		});

		it('normalizes a mixed (down-left) range', () => {
			const next = extendRangeToCell(emptySheetsSelection, 1, 6, 4, 2);
			expect(next.current).toEqual({ cell: [1, 6], range: { x: 1, y: 2, width: 4, height: 5 } });
		});

		it('a single-cell extension yields a 1x1 range', () => {
			const next = extendRangeToCell(emptySheetsSelection, 3, 3, 3, 3);
			expect(next.current).toEqual({ cell: [3, 3], range: { x: 3, y: 3, width: 1, height: 1 } });
		});

		it('preserves rows/columns', () => {
			const prior = { ...emptySheetsSelection, rows: emptySheetsSelection.rows.add(9) };
			const next = extendRangeToCell(prior, 0, 0, 1, 1);
			expect(next.rows.toArray()).toEqual([9]);
		});
	});

	// Stage B (cell-range selection). The grid handler latches a FIXED anchor and dispatches
	// shift-arrow → extendRangeToCell(anchor → target), plain-arrow → moveActive (range cleared),
	// Ctrl/Cmd+A → selectAllCells. These tests model that exact dispatch on the pure helpers.
	describe('selectAllCells (Ctrl/Cmd+A)', () => {
		it('sets a SINGLE full-grid rect and parks the active cell at [0,0]', () => {
			const next = selectAllCells(emptySheetsSelection, 5, 100);
			expect(next.current).toEqual({ cell: [0, 0], range: { x: 0, y: 0, width: 5, height: 100 } });
		});

		it('NEVER touches selection.rows (orthogonal to row-checkbox selection)', () => {
			const prior = { ...emptySheetsSelection, rows: emptySheetsSelection.rows.add([2, 5]) };
			const next = selectAllCells(prior, 3, 10);
			expect(next.rows).toBe(prior.rows);
			expect(next.rows.toArray()).toEqual([2, 3, 4]);
			expect(next.columns).toBe(prior.columns);
		});

		it('is coordinate-only — a million-row grid stays one interval', () => {
			const next = selectAllCells(emptySheetsSelection, 8, 1_000_000);
			expect(next.current?.range).toEqual({ x: 0, y: 0, width: 8, height: 1_000_000 });
			expect(next.rows.toArray()).toEqual([]);
		});
	});

	describe('shift-arrow range extension (anchor fixed)', () => {
		it('populates current.range to the rect spanning anchor → target', () => {
			// Anchor latched at [2, 3]; shift-down-down-right walks the target to [3, 5].
			const anchor: [number, number] = [2, 3];
			const sel = selectCell(emptySheetsSelection, 2, 3);
			const next = extendRangeToCell(sel, 3, 5, anchor[0], anchor[1]);
			expect(next.current).toEqual({ cell: [3, 5], range: { x: 2, y: 3, width: 2, height: 3 } });
		});

		it('keeps the anchor FIXED across successive extends (grows from the same corner)', () => {
			const anchor: [number, number] = [2, 3];
			let sel = selectCell(emptySheetsSelection, 2, 3);
			sel = extendRangeToCell(sel, 2, 4, anchor[0], anchor[1]);
			sel = extendRangeToCell(sel, 4, 6, anchor[0], anchor[1]);
			expect(sel.current).toEqual({ cell: [4, 6], range: { x: 2, y: 3, width: 3, height: 4 } });
		});
	});

	describe('plain arrow resets the anchor (range cleared)', () => {
		it('a plain move after a range extension drops current.range', () => {
			// Build a multi-cell range, then a plain arrow moves the active cell and clears it.
			const ranged = extendRangeToCell(selectCell(emptySheetsSelection, 1, 1), 3, 3, 1, 1);
			expect(ranged.current?.range).toBeDefined();
			const moved = moveActive(ranged, 1, 0, 10, 10);
			expect(moved.current).toEqual({ cell: [4, 3] });
			expect(moved.current?.range).toBeUndefined();
		});
	});

	describe('clear', () => {
		it('returns the empty selection', () => {
			const start = selectRange(emptySheetsSelection, 0, 9);
			const next = clear(start);
			expect(next.rows.toArray()).toEqual([]);
			expect(next.columns.toArray()).toEqual([]);
			expect(next.current).toBeUndefined();
			expect(next).toBe(emptySheetsSelection);
		});
	});

	// Pure resolver for the extended nav keys (Tab/Home/End + Ctrl/Cmd variants + PageUp/Dn).
	// Grid is 5 cols × 10 rows; page span 4. Coordinate-only (never enumerates rows).
	describe('computeKeyNavTarget', () => {
		const COLS = 5;
		const ROWS = 10;
		const PAGE = 4;
		const noMods = { ctrlOrMeta: false, shift: false };
		const ctrl = { ctrlOrMeta: true, shift: false };
		const shift = { ctrlOrMeta: false, shift: true };
		const at = (key: string, mods: { ctrlOrMeta: boolean; shift: boolean }, base: [number, number]) =>
			computeKeyNavTarget(key, mods, base, COLS, ROWS, PAGE);

		it('Home → col 0 of the same row', () => {
			expect(at('Home', noMods, [3, 4])).toEqual([0, 4]);
		});

		it('End → last col of the same row', () => {
			expect(at('End', noMods, [1, 4])).toEqual([4, 4]);
		});

		it('Ctrl/Cmd+Home → [0, 0]', () => {
			expect(at('Home', ctrl, [3, 7])).toEqual([0, 0]);
		});

		it('Ctrl/Cmd+End → [lastCol, lastRow]', () => {
			expect(at('End', ctrl, [1, 2])).toEqual([4, 9]);
		});

		it('Tab advances one col', () => {
			expect(at('Tab', noMods, [1, 3])).toEqual([2, 3]);
		});

		it('Tab at the last col WRAPS to col 0 of the next row', () => {
			expect(at('Tab', noMods, [4, 3])).toEqual([0, 4]);
		});

		it('Tab at the last cell clamps (stays)', () => {
			expect(at('Tab', noMods, [4, 9])).toEqual([4, 9]);
		});

		it('Shift+Tab retreats one col', () => {
			expect(at('Tab', shift, [2, 3])).toEqual([1, 3]);
		});

		it('Shift+Tab at col 0 WRAPS to the last col of the previous row', () => {
			expect(at('Tab', shift, [0, 3])).toEqual([4, 2]);
		});

		it('Shift+Tab at the first cell clamps (stays)', () => {
			expect(at('Tab', shift, [0, 0])).toEqual([0, 0]);
		});

		it('PageDown moves down by the page span, clamped to the last row', () => {
			expect(at('PageDown', noMods, [2, 1])).toEqual([2, 5]);
			expect(at('PageDown', noMods, [2, 8])).toEqual([2, 9]);
		});

		it('PageUp moves up by the page span, clamped to row 0', () => {
			expect(at('PageUp', noMods, [2, 8])).toEqual([2, 4]);
			expect(at('PageUp', noMods, [2, 1])).toEqual([2, 0]);
		});

		it('returns null for non-nav keys (Arrow/Enter handled elsewhere)', () => {
			expect(at('ArrowDown', noMods, [0, 0])).toBeNull();
			expect(at('Enter', noMods, [0, 0])).toBeNull();
			expect(at('a', noMods, [0, 0])).toBeNull();
		});
	});
});

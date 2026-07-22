/**
 * SheetsSelection — the native (TanStack DOM) selection value that replaces
 * glide's `GridSelection`. It is the canonical selection state for the new grid;
 * glide's `GridSelection` is only a derived projection (see `glide-projection.ts`)
 * kept alive for the still-drawing canvas during the phased port.
 *
 * Shape mirrors the slice of glide the grid actually reads/round-trips:
 *   - `rows`    — selected ROW indices (a {@link RangeSet}; the only thing
 *                 production consumes via `.toArray()` / `.length`).
 *   - `columns` — selected COLUMN indices. Nothing consumes it today; it exists
 *                 solely so the glide projection has a faithful slot. Stays empty.
 *   - `current` — the active cell + optional active range (glide's `current.cell`
 *                 + `current.range`). The canvas keyboard-nav cursor depends on it,
 *                 so the projection must preserve it round-trip.
 *
 * The interaction helpers below are PURE and own the click logic glide used to
 * own internally (plain/ctrl/shift row clicks). They operate on ROW indices.
 *
 * NOTE — anchor tracking for shift-click is NOT stored here: `selectRange` takes
 * the anchor as an argument, so the caller (the reducer / interaction layer) owns
 * "where the last plain click landed". This keeps the model a pure value with no
 * hidden interaction state.
 */

import { RangeSet } from './range-set';

/** A half-open active range in cell coordinates (mirrors glide's `Rectangle`). */
export interface SelectionRect {
	x: number;
	y: number;
	width: number;
	height: number;
}

/** The active cell (and optional active range) — glide's `current`, trimmed. */
export interface SelectionCurrent {
	/** `[col, row]` — mirrors glide's `Item` ordering. */
	cell: [number, number];
	/** Active range; absent for a bare single-cell cursor. */
	range?: SelectionRect;
}

export interface SheetsSelection {
	current?: SelectionCurrent;
	rows: RangeSet;
	columns: RangeSet;
}

/** The zero value — no rows, no columns, no active cell. */
export const emptySheetsSelection: SheetsSelection = {
	rows: RangeSet.empty(),
	columns: RangeSet.empty()
};

/**
 * Plain row click: REPLACE the row selection with just `index` and park the
 * active cell on that row (column 0). Columns are left empty.
 */
export function selectRow(sel: SheetsSelection, index: number): SheetsSelection {
	return {
		current: { cell: [0, index] },
		rows: RangeSet.fromSingleSelection(index),
		columns: sel.columns
	};
}

/**
 * Ctrl/cmd row click: TOGGLE `index` in the existing row selection (add when
 * absent, remove when present). The active cell follows the touched row.
 */
export function toggleRow(sel: SheetsSelection, index: number): SheetsSelection {
	const rows = sel.rows.hasIndex(index) ? sel.rows.remove(index) : sel.rows.add(index);
	return {
		current: { cell: [0, index] },
		rows,
		columns: sel.columns
	};
}

/**
 * Shift row click: REPLACE the row selection with the contiguous block spanning
 * `anchor`..`index` (inclusive, either order). The active cell follows `index`.
 */
export function selectRange(sel: SheetsSelection, anchor: number, index: number): SheetsSelection {
	const min = Math.min(anchor, index);
	const max = Math.max(anchor, index);
	return {
		current: { cell: [0, index] },
		rows: RangeSet.fromSingleSelection([min, max + 1]),
		columns: sel.columns
	};
}

/** Clear everything back to the empty selection. */
export function clear(_sel: SheetsSelection): SheetsSelection {
	return emptySheetsSelection;
}

/** Clamp `n` into the inclusive `[min, max]` range. */
function clamp(n: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, n));
}

/**
 * Park the active cell on `[col, row]`, dropping any prior active range. PRESERVES
 * `rows` and `columns` — cell navigation must NOT touch the row-checkbox selection
 * that drives delete/export.
 */
export function selectCell(sel: SheetsSelection, col: number, row: number): SheetsSelection {
	return { ...sel, current: { cell: [col, row] } };
}

/**
 * Extend the active range from an anchor cell to `[col, row]`. The active cell
 * becomes `[col, row]`; `current.range` is a normalized HALF-OPEN {@link SelectionRect}
 * spanning anchor..target in either order. PRESERVES `rows` and `columns`.
 */
export function extendRangeToCell(
	sel: SheetsSelection,
	col: number,
	row: number,
	anchorCol: number,
	anchorRow: number,
): SheetsSelection {
	return {
		...sel,
		current: {
			cell: [col, row],
			range: {
				x: Math.min(col, anchorCol),
				y: Math.min(row, anchorRow),
				width: Math.abs(col - anchorCol) + 1,
				height: Math.abs(row - anchorRow) + 1,
			},
		},
	};
}

/**
 * Select the WHOLE grid as a single cell range (Ctrl/Cmd+A). `current.range` is ONE
 * rect spanning every column/row and `current.cell` parks at `[0, 0]`; `rows`/`columns`
 * are untouched. Coordinate-only — NEVER enumerates rows (the infinite row-model is
 * O(totalCount)), so a million-row grid stays a single interval.
 */
export function selectAllCells(sel: SheetsSelection, colCount: number, rowCount: number): SheetsSelection {
	return {
		...sel,
		current: { cell: [0, 0], range: { x: 0, y: 0, width: colCount, height: rowCount } },
	};
}

/**
 * Move the active cell by `[dCol, dRow]`, clamped to the grid bounds. Starts from
 * `[0, 0]` when no active cell exists. Drops any prior range; PRESERVES rows/columns.
 */
export function moveActive(
	sel: SheetsSelection,
	dCol: number,
	dRow: number,
	colCount: number,
	rowCount: number,
): SheetsSelection {
	const base = sel.current?.cell ?? [0, 0];
	const col = clamp(base[0] + dCol, 0, colCount - 1);
	const row = clamp(base[1] + dRow, 0, rowCount - 1);
	return selectCell(sel, col, row);
}

/**
 * Pure nav-key resolver for the extended spreadsheet keys (Tab/Home/End + their
 * Ctrl/Cmd variants + PageUp/PageDown). Returns the NEW `[col, row]` target clamped
 * to grid bounds, or `null` when the key is not one of these moves (Arrow keys and
 * Enter/F2 are handled separately). `base` is the current active cell, `pageRows` is
 * the row span of one visible page (PageUp/Dn). Coordinate-only — never enumerates rows.
 */
export function computeKeyNavTarget(
	key: string,
	mods: { ctrlOrMeta: boolean; shift: boolean },
	base: [number, number],
	colCount: number,
	rowCount: number,
	pageRows: number,
): [number, number] | null {
	const [col, row] = base;
	const lastCol = colCount - 1;
	const lastRow = rowCount - 1;

	switch (key) {
		case 'Tab': {
			if (mods.shift) {
				// col-1; before col 0 wrap to the last col of the previous row. Clamp at grid start.
				if (col > 0) return [col - 1, row];
				if (row > 0) return [lastCol, row - 1];
				return [0, 0];
			}
			// col+1; past the last col wrap to col 0 of the next row. Clamp at grid end.
			if (col < lastCol) return [col + 1, row];
			if (row < lastRow) return [0, row + 1];
			return [lastCol, lastRow];
		}
		case 'Home':
			return mods.ctrlOrMeta ? [0, 0] : [0, row];
		case 'End':
			return mods.ctrlOrMeta ? [lastCol, lastRow] : [lastCol, row];
		case 'PageUp':
			return [col, clamp(row - pageRows, 0, lastRow)];
		case 'PageDown':
			return [col, clamp(row + pageRows, 0, lastRow)];
		default:
			return null;
	}
}

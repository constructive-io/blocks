/**
 * Fill-math — REPLICATE a source row/column across a target range (P4 Phase 3).
 *
 * PURE + SSR-safe (no React, no DOM) — the analog of {@link getCellsInRange} on the
 * WRITE side: it reads the seed cells out of the raw `rows` array (null-safe for
 * unfetched proxy rows / out-of-range columns, exactly like the extractor) and emits
 * the {@link CellWrite}[] the command hands to `commitCells` (readonly/UUID skips +
 * undo live inside that batch, never here).
 *
 * SCOPE — value REPLICATION only. Numeric/date SERIES detection (1,2 -> 3,4 ; Jan,Feb
 * -> Mar) is DEFERRED: every filled cell is a verbatim copy of the seed.
 */

import type { SelectionRect } from './selection-model';
import type { CellWrite } from '../grid/hooks/use-batch-commit';

/** Read one raw cell value, null-safe (mirrors getCellsInRange: undefined -> null). */
function readCell(rows: readonly unknown[], rowIndex: number, colKey: string): unknown {
	const rowData = rows[rowIndex] as Record<string, unknown> | null | undefined;
	const raw = rowData && colKey != null ? rowData[colKey] : null;
	return raw === undefined ? null : raw;
}

/**
 * Fill DOWN: SOURCE = the TOP row of `range` (y). For each col `x..x+width-1`, replicate
 * the seed cell value into every row `y+1..y+height-1`. Returns the writes column-major
 * is not required — emitted row-major (top-to-bottom within each... actually outer loop is
 * target rows, inner is cols) so commitCells coalesces per row. A single-row range yields
 * no writes (nothing below the seed).
 */
export function fillDownWrites(
	range: SelectionRect,
	rows: readonly unknown[],
	columnKeys: readonly string[],
): CellWrite[] {
	const writes: CellWrite[] = [];
	const sourceRow = range.y;
	for (let targetRow = range.y + 1; targetRow < range.y + range.height; targetRow++) {
		for (let c = 0; c < range.width; c++) {
			const colKey = columnKeys[range.x + c];
			if (colKey == null) continue;
			writes.push({ rowIndex: targetRow, colKey, value: readCell(rows, sourceRow, colKey) });
		}
	}
	return writes;
}

/**
 * Fill RIGHT: SOURCE = the LEFT column of `range` (x). For each col `x+1..x+width-1`,
 * replicate that column's seed (the value in the LEFT column of the SAME row) rightward
 * across every row `y..y+height-1`. A single-column range yields no writes.
 */
export function fillRightWrites(
	range: SelectionRect,
	rows: readonly unknown[],
	columnKeys: readonly string[],
): CellWrite[] {
	const writes: CellWrite[] = [];
	const sourceColKey = columnKeys[range.x];
	for (let r = 0; r < range.height; r++) {
		const rowIndex = range.y + r;
		const seed = sourceColKey == null ? null : readCell(rows, rowIndex, sourceColKey);
		for (let c = 1; c < range.width; c++) {
			const colKey = columnKeys[range.x + c];
			if (colKey == null) continue;
			writes.push({ rowIndex, colKey, value: seed });
		}
	}
	return writes;
}

/**
 * Bulk-edit: FAN a single committed `value` across every cell of `range` (the classic
 * "select range, type, commit, fill" edit). Unlike fill-down/right this reads NO seed
 * out of the data — every cell in the range gets the SAME `value` (per-column coercion
 * happens downstream in commitCells/resolveServerPatch). The write set is the COMPLETE
 * range INCLUDING the active cell, so the caller does ONE commitCells (never a single
 * commit + a separate range commit) — no double-write, one optimistic patch, one undo.
 * Out-of-bounds column slots are skipped (mirrors the other fill writers).
 */
export function bulkEditWrites(
	range: SelectionRect,
	value: unknown,
	columnKeys: readonly string[],
): CellWrite[] {
	const writes: CellWrite[] = [];
	for (let r = 0; r < range.height; r++) {
		const rowIndex = range.y + r;
		for (let c = 0; c < range.width; c++) {
			const colKey = columnKeys[range.x + c];
			if (colKey == null) continue;
			writes.push({ rowIndex, colKey, value });
		}
	}
	return writes;
}

/**
 * Fill-handle DRAG geometry — extend `from` toward target cell `[col,row]` along the
 * DOMINANT axis (v1 supports one axis at a time). PURE.
 *
 * The axis is chosen by which direction the target overshoots `from` the most: if the
 * vertical overshoot (below the bottom / above the top) exceeds the horizontal one we
 * fill VERTICALLY (the rect's height grows); otherwise HORIZONTALLY (width grows). Ties
 * and a target already inside `from` collapse to `from` (no extension). The off-axis span
 * is left exactly as `from`'s.
 */
export function extendedFillRect(from: SelectionRect, target: readonly [number, number]): SelectionRect {
	const [col, row] = target;
	const bottom = from.y + from.height - 1;
	const right = from.x + from.width - 1;
	// Overshoot past the source band on each axis (0 when target is within the band).
	const vOver = row > bottom ? row - bottom : from.y - row > 0 ? from.y - row : 0;
	const hOver = col > right ? col - right : from.x - col > 0 ? from.x - col : 0;
	if (vOver === 0 && hOver === 0) return from;
	if (vOver >= hOver) {
		// Vertical fill: grow the height toward `row`, keep x/width.
		const y = Math.min(from.y, row);
		const yEnd = Math.max(bottom, row);
		return { x: from.x, y, width: from.width, height: yEnd - y + 1 };
	}
	// Horizontal fill: grow the width toward `col`, keep y/height.
	const x = Math.min(from.x, col);
	const xEnd = Math.max(right, col);
	return { x, y: from.y, width: xEnd - x + 1, height: from.height };
}

/**
 * Replicate the SOURCE band `from` across the NEW cells of `extended` (the cells in
 * `extended` that are NOT in `from`). For a vertical extension each new row copies the
 * matching column's value from the NEAREST source row (the band repeats); for a horizontal
 * extension each new column copies the matching row's nearest source column. Value
 * REPLICATION only — SERIES detection DEFERRED. Skips the `from` band (already populated).
 */
export function fillDragWrites(
	from: SelectionRect,
	extended: SelectionRect,
	rows: readonly unknown[],
	columnKeys: readonly string[],
): CellWrite[] {
	const writes: CellWrite[] = [];
	for (let ty = extended.y; ty < extended.y + extended.height; ty++) {
		for (let tx = extended.x; tx < extended.x + extended.width; tx++) {
			// Inside the source band — already has its value, never overwrite.
			if (tx >= from.x && tx < from.x + from.width && ty >= from.y && ty < from.y + from.height) continue;
			const colKey = columnKeys[tx];
			if (colKey == null) continue;
			// Tile the source band: map the target back into the band on each axis.
			const srcCol = from.x + ((tx - from.x) % from.width + from.width) % from.width;
			const srcRow = from.y + ((ty - from.y) % from.height + from.height) % from.height;
			const srcKey = columnKeys[srcCol];
			writes.push({ rowIndex: ty, colKey, value: srcKey == null ? null : readCell(rows, srcRow, srcKey) });
		}
	}
	return writes;
}

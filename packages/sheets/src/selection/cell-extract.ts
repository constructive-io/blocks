/**
 * Range-value extractor — pulls the matrix of cell values covered by a
 * {@link SelectionRect} out of the (possibly virtualized) row array.
 *
 * PURE + SSR-safe — no React, no DOM. The BOUNDED contract is load-bearing: it
 * reads only the cells inside the rect (w×h), never enumerates `rows.length`, so
 * a paste/fill/copy targeting a few cells of a million-row grid stays O(w·h). An
 * unfetched proxy row (infinite-mode) reads as `null` -> its cells come back as
 * `null`; an out-of-range column reads as `null` too.
 *
 * Reused by P3 (paste/fill writes the same coordinate matrix back) and P4 (copy
 * serializes {@link toTSV}).
 */

import type { SelectionRect } from './selection-model';

/** The extracted block: a `values[row][col]` matrix plus the row indices + col keys it covers. */
export interface ExtractedRange {
	/** `values[r][c]` — outer index aligns with `rows[r]`, inner with `cols[c]`. */
	values: unknown[][];
	/** Absolute row indices covered (y .. y+height-1). */
	rows: number[];
	/** Column keys covered (columnKeys[x .. x+width-1]). */
	cols: string[];
}

/**
 * Read every cell inside `range` (half-open: x/width = cols, y/height = rows) from
 * `rows` keyed by `columnKeys`. `getDisplay`, when supplied, maps the raw value to
 * the value to emit (e.g. a display string for copy) — defaults to the raw value.
 * Null-safe for unfetched proxy rows and out-of-range columns.
 */
export function getCellsInRange(
	range: SelectionRect,
	rows: readonly unknown[],
	columnKeys: readonly string[],
	getDisplay?: (value: unknown, rowIndex: number, colKey: string) => unknown,
): ExtractedRange {
	const cols: string[] = [];
	for (let c = 0; c < range.width; c++) {
		cols.push(columnKeys[range.x + c]);
	}

	const rowIndices: number[] = [];
	const values: unknown[][] = [];
	for (let r = 0; r < range.height; r++) {
		const rowIndex = range.y + r;
		rowIndices.push(rowIndex);
		const rowData = rows[rowIndex] as Record<string, unknown> | null | undefined;
		const line: unknown[] = [];
		for (let c = 0; c < range.width; c++) {
			const colKey = cols[c];
			const raw = rowData && colKey != null ? rowData[colKey] : null;
			const cellValue = raw === undefined ? null : raw;
			line.push(getDisplay ? getDisplay(cellValue, rowIndex, colKey) : cellValue);
		}
		values.push(line);
	}

	return { values, rows: rowIndices, cols };
}

/**
 * Serialize a value matrix to TSV (tab-joined cols, newline-joined rows). Each value
 * is stringified; `null`/`undefined` become an empty cell. Spreadsheet-paste shape —
 * reused by P4 copy.
 */
export function toTSV(values: readonly (readonly unknown[])[]): string {
	return values
		.map((row) => row.map((cell) => (cell == null ? '' : String(cell))).join('\t'))
		.join('\n');
}

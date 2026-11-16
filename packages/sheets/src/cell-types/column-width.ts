// Default column widths per cell type, so a typical value fits without truncation.
// Exact numbers are long: a whole number beyond 2^53 has up to 20 characters
// (`-9223372036854775807`) and a double up to 23 (`1.7976931348623157e+308`).
// A value wider than its column is still marked as cut (see the number view).

import type { ColumnModel } from '@constructive-io/data';

import { cellTypeForColumn } from './column-routing';

/** Width of a column whose cell type has no specific width. */
export const DEFAULT_COLUMN_WIDTH = 150;

const WIDTH_BY_CELL_TYPE: Readonly<Record<string, number>> = {
	bigint: 200,
	decimal: 200,
	number: 200,
	currency: 200,
};

/** Default width for a cell type key. */
export function defaultWidthForCellType(cellType: string): number {
	return WIDTH_BY_CELL_TYPE[cellType] ?? DEFAULT_COLUMN_WIDTH;
}

/** Default width for a table-model column. */
export function defaultColumnWidth(column: ColumnModel): number {
	return defaultWidthForCellType(cellTypeForColumn(column));
}

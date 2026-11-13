// The ONE routing rule from a table-model column to a cell type.
//
// Every decision here reads the `ColumnModel` (value kind, list flag, semantic
// hint, option list, file details, input type). Nothing looks at a column name,
// and nothing guesses from a value. The cell type picks the cell factory, the
// view and the editor (see `grid-dom/editors/edit-intent.ts`).

import type { ColumnModel } from '@constructive-io/data';

import type { CellType } from './types';

/** Cell type of a list column whose elements have a dedicated list cell type. */
const LIST_CELL_TYPES: Partial<Record<ColumnModel['value']['kind'], CellType>> = {
	text: 'text-array',
	uuid: 'uuid-array',
	integer: 'integer-array',
	float: 'number-array',
	date: 'date-array',
};

/** Cell type of a file column. */
function fileCellType(column: ColumnModel): CellType {
	switch (column.value.file?.kind) {
		case 'image':
			return 'image';
		case 'attachment':
			return 'attachment';
		default:
			return 'upload';
	}
}

/** Cell type of a single text value: presentation follows the semantic hint. */
function textCellType(column: ColumnModel): CellType {
	switch (column.value.semantic) {
		case 'email':
			return 'email';
		case 'url':
			return 'url';
		case 'origin':
			return 'origin';
		default:
			return 'text';
	}
}

/**
 * Map a table-model column to its cell type. A list column routes to a list cell
 * type (the editor validates each element by the column's value kind); a column with
 * a fixed option list routes to a choice cell type.
 */
export function cellTypeForColumn(column: ColumnModel): CellType {
	const { value } = column;
	if (value.kind === 'file') return fileCellType(column);
	if (value.kind === 'enum' || value.options) return value.isArray ? 'multi-select' : 'select';
	if (value.isArray) {
		if (value.kind === 'vector') return 'vector';
		return LIST_CELL_TYPES[value.kind] ?? 'array';
	}

	switch (value.kind) {
		case 'text':
			return textCellType(column);
		case 'integer':
			return 'integer';
		case 'bigint':
			return 'bigint';
		case 'decimal':
			return 'decimal';
		case 'float':
			return value.semantic === 'currency' ? 'currency' : 'number';
		case 'boolean':
			return 'boolean';
		case 'uuid':
			return 'uuid';
		case 'date':
			return 'date';
		case 'time':
			return 'time';
		case 'datetime':
			return 'datetime';
		case 'interval':
			return 'interval';
		case 'json':
			return 'json';
		case 'bitstring':
			return 'bitstring';
		case 'binary':
			return 'binary';
		// A hardware address has no network editor; it edits as text.
		case 'network':
			return value.typeName === 'MacAddress' ? 'text' : 'inet';
		case 'geometry':
			return value.geometrySubtype === 'Point' ? 'geometry-point' : 'geometry';
		case 'point':
			return 'point';
		case 'vector':
			return 'vector';
		case 'fulltext':
			return 'tsvector';
		case 'path':
			return 'path';
		case 'range':
			return 'range';
		case 'composite':
			return 'composite';
		default:
			return 'unknown';
	}
}

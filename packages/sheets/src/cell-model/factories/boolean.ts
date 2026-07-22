// Boolean SheetsCell factory — native analogue of v1's BooleanCellFactory
// (grid/cell-content-factory.ts). Claims BOOLEAN_TYPES (boolean, bit, toggle).
//
// Parity contract (projectSheetsCell ≡ projectGlideCell):
//   The glide BooleanCell carries `data: boolValue` and NO `displayData`, so
//   projectGlideCell yields { displayText: '', copyText: String(boolValue) }.
//   We mirror that: `data` holds EXACTLY the boolean glide put in `.data`, and
//   `displayData` is '' (glide Boolean had none). Since kind 'boolean' is not
//   geometry/custom, projectSheetsCell reads displayData -> '' and data ->
//   String(boolValue), matching glide branch-for-branch. The glide BooleanCell
//   sets no `readonly`, so readonly = false.

import type { CellCreationMetadata } from '../../grid/grid-cell-types';
import { BOOLEAN_TYPES } from '../../cell-types/cell-type-groups';
import type { SheetsCell } from '../sheets-cell';
import type { SheetsCellFactory } from './types';

function canHandle(cellType: string, _value: unknown): boolean {
	return BOOLEAN_TYPES.has(cellType);
}

function create(value: unknown, _metadata: CellCreationMetadata): SheetsCell {
	const boolValue = value === null || value === undefined ? false : typeof value === 'boolean' ? value : Boolean(value);
	return { kind: 'boolean', data: boolValue, displayData: '', readonly: false };
}

export const booleanSheetsCellFactory: SheetsCellFactory = { canHandle, create };

// Boolean SheetsCell factory — native analogue of v1's BooleanCellFactory
// (grid/cell-content-factory.ts). Claims BOOLEAN_TYPES (boolean, toggle).
//
// The cell keeps the boolean in `data` for the view and leaves `displayData` empty
// because the view owns its visual representation. A null value stays null (an
// empty cell), so "no value" never shows as false.

import type { CellCreationMetadata } from '../../grid/grid-cell-types';
import { BOOLEAN_TYPES } from '../../cell-types/cell-type-groups';
import type { SheetsCell } from '../sheets-cell';
import type { SheetsCellFactory } from './types';

function canHandle(cellType: string, _value: unknown): boolean {
	return BOOLEAN_TYPES.has(cellType);
}

function create(value: unknown, _metadata: CellCreationMetadata): SheetsCell {
	const boolValue = value === null || value === undefined ? null : typeof value === 'boolean' ? value : Boolean(value);
	return { kind: 'boolean', data: boolValue, displayData: '', readonly: false };
}

export const booleanSheetsCellFactory: SheetsCellFactory = { canHandle, create };

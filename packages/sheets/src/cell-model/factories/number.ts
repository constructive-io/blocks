// Number SheetsCell factory — native analogue of v1's NumberCellFactory
// (grid/cell-content-factory.ts). Claims NUMBER_TYPES (number, integer, smallint,
// decimal, currency, percentage, AND `rating` — `rating` lives in NUMBER_TYPES so
// the number family wins it before the text fallback; this is a deliberate v1
// quirk preserved for parity).
//
// Parity contract (projectSheetsCell ≡ projectGlideCell):
//   - null/undefined OR NaN coercion -> data: undefined, displayData: ''
//     (projects copyText '' + displayText '')
//   - otherwise -> data: numValue (number), displayData: String(numValue)
// Mirrors the glide NumberCell branch-for-branch; `data` holds EXACTLY what the
// glide factory put in `.data`, and `displayData` is the string form of glide's
// `.displayData`. The glide NumberCell sets no `readonly`, so readonly = false.

import type { CellCreationMetadata } from '../../grid/grid-cell-types';
import { NUMBER_TYPES } from '../../cell-types/cell-type-groups';
import type { SheetsCell } from '../sheets-cell';
import type { SheetsCellFactory } from './types';

function canHandle(cellType: string, _value: unknown): boolean {
	return NUMBER_TYPES.has(cellType);
}

function create(value: unknown, _metadata: CellCreationMetadata): SheetsCell {
	if (value === null || value === undefined) {
		return { kind: 'number', data: undefined, displayData: '', readonly: false };
	}

	const numValue = typeof value === 'number' ? value : parseFloat(value as string);
	if (isNaN(numValue)) {
		return { kind: 'number', data: undefined, displayData: '', readonly: false };
	}

	return { kind: 'number', data: numValue, displayData: String(numValue), readonly: false };
}

export const numberSheetsCellFactory: SheetsCellFactory = { canHandle, create };

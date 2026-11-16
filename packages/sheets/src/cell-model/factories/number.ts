// Number SheetsCell factory — native analogue of v1's NumberCellFactory
// (grid/cell-content-factory.ts). Claims NUMBER_TYPES (number, integer, smallint,
// bigint, decimal, currency, percentage, AND `rating` — `rating` lives in NUMBER_TYPES
// so the number family wins it before the text fallback; a deliberate v1 quirk).
//
// A string value is an exact decimal (whole numbers beyond 2^53, exact decimals,
// "NaN", "Infinity") and is shown digit for digit: it is never parsed into a JS
// number. A number value shows as its string form. Null is an empty cell.

import type { CellCreationMetadata } from '../../grid/grid-cell-types';
import { NUMBER_TYPES } from '../../cell-types/cell-type-groups';
import type { SheetsCell } from '../sheets-cell';
import type { SheetsCellFactory } from './types';

function canHandle(cellType: string, _value: unknown): boolean {
	return NUMBER_TYPES.has(cellType);
}

function create(value: unknown, _metadata: CellCreationMetadata): SheetsCell {
	if (value === null || value === undefined || value === '') {
		return { kind: 'number', data: undefined, displayData: '', readonly: false };
	}
	if (typeof value === 'string') {
		return { kind: 'number', data: value, displayData: value, readonly: false };
	}
	if (typeof value === 'number') {
		return { kind: 'number', data: value, displayData: String(value), readonly: false };
	}
	return { kind: 'number', data: undefined, displayData: String(value), readonly: false };
}

export const numberSheetsCellFactory: SheetsCellFactory = { canHandle, create };

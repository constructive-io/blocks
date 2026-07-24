// Default (fallback) SheetsCell factory — native analogue of v1's TextCellFactory
// (grid/cell-content-factory.ts). It is the LAST factory in dispatcher precedence:
// `canHandle` returns true for every cellType, so it only WINS the types no
// earlier family claimed (text, textarea, phone, citext, bpchar, json, jsonb,
// inet, uuid, color, origin, unknown).
//
// v1 emits a Text glide cell: null/undefined -> data/displayData ''; string ->
// data/displayData = value; anything else -> compactJsonPreview(value, 80) for
// both. This factory mirrors that exactly so projectSheetsCell deep-equals
// projectGlideCell. `compactJsonPreview` is shared (sheets.formatters), so it is
// imported rather than copied.

import type { CellType } from '../../cell-types/types';
import type { CellCreationMetadata } from '../../grid/grid-cell-types';
import { compactJsonPreview } from '../../grid/sheets.formatters';
import type { SheetsCell } from '../sheets-cell';
import type { SheetsCellFactory } from './types';

function canHandle(_cellType: string, _value: unknown): boolean {
	return true;
}

function create(value: unknown, metadata: CellCreationMetadata): SheetsCell {
	const meta = { cellType: metadata.cellType as CellType };

	if (value === null || value === undefined) {
		return { kind: 'text', data: '', displayData: '', readonly: false, meta };
	}

	if (typeof value === 'string') {
		return { kind: 'text', data: value, displayData: value, readonly: false, meta };
	}

	const display = compactJsonPreview(value, 80);
	return { kind: 'text', data: display, displayData: display, readonly: false, meta };
}

export const textSheetsCellFactory: SheetsCellFactory = { canHandle, create };

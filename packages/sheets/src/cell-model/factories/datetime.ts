// SheetsCell factory for the datetime family — native analogue of v1's
// DateTimeCellFactory (cell-content-factory.ts). Claims the DATE_TIME_TYPES
// (date, datetime, time, timestamptz) and emits a neutral `text` cell carrying
// the value's string form. v1 renders the raw value as formatted text: non-null
// -> data/displayData = String(value); null/undefined -> both ''. This factory
// mirrors that exactly so projectSheetsCell deep-equals projectGlideCell.

import type { CellType } from '../../cell-types/types';
import { DATE_TIME_TYPES } from '../../cell-types/cell-type-groups';
import type { CellCreationMetadata } from '../../grid/grid-cell-types';
import type { SheetsCell } from '../sheets-cell';
import type { SheetsCellFactory } from './types';

function canHandle(cellType: string, _value: unknown): boolean {
	return DATE_TIME_TYPES.has(cellType);
}

function create(value: unknown, metadata: CellCreationMetadata): SheetsCell {
	const meta = { cellType: metadata.cellType as CellType };

	if (value === null || value === undefined) {
		return { kind: 'text', data: '', displayData: '', readonly: false, meta };
	}

	const text = String(value);
	return { kind: 'text', data: text, displayData: text, readonly: false, meta };
}

export const dateTimeSheetsCellFactory: SheetsCellFactory = { canHandle, create };

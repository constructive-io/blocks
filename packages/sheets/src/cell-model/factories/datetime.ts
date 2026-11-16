// SheetsCell factory for the datetime family (date, datetime, time, timestamptz): a
// neutral `text` cell shown by the one date and time rule (`formatDateTimeText`: a date
// as stored, a time "HH:mm:ss" and a date and time "YYYY-MM-DD HH:mm:ss" with fractions
// only when not zero, a zoned value in the viewer's zone). `data` keeps the exact
// stored text; the title shows it with the zone used. Copy and export read the raw
// value. No value is ''.

import type { CellType } from '../../cell-types/types';
import { DATE_TIME_TYPES } from '../../cell-types/cell-type-groups';
import { dateTimeKindOf, dateTimeTitle, formatDateTimeText } from '../../cell-types/date-time-format';
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
	const kind = dateTimeKindOf(metadata.cellType);
	if (!kind) return { kind: 'text', data: text, displayData: text, readonly: false, meta };
	const shown = formatDateTimeText(text, kind);
	return { kind: 'text', data: text, displayData: shown.text, readonly: false, meta: { ...meta, title: dateTimeTitle(text, shown.zone) } };
}

export const dateTimeSheetsCellFactory: SheetsCellFactory = { canHandle, create };

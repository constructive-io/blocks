// Choice SheetsCell factory — enum columns and text columns with an allowed-values
// list (`select`, `multi-select`). The stored value is the wire value; the cell shows
// each value's label as a badge. A stored value that is not in the option list still
// shows, as it is.

import type { CellType } from '../../cell-types/types';
import { CHOICE_TYPES } from '../../cell-types/cell-type-groups';
import { choiceLabel } from '../../cell-types/column-value';
import type { CellCreationMetadata } from '../../grid/grid-cell-types';
import type { SheetsCell } from '../sheets-cell';
import type { SheetsCellFactory } from './types';

function canHandle(cellType: string, _value: unknown): boolean {
	return CHOICE_TYPES.has(cellType);
}

function create(value: unknown, metadata: CellCreationMetadata): SheetsCell {
	const values = value === null || value === undefined ? [] : Array.isArray(value) ? value : [value];
	const labels = values.filter((entry) => entry !== null && entry !== undefined).map((entry) => choiceLabel(metadata.column, entry));
	return {
		kind: 'badges',
		data: labels,
		displayData: labels.join(', '),
		readonly: false,
		meta: { cellType: metadata.cellType as CellType },
	};
}

export const choiceSheetsCellFactory: SheetsCellFactory = { canHandle, create };

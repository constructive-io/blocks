// Native SheetsCell factory — URI family (url | email). Ports v1
// `UriCellFactory` (grid/cell-content-factory.ts) to the neutral SheetsCell
// render payload. All domain logic (email -> mailto, url passthrough, empty
// guard) is reproduced here verbatim so this file is glide-free at cutover.
//
// PARITY: projectSheetsCell(create(...)) deep-equals projectGlideCell of v1's
// UriCell — `data`/`displayData` are the SAME strings v1 emits. v1 drops only
// the `onClickUri` side-effect (the DOM view owns clicks).

import type { CellType } from '../../cell-types/types';
import type { CellCreationMetadata } from '../../grid/grid-cell-types';
import type { SheetsCell } from '../sheets-cell';
import type { SheetsCellFactory } from './types';

function canHandle(cellType: string, _value: unknown): boolean {
	return cellType === 'url' || cellType === 'email';
}

function create(value: unknown, metadata: CellCreationMetadata): SheetsCell {
	const cellType = metadata.cellType as CellType;

	if (value === null || value === undefined || value === '') {
		return { kind: 'uri', data: '', displayData: '', readonly: false, meta: { cellType } };
	}

	const stringValue = String(value);
	const isEmail = metadata.cellType === 'email';
	const data = isEmail ? `mailto:${stringValue}` : stringValue;

	return { kind: 'uri', data, displayData: stringValue, readonly: false, meta: { cellType } };
}

export const uriSheetsCellFactory: SheetsCellFactory = { canHandle, create };

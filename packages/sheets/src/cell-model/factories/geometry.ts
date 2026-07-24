// Geometry SheetsCell factory — native analogue of v1 `GeometryCellFactory`.
//
// Owns GEOMETRY_TYPES (geometry, geometry-point, geometry-collection). Geometry
// stays out-of-band: when the caller supplies a `deriveGeometry` builder (the
// native mirror of v1's `createGeometryCell`), this factory delegates to it so
// this module never imports the leaflet-backed geometry view. Without a builder,
// it falls back to a compact JSON preview as both the copy value and the display
// string — identical to v1's Text fallback.
//
// Parity: `projectSheetsCell` special-cases kind `geometry` so copyText ===
// displayText === displayData. The fallback therefore sets `data` and
// `displayData` to the SAME `compactJsonPreview(value, 80)` string v1 emits.

import type { CellCreationMetadata } from '../../grid/grid-cell-types';
import { GEOMETRY_TYPES } from '../../cell-types/cell-type-groups';
import { compactJsonPreview } from '../../grid/sheets.formatters';
import type { SheetsCell } from '../sheets-cell';
import type { SheetsCellFactory } from './types';

function canHandle(cellType: string, _value: unknown): boolean {
	return GEOMETRY_TYPES.has(cellType);
}

function create(
	value: unknown,
	_metadata: CellCreationMetadata,
	deriveGeometry?: (value: unknown) => SheetsCell,
): SheetsCell {
	if (deriveGeometry) {
		return deriveGeometry(value ?? null);
	}

	const display = compactJsonPreview(value, 80);
	return {
		kind: 'geometry',
		data: display,
		displayData: display,
		readonly: false,
	};
}

export const geometrySheetsCellFactory: SheetsCellFactory = { canHandle, create };

// Geometry SheetsCell factory — native analogue of v1 `GeometryCellFactory`.
//
// Owns GEOMETRY_TYPES (geometry, geometry-point, geometry-collection). Geometry
// stays out-of-band: when the caller supplies a `deriveGeometry` builder (the
// native mirror of v1's `createGeometryCell`), this factory delegates to it so
// this module never imports the leaflet-backed geometry view. Without a builder,
// it falls back to a compact JSON preview as both the copy value and the display
// string — identical to v1's Text fallback.
//
// Copy and display text intentionally use the same compact JSON preview when no
// geometry-specific builder is available.

import type { CellCreationMetadata } from '../../grid/grid-cell-types';
import { GEOMETRY_TYPES } from '../../cell-types/cell-type-groups';
import { summarizeShape } from '../../cell-types/shape-kind';
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

	// No value: an empty cell, like every other kind (not the text "null").
	const summary = summarizeShape(value);
	if (!summary) return { kind: 'geometry', data: '', displayData: '', readonly: false };

	// The view shows the summary (kind and part count); the compact JSON stays the text
	// for the title. A value that cannot be read as a shape carries the reason.
	const display = compactJsonPreview(value, 80);
	return {
		kind: 'geometry',
		data: display,
		displayData: display,
		readonly: false,
		meta: { shapeLabel: summary.label, shapeCategory: summary.category, shapeProblem: summary.problem },
	};
}

export const geometrySheetsCellFactory: SheetsCellFactory = { canHandle, create };

// The SheetsCell DISPATCHER — the native analogue of v1's `createCellContent`
// (grid/cell-content-factory.ts). Given a (value, metadata) it selects the first
// family factory whose `canHandle(cellType, value)` is true and returns its
// neutral {@link SheetsCell} render payload. Geometry stays out-of-band: the
// optional `deriveGeometry` hook is threaded straight through to the geometry
// factory (v1's `createGeometryCell` mirror) so this module never imports the
// leaflet-backed geometry view.
//
// Precedence MIRRORS v1 CELL_FACTORIES exactly (image, uri, badges, dateTime,
// interval, geometry, relation, number, boolean, text) — `text` is the universal
// fallback and MUST stay last. Null handling mirrors `createEmptyCell`: pick the
// first factory that claims the cellType for a null value and let it emit its own
// empty cell.

import type { CellType } from '../cell-types/types';
import type { CellCreationMetadata } from '../grid/grid-cell-types';
import { badgesSheetsCellFactory } from './factories/badges';
import { booleanSheetsCellFactory } from './factories/boolean';
import { dateTimeSheetsCellFactory } from './factories/datetime';
import { geometrySheetsCellFactory } from './factories/geometry';
import { imageSheetsCellFactory } from './factories/image';
import { intervalSheetsCellFactory } from './factories/interval';
import { numberSheetsCellFactory } from './factories/number';
import { relationSheetsCellFactory } from './factories/relation';
import { textSheetsCellFactory } from './factories/text';
import type { SheetsCellFactory } from './factories/types';
import { uriSheetsCellFactory } from './factories/uri';
import type { SheetsCell } from './sheets-cell';

// Registry of all SheetsCell factories — SAME precedence as glide CELL_FACTORIES
// (more specific first; the text fallback MUST be last).
const SHEETS_CELL_FACTORIES: SheetsCellFactory[] = [
	imageSheetsCellFactory,
	uriSheetsCellFactory,
	badgesSheetsCellFactory,
	dateTimeSheetsCellFactory,
	intervalSheetsCellFactory,
	geometrySheetsCellFactory,
	relationSheetsCellFactory,
	numberSheetsCellFactory,
	booleanSheetsCellFactory,
	textSheetsCellFactory, // Fallback — must be last.
];

/**
 * Build the neutral {@link SheetsCell} for a (value, metadata). Mirrors v1
 * `createCellContent`: null/undefined → the first claiming factory's empty cell
 * (mirror of `createEmptyCell`); otherwise the first factory whose
 * `canHandle(cellType, value)` is true. `deriveGeometry` is threaded to the
 * geometry factory unchanged. The `text` factory's `canHandle` always returns
 * true, so a factory is always found and the explicit final fallback below is a
 * defensive belt-and-braces guard.
 */
/**
 * Stamp the resolved cellType onto the cell's `meta` so the cell SELF-DESCRIBES
 * its type (the host reads `SheetsCellResolution.typeKey`, but the cell carrying
 * `meta.cellType` keeps it self-contained for the editor adapters that already
 * read it — date/geometry). MERGE (not replace) so any factory-set meta key
 * (e.g. geometry's `geometryType`) survives. Parity-safe: `projectSheetsCell`
 * ignores `meta` entirely, so display/copy text is unchanged.
 */
function withTypeKey(cell: SheetsCell, cellType: string): SheetsCell {
	return { ...cell, meta: { ...cell.meta, cellType: cellType as CellType } };
}

export function createSheetsCell(
	value: unknown,
	metadata: CellCreationMetadata,
	deriveGeometry?: (value: unknown) => SheetsCell,
): SheetsCell {
	const { cellType } = metadata;

	if (value === null || value === undefined) {
		const emptyFactory = SHEETS_CELL_FACTORIES.find((f) => f.canHandle(cellType, null));
		if (emptyFactory) {
			return withTypeKey(emptyFactory.create(null, metadata, deriveGeometry), cellType);
		}
		return withTypeKey({ kind: 'text', data: '', displayData: '', readonly: false }, cellType);
	}

	const factory = SHEETS_CELL_FACTORIES.find((f) => f.canHandle(cellType, value));
	if (factory) {
		return withTypeKey(factory.create(value, metadata, deriveGeometry), cellType);
	}

	return withTypeKey(
		{
			kind: 'text',
			data: value,
			displayData: String(value),
			readonly: false,
		},
		cellType,
	);
}

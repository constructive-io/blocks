// SheetsCell factory contract — the native analogue of v1's cell-content-factory
// family. Each factory claims a set of `cellType`s (and/or value shapes) and emits
// the neutral {@link SheetsCell} render payload. Geometry stays out-of-band: the
// optional `deriveGeometry` hook lets a factory delegate to a geometry builder
// without this module importing leaflet peers (mirrors v1 createGeometryCell).

import type { CellCreationMetadata } from '../../grid/grid-cell-types';
import type { SheetsCell } from '../sheets-cell';

export interface SheetsCellFactory {
	canHandle(cellType: string, value: unknown): boolean;
	create(value: unknown, metadata: CellCreationMetadata, deriveGeometry?: (value: unknown) => SheetsCell): SheetsCell;
}

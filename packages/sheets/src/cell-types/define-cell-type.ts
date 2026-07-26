// Public contract for defining and overriding cell types.
//
// A CellTypeDefinition unifies DETECTION (`match`) and native DISPLAY
// (`toSheetsCell` / `cell`) and native EDITING (`editorComponent`) in one object.
// Consumers register them per-instance via `<SheetsProvider config={{ plugins }}>`
// or `<Sheets cellTypes>`; a def whose `typeKey` matches a built-in overrides that
// built-in for this grid, and a def with a `match()` adds detection. Any concern
// left undefined falls back to the built-in behavior, so a def may override just
// the editor, just the display, or add a brand-new type end-to-end.

import type { CellCategory } from './types';
// Type-only imports (erased at runtime) — avoids a cell-types -> grid cycle.
import type { CellCreationMetadata } from '../grid/grid-cell-types';
import type { SheetsCell } from '../cell-model/sheets-cell';
import type { CellProps } from '../cell-model/cell-props';
import type { EditorProps } from '../grid-dom/editors/editor-props';

/** Schema-only inputs used to DETECT a cell type. Never the runtime value. */
export interface CellTypeMatchInput {
	gqlType: string;
	isArray: boolean;
	pgAlias?: string | null;
	pgType?: string | null;
	subtype?: string | null;
	fieldName?: string;
}

/** Context handed to `toSheetsCell` so a definition can build the neutral cell.
 * Geometry uses the built-in fallback, so no `createGeometry` callback is needed. */
export interface SheetsCellRenderContext {
	metadata: CellCreationMetadata;
}

export interface CellTypeDefinition<TValue = unknown> {
	/** Stable key. A def whose typeKey equals a built-in (e.g. 'relation') overrides it. */
	typeKey: string;
	category?: CellCategory;
	/** Toolbar / type-picker icon. */
	icon?: React.ComponentType<{ size?: number }>;
	defaultWidth?: number;
	supportsInlineEdit?: boolean;
	/** DETECTION (schema-only). Highest-priority match wins; omit for typeKey-only. */
	match?: (meta: CellTypeMatchInput) => boolean;
	/** Native DISPLAY. Build the neutral SheetsCell. Omit to keep the built-in renderer. */
	toSheetsCell?: (value: TValue, ctx: SheetsCellRenderContext) => SheetsCell;
	/** Native cell COMPONENT override (the slot target). Omit to keep the built-in view. */
	cell?: React.ComponentType<CellProps>;
	/** Native EDITOR override (DOM portal overlay). Omit to keep the built-in native editor. */
	editorComponent?: React.ComponentType<EditorProps>;
	/** Value -> display/copy/export string. */
	format?: (value: TValue) => string;
	defaultValue?: () => TValue;
}

/** Identity helper that pins the generic — `defineCellType<number>({ ... })`. */
export function defineCellType<T = unknown>(def: CellTypeDefinition<T>): CellTypeDefinition<T> {
	return def;
}

/** A named bundle of cell types, registered via `SheetsConfig.plugins`. */
export interface CellTypePlugin {
	name: string;
	cellTypes: CellTypeDefinition<any>[];
}

export type { CellCreationMetadata };

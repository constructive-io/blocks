// Per-instance cell-type registry.
//
// This is a thin OVERRIDE LAYER over the built-in native rendering engine:
// consumer definitions (from `SheetsConfig.plugins` and `<Sheets cellTypes>`)
// win by `typeKey` and by `match()`, and anything they don't define falls back
// to the built-in `toSheetsCell`. The built-in engine is injected so this module
// stays free of a cell-types -> grid import cycle. The registry is created once
// per <SheetsProvider> (same lifetime as the store), so it is SSR- and
// multi-tenant-safe — no module singleton.
import type {
	CellTypeDefinition,
	CellTypeMatchInput,
	SheetsCellRenderContext,
} from './define-cell-type';
import type { SheetsCell } from '../cell-model/sheets-cell';
import type { CellProps } from '../cell-model/cell-props';
import type { EditorProps } from '../grid-dom/editors/editor-props';

/** The built-in engine the registry falls back to (injected to avoid a cycle). */
export interface CellTypeBuiltins {
	toSheetsCell: (value: unknown, ctx: SheetsCellRenderContext) => SheetsCell;
}

export interface CellTypeRegistry {
	/** Detection: consumer `match()` chain first (later defs win), else the built-in resolver. */
	resolveTypeKey(meta: CellTypeMatchInput, builtinFallback: () => string): string;
	/** Native display: consumer `def.toSheetsCell` for this typeKey, else the built-in renderer. */
	toSheetsCell(typeKey: string, value: unknown, ctx: SheetsCellRenderContext): SheetsCell;
	/** The registered definition for a typeKey, if any (consumer defs only). */
	get(typeKey: string): CellTypeDefinition<any> | undefined;
	/** The native cell COMPONENT override for a typeKey, if any (consumer `def.cell`). */
	getCellComponent(typeKey: string): React.ComponentType<CellProps> | undefined;
	/** The native EDITOR override for a typeKey, if any (consumer `def.editorComponent`). */
	getEditorComponent(typeKey: string): React.ComponentType<EditorProps> | undefined;
}

/**
 * Build a registry. `cellTypes` are consumer definitions in precedence order
 * (provider `plugins` first, then per-instance `cellTypes`); later entries win,
 * so an instance-level def overrides a provider-level one with the same typeKey.
 */
export function createCellTypeRegistry(cellTypes: CellTypeDefinition<any>[], builtins: CellTypeBuiltins): CellTypeRegistry {
	// Index by typeKey — last write wins (instance overrides provider).
	const byKey = new Map<string, CellTypeDefinition<any>>();
	for (const def of cellTypes) byKey.set(def.typeKey, def);

	// Match list in REVERSE precedence so later (instance) defs are tried first.
	const matchers = [...cellTypes].reverse().filter((d) => d.match);

	return {
		resolveTypeKey(meta, builtinFallback) {
			for (const def of matchers) {
				if (def.match!(meta)) return def.typeKey;
			}
			return builtinFallback();
		},
		toSheetsCell(typeKey, value, ctx) {
			const def = byKey.get(typeKey);
			return def?.toSheetsCell ? def.toSheetsCell(value, ctx) : builtins.toSheetsCell(value, ctx);
		},
		get(typeKey) {
			return byKey.get(typeKey);
		},
		getCellComponent(typeKey) {
			return byKey.get(typeKey)?.cell;
		},
		getEditorComponent(typeKey) {
			return byKey.get(typeKey)?.editorComponent;
		},
	};
}

// Consumer-facing cell-component override slots. A thin sugar over the native
// `cell` field of a CellTypeDefinition: a `CellSlots` map (keyed by cell typeKey)
// compiles down to component-only CellTypeDefinitions that the registry resolves
// via `getCellComponent`. Pure logic — no React render, no glide.

import type { CellTypeDefinition } from '../cell-types/define-cell-type';
import type { CellProps } from './cell-props';
import type { EditorProps } from '../grid-dom/editors/editor-props';

/**
 * A single slot: either a bare cell component, or an object overriding the cell
 * view and/or the native editor for a typeKey. The object form lets a consumer
 * override JUST the editor (`{ editor: MyEditor }`) without touching the view.
 */
export type CellSlot =
	| React.ComponentType<CellProps>
	| { cell?: React.ComponentType<CellProps>; editor?: React.ComponentType<EditorProps> };

/** Consumer cell-component / editor overrides keyed by cell typeKey. */
export type CellSlots = Record<string, CellSlot>;

/**
 * Compile a {@link CellSlots} map into {@link CellTypeDefinition}s. The function
 * form yields `{ typeKey, cell }` (view-only); the object form yields
 * `{ typeKey, cell?, editorComponent? }`. Entries that resolve to neither a cell
 * nor an editor (e.g. `{ json: {} }`) are skipped. Returns `[]` for empty/undefined.
 */
export function compileSlots(slots: CellSlots | undefined): CellTypeDefinition[] {
	if (!slots) return [];
	const defs: CellTypeDefinition[] = [];
	for (const [typeKey, slot] of Object.entries(slots)) {
		if (typeof slot === 'function') {
			defs.push({ typeKey, cell: slot });
			continue;
		}
		const { cell, editor } = slot;
		if (!cell && !editor) continue;
		defs.push({ typeKey, cell, editorComponent: editor });
	}
	return defs;
}

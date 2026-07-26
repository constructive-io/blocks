// The SINGLE edit-intent resolver — the host's one entry point for "what happens
// when this cell is activated?". It replaces the host's brittle
// `resolveNativeEditor(cell.meta?.cellType ?? 'text')` lookup (which mis-routed
// EVERY non-text cell to TextEditor) with an AUTHORITATIVE, exhaustive mapping
// from a `typeKey` (CellType) + the cell's readonly flag to exactly one of:
//   • { mode: 'inline-toggle' } — no overlay; the host commits `!currentBool`.
//   • { mode: 'inline-edit' }   — no overlay; the host edits IN PLACE with a bare
//                                 single-line <input> (the SIMPLE text-representable
//                                 types: text-like + number-like). url/inet are NOT
//                                 here — they keep their specialised overlay editors.
//   • { mode: 'overlay', editor } — open the resolved native overlay editor.
//   • { mode: 'none' }           — not editable (readonly / non-editable type).
//
// EXHAUSTIVENESS is structural: the buckets are DRIVEN OFF the canonical
// cell-type-groups Sets (BOOLEAN_TYPES / NUMBER_TYPES / DATE_TIME_TYPES /
// GEOMETRY_TYPES / MEDIA_TYPES / isArrayCellType / NON_EDITABLE_TYPES /
// VIEWER_ONLY_TYPES), never a hand-maintained list — so adding a member to a
// group automatically routes it here. Every CellType in cell-types/types.ts lands
// in exactly one bucket; anything unrecognised falls through to the text default
// (TextEditor), matching the `unknown` cell-type contract.
//
// CONSUMER OVERRIDE: a registered `def.editorComponent` for the typeKey (looked up
// via the injected `consumer`, i.e. `registry.getEditorComponent`) WINS as the
// overlay editor for any type that opens an overlay — same precedence the glide
// path gave `def.editor`. It does NOT override inline-toggle or readonly `none`.

import type { ComponentType } from 'react';

import {
	BOOLEAN_TYPES,
	DATE_TIME_TYPES,
	GEOMETRY_TYPES,
	MEDIA_TYPES,
	NON_EDITABLE_TYPES,
	NUMBER_TYPES,
	VIEWER_ONLY_TYPES,
	isArrayCellType,
} from '../../cell-types/cell-type-groups';
import { DOM_EDITOR_REGISTRY, type NativeEditor } from './editor-registry-dom';
import type { EditorProps } from './editor-props';

export type EditIntent =
	| { mode: 'overlay'; editor: NativeEditor }
	| { mode: 'inline-toggle' }
	| { mode: 'inline-edit' }
	| { mode: 'none' };

type EditorConsumer = (typeKey: string) => ComponentType<EditorProps> | undefined;

/** Build the overlay intent for a typeKey: consumer override wins, else the registry entry. */
function overlay(typeKey: string, consumer: EditorConsumer | undefined): EditIntent {
	const editor = (consumer?.(typeKey) as NativeEditor | undefined) ?? DOM_EDITOR_REGISTRY[typeKey];
	// No editor resolved for a type that should open one — degrade to no-edit rather
	// than portal an empty overlay. (Cannot happen for the buckets below: every one
	// has a DOM_EDITOR_REGISTRY entry.)
	return editor ? { mode: 'overlay', editor } : { mode: 'none' };
}

/**
 * Simple text-representable types (text-like + number-like) edit IN PLACE with a bare
 * <input> — no overlay. A registered consumer editor for the typeKey still WINS as an
 * overlay editor (same override precedence the overlay types give `def.editor`); only
 * the built-in path becomes inline. The host derives text-vs-number from the cell kind.
 */
function inlineOrOverride(typeKey: string, consumer: EditorConsumer | undefined): EditIntent {
	const editor = consumer?.(typeKey) as NativeEditor | undefined;
	if (editor) return { mode: 'overlay', editor };
	return { mode: 'inline-edit' };
}

/**
 * Resolve the edit intent for a cell.
 *
 * @param typeKey  - resolved CellType key (the `SheetsCellResolution.typeKey`).
 * @param opts     - `readonly` mirrors the cell's readonly flag (READONLY_CONDITIONS / draft-id / relation-not-inline).
 * @param consumer - optional per-instance editor override (`registry.getEditorComponent`).
 */
export function resolveEditIntent(
	typeKey: string,
	opts: { readonly?: boolean },
	consumer?: EditorConsumer,
): EditIntent {
	// 1) Readonly cell — never editable, regardless of type (matches the host already
	//    skipping `cell.readonly`). Also covers NON_EDITABLE types that are not viewers.
	if (opts.readonly) return { mode: 'none' };

	// 2) Non-editable types that are NOT viewer-only → no edit. (tsvector is in
	//    NON_EDITABLE_TYPES but is viewer-only, so it falls through to its viewer
	//    overlay below; this guard catches any future non-viewer non-editable type.)
	if (NON_EDITABLE_TYPES.has(typeKey) && !VIEWER_ONLY_TYPES.has(typeKey)) return { mode: 'none' };

	// 3) Booleans → inline toggle (no overlay; the host commits `!currentBool`).
	if (BOOLEAN_TYPES.has(typeKey)) return { mode: 'inline-toggle' };

	// 4) Number-like → inline edit (simple text-representable). Overlay families below stay
	//    overlay, driven off the canonical groups so they stay exhaustive.
	if (NUMBER_TYPES.has(typeKey)) return inlineOrOverride(typeKey, consumer);
	if (DATE_TIME_TYPES.has(typeKey)) return overlay(typeKey, consumer);
	if (isArrayCellType(typeKey)) return overlay(typeKey, consumer);
	if (GEOMETRY_TYPES.has(typeKey)) return overlay(typeKey, consumer);
	if (MEDIA_TYPES.has(typeKey)) return overlay(typeKey, consumer);

	// 5) Singleton overlay types (each has a DOM_EDITOR_REGISTRY entry).
	if (typeKey === 'interval') return overlay(typeKey, consumer);
	if (typeKey === 'json' || typeKey === 'jsonb') return overlay(typeKey, consumer);
	if (typeKey === 'inet') return overlay(typeKey, consumer);
	if (typeKey === 'relation') return overlay(typeKey, consumer);
	if (typeKey === 'url') return overlay(typeKey, consumer);
	// tsvector — VIEWER_ONLY, but still opens a read-only viewer overlay.
	if (VIEWER_ONLY_TYPES.has(typeKey)) return overlay(typeKey, consumer);

	// 6) Text-like default (text/textarea/email/phone/citext/bpchar/uuid/color/
	//    origin/unknown + anything unrecognised) → inline edit. `color` is NOT a real
	//    backend data type — just a hex/text string — so it edits inline too (no dedicated
	//    color editor). A consumer override on a text-like typeKey still wins as an overlay
	//    editor via `inlineOrOverride`; otherwise the cell edits in place.
	return inlineOrOverride(typeKey, consumer);
}

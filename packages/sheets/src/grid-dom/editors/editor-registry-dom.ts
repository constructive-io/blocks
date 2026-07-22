// Native (DOM React-portal) editor registry — the Phase-4 analogue of the glide
// `grid/editor-registry.ts` `EDITOR_REGISTRY` + `createEditor`, but value-native.
//
// The OverlayManager already supplies the focus-trap, error-guard, flip geometry
// and overlay-preset width class, so a native editor is just a `ComponentType<
// EditorProps>` — no glide `ProvideEditorCallbackResult`/`disableStyling` wrapper.
// `wrapNativeEditor` is therefore a thin passthrough that only TAGS a preset width
// class (so the OverlayManager can read it) — it does NOT re-wrap the trap/guard.
//
// `resolveNativeEditor` mirrors the glide precedence: a consumer override
// (`def.editor`, looked up via the injected `consumer` fn) wins, else the
// built-in `DOM_EDITOR_REGISTRY` entry. The `consumer` lookup is injected (not the
// CellTypeRegistry directly) so this module stays decoupled from the registry
// shape; Stage 3+ wires `registry.getEditorComponent` in at the call site.
//
// PER-EDITOR COMMIT PATTERN (Phase 5 fan-out — every native re-host must follow one):
//   • VALUE editors (text/json/date/geometry/interval/inet/array/tsvector/url):
//       read the initial value from `EditorProps.value`; on save call
//       `onCommit(nextRawValue)` (the host serialises + builds the cell). Cancel ->
//       `onCancel()`. These DO NOT mutate the server.
//   • IMAGE/upload (self-committing): the editor uploads, then
//       `onCommitPatch({ [colKey]: imageData })` (single field). On a DRAFT row it
//       must first `onSubmitDraftRow(draftRowId)` to obtain a real id, and use
//       `onInvalidateData` as the post-upload `onDraftUploadComplete`.
//   • RELATION (self-committing): the editor mutates, then
//       `onCommitPatch({ [foreignKeyField]: fkValue, [relationField ?? colKey]: relationData })`
//       (MULTI field for belongsTo). FK/display fields come from EditorProps.relationInfo.
//   The host wires onCommit/onCommitPatch/onSubmitDraftRow/onInvalidateData/onCancel
//   in SheetsDomInner; an editor only PICKS the matching callback(s) for its kind.

import type { ComponentType } from 'react';

import { ArrayEditorDom } from './array-editor';
import { DateEditorDom } from './date-editor';
import type { EditorProps } from './editor-props';
import { GeometryEditorDom } from './geometry-editor';
import { ImageEditorDom } from './image-editor';
import { InetEditorDom } from './inet-editor';
import { IntervalEditorDom } from './interval-editor';
import { JsonEditorDom } from './json-editor';
import { NumberEditorDom } from './number-editor';
import { RelationEditorDom } from './relation-editor';
import { TextEditor } from './text-editor';
import { TsvectorEditorDom } from './tsvector-editor';
import { UrlEditorDom } from './url-editor';

/**
 * A native editor that optionally advertises its overlay-preset width class and whether it
 * commits-on-click-away (Stage B): `commitsOnBlur` editors own an `onBlur → onCommit` path,
 * so the OverlayManager dismisses them with `dismissMode='commit'` (blur the input → commit)
 * instead of cancelling. Editors without it keep cancel-on-outside.
 */
export type NativeEditor = ComponentType<EditorProps> & { overlayPresetClass?: string; commitsOnBlur?: boolean };

/**
 * Tag a native editor with an overlay-preset width class so the OverlayManager can
 * size the portal. Thin passthrough — the trap/guard/geometry are the manager's job.
 */
export function wrapNativeEditor(Editor: ComponentType<EditorProps>, presetClass?: string): NativeEditor {
	if (!presetClass) return Editor;
	const wrapped = Editor as NativeEditor;
	// Tag in place — no re-render wrapper needed; the manager reads the class off
	// the resolved component. (A fresh object would break referential identity of
	// memoised editors, so we annotate the component the registry already holds.)
	wrapped.overlayPresetClass = presetClass;
	return wrapped;
}

// Built-in native editors, keyed by cell-type key. This is the CONSUMER-FACING
// overlay-editor table — the type->component map `resolveEditIntent` reads when it
// decides a type opens an overlay. It now covers EVERY type the authoritative
// edit-intent enumeration routes to an overlay (edit-intent.ts), so the host never
// falls back to TextEditor for a typed cell:
//   • number/integer/smallint/decimal/currency/percentage/rating -> NumberEditorDom.
//   • url -> UrlEditorDom (native, wired here — went through the text overlay before
//     the routing fix). NOTE: `color` is NOT here — it is not a real backend data
//     type (just a hex/text string), so it routes to the plain TextEditor via the
//     edit-intent text-like default; there is no dedicated color editor.
//   • image/file/video/audio/upload -> ImageEditorDom (the media family).
// (Booleans are NOT here — they are an inline toggle with no overlay; see edit-intent.)
export const DOM_EDITOR_REGISTRY: Record<string, NativeEditor> = {
	// Text types
	text: TextEditor,
	varchar: TextEditor,
	// Number types (the whole NUMBER_TYPES family, incl. rating)
	number: NumberEditorDom,
	integer: NumberEditorDom,
	smallint: NumberEditorDom,
	decimal: NumberEditorDom,
	currency: NumberEditorDom,
	percentage: NumberEditorDom,
	rating: NumberEditorDom,
	// Media types (the whole MEDIA_TYPES family reuses the image editor, as in glide)
	image: ImageEditorDom,
	file: ImageEditorDom,
	video: ImageEditorDom,
	audio: ImageEditorDom,
	upload: ImageEditorDom,
	// Date/time types
	date: DateEditorDom,
	datetime: DateEditorDom,
	timestamptz: DateEditorDom,
	time: DateEditorDom,
	// Geometry types
	geometry: GeometryEditorDom,
	'geometry-point': GeometryEditorDom,
	'geometry-collection': GeometryEditorDom,
	// Other complex types
	interval: IntervalEditorDom,
	relation: RelationEditorDom,
	tsvector: TsvectorEditorDom,
	inet: InetEditorDom,
	url: UrlEditorDom,
	// Array types
	array: ArrayEditorDom,
	'text-array': ArrayEditorDom,
	'uuid-array': ArrayEditorDom,
	'number-array': ArrayEditorDom,
	'integer-array': ArrayEditorDom,
	'date-array': ArrayEditorDom,
	tags: ArrayEditorDom,
	// JSON types
	json: JsonEditorDom,
	jsonb: JsonEditorDom,
};

/**
 * Resolve the native editor for a type key. A consumer override wins (mirrors the
 * glide `def.editor` precedence), else the built-in `DOM_EDITOR_REGISTRY` entry.
 *
 * @param typeKey - resolved cell-type key (e.g. `text`, `json`).
 * @param consumer - optional per-instance override lookup (`registry.getEditorComponent`).
 */
export function resolveNativeEditor(
	typeKey: string,
	consumer?: (typeKey: string) => ComponentType<EditorProps> | undefined,
): NativeEditor | undefined {
	return consumer?.(typeKey) ?? DOM_EDITOR_REGISTRY[typeKey];
}

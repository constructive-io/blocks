/* @vitest-environment node */

// EXHAUSTIVE routing contract for the edit-intent resolver — the regression guard
// for the bug this fix closes: EVERY non-text cell used to mis-route to TextEditor
// because the host read a `meta.cellType` the factories never set. Here we assert
// every CellType lands in exactly the bucket the AUTHORITATIVE enumeration prescribes,
// that readonly always wins, and that a consumer override wins for overlay types (but
// never flips inline-toggle or readonly).
//
// EXHAUSTIVENESS is anchored to the SAME authoritative list every golden asserts
// through — ALL_CELL_TYPES from grid/__golden__/parity.harness (the runtime mirror of
// the CellType union, typed `Record<CellType, …>` upstream so it can only lag in the
// safe direction). Importing it here — rather than re-listing the union — means a new
// CellType is forced into a bucket by THIS test the moment it joins the union: the
// `for (const type of ALL_CELL_TYPES)` loop visits it, and its `default`-less
// classification below makes an unclassified member fail loudly.

import { describe, expect, it } from 'vitest';

import type { CellType } from '../../../cell-types/types';
import {
	BOOLEAN_TYPES,
	DATE_TIME_TYPES,
	GEOMETRY_TYPES,
	MEDIA_TYPES,
	NUMBER_TYPES,
	isArrayCellType,
} from '../../../cell-types/cell-type-groups';
import { ALL_CELL_TYPES } from '../../../grid/__golden__/parity.harness';
import { DOM_EDITOR_REGISTRY, type NativeEditor } from '../editor-registry-dom';
import { resolveEditIntent, type EditIntent } from '../edit-intent';

// ─── The authoritative per-type expectation, derived FROM the canonical groups ──
//
// `expectedIntentFor` is the spec's enumeration expressed as code, but — like the
// resolver — it is DRIVEN OFF the same cell-type-groups Sets, so it stays exhaustive
// by construction (never a hand-maintained per-type table that could drift). For each
// CellType it returns the intent the resolver MUST produce, keyed to the DOM registry
// editor for overlay types:
//   • boolean/toggle/bit            -> { mode: 'inline-toggle' }
//   • NUMBER_TYPES                  -> { mode: 'inline-edit' } (simple text-representable, in-cell)
//   • DATE_TIME_TYPES               -> overlay DateEditorDom    (key === type)
//   • interval                      -> overlay IntervalEditorDom
//   • json | jsonb                  -> overlay JsonEditorDom     (key === type)
//   • isArrayCellType (incl. tags)  -> overlay ArrayEditorDom    (key === type)
//   • GEOMETRY_TYPES                -> overlay GeometryEditorDom  (key === type)
//   • inet                          -> overlay InetEditorDom (validated editor — NOT inline)
//   • MEDIA_TYPES                   -> overlay ImageEditorDom     (key 'image')
//   • relation                      -> overlay RelationEditorDom
//   • url                           -> overlay UrlEditorDom (the explicit text exception — NOT inline)
//   • tsvector                      -> overlay TsvectorEditorDom (viewer-only, still overlay)
//   • everything text-like (text/textarea/email/phone/citext/bpchar/uuid/color/
//     origin/unknown)               -> { mode: 'inline-edit' } (simple text — edits in place;
//                                       color is just a text string, no dedicated editor)
type ExpectedOverlay = { mode: 'overlay'; editor: NativeEditor };
type ExpectedIntent = { mode: 'inline-toggle' } | { mode: 'inline-edit' } | ExpectedOverlay;

function overlayWith(editor: NativeEditor): ExpectedOverlay {
	return { mode: 'overlay', editor };
}

function expectedIntentFor(type: CellType): ExpectedIntent {
	if (BOOLEAN_TYPES.has(type)) return { mode: 'inline-toggle' };
	if (NUMBER_TYPES.has(type)) return { mode: 'inline-edit' };
	if (DATE_TIME_TYPES.has(type)) return overlayWith(DOM_EDITOR_REGISTRY[type]);
	if (type === 'interval') return overlayWith(DOM_EDITOR_REGISTRY.interval);
	if (type === 'json' || type === 'jsonb') return overlayWith(DOM_EDITOR_REGISTRY[type]);
	if (isArrayCellType(type)) return overlayWith(DOM_EDITOR_REGISTRY[type]);
	if (GEOMETRY_TYPES.has(type)) return overlayWith(DOM_EDITOR_REGISTRY[type]);
	if (type === 'inet') return overlayWith(DOM_EDITOR_REGISTRY.inet);
	if (MEDIA_TYPES.has(type)) return overlayWith(DOM_EDITOR_REGISTRY.image);
	if (type === 'relation') return overlayWith(DOM_EDITOR_REGISTRY.relation);
	if (type === 'url') return overlayWith(DOM_EDITOR_REGISTRY.url);
	if (type === 'tsvector') return overlayWith(DOM_EDITOR_REGISTRY.tsvector);
	// Text-like floor — text/textarea/email/phone/citext/bpchar/uuid/color/origin/unknown — edits inline.
	return { mode: 'inline-edit' };
}

describe('resolveEditIntent — EXHAUSTIVE enumeration (every ALL_CELL_TYPES member)', () => {
	it(`covers all ${ALL_CELL_TYPES.length} CellTypes with exactly the prescribed intent`, () => {
		// The "all combinations" guard: visit EVERY authoritative CellType and assert the
		// resolver yields the group-derived expectation. A new union member (hence a new
		// ALL_CELL_TYPES entry) is checked here automatically — a missing classification
		// in either map fails this loop.
		for (const type of ALL_CELL_TYPES) {
			const actual = resolveEditIntent(type, {});
			const expected = expectedIntentFor(type);
			expect(actual, `${type} -> ${JSON.stringify(expected)}`).toEqual(expected);

			// Overlay editors must resolve to a real component (never an empty portal).
			if (expected.mode === 'overlay') {
				expect((actual as ExpectedOverlay).editor, `${type} editor is defined`).toBeTruthy();
			}
		}
	});

	it('the enumeration spans the full 46-member CellType union', () => {
		// Belt-and-suspenders: the list is the authoritative one (no duplicates), so its
		// length is the CellType-union cardinality. Pin it so an accidental edit to the
		// harness list (or a union change without a list update) is visible here too.
		expect(new Set(ALL_CELL_TYPES).size).toBe(ALL_CELL_TYPES.length);
		expect(ALL_CELL_TYPES.length).toBe(46);
	});
});

describe('resolveEditIntent — per-family spot checks (spec language)', () => {
	it('booleans (boolean/toggle/bit) are inline-toggle, never an overlay', () => {
		for (const t of ['boolean', 'toggle', 'bit'] as CellType[]) {
			expect(resolveEditIntent(t, {})).toEqual({ mode: 'inline-toggle' });
		}
	});

	it('number family (incl. rating) edits inline (simple text-representable)', () => {
		for (const t of ['number', 'integer', 'smallint', 'decimal', 'currency', 'percentage', 'rating'] as CellType[]) {
			expect(resolveEditIntent(t, {})).toEqual({ mode: 'inline-edit' });
		}
	});

	it('date/time family routes to DateEditorDom', () => {
		for (const t of ['date', 'datetime', 'time', 'timestamptz'] as CellType[]) {
			expect(resolveEditIntent(t, {})).toEqual({ mode: 'overlay', editor: DOM_EDITOR_REGISTRY.date });
		}
	});

	it('interval routes to IntervalEditorDom', () => {
		expect(resolveEditIntent('interval', {})).toEqual({ mode: 'overlay', editor: DOM_EDITOR_REGISTRY.interval });
	});

	it('json/jsonb route to JsonEditorDom', () => {
		for (const t of ['json', 'jsonb'] as CellType[]) {
			expect(resolveEditIntent(t, {})).toEqual({ mode: 'overlay', editor: DOM_EDITOR_REGISTRY.json });
		}
	});

	it('array family (incl. tags) routes to ArrayEditorDom', () => {
		for (const t of ['array', 'text-array', 'uuid-array', 'number-array', 'integer-array', 'date-array', 'tags'] as CellType[]) {
			expect(resolveEditIntent(t, {})).toEqual({ mode: 'overlay', editor: DOM_EDITOR_REGISTRY[t] });
			expect((resolveEditIntent(t, {}) as ExpectedOverlay).editor).toBe(DOM_EDITOR_REGISTRY.array);
		}
	});

	it('geometry family routes to GeometryEditorDom', () => {
		for (const t of ['geometry', 'geometry-point', 'geometry-collection'] as CellType[]) {
			expect(resolveEditIntent(t, {})).toEqual({ mode: 'overlay', editor: DOM_EDITOR_REGISTRY.geometry });
		}
	});

	it('media family (image/file/video/audio/upload) reuses the image editor', () => {
		for (const t of ['image', 'file', 'video', 'audio', 'upload'] as CellType[]) {
			expect(resolveEditIntent(t, {})).toEqual({ mode: 'overlay', editor: DOM_EDITOR_REGISTRY.image });
		}
	});

	it('inet routes to InetEditorDom', () => {
		expect(resolveEditIntent('inet', {})).toEqual({ mode: 'overlay', editor: DOM_EDITOR_REGISTRY.inet });
	});

	it('relation routes to RelationEditorDom', () => {
		expect(resolveEditIntent('relation', {})).toEqual({ mode: 'overlay', editor: DOM_EDITOR_REGISTRY.relation });
	});

	it('url routes to UrlEditorDom (was the text overlay before the fix)', () => {
		expect(resolveEditIntent('url', {})).toEqual({ mode: 'overlay', editor: DOM_EDITOR_REGISTRY.url });
	});

	it('tsvector is viewer-only but still opens an overlay (not none)', () => {
		expect(resolveEditIntent('tsvector', {})).toEqual({ mode: 'overlay', editor: DOM_EDITOR_REGISTRY.tsvector });
	});

	it('text-like family edits inline (the simple text floor)', () => {
		for (const t of ['text', 'textarea', 'email', 'phone', 'citext', 'bpchar', 'uuid', 'color', 'origin', 'unknown'] as CellType[]) {
			expect(resolveEditIntent(t, {})).toEqual({ mode: 'inline-edit' });
		}
	});

	it('url is the explicit text exception — it keeps its overlay editor, NOT inline', () => {
		expect(resolveEditIntent('url', {})).toEqual({ mode: 'overlay', editor: DOM_EDITOR_REGISTRY.url });
	});

	it('color is NOT a dedicated editor — it edits inline, and no color key leaks into the registry', () => {
		expect(resolveEditIntent('color', {})).toEqual({ mode: 'inline-edit' });
		expect(DOM_EDITOR_REGISTRY.color).toBeUndefined();
	});
});

describe('resolveEditIntent — readonly & override precedence', () => {
	it('readonly wins for EVERY CellType, regardless of bucket', () => {
		for (const type of ALL_CELL_TYPES) {
			expect(resolveEditIntent(type, { readonly: true }), `${type} readonly -> none`).toEqual({ mode: 'none' });
		}
	});

	it('a consumer override flips an inline text type to its overlay editor', () => {
		const Custom = (() => null) as unknown as NativeEditor;
		const intent: EditIntent = resolveEditIntent('text', {}, (k) => (k === 'text' ? Custom : undefined));
		expect(intent).toEqual({ mode: 'overlay', editor: Custom });
	});

	it('a consumer override flips an inline number type to its overlay editor', () => {
		const Custom = (() => null) as unknown as NativeEditor;
		expect(resolveEditIntent('integer', {}, () => Custom)).toEqual({ mode: 'overlay', editor: Custom });
	});

	it('without an override, an inline type stays inline (override is opt-in)', () => {
		expect(resolveEditIntent('text', {}, () => undefined)).toEqual({ mode: 'inline-edit' });
	});

	it('a consumer override does NOT flip an inline-toggle', () => {
		const Custom = (() => null) as unknown as NativeEditor;
		expect(resolveEditIntent('boolean', {}, () => Custom)).toEqual({ mode: 'inline-toggle' });
	});

	it('a consumer override does NOT flip a readonly none', () => {
		const Custom = (() => null) as unknown as NativeEditor;
		expect(resolveEditIntent('text', { readonly: true }, () => Custom)).toEqual({ mode: 'none' });
	});
});

// Native cell model — the DOM render payload that replaces glide `GridCell`.
//
// Pure types: no @tanstack/* or virtual import. `SheetsCellKind` is the neutral
// 11-member render vocabulary, frozen by the Phase-0 parity harness
// (`grid/__golden__/parity.harness.ts` DisplayKind). The type-level guard in
// `__tests__/kind-parity.test-d.ts` asserts member-for-member equality without
// importing the harness into production code (it pulls vitest).

import type { CellType } from '../cell-types/types';

/**
 * Neutral RENDER kinds — equal to the frozen `DisplayKind` union. `loading` and
 * `draft-action` originate from grid-internal state, not the `CellType` system.
 */
export type SheetsCellKind =
	| 'text'
	| 'number'
	| 'boolean'
	| 'badges'
	| 'uri'
	| 'image'
	| 'geometry'
	| 'relation'
	| 'loading'
	| 'draft-action'
	| 'custom';

/** Per-cell visual hint, open-ish so later phases can enrich it. */
export interface SheetsCellStyleHint {
	draft?: boolean;
	faded?: boolean;
	/** This draft cell has a field-level validation error (draftMeta.errors[colKey]). */
	error?: boolean;
	[extra: string]: unknown;
}

/**
 * The factory output + render payload. A SINGLE interface with a `kind` field
 * (not a per-kind discriminated union): text/number/boolean share this payload
 * and do not diverge yet.
 *
 * TODO(phases 2+): enrich `meta` per kind (badges/uri/image/geometry/relation)
 * once their factories and views are ported.
 */
export interface SheetsCell {
	kind: SheetsCellKind;
	data: unknown;
	displayData: string;
	readonly: boolean;
	styleHint?: SheetsCellStyleHint;
	meta?: { cellType?: CellType; [extra: string]: unknown };
}

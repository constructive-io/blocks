/**
 * SHARED PARITY CONTRACT — the native (glide-free) projection every golden
 * asserts through. With the glide cutover complete, the committed `*.golden.json`
 * snapshots ARE the frozen v1 truth, and the live native pipeline
 * (`createSheetsCell` -> {@link projectSheetsCell}) is asserted against them.
 *
 * Two concepts live here:
 *
 *   1. A neutral RENDER vocabulary — {@link DisplayKind} — the ~11 native kinds,
 *      plus a total map from every {@link CellType} union member to its
 *      `DisplayKind`.
 *
 *   2. A total, deterministic projection — {@link projectSheetsCell} — that
 *      reduces any native `SheetsCell` the factories emit to a
 *      `{ displayText, copyText }` pair (the frozen golden shape).
 *
 *   3. A golden assert/update helper — {@link assertOrUpdateGolden} — colocated
 *      JSON snapshots with stable key order, switched by `UPDATE_GOLDEN`.
 *
 * Nothing here imports the real `createGeometryCell` (it pulls optional leaflet
 * peers); the geometry custom-cell is projected from its `displayData`.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect } from 'vitest';

import type { CellType } from '../../cell-types/types';
import type { SheetsCell } from '../../cell-model/sheets-cell';

// ─── (a) Neutral render vocabulary ──────────────────────────────────────────

/**
 * The ~11 RENDER-LEVEL native kinds — the canonical neutral vocabulary every
 * phase projects into.
 *
 * `loading` and `draft-action` have no `CellType` source (they originate from
 * grid-internal state, not the data type system) but are part of the native
 * render surface, so they are reserved here for downstream phases.
 */
export type DisplayKind =
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

// ─── (b) CellType -> DisplayKind (compiler-enforced exhaustive) ──────────────

/**
 * Maps EVERY member of the {@link CellType} union to its {@link DisplayKind}.
 *
 * Typed as `Record<CellType, DisplayKind>` so a missing union member is a
 * COMPILE error (the spike's exhaustiveness guard). Each entry is assigned by
 * which `cell-content-factory` family handles that type:
 *
 *   ImageCellFactory   (MEDIA_TYPES)               -> 'image'
 *   UriCellFactory     (url|email)                 -> 'uri'
 *   ArrayCellFactory   (array-like + tsvector)     -> 'badges'
 *   DateTimeCellFactory + IntervalCellFactory      -> 'text'   (formatted text in v1)
 *   GeometryCellFactory(GEOMETRY_TYPES)            -> 'geometry'
 *   RelationCellFactory(relation)                  -> 'relation'
 *   NumberCellFactory  (NUMBER_TYPES)              -> 'number'
 *   BooleanCellFactory (BOOLEAN_TYPES)             -> 'boolean'
 *   TextCellFactory    (everything else, fallback) -> 'text'
 *
 * NOTE on the two v1 quirks captured here (see `deviations`):
 *   - `rating` is in NUMBER_TYPES (cell-type-groups.ts), so the NumberCellFactory
 *     claims it before the text fallback -> 'number' (NOT 'text'), even though the
 *     task's text-fallback list names 'rating'. Mapped to 'number' to match the
 *     ACTUAL v1 factory selection.
 *   - `relation` maps to 'relation' for BOTH single and list; the native
 *     RelationCellView owns both, even though v1 glide emits Text (single) and
 *     Bubble (list). The neutral kind intentionally collapses that glide split.
 */
export const CELL_TYPE_TO_DISPLAY_KIND: Record<CellType, DisplayKind> = {
	// Text-based cells — TextCellFactory fallback display
	text: 'text',
	textarea: 'text',
	email: 'uri',
	url: 'uri',
	phone: 'text',
	citext: 'text',
	bpchar: 'text',
	// Numeric cells — NumberCellFactory
	number: 'number',
	integer: 'number',
	smallint: 'number',
	decimal: 'number',
	currency: 'number',
	percentage: 'number',
	// Date/time cells — DateTime + Interval factories (formatted text in v1)
	date: 'text',
	datetime: 'text',
	time: 'text',
	timestamptz: 'text',
	interval: 'text',
	// Boolean cells — BooleanCellFactory
	boolean: 'boolean',
	toggle: 'boolean',
	bit: 'boolean',
	// Structured data cells
	json: 'text',
	jsonb: 'text',
	array: 'badges',
	// Array cells (specific types) — ArrayCellFactory
	'text-array': 'badges',
	'uuid-array': 'badges',
	'number-array': 'badges',
	'integer-array': 'badges',
	'date-array': 'badges',
	// Geometric cells — GeometryCellFactory
	geometry: 'geometry',
	'geometry-point': 'geometry',
	'geometry-collection': 'geometry',
	// Network cells — text fallback
	inet: 'text',
	// Media cells — ImageCellFactory
	image: 'image',
	file: 'image',
	video: 'image',
	audio: 'image',
	upload: 'image',
	// Special cells
	uuid: 'text',
	color: 'text',
	// `rating` is in NUMBER_TYPES -> NumberCellFactory claims it (v1 actual). quirk.
	rating: 'number',
	tags: 'badges',
	tsvector: 'badges',
	origin: 'text',
	// Relation cells — RelationCellFactory (single AND list -> one neutral kind)
	relation: 'relation',
	// Fallback
	unknown: 'text',
};

/**
 * Runtime mirror of the {@link CellType} union — the authoritative enumeration
 * for the Gate stage and for the harness self-test's totality check. Kept in the
 * SAME order as the union in `cell-types/types.ts`. If a member is added to the
 * union but not here, `CELL_TYPE_TO_DISPLAY_KIND` (typed `Record<CellType, …>`)
 * still fails to compile, so this array can only ever lag in the safe direction.
 */
export const ALL_CELL_TYPES: CellType[] = [
	'text',
	'textarea',
	'email',
	'url',
	'phone',
	'citext',
	'bpchar',
	'number',
	'integer',
	'smallint',
	'decimal',
	'currency',
	'percentage',
	'date',
	'datetime',
	'time',
	'timestamptz',
	'interval',
	'boolean',
	'toggle',
	'bit',
	'json',
	'jsonb',
	'array',
	'text-array',
	'uuid-array',
	'number-array',
	'integer-array',
	'date-array',
	'geometry',
	'geometry-point',
	'geometry-collection',
	'inet',
	'image',
	'file',
	'video',
	'audio',
	'upload',
	'uuid',
	'color',
	'rating',
	'tags',
	'tsvector',
	'origin',
	'relation',
	'unknown',
];

// ─── (c) Native neutral projection ──────────────────────────────────────────

/**
 * Stringify one cell field deterministically:
 *   - null / undefined         -> ''
 *   - Array (image/badges data) -> JSON.stringify(array)
 *   - string                   -> as-is
 *   - anything else            -> String(value)
 */
function stringifyField(value: unknown): string {
	if (value === null || value === undefined) return '';
	if (Array.isArray(value)) return JSON.stringify(value);
	if (typeof value === 'string') return value;
	return String(value);
}

/**
 * Reduce a native {@link SheetsCell} to the neutral `{ displayText, copyText }`
 * pair the committed goldens freeze. TOTAL + DETERMINISTIC over every kind the
 * factories emit.
 *
 *   - geometry / custom — the SheetsCell carries the rendered text in
 *     `displayData`, and (mirroring v1's Custom cell where copyData === displayText)
 *     both display and copy come from `cell.displayData`, used verbatim.
 *   - everything else — display from `displayData`, copy from `data`, both run
 *     through the same `stringifyField` (arrays -> JSON; null/undefined -> '').
 *     badges/boolean carry no display text, so they project to '' on the display
 *     side — that is the frozen v1 truth.
 */
export function projectSheetsCell(cell: SheetsCell): { displayText: string; copyText: string } {
	if (cell.kind === 'geometry' || cell.kind === 'custom') {
		return { displayText: cell.displayData, copyText: cell.displayData };
	}
	return {
		displayText: stringifyField(cell.displayData),
		copyText: stringifyField(cell.data),
	};
}

// ─── (d) + (e) Golden assert / update + load / write helpers ────────────────

const GOLDEN_DIR = dirname(fileURLToPath(import.meta.url));

function goldenPath(name: string): string {
	return join(GOLDEN_DIR, `${name}.json`);
}

/**
 * Recursively sort object keys so written goldens have a STABLE byte layout
 * regardless of insertion order. Arrays keep their order (order is meaningful);
 * primitives pass through.
 */
function sortKeysDeep(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(sortKeysDeep);
	if (value && typeof value === 'object') {
		const out: Record<string, unknown> = {};
		for (const key of Object.keys(value as Record<string, unknown>).sort()) {
			out[key] = sortKeysDeep((value as Record<string, unknown>)[key]);
		}
		return out;
	}
	return value;
}

/** Read + parse the golden JSON for `name`. Throws if it is missing. */
export function loadGolden(name: string): unknown {
	const path = goldenPath(name);
	if (!existsSync(path)) {
		throw new Error(
			`Golden "${name}" not found at ${path}. Generate it with UPDATE_GOLDEN=1 pnpm exec vitest run <relpath>.`,
		);
	}
	return JSON.parse(readFileSync(path, 'utf8'));
}

/** Write `data` as a stable-key-order golden JSON (pretty, trailing newline). */
export function writeGolden(name: string, data: unknown): void {
	if (!existsSync(GOLDEN_DIR)) mkdirSync(GOLDEN_DIR, { recursive: true });
	const stable = sortKeysDeep(data);
	writeFileSync(goldenPath(name), `${JSON.stringify(stable, null, 2)}\n`, 'utf8');
}

/**
 * Golden gate. With `UPDATE_GOLDEN` set, (re)writes `<name>.json` and returns.
 * Otherwise reads the committed golden and asserts deep equality against
 * `actual`. `actual` is normalized through the same stable-key-order pass so
 * the comparison is order-insensitive on object keys — matching what was
 * written — while staying a strict `toEqual`.
 */
export function assertOrUpdateGolden(name: string, actual: unknown): void {
	if (process.env.UPDATE_GOLDEN) {
		writeGolden(name, actual);
		return;
	}
	const expected = loadGolden(name);
	expect(sortKeysDeep(actual)).toEqual(expected);
}

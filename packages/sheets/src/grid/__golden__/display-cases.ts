/**
 * SHARED display fixtures — the native (glide-free) case tables + helpers that
 * drive the cell-display golden. The committed `cell-display.golden.json` freezes
 * the expected `{ displayText, copyText }` per case; the cell-display parity test
 * iterates these and asserts the native pipeline reproduces the frozen values.
 */

import type { CellType } from '../../cell-types/types';
import type { SheetsCell } from '../../cell-model/sheets-cell';
import type { CellCreationMetadata } from '../grid-cell-types';
import type { RelationInfo } from '../../store/relation-info-slice';

// Deterministic geometry SheetsCell — the native render payload a geometry factory
// emits. We do NOT import the real createGeometryCell (it pulls optional leaflet
// peers); a stable `geo:<json>` displayText keeps the golden reproducible while
// exercising projectSheetsCell's geometry branch (display === copy) faithfully.
export function fakeGeometrySheetsCell(value: unknown): SheetsCell {
	return {
		kind: 'geometry',
		data: value,
		displayData: `geo:${JSON.stringify(value ?? null)}`,
		readonly: false,
	};
}

// Build metadata the way use-grid-content does: cellType === resolved typeKey,
// fieldName === column, sensible edit flags. Only cellType drives factory
// selection; relation cases override relationInfo/relationOptions.
export function makeMetadata(cellType: string, overrides?: Partial<CellCreationMetadata>): CellCreationMetadata {
	return {
		cellType,
		fieldName: overrides?.fieldName ?? cellType,
		canEdit: true,
		isReadonly: false,
		activationBehavior: 'double-click',
		...overrides,
	};
}

export const RELATION_INFO_BELONGS_TO: RelationInfo = {
	kind: 'belongsTo',
	relatedTable: 'users',
	relationField: 'author',
	foreignKeyField: 'authorId',
	displayCandidates: ['displayName', 'name'],
};

export interface DisplayCase {
	label: string;
	typeKey: CellType;
	value: unknown;
	metaOverrides?: Partial<CellCreationMetadata>;
}

// One representative NON-null value per CellType union member, in union order.
// Non-null so each factory's MAIN branch runs (null/empty branches are pinned by
// the dedicated EDGE_CASES below and by registry-fidelity.test.ts).
export const PER_TYPE_CASES: DisplayCase[] = [
	// ── Text-based — TextCellFactory fallback (email/url -> UriCellFactory) ──
	{ label: 'text — string', typeKey: 'text', value: 'hello world' },
	{ label: 'textarea — multiline string', typeKey: 'textarea', value: 'line one\nline two' },
	{ label: 'email — address (mailto data)', typeKey: 'email', value: 'ada@example.com' },
	{ label: 'url — http link', typeKey: 'url', value: 'https://example.com/path' },
	{ label: 'phone — digits string', typeKey: 'phone', value: '+1 555 0100' },
	{ label: 'citext — case-insensitive text', typeKey: 'citext', value: 'MixedCase' },
	{ label: 'bpchar — padded char', typeKey: 'bpchar', value: 'AB ' },
	// ── Numeric — NumberCellFactory ──
	{ label: 'number — float', typeKey: 'number', value: 42.5 },
	{ label: 'integer — int', typeKey: 'integer', value: 17 },
	{ label: 'smallint — small int', typeKey: 'smallint', value: 7 },
	{ label: 'decimal — string coerced', typeKey: 'decimal', value: '123.45' },
	{ label: 'currency — number', typeKey: 'currency', value: 1999.99 },
	{ label: 'percentage — number', typeKey: 'percentage', value: 0.42 },
	// ── Date/time — DateTime + Interval factories (formatted text) ──
	{ label: 'date — iso date', typeKey: 'date', value: '2026-06-11' },
	{ label: 'datetime — iso datetime', typeKey: 'datetime', value: '2026-06-11T10:00:00' },
	{ label: 'time — clock', typeKey: 'time', value: '10:00:00' },
	{ label: 'timestamptz — iso tz', typeKey: 'timestamptz', value: '2026-06-11T10:00:00Z' },
	{ label: 'interval — object formatted', typeKey: 'interval', value: { years: 1, months: 6 } },
	// ── Boolean — BooleanCellFactory (no displayData -> displayText '') ──
	{ label: 'boolean — true', typeKey: 'boolean', value: true },
	{ label: 'toggle — truthy coercion', typeKey: 'toggle', value: 1 },
	{ label: 'bit — string coercion (truthy)', typeKey: 'bit', value: '1' },
	// ── Structured — json/jsonb -> Text fallback, array -> Bubble ──
	{ label: 'json — object preview', typeKey: 'json', value: { a: 1, b: 'two' } },
	{ label: 'jsonb — nested object preview', typeKey: 'jsonb', value: { nested: { x: [1, 2] } } },
	{ label: 'array — generic list', typeKey: 'array', value: ['a', 'b', 'c'] },
	// ── Typed arrays — ArrayCellFactory (Bubble) ──
	{ label: 'text-array — strings', typeKey: 'text-array', value: ['x', 'y'] },
	{ label: 'uuid-array — uuids', typeKey: 'uuid-array', value: ['11111111-1111', '22222222-2222'] },
	{ label: 'number-array — numbers', typeKey: 'number-array', value: [1, 2, 3] },
	{ label: 'integer-array — ints', typeKey: 'integer-array', value: [10, 20] },
	{ label: 'date-array — date strings', typeKey: 'date-array', value: ['2026-01-01', '2026-02-02'] },
	// ── Geometry — GeometryCellFactory forwards to fakeGeometrySheetsCell ──
	{ label: 'geometry — point geojson', typeKey: 'geometry', value: { type: 'Point', coordinates: [1, 2] } },
	{ label: 'geometry-point — bare xy', typeKey: 'geometry-point', value: { x: 1, y: 2 } },
	{
		label: 'geometry-collection — collection',
		typeKey: 'geometry-collection',
		value: { type: 'GeometryCollection', geometries: [] },
	},
	// ── Network — Text fallback ──
	{ label: 'inet — ip address', typeKey: 'inet', value: '192.168.0.1' },
	// ── Media — ImageCellFactory (data/displayData are [url]) ──
	{ label: 'image — url string', typeKey: 'image', value: 'https://example.com/a.png' },
	{ label: 'file — object with url', typeKey: 'file', value: { url: 'https://example.com/doc.pdf' } },
	{ label: 'video — url string', typeKey: 'video', value: 'https://example.com/v.mp4' },
	{ label: 'audio — url string', typeKey: 'audio', value: 'https://example.com/a.mp3' },
	{ label: 'upload — object with path', typeKey: 'upload', value: { path: '/uploads/file.bin' } },
	// ── Special — Text fallback except rating (NumberCellFactory) + tags/tsvector (Bubble) ──
	{ label: 'uuid — string', typeKey: 'uuid', value: '550e8400-e29b-41d4-a716-446655440000' },
	{ label: 'color — hex string', typeKey: 'color', value: '#3b82f6' },
	{ label: 'rating — number (NUMBER_TYPES quirk)', typeKey: 'rating', value: 4 },
	{ label: 'tags — comma string split', typeKey: 'tags', value: 'red, green, blue' },
	{
		label: 'tsvector — lexeme preview',
		typeKey: 'tsvector',
		value: "'cat':1A 'sat':2B,3 'mat':4",
	},
	{ label: 'origin — string fallback', typeKey: 'origin', value: 'system' },
	// ── Relation — RelationCellFactory (single belongsTo) ──
	{
		label: 'relation — belongsTo object (displayName)',
		typeKey: 'relation',
		value: { id: 'u1', displayName: 'Ada Lovelace' },
		metaOverrides: { relationInfo: RELATION_INFO_BELONGS_TO, relationOptions: {} },
	},
	// ── Fallback ──
	{ label: 'unknown — string fallback', typeKey: 'unknown', value: 'mystery' },
];

// Edge cases that enrich coverage without duplicating union members. These pin
// projection-visible quirks (Bubble/Boolean carry no displayData; tags array vs
// string; image object key precedence; NaN/object number fallbacks).
export const EDGE_CASES: DisplayCase[] = [
	{ label: 'number — NaN string -> empty', typeKey: 'number', value: 'not-a-number' },
	{ label: 'text — object -> JSON preview', typeKey: 'text', value: { a: 1, b: 2 } },
	{ label: 'tags — array form', typeKey: 'tags', value: ['alpha', 'beta'] },
	{ label: 'array — object items JSON-stringified', typeKey: 'array', value: [{ k: 1 }, { k: 2 }] },
	{ label: 'image — object src key precedence', typeKey: 'image', value: { src: 'https://example.com/s.png' } },
	{ label: 'interval — string passthrough', typeKey: 'interval', value: '1 day' },
	{ label: 'interval — zero object -> 0s', typeKey: 'interval', value: { years: 0, months: 0 } },
];

export const ALL_CASES: DisplayCase[] = [...PER_TYPE_CASES, ...EDGE_CASES];

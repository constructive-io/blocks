/**
 * Canonical cell-type group constants.
 *
 * Every file that needs to check "is this cell type a date?" or "is this a
 * geometry?" should import from here instead of maintaining inline arrays.
 *
 * All Sets are typed as `Set<string>` so `.has(cellType)` works without casts.
 */

// ─── Date / Time ────────────────────────────────────────────────────────────
export const DATE_TIME_TYPES: Set<string> = new Set(['date', 'datetime', 'timestamptz', 'time']);

// ─── Geometry ───────────────────────────────────────────────────────────────
export const GEOMETRY_TYPES: Set<string> = new Set(['geometry', 'geometry-point', 'geometry-collection']);

// ─── Numeric ────────────────────────────────────────────────────────────────
export const NUMBER_TYPES: Set<string> = new Set([
	'number',
	'integer',
	'decimal',
	'currency',
	'smallint',
	'percentage',
	'rating',
]);

// ─── Boolean ────────────────────────────────────────────────────────────────
export const BOOLEAN_TYPES: Set<string> = new Set(['boolean', 'bit', 'toggle']);

// ─── Array / Collection ─────────────────────────────────────────────────────
export const TYPED_ARRAY_TYPES: Set<string> = new Set([
	'array',
	'text-array',
	'uuid-array',
	'number-array',
	'integer-array',
	'date-array',
	'tags',
]);

/** Check for any array-like cell type (typed arrays + generic `-array` suffix) */
export function isArrayCellType(cellType: string): boolean {
	return TYPED_ARRAY_TYPES.has(cellType) || cellType.endsWith('-array');
}

// ─── Structured data (JSON, arrays, interval) ──────────────────────────────
export const STRUCTURED_DATA_TYPES: Set<string> = new Set([
	'json',
	'jsonb',
	'array',
	'text-array',
	'uuid-array',
	'number-array',
	'integer-array',
	'date-array',
	'interval',
]);

// ─── Media ──────────────────────────────────────────────────────────────────
export const MEDIA_TYPES: Set<string> = new Set(['image', 'file', 'video', 'audio', 'upload']);

// ─── Enhanced scalar types ──────────────────────────────────────────────────
export const ENHANCED_TYPES: Set<string> = new Set([
	'email',
	'url',
	'phone',
	'currency',
	'percentage',
	'color',
	'rating',
	'tags',
]);

// ─── Editor behaviour ───────────────────────────────────────────────────────

/** Cell types that use Glide's built-in text editor (no custom overlay). */
export const BUILTIN_EDITOR_TYPES: Set<string> = new Set(['text', 'varchar']);

/** Cell types that are never editable (always read-only). */
export const NON_EDITABLE_TYPES: Set<string> = new Set(['tsvector']);

/** Cell types that can be activated for viewing but not editing. */
export const VIEWER_ONLY_TYPES: Set<string> = new Set(['tsvector']);

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
	'bigint',
	'decimal',
	'currency',
	'smallint',
	'percentage',
	'rating',
]);

// ─── Boolean ────────────────────────────────────────────────────────────────
// A bit string (`bit`, `bitstring`) is text of 0 and 1, never a checkbox.
export const BOOLEAN_TYPES: Set<string> = new Set(['boolean', 'toggle']);

// ─── Exact decimal strings ──────────────────────────────────────────────────
/** Numbers carried as exact decimal strings end to end; never parsed into a JS number. */
export const DECIMAL_STRING_TYPES: Set<string> = new Set(['bigint', 'decimal']);

// ─── Tabular figures ────────────────────────────────────────────────────────
/**
 * Text cell types whose values are mostly digits read down a column (dates, times,
 * durations, ranges, points, vectors, bit strings): they use tabular figures so the
 * digits line up. Number cells always do.
 */
export const TABULAR_TEXT_TYPES: Set<string> = new Set([
	'date',
	'datetime',
	'timestamptz',
	'time',
	'interval',
	'range',
	'point',
	'vector',
	'bitstring',
	'binary',
]);

// ─── Choices ────────────────────────────────────────────────────────────────
/** A fixed list of values: an enum, or text with an allowed-values list. */
export const CHOICE_TYPES: Set<string> = new Set(['select', 'multi-select']);

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
	'range',
	'composite',
	'point',
]);

// ─── Media ──────────────────────────────────────────────────────────────────
export const MEDIA_TYPES: Set<string> = new Set(['image', 'file', 'video', 'audio', 'upload', 'attachment']);

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
export const NON_EDITABLE_TYPES: Set<string> = new Set(['tsvector', 'binary', 'vector', 'unknown']);

/** Cell types that open a read-only viewer (show and copy the value) instead of an editor. */
export const VIEWER_ONLY_TYPES: Set<string> = new Set(['tsvector', 'binary', 'vector', 'unknown']);

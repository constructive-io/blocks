// Vendored from @constructive-io/data — trimmed to the surface the schema-builder blocks use. Do not edit to track upstream.

/**
 * Converts null, undefined, and empty strings to undefined.
 * Unlike `value || undefined`, this preserves `false`, `0`, and `[]`.
 */
export function stripEmpty<T>(value: T | null | undefined): NonNullable<T> | undefined {
	if (value === null || value === undefined || value === '') return undefined;
	return value as NonNullable<T>;
}

/**
 * Casts a string array for array columns (e.g. `fieldIds`, `refFieldIds`).
 * Codegen types create inputs as `string[]` but patch inputs as `string` — runtime accepts both.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const asFieldIds = (ids: string[]): any => ids;

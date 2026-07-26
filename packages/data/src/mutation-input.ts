/**
 * Centralized mutation input filtering utilities.
 *
 * Provides consistent nullish value handling when passing data from React
 * components to GraphQL mutations. Supports recursive nested object filtering
 * and form dirty field tracking.
 *
 * @see apps/admin/docs/MUTATION_INPUT_FILTERING_SPEC.md
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Makes specific keys of T optional while keeping the rest required.
 * Useful when a generated type marks a field as required (e.g. `inheritsId: string`)
 * but the GraphQL schema treats it as optional (server creates it).
 *
 * @example
 * type Input = { name: string; inheritsId: string; databaseId: string };
 * type SafeInput = PartialBy<Input, 'inheritsId' | 'databaseId'>;
 * // => { name: string; inheritsId?: string; databaseId?: string }
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Converts null, undefined, and empty strings to undefined.
 * Unlike `value || undefined`, this preserves `false`, `0`, and `[]`.
 *
 * Use in SDK hook call sites where `|| undefined` would incorrectly strip falsy values.
 *
 * @example
 * stripEmpty('')        // undefined
 * stripEmpty(null)      // undefined
 * stripEmpty(undefined) // undefined
 * stripEmpty(false)     // false  ← || undefined would break this
 * stripEmpty(0)         // 0
 * stripEmpty('hello')   // 'hello'
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

export interface PrepareInputOptions {
	/** Operation type affects null/empty string handling */
	operation: 'create' | 'update' | 'patch';

	/**
	 * Fields that user explicitly modified (from form dirty tracking).
	 * Supports dot notation for nested fields: "settings.theme", "address.city"
	 * If not provided, all fields are considered dirty (backward compat for non-form usage).
	 */
	dirtyFields?: Set<string>;

	/** Default values to compare against (for detecting changes) */
	defaultValues?: Record<string, unknown>;

	/** Fields that should always be included even if nullish */
	alwaysInclude?: string[];

	/** Fields that should never be sent (e.g., computed, read-only) */
	exclude?: string[];

	/**
	 * Current path prefix for recursive calls (internal use).
	 * Users don't need to set this - it's used during recursion.
	 * @internal
	 */
	_pathPrefix?: string;
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Check if a value is a plain object (not array, null, Date, etc.)
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
	return (
		typeof value === 'object' &&
		value !== null &&
		!Array.isArray(value) &&
		Object.prototype.toString.call(value) === '[object Object]'
	);
}

/**
 * Check if any field in the dirty set starts with the given prefix.
 * Used to determine if a nested object has any dirty children.
 */
function hasNestedDirtyFields(dirtyFields: Set<string>, prefix: string): boolean {
	for (const field of dirtyFields) {
		if (field === prefix || field.startsWith(`${prefix}.`)) {
			return true;
		}
	}
	return false;
}

/**
 * Check if a field or any of its ancestors is dirty.
 * This handles the case where a parent object is marked dirty,
 * which should make all its children implicitly dirty.
 *
 * Example: If 'settings' is dirty, then 'settings.theme' is implicitly dirty.
 */
function isFieldOrAncestorDirty(dirtyFields: Set<string>, path: string): boolean {
	// Check if this exact path is dirty
	if (dirtyFields.has(path)) return true;

	// Check if any ancestor path is dirty
	const parts = path.split('.');
	for (let i = 1; i < parts.length; i++) {
		const ancestorPath = parts.slice(0, i).join('.');
		if (dirtyFields.has(ancestorPath)) return true;
	}

	return false;
}

/**
 * Get nested value from an object using dot notation path.
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
	const parts = path.split('.');
	let current: unknown = obj;
	for (const part of parts) {
		if (current === null || current === undefined) return undefined;
		if (typeof current !== 'object') return undefined;
		current = (current as Record<string, unknown>)[part];
	}
	return current;
}

// ============================================================================
// Core Function
// ============================================================================

/**
 * Prepares mutation input by filtering nullish values based on operation type
 * and dirty field tracking. Recursively processes nested objects.
 *
 * Filtering rules:
 * - `undefined`: Always omitted
 * - `null`: Omitted unless field is dirty (user explicitly cleared)
 * - `""` (empty string): For CREATE, omitted unless dirty. For UPDATE, kept.
 * - `[]` (empty array): Kept (valid value meaning "none selected")
 * - `{}` (empty object after filtering): Omitted
 * - Nested objects: Recursively filtered
 *
 * @example
 * // Simple CREATE - filters nullish
 * prepareMutationInput({ name: 'test', desc: undefined }, { operation: 'create' })
 * // => { name: 'test' }
 *
 * @example
 * // UPDATE with dirty tracking - keeps null for clearing
 * prepareMutationInput(
 *   { name: 'test', desc: null },
 *   { operation: 'update', dirtyFields: new Set(['name', 'desc']) }
 * )
 * // => { name: 'test', desc: null }
 *
 * @example
 * // Nested object filtering
 * prepareMutationInput(
 *   { settings: { theme: 'dark', unused: undefined } },
 *   { operation: 'create' }
 * )
 * // => { settings: { theme: 'dark' } }
 */
export function prepareMutationInput<T extends Record<string, unknown>>(
	input: T,
	options: PrepareInputOptions,
): Partial<T> {
	const { operation, dirtyFields, defaultValues, alwaysInclude = [], exclude = [], _pathPrefix = '' } = options;

	const result: Partial<T> = {};
	const alwaysIncludeSet = new Set(alwaysInclude);
	const excludeSet = new Set(exclude);

	for (const [key, value] of Object.entries(input)) {
		const fullPath = _pathPrefix ? `${_pathPrefix}.${key}` : key;

		// Check dirty status - considers both direct and ancestor dirty state
		const isDirty = dirtyFields ? isFieldOrAncestorDirty(dirtyFields, fullPath) : true;
		const hasDirtyTracking = !!dirtyFields;

		// Skip excluded fields
		if (excludeSet.has(key) || excludeSet.has(fullPath)) continue;

		// Always include specified fields (skip all other checks)
		if (alwaysIncludeSet.has(key) || alwaysIncludeSet.has(fullPath)) {
			result[key as keyof T] = value as T[keyof T];
			continue;
		}

		// Handle undefined - always skip
		if (value === undefined) continue;

		// Handle null
		if (value === null) {
			if (operation === 'create') {
				// For CREATE: only keep null if dirty tracking is enabled AND field is dirty
				// Without dirty tracking, null = "not set", not "intentionally cleared"
				if (hasDirtyTracking && isDirty) {
					result[key as keyof T] = null as T[keyof T];
				}
			} else {
				// For UPDATE/PATCH: keep null if dirty (allows clearing fields)
				// Without dirty tracking, assume intentional (keep null)
				if (isDirty) {
					result[key as keyof T] = null as T[keyof T];
				}
			}
			continue;
		}

		// Handle empty string
		if (value === '') {
			if (operation === 'create') {
				// For CREATE: only keep empty string if dirty tracking enabled AND field is dirty
				// Without dirty tracking, empty string = "untouched form field"
				if (hasDirtyTracking && isDirty) {
					result[key as keyof T] = '' as T[keyof T];
				}
			} else {
				// For UPDATE/PATCH: keep empty strings (could be intentional)
				if (isDirty) {
					result[key as keyof T] = '' as T[keyof T];
				}
			}
			continue;
		}

		// Handle arrays - keep as-is (empty arrays are valid values)
		if (Array.isArray(value)) {
			// If dirty tracking enabled and this field not dirty, skip
			if (hasDirtyTracking && !isDirty && !hasNestedDirtyFields(dirtyFields, fullPath)) {
				continue;
			}
			result[key as keyof T] = value as T[keyof T];
			continue;
		}

		// Handle nested objects - RECURSE
		if (isPlainObject(value)) {
			// Check if this nested object or any of its children are dirty
			const hasRelevantDirtyFields = !hasDirtyTracking || isDirty || hasNestedDirtyFields(dirtyFields, fullPath);

			if (!hasRelevantDirtyFields) {
				continue; // Skip entire nested object if nothing dirty inside
			}

			const nestedResult = prepareMutationInput(value, {
				...options,
				_pathPrefix: fullPath,
			});

			// Only include nested object if it has remaining keys after filtering
			if (Object.keys(nestedResult).length > 0) {
				result[key as keyof T] = nestedResult as T[keyof T];
			}
			continue;
		}

		// Handle primitive values
		if (hasDirtyTracking && !isDirty) {
			continue; // Skip non-dirty primitives when tracking enabled
		}

		// Check against default value
		if (defaultValues) {
			const defaultValue = getNestedValue(defaultValues, fullPath);
			if (value === defaultValue && !isDirty) {
				continue; // Skip unchanged values
			}
		}

		// Include the value
		result[key as keyof T] = value as T[keyof T];
	}

	return result;
}

// ============================================================================
// Convenience Wrappers
// ============================================================================

/**
 * Prepare input for CREATE operations.
 *
 * Applies aggressive filtering:
 * - Omits `undefined`
 * - Omits `null` unless field is dirty
 * - Omits empty strings `""` unless field is dirty
 * - Keeps empty arrays `[]` (valid value)
 * - Recursively filters nested objects
 *
 * @example
 * prepareCreateInput({ name: 'test', desc: undefined, tags: [] })
 * // => { name: 'test', tags: [] }
 */
export function prepareCreateInput<T extends Record<string, unknown>>(
	input: T,
	options?: Omit<PrepareInputOptions, 'operation'>,
): Partial<T> {
	return prepareMutationInput(input, { ...options, operation: 'create' });
}

/**
 * Prepare input for UPDATE operations.
 *
 * Preserves null values for field clearing:
 * - Omits `undefined`
 * - Keeps `null` when field is dirty (for clearing)
 * - Keeps empty strings `""`
 * - Keeps empty arrays `[]`
 * - Recursively filters nested objects
 *
 * @example
 * prepareUpdateInput(
 *   { name: 'test', desc: null },
 *   { dirtyFields: new Set(['name', 'desc']) }
 * )
 * // => { name: 'test', desc: null }
 */
export function prepareUpdateInput<T extends Record<string, unknown>>(
	input: T,
	options?: Omit<PrepareInputOptions, 'operation'>,
): Partial<T> {
	return prepareMutationInput(input, { ...options, operation: 'update' });
}

/**
 * Prepare input for PATCH operations.
 *
 * Requires dirty fields - only sends fields that changed.
 * Same filtering rules as UPDATE.
 *
 * @example
 * preparePatchInput(
 *   { name: 'test', desc: 'old', status: 'active' },
 *   new Set(['name'])
 * )
 * // => { name: 'test' }
 */
export function preparePatchInput<T extends Record<string, unknown>>(
	input: T,
	dirtyFields: Set<string>,
	options?: Omit<PrepareInputOptions, 'operation' | 'dirtyFields'>,
): Partial<T> {
	return prepareMutationInput(input, { ...options, operation: 'patch', dirtyFields });
}

/**
 * Field type / default-value mappers.
 *
 * Backend breaking change: metaschema `field.type` and `field.default_value`
 * are now JSONB **objects** (validated by ast_validate.validate_field_type /
 * validate_field_default + the `_00001_ensure_no_sql_injection` trigger which
 * requires `jsonb_typeof = 'object'`). Sending bare strings raises
 * `BAD_FIELD_INPUT`. These helpers convert the dashboard's internal
 * type-name / default-expression strings into the structured objects the
 * backend expects, and back again on read.
 *
 * The canonical FieldType / FieldDefault types live in `node-type-registry`,
 * but are not exported by the version pinned here (^0.33.1). We mirror the
 * verified ground-truth shapes locally to stay self-contained; keep these in
 * sync with node-type-registry/src/types.ts.
 */

/** Mirror of node-type-registry FieldType (verified against ast_validate.validate_field_type). */
export interface FieldType {
	name: string;
	schema?: string;
	args?: (string | number | boolean)[];
	/** 0..6 */
	array_dimensions?: number;
	range?: string[];
}

/**
 * Mirror of node-type-registry FieldDefault — discriminated union with EXACTLY
 * one discriminant key (verified against ast_validate.validate_field_default).
 */
export type FieldDefault =
	| { value: string | number | boolean | null | unknown[] | Record<string, unknown>; cast?: FieldType }
	| { function: string; schema?: string; args?: (FieldDefault | string | number | boolean | null)[]; cast?: FieldType }
	| { operator: '+' | '-'; left: FieldDefault; right: FieldDefault }
	| { sql_keyword: string };

// SQL keyword allowlist — mirrors v_allowed_sql_keywords in validate_field_default.sql.
const SQL_KEYWORDS = new Set([
	'CURRENT_TIMESTAMP',
	'CURRENT_DATE',
	'CURRENT_TIME',
	'LOCALTIME',
	'LOCALTIMESTAMP',
	'CURRENT_ROLE',
	'CURRENT_USER',
	'SESSION_USER',
	'USER',
	'CURRENT_CATALOG',
	'CURRENT_SCHEMA',
]);

/**
 * Convert a backend type-name string into a structured FieldType object.
 *
 * Handles array suffixes (`'text[]'` → `{ name: 'text', array_dimensions: 1 }`)
 * since brackets fail the backend `is_valid_type_name` regex. Trailing `[]`
 * pairs are stripped and counted into `array_dimensions`.
 */
export function toFieldType(typeName: string): FieldType {
	const raw = (typeName ?? '').trim();
	let base = raw;
	let dims = 0;
	while (base.endsWith('[]')) {
		base = base.slice(0, -2);
		dims += 1;
	}
	base = base.trim();
	const result: FieldType = { name: base };
	if (dims > 0) result.array_dimensions = dims;
	return result;
}

/** Best-effort parse of a single function-arg literal into a scalar. */
function parseScalarLiteral(token: string): string | number | boolean | null {
	const t = token.trim();
	if (t === '') return '';
	if (t === 'true') return true;
	if (t === 'false') return false;
	if (t.toLowerCase() === 'null') return null;
	if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
	// Strip surrounding single or double quotes.
	if ((t.startsWith("'") && t.endsWith("'")) || (t.startsWith('"') && t.endsWith('"'))) {
		return t.slice(1, -1);
	}
	return t;
}

/**
 * Convert a backend default-expression string into a structured FieldDefault
 * object (or undefined when empty).
 *
 * Recognizes:
 *  - function calls            `uuidv7()` → `{ function: 'uuidv7' }`
 *  - boolean / numeric literals `true` → `{ value: true }`, `42` → `{ value: 42 }`
 *  - SQL keywords (allowlist)   `CURRENT_TIMESTAMP` → `{ sql_keyword: 'CURRENT_TIMESTAMP' }`
 *  - quoted / plain string      `'draft'` → `{ value: 'draft' }`
 */
export function toFieldDefault(def?: string | null): FieldDefault | undefined {
	if (def === undefined || def === null) return undefined;
	const raw = String(def).trim();
	if (raw === '') return undefined;

	// SQL keyword allowlist (case-insensitive match, canonical upper-case emit).
	if (SQL_KEYWORDS.has(raw.toUpperCase())) {
		return { sql_keyword: raw.toUpperCase() };
	}

	// Function call: name(...optional args...)
	const fnMatch = raw.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([\s\S]*)\)$/);
	if (fnMatch) {
		const fnName = fnMatch[1];
		const argsRaw = fnMatch[2].trim();
		const result: { function: string; args?: (string | number | boolean | null)[] } = { function: fnName };
		if (argsRaw !== '') {
			const args = argsRaw.split(',').map((a) => parseScalarLiteral(a));
			if (args.length > 0) result.args = args;
		}
		return result;
	}

	// Boolean / numeric literals.
	if (raw === 'true') return { value: true };
	if (raw === 'false') return { value: false };
	if (/^-?\d+(\.\d+)?$/.test(raw)) return { value: Number(raw) };

	// Quoted string literal — strip surrounding quotes.
	if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) {
		return { value: raw.slice(1, -1) };
	}

	// Plain string literal.
	return { value: raw };
}

/**
 * Reverse of {@link toFieldType}: extract the type-name string from a structured
 * FieldType object (`{ name, array_dimensions? }` → `'name'` / `'name[]'`).
 *
 * Passes through if already a string; returns '' for null/undefined.
 */
export function fieldTypeToTypeName(t: unknown): string {
	if (t == null) return '';
	if (typeof t === 'string') return t;
	if (typeof t === 'object') {
		const obj = t as { name?: unknown; array_dimensions?: unknown };
		if (typeof obj.name === 'string') {
			const dims = typeof obj.array_dimensions === 'number' && obj.array_dimensions > 0 ? obj.array_dimensions : 0;
			return obj.name + '[]'.repeat(dims);
		}
	}
	return '';
}

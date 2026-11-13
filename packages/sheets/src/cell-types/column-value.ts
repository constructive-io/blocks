// Parse, validate and format one column value, driven by the table model.
//
// Every write the grid makes (an editor commit, a paste, a fill, a clear, an undo,
// a bulk edit, a draft cell) passes through `parseColumnInput`, so the editors and
// the clipboard share one set of rules. A value that does not fit the column is
// rejected with a reason the user can read; it is never written as something else.
//
// Wire facts this module respects:
// - whole numbers beyond 2^53 (`bigint`) and exact decimals (`decimal`) are decimal
//   strings and never pass through `Number()`;
// - enum values are written as their wire value; labels are display text;
// - a text column that cannot be empty writes '' when cleared, any other cleared
//   column writes null (or is refused when it requires a value).

import type { ColumnModel, ColumnOption, ColumnValueKind, InputFieldModel, InputValueModel } from '@constructive-io/data';

export type ColumnInputResult = { ok: true; value: unknown } | { ok: false; reason: string };

export interface ColumnInputOptions {
	/**
	 * The input is text the user typed or pasted, so JSON and lists are read from
	 * the text. False (the default) for a value an editor, a fill or an undo produced.
	 */
	fromText?: boolean;
}

/** Why a value of a view-only kind cannot be written. */
export const VIEW_ONLY_REASON = 'Values of this kind can be viewed and copied, but not changed here.';

const ok = (value: unknown): ColumnInputResult => ({ ok: true, value });
const fail = (reason: string): ColumnInputResult => ({ ok: false, reason });

const VIEW_ONLY_KINDS: ReadonlySet<ColumnValueKind> = new Set(['binary', 'vector', 'fulltext', 'unknown']);
const TEXT_LIKE_KINDS: ReadonlySet<ColumnValueKind> = new Set(['text', 'bitstring', 'network', 'path']);

const INT32_MIN = -2147483648;
const INT32_MAX = 2147483647;
// Built from strings, not bigint literals, so hosts that compile for an older target build this file too.
const INT64_MIN = BigInt('-9223372036854775808');
const INT64_MAX = BigInt('9223372036854775807');

const WHOLE_RE = /^[+-]?\d+$/;
const DECIMAL_RE = /^[+-]?(?:\d+\.?\d*|\.\d+)$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,6})?)?(?:Z|[+-]\d{2}(?::?\d{2})?)?$/;
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}(?::?\d{2})?)?)?$/;
const BITS_RE = /^[01]*$/;
const INTERVAL_FIELDS = ['years', 'months', 'days', 'hours', 'minutes', 'seconds'] as const;
const INTERVAL_TEXT_UNITS: Record<string, (typeof INTERVAL_FIELDS)[number]> = {
	y: 'years',
	mo: 'months',
	d: 'days',
	h: 'hours',
	m: 'minutes',
	s: 'seconds',
};

/** The limits a value is checked against; a column or one input field supplies them. */
interface ValueRules {
	kind: ColumnValueKind;
	options: readonly ColumnOption[] | null;
	maxLength: number | null;
	precision: number | null;
	scale: number | null;
	input: InputValueModel | null;
}

function rulesOf(column: ColumnModel): ValueRules {
	const { value } = column;
	return {
		kind: value.kind,
		options: value.options,
		maxLength: value.maxLength,
		precision: value.precision,
		scale: value.scale,
		input: value.input,
	};
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isBlank(value: unknown): boolean {
	return value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
}

function characterCount(text: string): number {
	return Array.from(text).length;
}

function parseJsonText(text: string): { ok: true; value: unknown } | { ok: false } {
	try {
		return { ok: true, value: JSON.parse(text) };
	} catch {
		return { ok: false };
	}
}

/** Text of a primitive; null for an object (an object is never silently turned into text). */
function primitiveText(value: unknown): string | null {
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value);
	return null;
}

// ─── Choices ────────────────────────────────────────────────────────────────

/** Find the option a value names: its wire value first, then its label, then either ignoring case. */
export function findColumnOption(options: readonly ColumnOption[], input: string): ColumnOption | null {
	const exact = options.find((option) => option.value === input) ?? options.find((option) => option.label === input);
	if (exact) return exact;
	const folded = input.toLowerCase();
	return options.find((option) => option.value.toLowerCase() === folded || option.label.toLowerCase() === folded) ?? null;
}

function parseChoice(rules: ValueRules, input: unknown): ColumnInputResult {
	const text = primitiveText(input)?.trim();
	if (text === undefined) return fail('Choose one of the listed values.');
	const option = findColumnOption(rules.options ?? [], text);
	return option ? ok(option.value) : fail(`"${text}" is not one of the listed values.`);
}

// ─── Numbers ────────────────────────────────────────────────────────────────

function parseInteger(input: unknown): ColumnInputResult {
	const text = primitiveText(input)?.trim();
	if (text === undefined || !WHOLE_RE.test(text)) return fail('Enter a whole number.');
	const value = Number(text);
	if (value < INT32_MIN || value > INT32_MAX) return fail('This number is too large for this field.');
	return ok(value);
}

function parseBigInteger(input: unknown): ColumnInputResult {
	if (typeof input === 'number' && !Number.isSafeInteger(input)) return fail('Enter a whole number.');
	const text = primitiveText(input)?.trim();
	if (text === undefined || !WHOLE_RE.test(text)) return fail('Enter a whole number.');
	const exact = BigInt(text);
	if (exact < INT64_MIN || exact > INT64_MAX) return fail('This number is too large for this field.');
	return ok(text.startsWith('+') ? text.slice(1) : text);
}

/** Digits before and after the decimal point, without sign and leading zeros. */
function decimalDigits(text: string): { whole: number; fraction: number } {
	const unsigned = text.replace(/^[+-]/, '');
	const [wholePart = '', fractionPart = ''] = unsigned.split('.');
	return { whole: wholePart.replace(/^0+/, '').length, fraction: fractionPart.length };
}

function parseDecimal(rules: ValueRules, input: unknown): ColumnInputResult {
	if (typeof input === 'number' && !Number.isFinite(input)) return fail('Enter a number.');
	const text = primitiveText(input)?.trim();
	if (text === undefined) return fail('Enter a number.');
	const special = /^(nan|[+-]?infinity)$/i.exec(text);
	if (special) {
		const lower = text.toLowerCase();
		return ok(lower === 'nan' ? 'NaN' : lower.startsWith('-') ? '-Infinity' : 'Infinity');
	}
	if (!DECIMAL_RE.test(text)) return fail('Enter a number, for example 12.50.');
	if (rules.precision != null) {
		const scale = rules.scale ?? 0;
		const { whole, fraction } = decimalDigits(text);
		if (whole > rules.precision - scale) return fail(`Use at most ${rules.precision - scale} digits before the decimal point.`);
		if (fraction > scale) {
			return fail(scale === 0 ? 'Enter a whole number.' : `Use at most ${scale} digits after the decimal point.`);
		}
	}
	return ok(text.startsWith('+') ? text.slice(1) : text);
}

function parseFloatValue(input: unknown): ColumnInputResult {
	if (typeof input === 'number') return Number.isFinite(input) ? ok(input) : fail('Enter a finite number.');
	const text = primitiveText(input)?.trim();
	if (text === undefined || !DECIMAL_RE.test(text.replace(/e[+-]?\d+$/i, ''))) return fail('Enter a number.');
	const value = Number(text);
	return Number.isFinite(value) ? ok(value) : fail('Enter a finite number.');
}

// ─── Other scalars ──────────────────────────────────────────────────────────

const TRUE_WORDS = new Set(['true', 't', 'yes', 'y', 'on', '1']);
const FALSE_WORDS = new Set(['false', 'f', 'no', 'n', 'off', '0']);

function parseBoolean(input: unknown): ColumnInputResult {
	if (typeof input === 'boolean') return ok(input);
	const text = primitiveText(input)?.trim().toLowerCase();
	if (text !== undefined && TRUE_WORDS.has(text)) return ok(true);
	if (text !== undefined && FALSE_WORDS.has(text)) return ok(false);
	return fail('Enter true or false.');
}

function parseText(rules: ValueRules, input: unknown): ColumnInputResult {
	const text = typeof input === 'string' ? input : primitiveText(input) ?? (isPlainObject(input) || Array.isArray(input) ? JSON.stringify(input) : null);
	if (text === null) return fail('Enter text.');
	if (rules.maxLength != null && characterCount(text) > rules.maxLength) {
		return fail(`Use at most ${rules.maxLength} characters.`);
	}
	return ok(text);
}

function parseBits(rules: ValueRules, input: unknown): ColumnInputResult {
	const text = primitiveText(input)?.trim();
	if (text === undefined || !BITS_RE.test(text)) return fail('Use only the digits 0 and 1.');
	if (rules.maxLength != null && text.length > rules.maxLength) return fail(`Use at most ${rules.maxLength} digits.`);
	return ok(text);
}

function parseUuid(input: unknown): ColumnInputResult {
	const text = primitiveText(input)?.trim();
	return text !== undefined && UUID_RE.test(text)
		? ok(text)
		: fail('Enter an identifier like 123e4567-e89b-12d3-a456-426614174000.');
}

function parseDate(input: unknown): ColumnInputResult {
	const text = primitiveText(input)?.trim();
	const match = text === undefined ? null : DATE_RE.exec(text);
	if (!text || !match) return fail('Enter a date like 2024-01-31.');
	const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
	const probe = new Date(Date.UTC(year, month - 1, day));
	if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
		return fail('Enter a date like 2024-01-31.');
	}
	return ok(text);
}

function parseTime(input: unknown): ColumnInputResult {
	const text = primitiveText(input)?.trim();
	const match = text === undefined ? null : TIME_RE.exec(text);
	if (!text || !match) return fail('Enter a time like 13:45 or 13:45:30.');
	const [hours, minutes, seconds] = [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)];
	if (hours > 23 || minutes > 59 || seconds > 59) return fail('Enter a time like 13:45 or 13:45:30.');
	return ok(text);
}

function parseDatetime(input: unknown): ColumnInputResult {
	const text = primitiveText(input)?.trim();
	if (!text || !DATETIME_RE.test(text) || Number.isNaN(Date.parse(text.replace(' ', 'T')))) {
		return fail('Enter a date and time like 2024-01-31T13:45.');
	}
	return ok(text);
}

function parseNetwork(input: unknown): ColumnInputResult {
	const text = primitiveText(input)?.trim();
	return text ? ok(text) : fail('Enter an address.');
}

// ─── Structured values ──────────────────────────────────────────────────────

/** Read an object from a value, or from its JSON text when the input is text. */
function objectInput(input: unknown, fromText: boolean): Record<string, unknown> | null {
	if (isPlainObject(input)) return input;
	if (typeof input === 'string' && (fromText || input.trim().startsWith('{'))) {
		const parsed = parseJsonText(input.trim());
		return parsed.ok && isPlainObject(parsed.value) ? parsed.value : null;
	}
	return null;
}

/** Rules for a nested input field, from its GraphQL type; null when the type is not one the grid knows. */
function fieldRules(value: InputValueModel): ValueRules | null {
	const kind = kindOfScalar(value);
	if (!kind) return null;
	return {
		kind,
		options: value.enumValues ? value.enumValues.map((entry) => ({ value: entry, label: entry })) : null,
		maxLength: null,
		precision: null,
		scale: null,
		input: value,
	};
}

/** Value kind of a nested input field. Only the standard scalars are known; any other value passes as given. */
function kindOfScalar(value: InputValueModel): ColumnValueKind | null {
	if (value.shape === 'enum') return 'enum';
	if (value.shape === 'object') return 'composite';
	switch (value.typeName) {
		case 'Int':
			return 'integer';
		case 'Float':
			return 'float';
		case 'BigInt':
			return 'bigint';
		case 'BigFloat':
			return 'decimal';
		case 'Boolean':
			return 'boolean';
		case 'String':
			return 'text';
		case 'UUID':
			return 'uuid';
		case 'Date':
			return 'date';
		case 'Datetime':
			return 'datetime';
		case 'Time':
			return 'time';
		case 'JSON':
			return 'json';
		default:
			return null;
	}
}

/** Parse each field of an input object by its own type. Unknown fields are refused. */
function parseFields(
	fields: readonly InputFieldModel[],
	input: Record<string, unknown>,
	fromText: boolean,
): ColumnInputResult {
	const known = new Map(fields.map((field) => [field.name, field] as const));
	const out: Record<string, unknown> = {};
	for (const [name, raw] of Object.entries(input)) {
		if (name === '__typename') continue;
		const field = known.get(name);
		if (!field) return fail(`"${name}" is not part of this value.`);
		if (raw === undefined) continue;
		if (raw === null) {
			if (field.required) return fail(`"${name}" needs a value.`);
			out[name] = null;
			continue;
		}
		const rules = fieldRules(field.value);
		const parsed = rules ? parseRules(rules, raw, fromText) : ok(raw);
		if (parsed.ok === false) return fail(`${name}: ${parsed.reason}`);
		out[name] = parsed.value;
	}
	for (const field of fields) {
		if (field.required && out[field.name] === undefined) return fail(`"${field.name}" needs a value.`);
	}
	return ok(out);
}

function parseComposite(rules: ValueRules, input: unknown, fromText: boolean): ColumnInputResult {
	const object = objectInput(input, fromText);
	if (!object) return fail('Enter the value as a set of named fields.');
	const fields = rules.input?.fields;
	if (!fields) {
		const { __typename: _typename, ...rest } = object;
		return ok(rest);
	}
	return parseFields(fields, object, fromText);
}

/** Read "1y 2mo 3d 4h 5m 6s" (the cell's display form) into interval fields. */
function intervalFromText(text: string): Record<string, number> | null {
	const parts = text.trim().split(/\s+/);
	const out: Record<string, number> = {};
	for (const part of parts) {
		const match = /^(-?\d+(?:\.\d+)?)(mo|y|d|h|m|s)$/.exec(part);
		if (!match) return null;
		out[INTERVAL_TEXT_UNITS[match[2]]] = Number(match[1]);
	}
	return out;
}

function parseInterval(rules: ValueRules, input: unknown, fromText: boolean): ColumnInputResult {
	const object =
		objectInput(input, fromText) ?? (typeof input === 'string' ? intervalFromText(input) : null);
	if (!object) return fail('Enter a duration like 1d 2h 30m.');
	const out: Record<string, number> = {};
	for (const name of INTERVAL_FIELDS) {
		const raw = object[name];
		if (raw === undefined || raw === null) {
			out[name] = 0;
			continue;
		}
		const value = typeof raw === 'number' ? raw : Number(primitiveText(raw)?.trim() ?? NaN);
		if (!Number.isFinite(value)) return fail(`${name}: enter a number.`);
		if (name !== 'seconds' && !Number.isInteger(value)) return fail(`${name}: enter a whole number.`);
		out[name] = value;
	}
	const unknownField = Object.keys(object).find(
		(name) => name !== '__typename' && !(INTERVAL_FIELDS as readonly string[]).includes(name),
	);
	if (unknownField) return fail(`"${unknownField}" is not part of a duration.`);
	const accepted = rules.input?.fields?.map((field) => field.name);
	if (accepted) for (const name of Object.keys(out)) if (!accepted.includes(name)) delete out[name];
	return ok(out);
}

function parsePoint(input: unknown, fromText: boolean): ColumnInputResult {
	let object = objectInput(input, fromText);
	if (!object && typeof input === 'string') {
		const match = /^\(?\s*(-?[\d.]+(?:e[+-]?\d+)?)\s*,\s*(-?[\d.]+(?:e[+-]?\d+)?)\s*\)?$/i.exec(input.trim());
		if (match) object = { x: match[1], y: match[2] };
	}
	if (!object) return fail('Enter a point like 1.5, 2.');
	const x = parseFloatValue(object.x);
	const y = parseFloatValue(object.y);
	if (!x.ok || !y.ok) return fail('Enter a point like 1.5, 2.');
	return ok({ x: x.value, y: y.value });
}

function parseGeometry(input: unknown, fromText: boolean): ColumnInputResult {
	const object = objectInput(input, fromText);
	const shape = object && isPlainObject(object.geojson) ? object.geojson : object;
	if (!shape || typeof shape.type !== 'string') return fail('Enter a GeoJSON shape.');
	return ok(shape);
}

/** Rules of a range bound value, from the range input's `start.value` field. */
function boundRules(rules: ValueRules): ValueRules | null {
	const start = rules.input?.fields?.find((field) => field.name === 'start');
	const value = start?.value.fields?.find((field) => field.name === 'value');
	return value ? fieldRules(value.value) : null;
}

function parseBound(bound: unknown, rules: ValueRules | null, fromText: boolean): ColumnInputResult {
	if (bound === null || bound === undefined) return ok(null);
	if (!isPlainObject(bound)) return fail('Each end of a range needs a value and whether it is included.');
	if (bound.value === null || bound.value === undefined) return ok(null);
	const parsed = rules ? parseRules(rules, bound.value, fromText) : ok(bound.value);
	if (parsed.ok === false) return parsed;
	return ok({ value: parsed.value, inclusive: bound.inclusive !== false });
}

function parseRange(rules: ValueRules, input: unknown, fromText: boolean): ColumnInputResult {
	const object = objectInput(input, fromText);
	if (!object) return fail('Enter a range with a start and an end.');
	const valueRules = boundRules(rules);
	const start = parseBound(object.start, valueRules, fromText);
	if (start.ok === false) return fail(`Start: ${start.reason}`);
	const end = parseBound(object.end, valueRules, fromText);
	if (end.ok === false) return fail(`End: ${end.reason}`);
	return ok({ start: start.value, end: end.value });
}

function parseJson(input: unknown, fromText: boolean): ColumnInputResult {
	if (!fromText || typeof input !== 'string') return ok(input);
	const parsed = parseJsonText(input.trim());
	return parsed.ok ? ok(parsed.value) : fail('Enter valid JSON.');
}

// ─── Dispatch ───────────────────────────────────────────────────────────────

/** Parse one non-empty value by its kind. */
function parseRules(rules: ValueRules, input: unknown, fromText: boolean): ColumnInputResult {
	if (rules.options && rules.kind !== 'file') return parseChoice(rules, input);
	switch (rules.kind) {
		case 'text':
			return parseText(rules, input);
		case 'integer':
			return parseInteger(input);
		case 'bigint':
			return parseBigInteger(input);
		case 'decimal':
			return parseDecimal(rules, input);
		case 'float':
			return parseFloatValue(input);
		case 'boolean':
			return parseBoolean(input);
		case 'uuid':
			return parseUuid(input);
		case 'date':
			return parseDate(input);
		case 'time':
			return parseTime(input);
		case 'datetime':
			return parseDatetime(input);
		case 'interval':
			return parseInterval(rules, input, fromText);
		case 'json':
			return parseJson(input, fromText);
		case 'enum':
			return parseChoice(rules, input);
		case 'bitstring':
			return parseBits(rules, input);
		case 'network':
		case 'path':
			return parseNetwork(input);
		case 'geometry':
			return parseGeometry(input, fromText);
		case 'point':
			return parsePoint(input, fromText);
		case 'range':
			return parseRange(rules, input, fromText);
		case 'composite':
			return parseComposite(rules, input, fromText);
		// File values are owned by the upload flow; they pass unchanged.
		case 'file':
			return ok(input);
		default:
			return fail(VIEW_ONLY_REASON);
	}
}

/** What clearing the column writes: null, '' for a text column that cannot be empty, or a refusal. */
function clearedValue(column: ColumnModel): ColumnInputResult {
	if (column.value.isArray) return column.nullable ? ok(null) : ok([]);
	if (column.nullable) return ok(null);
	if (column.value.kind === 'text' && !column.value.options) return ok('');
	return fail('This field needs a value.');
}

/** Split list text: a JSON array, else one element per comma. */
function listFromText(text: string): unknown[] | null {
	const trimmed = text.trim();
	if (trimmed.startsWith('[')) {
		const parsed = parseJsonText(trimmed);
		return parsed.ok && Array.isArray(parsed.value) ? parsed.value : null;
	}
	return trimmed.split(',').map((element) => element.trim());
}

function parseList(column: ColumnModel, input: unknown, fromText: boolean): ColumnInputResult {
	const elements = Array.isArray(input) ? input : typeof input === 'string' ? listFromText(input) : null;
	if (!elements) return fail('Enter a list of values.');
	const rules = rulesOf(column);
	const out: unknown[] = [];
	for (const [index, element] of elements.entries()) {
		if (element === null || element === undefined) {
			out.push(null);
			continue;
		}
		const parsed = parseRules(rules, element, fromText || typeof element === 'string');
		if (parsed.ok === false) return fail(`Item ${index + 1}: ${parsed.reason}`);
		out.push(parsed.value);
	}
	return ok(out);
}

/**
 * Turn a user's input into the value the column stores, or say why it does not fit.
 * Empty input clears the column (see `clearedValue`). The result is still encoded by
 * the write codec (`encodeWriteValues`) before it is sent.
 */
export function parseColumnInput(column: ColumnModel, input: unknown, options: ColumnInputOptions = {}): ColumnInputResult {
	const fromText = options.fromText ?? false;
	if (VIEW_ONLY_KINDS.has(column.value.kind)) return fail(VIEW_ONLY_REASON);
	const keepsBlankText = TEXT_LIKE_KINDS.has(column.value.kind) && typeof input === 'string' && input !== '';
	if (input === undefined || input === null || (!keepsBlankText && isBlank(input))) return clearedValue(column);
	if (column.value.isArray) return parseList(column, input, fromText);
	return parseRules(rulesOf(column), input, fromText);
}

// ─── Formatting ─────────────────────────────────────────────────────────────

/** Label of a stored choice value; an unknown stored value shows as it is. */
export function choiceLabel(column: ColumnModel | null | undefined, value: unknown): string {
	const text = primitiveText(value) ?? '';
	return column?.value.options?.find((option) => option.value === text)?.label ?? text;
}

/**
 * Text for one value when it leaves the grid (copy, export). Structured values and
 * JSON are written as JSON so a paste reads them back exactly; choices use their label.
 */
export function formatColumnValue(column: ColumnModel | null | undefined, value: unknown): string {
	if (value === null || value === undefined) return '';
	if (column?.value.kind === 'json') return JSON.stringify(value);
	if (column?.value.options) {
		return Array.isArray(value) ? JSON.stringify(value.map((entry) => (entry == null ? null : choiceLabel(column, entry)))) : choiceLabel(column, value);
	}
	if (typeof value === 'object') return JSON.stringify(value);
	return String(value);
}

/**
 * The next value of a toggled boolean cell: checked and unchecked flip, and an empty
 * cell becomes checked. A toggle never empties a cell, so a click on an unchecked box
 * checks it; Delete clears a cell that accepts no value, and the record panel offers
 * Empty as a choice of its own.
 */
export function nextToggleValue(current: unknown): boolean {
	return current !== true;
}

/** Copy text of one cell: its column's format when the table model knows the column, else plain text. */
export function copyText(columns: readonly ColumnModel[] | null | undefined, colKey: string, value: unknown): string {
	const column = columns?.find((candidate) => candidate.name === colKey);
	if (column) return formatColumnValue(column, value);
	if (value === null || value === undefined) return '';
	return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

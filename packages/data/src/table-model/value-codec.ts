import { canonicalName } from './names';
import { TableModelError } from './table-key';
import type { ColumnModel, ColumnOption, ColumnValueKind, InputValueModel, TableModel } from './types';

/**
 * The write codec: turn a value as the API returns it (or as an editor holds
 * it) into the value the write input takes. One place, driven by
 * `ColumnValueModel.input`:
 *
 * - object outputs become input objects field by field; output-only fields drop;
 * - a geometry value read as `{ geojson }` writes its GeoJSON;
 * - an enum label maps to its wire value;
 * - large integers and decimals stay strings (a number is converted to a string, never parsed).
 */

/** Scalars whose wire format is a decimal string. */
const DECIMAL_STRING_SCALARS: ReadonlySet<string> = new Set(['BigInt', 'BigFloat']);

interface EncodeContext {
	/** Column the value belongs to, for messages. */
	column: string;
	/** Value kind of the column; only the top level uses it. */
	kind: ColumnValueKind | null;
	/** Enum labels of the column, for label input. */
	options: readonly ColumnOption[] | null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
	const prototype = Object.getPrototypeOf(value);
	return prototype === Object.prototype || prototype === null;
}

function invalid(ctx: EncodeContext, detail: string): TableModelError {
	return new TableModelError('INVALID_VALUE', `The value for "${ctx.column}" ${detail}.`);
}

function encodeEnum(input: InputValueModel, value: unknown, ctx: EncodeContext): unknown {
	if (typeof value !== 'string') throw invalid(ctx, 'must be one of its choices');
	const values = input.enumValues ?? [];
	if (values.includes(value)) return value;
	// A label is display text; it is accepted only when it names its value (`in_progress` for `IN_PROGRESS`).
	const byLabel = ctx.options?.find(
		(option) =>
			option.label === value && values.includes(option.value) && canonicalName(option.label) === canonicalName(option.value),
	);
	if (byLabel) return byLabel.value;
	throw invalid(ctx, `"${value}" is not one of its choices`);
}

function encodeScalar(input: InputValueModel, value: unknown, ctx: EncodeContext): unknown {
	if (ctx.kind === 'geometry' && isPlainObject(value) && 'geojson' in value) return value.geojson;
	if (DECIMAL_STRING_SCALARS.has(input.typeName) && typeof value === 'number') {
		if (!Number.isFinite(value)) throw invalid(ctx, 'must be a finite number');
		return String(value);
	}
	return value;
}

function encodeObject(input: InputValueModel, value: unknown, ctx: EncodeContext): unknown {
	if (!isPlainObject(value)) throw invalid(ctx, 'must be a structured value');
	const nested: EncodeContext = { ...ctx, kind: null, options: null };
	if (!input.fields) {
		const { __typename: _typename, ...rest } = value;
		return rest;
	}
	const encoded: Record<string, unknown> = {};
	for (const field of input.fields) {
		if (!Object.prototype.hasOwnProperty.call(value, field.name)) continue;
		const fieldValue = value[field.name];
		if (fieldValue === undefined) continue;
		encoded[field.name] = encodeValue(field.value, fieldValue, nested);
	}
	return encoded;
}

function encodeElement(input: InputValueModel, value: unknown, ctx: EncodeContext): unknown {
	if (value === null || value === undefined) return value;
	if (input.shape === 'enum') return encodeEnum(input, value, ctx);
	if (input.shape === 'object') return encodeObject(input, value, ctx);
	return encodeScalar(input, value, ctx);
}

function encodeValue(input: InputValueModel, value: unknown, ctx: EncodeContext): unknown {
	if (value === null || value === undefined) return value;
	if (input.isList && Array.isArray(value)) return value.map((element) => encodeElement(input, element, ctx));
	return encodeElement(input, value, ctx);
}

/** Encode one column value for a write. Throws `TableModelError` when the column takes no input or the value cannot be encoded. */
export function encodeColumnValue(column: ColumnModel, value: unknown): unknown {
	const input = column.value.input;
	if (!input) {
		throw new TableModelError(
			'FIELD_NOT_WRITABLE',
			column.write.updateReason ?? column.write.createReason ?? `"${column.name}" cannot be written.`,
		);
	}
	return encodeValue(input, value, { column: column.name, kind: column.value.kind, options: column.value.options });
}

/**
 * Encode a record's values for a create or an update. Every key must be a
 * column the operation accepts; anything else is an error, never dropped.
 * `undefined` values are left out.
 */
export function encodeWriteValues(
	model: TableModel,
	values: Readonly<Record<string, unknown>>,
	operation: 'create' | 'update',
): Record<string, unknown> {
	const encoded: Record<string, unknown> = {};
	for (const [name, value] of Object.entries(values)) {
		if (value === undefined) continue;
		const column = model.columns.find((candidate) => candidate.name === name);
		if (!column) {
			throw new TableModelError('UNKNOWN_FIELD', `"${name}" is not a field of this table.`, { tableKey: model.key });
		}
		const allowed = operation === 'create' ? column.write.create : column.write.update;
		if (!allowed) {
			const reason = operation === 'create' ? column.write.createReason : column.write.updateReason;
			throw new TableModelError('FIELD_NOT_WRITABLE', `"${name}": ${reason ?? 'this field cannot be written.'}`, {
				tableKey: model.key,
			});
		}
		encoded[name] = encodeColumnValue(column, value);
	}
	return encoded;
}

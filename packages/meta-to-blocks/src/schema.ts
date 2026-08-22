/**
 * Column metadata → JSON Schema.
 *
 * Widget selection is not repeated here: a `_meta` column is lowered to the
 * JSON Schema fragment that describes it, and `json-schema-to-blocks` turns
 * that fragment into a node. One rule pipeline therefore serves both
 * database-derived and schema-derived forms, which is the whole point of
 * lowering through JSON Schema rather than emitting nodes directly.
 */

import type { JSONSchema, JSONSchemaType } from 'json-schema-to-blocks';
import { titleize } from './naming';
import type { FieldOverride, MetaConstraints, MetaField, MetaOptions, MetaTable, MetaType } from './types';

/** Columns the database maintains; a create form should not ask for them. */
const AUDIT_COLUMNS = new Set(['created_at', 'createdAt', 'updated_at', 'updatedAt', 'deleted_at', 'deletedAt']);

/** GraphQL scalars that map straight onto a JSON Schema type. */
const scalarTypes: Record<string, JSONSchema> = {
	Boolean: { type: 'boolean' },
	Int: { type: 'integer' },
	Float: { type: 'number' },
	BigInt: { type: 'integer' },
	BigFloat: { type: 'number' },
	Datetime: { type: 'string', format: 'date-time' },
	Date: { type: 'string', format: 'date' },
	Time: { type: 'string', format: 'time' },
	UUID: { type: 'string', format: 'uuid', maxLength: 36 },
	JSON: { type: 'string', format: 'json' },
	Cursor: { type: 'string', maxLength: 255 },
	InternetAddress: { type: 'string', maxLength: 45 },
	Interval: { type: 'string', format: 'json' },
	GeoJSON: { type: 'string', format: 'json' },
};

/** Postgres types whose GraphQL scalar is too coarse to pick a widget from. */
const pgTypes: Record<string, JSONSchema> = {
	text: { type: 'string' },
	json: { type: 'string', format: 'json' },
	jsonb: { type: 'string', format: 'json' },
	bytea: { type: 'string', format: 'data-url' },
	date: { type: 'string', format: 'date' },
	time: { type: 'string', format: 'time' },
	timetz: { type: 'string', format: 'time' },
	timestamp: { type: 'string', format: 'date-time' },
	timestamptz: { type: 'string', format: 'date-time' },
	uuid: { type: 'string', format: 'uuid', maxLength: 36 },
	bool: { type: 'boolean' },
	int2: { type: 'integer' },
	int4: { type: 'integer' },
	int8: { type: 'integer' },
	float4: { type: 'number' },
	float8: { type: 'number' },
	numeric: { type: 'number' },
	money: { type: 'number' },
	inet: { type: 'string', maxLength: 45 },
	cidr: { type: 'string', maxLength: 45 },
	macaddr: { type: 'string', maxLength: 17 },
	ltree: { type: 'string', maxLength: 255 },
	interval: { type: 'string', format: 'json' },
	point: { type: 'string', format: 'json' },
	geometry: { type: 'string', format: 'json' },
	geography: { type: 'string', format: 'json' },
	vector: { type: 'string', format: 'json' },
	tsvector: { type: 'string', format: 'json' },
	email: { type: 'string', format: 'email', maxLength: 320 },
	citext: { type: 'string', maxLength: 255 },
};

/** `_meta` scalar encodings, which are more specific than either type name. */
const encodings: Record<string, JSONSchema> = {
	datetime: { type: 'string', format: 'date-time' },
	date: { type: 'string', format: 'date' },
	time: { type: 'string', format: 'time' },
	uuid: { type: 'string', format: 'uuid', maxLength: 36 },
	bigint: { type: 'integer' },
	bytea: { type: 'string', format: 'data-url' },
	interval: { type: 'string', format: 'json' },
	geojson: { type: 'string', format: 'json' },
	point: { type: 'string', format: 'json' },
	vector: { type: 'string', format: 'json' },
	composite: { type: 'string', format: 'json' },
	inet: { type: 'string', maxLength: 45 },
	ltree: { type: 'string', maxLength: 255 },
};

function unwrap(gqlType: string | null | undefined): string | undefined {
	return gqlType?.replace(/[[\]!]/g, '') || undefined;
}

/** `character varying(80)` / `varchar(80)` → 80. */
function varcharLength(pgType: string | null | undefined): number | undefined {
	const match = /^(?:character varying|varchar)\((\d+)\)$/.exec(pgType ?? '');
	return match ? Number(match[1]) : undefined;
}

function baseType(pgType: string | null | undefined): string | undefined {
	return pgType?.replace(/^_/, '').replace(/\[\]$/, '').replace(/\(.*\)$/, '').trim() || undefined;
}

/**
 * The scalar fragment for a column, most specific source first: `_meta`
 * encoding, then Postgres type, then GraphQL scalar. An unrecognised type stays
 * a bounded string so it lowers to an Input rather than a Textarea.
 */
export function typeToSchema(type: MetaType | null | undefined): JSONSchema {
	const encoding = type?.encoding?.kind ? encodings[type.encoding.kind] : undefined;
	if (encoding) return { ...encoding };

	const pg = baseType(type?.pgType);
	if (pg && pgTypes[pg]) return { ...pgTypes[pg] };

	const length = varcharLength(type?.pgType);
	if (length != null) return { type: 'string', maxLength: length };

	const gql = unwrap(type?.gqlType);
	if (gql && scalarTypes[gql]) return { ...scalarTypes[gql] };

	return { type: 'string', maxLength: 255 };
}

/**
 * `constraints` is the current grouped shape; cached pre-July metadata sends a
 * flat array instead, which carries none of the fields read here.
 */
export function structuredConstraints(table: MetaTable): MetaConstraints | undefined {
	const constraints = table.constraints;
	if (!constraints || Array.isArray(constraints)) return undefined;
	return constraints as MetaConstraints;
}

function isArrayColumn(field: MetaField): boolean {
	return Boolean(field.type?.isArray) || Boolean(field.type?.pgType?.endsWith('[]')) || field.type?.pgType?.startsWith('_') === true;
}

function enumValues(field: MetaField): string[] | undefined {
	const values = field.enumValues?.values?.filter((value): value is string => typeof value === 'string');
	return values?.length ? values : undefined;
}

/** Foreign keys are a picker over the referenced table, not a raw id input. */
function foreignKeyAnnotation(table: MetaTable, field: MetaField): Record<string, unknown> | undefined {
	if (!field.isForeignKey) return undefined;

	const candidates = [
		...(structuredConstraints(table)?.foreignKey ?? []),
		...(table.foreignKeyConstraints ?? []),
	];

	for (const constraint of candidates) {
		if (!constraint) continue;
		const names = (constraint.fields ?? []).map((entry) => entry?.name);
		if (!names.includes(field.name)) continue;

		const referencedTable = constraint.referencedTable ?? constraint.refTable?.name ?? undefined;
		const referencedField =
			constraint.referencedFields?.find((name): name is string => typeof name === 'string') ??
			constraint.refFields?.find((entry) => entry?.name)?.name ??
			undefined;

		return {
			widget: 'Select',
			props: {
				relation: {
					table: referencedTable,
					...(referencedField ? { field: referencedField } : {}),
				},
			},
		};
	}

	return { widget: 'Select' };
}

/** A column the database fills in, so a create form should not ask for it. */
export function isSystemField(field: MetaField): boolean {
	if (field.isPrimaryKey) return true;
	if (AUDIT_COLUMNS.has(field.name)) return true;
	return false;
}

export function selectFields(table: MetaTable, options: MetaOptions = {}): MetaField[] {
	const omitted = new Set(options.omitFields ?? []);
	const overrides = options.fields ?? {};
	const fields = (table.fields ?? []).filter((field): field is MetaField => Boolean(field?.name));

	const kept = fields.filter((field) => {
		if (omitted.has(field.name) || overrides[field.name]?.omit) return false;
		if (!options.includeSystemFields && isSystemField(field)) return false;
		return true;
	});

	const order = options.fieldOrder;
	if (!order?.length) return kept;

	const rank = new Map(order.map((name, index) => [name, index]));
	return [...kept].sort(
		(left, right) => (rank.get(left.name) ?? order.length) - (rank.get(right.name) ?? order.length)
	);
}

/** One column → its JSON Schema property (including `x-ui` presentation). */
export function fieldToSchema(table: MetaTable, field: MetaField, override?: FieldOverride): JSONSchema {
	const values = enumValues(field);
	const scalar: JSONSchema = values
		? { type: 'string', enum: values }
		: typeToSchema(field.type);

	const inner: JSONSchema = {
		...scalar,
		...(field.description ? { description: field.description } : {}),
	};

	const fk = foreignKeyAnnotation(table, field);
	const ui = {
		...fk,
		// `author_id` picks an author, so the label loses the id suffix.
		...(fk ? { label: titleize(field.name) } : {}),
		...(override?.widget ? { widget: override.widget } : {}),
		...(override?.label ? { label: override.label } : {}),
		...(override?.description ? { description: override.description } : {}),
		...(override?.placeholder ? { placeholder: override.placeholder } : {}),
		...(override?.hidden ? { hidden: true } : {}),
		...(override?.disabled ? { disabled: true } : {}),
		...(override?.order != null ? { order: override.order } : {}),
		...(fk?.props || override?.props
			? { props: { ...(fk?.props as Record<string, unknown>), ...override?.props } }
			: {}),
	};

	const schema: JSONSchema = isArrayColumn(field) ? { type: 'array', items: inner } : inner;
	// A nullable column keeps its widget but accepts an explicit null.
	if (!field.isNotNull) schema.type = [schema.type as JSONSchemaType, 'null'];

	return {
		...schema,
		...(Object.keys(ui).length > 0 ? { 'x-ui': ui } : {}),
	};
}

/**
 * A whole table → one JSON Schema object, ready for
 * `json-schema-to-blocks`. Useful on its own for validating writes.
 */
export function tableToSchema(table: MetaTable, options: MetaOptions = {}): JSONSchema {
	const fields = selectFields(table, options);
	const properties: Record<string, JSONSchema> = {};
	const required: string[] = [];

	for (const field of fields) {
		properties[field.name] = fieldToSchema(table, field, options.fields?.[field.name]);
		// A NOT NULL column without a default is the only column a form must have.
		if (field.isNotNull && !field.hasDefault) required.push(field.name);
	}

	return {
		$id: options.id ?? table.name,
		type: 'object',
		...(options.title ? { title: options.title } : {}),
		...(table.description ? { description: table.description } : {}),
		properties,
		...(required.length > 0 ? { required } : {}),
	};
}

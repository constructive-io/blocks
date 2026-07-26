import { mapToFrontendCellType } from '../cell-types/type-mapping';

import { createMetadataHash } from './metadata-hash';
import type {
	BuildFormSpecOptions,
	DynamicFormSpec,
	MetaField,
	MetaTable,
	ScalarFieldKind,
	ScalarFieldSpec,
} from './types';

const SCALAR_CELL_TYPE_TO_KIND: Partial<Record<string, ScalarFieldKind>> = {
	text: 'text',
	textarea: 'multiline',
	citext: 'text',
	bpchar: 'text',
	email: 'email',
	url: 'url',
	phone: 'phone',
	uuid: 'uuid',
	inet: 'inet',
	number: 'number',
	integer: 'integer',
	smallint: 'smallint',
	decimal: 'decimal',
	currency: 'currency',
	percentage: 'percentage',
	boolean: 'boolean',
	bit: 'bit',
	date: 'date',
	datetime: 'datetime',
	time: 'time',
	timestamptz: 'timestamptz',
	json: 'json',
	jsonb: 'json',
	tsvector: 'tsvector',
};

const HUMAN_CASE_REGEX = /([a-z0-9])([A-Z])/g;

export function buildScalarFormSpec(metaTable: MetaTable, options: BuildFormSpecOptions = {}): DynamicFormSpec | null {
	const fields: ScalarFieldSpec[] = [];
	const uniqueFieldSet = collectSingleFieldUniqueNames(metaTable);
	const primaryFieldSet = collectSingleFieldPrimaryNames(metaTable);

	for (const field of metaTable.fields ?? []) {
		if (!field) continue;

		const spec = createScalarFieldSpec(field, options, uniqueFieldSet, primaryFieldSet);
		if (!spec) continue;

		fields.push(spec);
	}

	if (fields.length === 0) {
		return null;
	}

	const versionHash = createMetadataHash({
		table: metaTable.name,
		fields: fields.map((f) => ({
			name: f.name,
			kind: f.kind,
			nullable: f.nullable,
			metadata: f.metadata,
			maxLength: f.maxLength,
			minLength: f.minLength,
			minimum: f.minimum,
			maximum: f.maximum,
			enumValues: f.enumValues,
		})),
	});

	return {
		tableName: metaTable.name,
		versionHash,
		fields,
	};
}

export function findTableFormSpec(
	meta: MetaTable[] | null | undefined,
	tableName: string,
	options: BuildFormSpecOptions = {},
): DynamicFormSpec | null {
	if (!meta) return null;
	const table = meta.find((item) => item?.name === tableName);
	if (!table) return null;
	return buildScalarFormSpec(table, options);
}

function createScalarFieldSpec(
	metaField: MetaField,
	options: BuildFormSpecOptions,
	uniqueFields: Set<string>,
	primaryFields: Set<string>,
): ScalarFieldSpec | null {
	const { multilineFields } = options;
	const cellType = mapToFrontendCellType({
		gqlType: metaField.type.gqlType,
		isArray: metaField.type.isArray,
		pgAlias: metaField.type.pgAlias,
		pgType: metaField.type.pgType,
		subtype: metaField.type.subtype ?? undefined,
		encoding: metaField.type.encoding,
	});

	if (metaField.type.isArray) {
		return null;
	}

	let kind = SCALAR_CELL_TYPE_TO_KIND[cellType];

	if (!kind && cellType === 'text' && multilineFields?.has(metaField.name)) {
		kind = 'multiline';
	}

	if (!kind) {
		return null;
	}

	const nullable = isFieldNullable(metaField);
	const { maxLength, numericPrecision, numericScale } = extractTypmodConstraints(metaField);

	const label = humanize(metaField.name);
	const description = buildDescription(metaField);

	const spec: ScalarFieldSpec = {
		name: metaField.name,
		label,
		description,
		kind,
		nullable,
		metadata: {
			cellType,
			gqlType: metaField.type.gqlType,
			pgAlias: metaField.type.pgAlias ?? undefined,
			pgType: metaField.type.pgType ?? undefined,
			subtype: metaField.type.subtype ?? undefined,
			typmod: metaField.type.typmod ?? undefined,
			encoding: metaField.type.encoding ?? undefined,
		},
		constraints: {
			isUnique: uniqueFields.has(metaField.name) || undefined,
			isPrimaryKey: primaryFields.has(metaField.name) || undefined,
		},
	};

	if (metaField.enumValues?.values?.length) {
		spec.enumValues = [...metaField.enumValues.values];
	}

	if (maxLength != null) {
		spec.maxLength = maxLength;
	}

	if (numericPrecision != null) {
		spec.numericPrecision = numericPrecision;
	}

	if (numericScale != null) {
		spec.numericScale = numericScale;
	}

	if (
		kind === 'decimal' ||
		kind === 'number' ||
		kind === 'integer' ||
		kind === 'smallint' ||
		kind === 'currency' ||
		kind === 'percentage'
	) {
		const { minimum, maximum } = extractNumericCheckBounds(metaField);
		if (minimum != null) spec.minimum = minimum;
		if (maximum != null) spec.maximum = maximum;
	}

	if (kind === 'json') {
		spec.description = description ?? 'JSON value';
	}

	if (kind === 'boolean') {
		spec.defaultValue = false;
	}

	return spec;
}

function buildDescription(metaField: MetaField): string | undefined {
	if (metaField.description) return metaField.description;
	const details: string[] = [];
	const { pgAlias, pgType, subtype } = metaField.type;

	if (pgAlias && pgAlias !== pgType) {
		details.push(pgAlias);
	}
	if (pgType) {
		details.push(pgType);
	}
	if (subtype) {
		details.push(subtype);
	}

	return details.length > 0 ? details.join(' • ') : undefined;
}

function humanize(name: string): string {
	return name.replace(HUMAN_CASE_REGEX, '$1 $2').replace(/^./, (str) => str.toUpperCase());
}

function isFieldNullable(metaField: MetaField): boolean {
	if (metaField.isNotNull === true || metaField.type.isNotNull === true) return false;
	const gqlType = metaField.type.gqlType;
	if (gqlType.endsWith('!')) return false;
	// Note: modifier is a numeric code from PostgreSQL, not a string enum
	// The gqlType check above is the primary indicator of non-nullability
	return true;
}

function extractTypmodConstraints(metaField: MetaField): {
	maxLength?: number;
	numericPrecision?: number;
	numericScale?: number;
} {
	const typmod = metaField.type.typmod ?? null;
	const pgType = metaField.type.pgType?.toLowerCase();

	if (typmod == null || typmod < 0) {
		return {};
	}

	if (pgType === 'varchar' || pgType === 'character varying' || pgType === 'bpchar' || pgType === 'character') {
		return { maxLength: Math.max(0, typmod - 4) };
	}

	if (pgType === 'numeric' || pgType === 'decimal') {
		const precision = ((typmod - 4) >> 16) & 65535;
		const scale = (typmod - 4) & 65535;
		return {
			numericPrecision: precision || undefined,
			numericScale: scale || undefined,
		};
	}

	return {};
}

function extractNumericCheckBounds(_metaField: MetaField): { minimum?: number; maximum?: number } {
	// Placeholder for future enhancements: currently return empty bounds.
	// Backend check constraints can be parsed here when the metadata exposes readable expressions.
	return {};
}

function collectSingleFieldUniqueNames(metaTable: MetaTable): Set<string> {
	const result = new Set<string>();

	for (const constraint of metaTable.uniqueConstraints ?? []) {
		if (!constraint || !constraint.fields) continue;
		const fields = constraint.fields.filter((field): field is MetaField => Boolean(field));
		if (fields.length === 1) {
			result.add(fields[0].name);
		}
	}

	return result;
}

function collectSingleFieldPrimaryNames(metaTable: MetaTable): Set<string> {
	const result = new Set<string>();
	for (const constraint of metaTable.primaryKeyConstraints ?? []) {
		if (!constraint) continue;
		const fields = constraint.fields?.filter((field): field is MetaField => Boolean(field));
		if (fields && fields.length === 1) {
			result.add(fields[0].name);
		}
	}
	return result;
}

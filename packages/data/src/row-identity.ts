import { pgFieldToCamelCase, type MetaTable } from './data.types';

export interface RowIdentityObject {
	readonly [key: string]: RowIdentityValue;
}

export type RowIdentityValue =
	| null
	| boolean
	| number
	| string
	| readonly RowIdentityValue[]
	| RowIdentityObject;

export type RowIdentityField = Readonly<{
	columnName: string;
	fieldName: string;
	value: RowIdentityValue;
}>;

export type RowIdentity = Readonly<{
	schemaName: string | null;
	tableName: string;
	fields: readonly RowIdentityField[];
}>;

export type RowIdentityDefinition =
	| Readonly<{
			status: 'keyed';
			schemaName: string | null;
			tableName: string;
			fields: readonly Readonly<{
				columnName: string;
				fieldName: string;
			}>[];
	  }>
	| Readonly<{
			status: 'read-only';
			schemaName: string | null;
			tableName: string;
			reason: 'no-primary-key';
	  }>;

export type RowIdentityResolution =
	| Readonly<{ status: 'identified'; identity: RowIdentity }>
	| Extract<RowIdentityDefinition, { status: 'read-only' }>
	| Readonly<{
			status: 'invalid-row';
			schemaName: string | null;
			tableName: string;
			missingFields: readonly string[];
			invalidFields: readonly string[];
	  }>;

export type TableWriteCapability =
	| Extract<RowIdentityDefinition, { status: 'read-only' }>
	| Readonly<{
			status: 'mutable';
			primaryKeyFields: readonly string[];
			operations: Readonly<{
				create: boolean;
				update: boolean;
				delete: boolean;
			}>;
	  }>;

function primaryKeyColumnNames(table: MetaTable): string[] {
	const constraints = table.constraints;
	if (constraints && !Array.isArray(constraints)) {
		const names = (constraints.primaryKey?.fields ?? [])
			.flatMap((field) => field?.name ? [field.name] : []);
		if (names.length > 0) return [...new Set(names)];
	}

	for (const constraint of table.primaryKeyConstraints ?? []) {
		const names = (constraint?.fields ?? [])
			.flatMap((field) => field?.name ? [field.name] : []);
		if (names.length > 0) return [...new Set(names)];
	}

	return [...new Set(
		(table.fields ?? [])
			.flatMap((field) => field?.isPrimaryKey && field.name ? [field.name] : []),
	)];
}

function isRowIdentityValue(value: unknown): value is RowIdentityValue {
	if (
		value === null ||
		typeof value === 'string' ||
		typeof value === 'boolean'
	) return true;
	if (typeof value === 'number') return Number.isFinite(value);
	if (Array.isArray(value)) return value.every(isRowIdentityValue);
	if (typeof value !== 'object' || value === null) return false;
	const prototype = Object.getPrototypeOf(value);
	if (prototype !== Object.prototype && prototype !== null) return false;
	return Object.values(value).every(isRowIdentityValue);
}

function sortIdentityValue(value: RowIdentityValue): RowIdentityValue {
	if (Array.isArray(value)) return value.map(sortIdentityValue);
	if (typeof value !== 'object' || value === null) return value;
	return Object.fromEntries(
		Object.entries(value)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([key, item]) => [key, sortIdentityValue(item)]),
	);
}

export function getRowIdentityDefinition(table: MetaTable): RowIdentityDefinition {
	const schemaName = table.schemaName ?? null;
	const columnNames = primaryKeyColumnNames(table);
	if (columnNames.length === 0) {
		return {
			status: 'read-only',
			schemaName,
			tableName: table.name,
			reason: 'no-primary-key',
		};
	}

	return {
		status: 'keyed',
		schemaName,
		tableName: table.name,
		fields: columnNames.map((columnName) => ({
			columnName,
			fieldName: pgFieldToCamelCase(columnName),
		})),
	};
}

/** Resolves an ordered, schema-qualified identity without assuming an `id` field. */
export function resolveRowIdentity(
	table: MetaTable,
	row: Readonly<Record<string, unknown>>,
): RowIdentityResolution {
	const definition = getRowIdentityDefinition(table);
	if (definition.status === 'read-only') return definition;

	const missingFields: string[] = [];
	const invalidFields: string[] = [];
	const fields: RowIdentityField[] = [];
	for (const field of definition.fields) {
		if (!Object.prototype.hasOwnProperty.call(row, field.fieldName)) {
			missingFields.push(field.fieldName);
			continue;
		}
		const value = row[field.fieldName];
		if (value === null || !isRowIdentityValue(value)) {
			invalidFields.push(field.fieldName);
			continue;
		}
		fields.push({ ...field, value });
	}

	if (missingFields.length > 0 || invalidFields.length > 0) {
		return {
			status: 'invalid-row',
			schemaName: definition.schemaName,
			tableName: definition.tableName,
			missingFields,
			invalidFields,
		};
	}

	return {
		status: 'identified',
		identity: {
			schemaName: definition.schemaName,
			tableName: definition.tableName,
			fields,
		},
	};
}

/** Produces a stable cache/selection key; it contains values, never credentials. */
export function serializeRowIdentity(identity: RowIdentity): string {
	return JSON.stringify([
		identity.schemaName,
		identity.tableName,
		identity.fields.map((field) => [
			field.columnName,
			field.fieldName,
			sortIdentityValue(field.value),
		]),
	]);
}

/** Produces GraphQL primary-key arguments in the same order declared by `_meta`. */
export function rowIdentityToPrimaryKey(
	identity: RowIdentity,
): Readonly<Record<string, RowIdentityValue>> {
	return Object.fromEntries(
		identity.fields.map((field) => [field.fieldName, field.value]),
	);
}

export function assessTableWriteCapability(table: MetaTable): TableWriteCapability {
	const definition = getRowIdentityDefinition(table);
	if (definition.status === 'read-only') return definition;
	return {
		status: 'mutable',
		primaryKeyFields: definition.fields.map((field) => field.fieldName),
		operations: {
			create: Boolean(table.query?.create),
			update: Boolean(table.query?.update),
			delete: Boolean(table.query?.delete),
		},
	};
}

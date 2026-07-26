import { singularize } from 'inflekt';
import type {
	MetaQuery,
	MetaschemaIndex,
	MetaschemaI18n,
	MetaschemaRealtime,
	MetaschemaScalarEncoding,
	MetaschemaScope,
	MetaschemaSearch,
	MetaschemaStorage,
	MetaschemaTableInflection,
	MetaschemaTableQuery,
} from './meta-query.types';

export type {
	Relations as CleanRelations,
	BelongsToRelation as CleanBelongsToRelation,
	HasOneRelation as CleanHasOneRelation,
	HasManyRelation as CleanHasManyRelation,
	ManyToManyRelation as CleanManyToManyRelation,
	TableInflection,
	TableQueryNames,
} from '@constructive-io/graphql-query/types/schema';

export type {
	PageInfo,
	ConnectionResult,
	QueryOptions,
	FilterOperator,
	FieldFilter,
	RelationalFilter,
	Filter,
	OrderByItem,
} from '@constructive-io/graphql-query/types/query';

export type {
	MutationOptions,
} from '@constructive-io/graphql-query/types/mutation';

export type {
	FieldSelection,
	SimpleFieldSelection,
	FieldSelectionPreset,
	SelectionOptions,
} from '@constructive-io/graphql-query/types/selection';

import type {
	Field,
	FieldType,
	Table,
	TableInflection,
	TableQueryNames,
} from '@constructive-io/graphql-query/types/schema';

export type CleanFieldType = FieldType & {
	encoding?: MetaschemaScalarEncoding | null;
};

export type CleanField = Omit<Field, 'type'> & {
	type: CleanFieldType;
	isPrimaryKey?: boolean | null;
	isForeignKey?: boolean | null;
	enumValues?: string[];
};

export type CleanTable = Omit<Table, 'fields'> & {
	schemaName?: string | null;
	fields: CleanField[];
	indexes?: Array<NonNullable<MetaschemaIndex>>;
	storage?: MetaschemaStorage | null;
	search?: MetaschemaSearch | null;
	i18n?: MetaschemaI18n | null;
	realtime?: MetaschemaRealtime | null;
	scope?: MetaschemaScope | null;
};

export type MetaTable = NonNullable<NonNullable<NonNullable<MetaQuery['_meta']>['tables']>[number]>;

export type MetaField = NonNullable<NonNullable<MetaTable['fields']>[number]>;

export type MetaFieldType = NonNullable<MetaField['type']>;

export type MetaRelations = NonNullable<MetaTable['relations']>;

export type MetaBelongsToRelation = NonNullable<NonNullable<MetaRelations['belongsTo']>[number]>;

export type MetaHasOneRelation = NonNullable<NonNullable<MetaRelations['hasOne']>[number]>;

export type MetaHasManyRelation = NonNullable<NonNullable<MetaRelations['hasMany']>[number]>;

export type MetaManyToManyRelation = NonNullable<NonNullable<MetaRelations['manyToMany']>[number]>;

/** Convert PostgreSQL snake_case column name to camelCase GraphQL field name. */
export function pgFieldToCamelCase(str: string): string {
	return str.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

function convertInflection(inflection: MetaschemaTableInflection | null | undefined): TableInflection | undefined {
	if (!inflection) return undefined;
	return {
		allRows: inflection.allRows ?? '',
		allRowsSimple: inflection.allRowsSimple ?? '',
		conditionType: inflection.conditionType ?? '',
		connection: inflection.connection ?? '',
		createField: inflection.createField ?? '',
		createInputType: inflection.createInputType ?? '',
		createPayloadType: inflection.createPayloadType ?? '',
		deleteByPrimaryKey: inflection.deleteByPrimaryKey ?? null,
		deletePayloadType: inflection.deletePayloadType ?? '',
		edge: inflection.edge ?? '',
		edgeField: inflection.edgeField ?? '',
		enumType: inflection.enumType ?? '',
		filterType: inflection.filterType ?? null,
		inputType: inflection.inputType ?? '',
		orderByType: inflection.orderByType ?? '',
		patchField: inflection.patchField ?? '',
		patchType: inflection.patchType ?? null,
		tableFieldName: inflection.tableFieldName ?? '',
		tableType: inflection.tableType ?? '',
		typeName: inflection.typeName ?? '',
		updateByPrimaryKey: inflection.updateByPrimaryKey ?? null,
		updatePayloadType: inflection.updatePayloadType ?? null,
	};
}

function convertQueryNames(query: MetaschemaTableQuery | null | undefined): TableQueryNames | undefined {
	if (!query) return undefined;
	return {
		all: query.all,
		one: query.one ?? null,
		create: query.create ?? '',
		update: query.update ?? null,
		delete: query.delete ?? null,
	};
}

/**
 * Convert a camelCasePlural codec name (as emitted by the current _meta endpoint) to
 * PascalCaseSingular (matching _meta.tables[].name format).
 * e.g. "routes" → "Route", "routeZones" → "RouteZone",
 *      "deliveryZones" → "DeliveryZone", "driverVehicleAssignments" → "DriverVehicleAssignment"
 */
export function codecNameToTableName(name: string): string {
	if (!name) return name;
	const singular = singularize(name);
	return singular.charAt(0).toUpperCase() + singular.slice(1);
}

export function cleanTable(metaTable: MetaTable): CleanTable {
	const relations = metaTable.relations;

	return {
		name: metaTable.name,
		schemaName: metaTable.schemaName ?? null,
		inflection: convertInflection(metaTable.inflection),
		query: convertQueryNames(metaTable.query),
		fields: (metaTable.fields || [])
			.filter((f): f is NonNullable<typeof f> => f != null)
			.map((field) => ({
				name: pgFieldToCamelCase(field.name),
				type: {
					gqlType: field.type.gqlType,
					isArray: field.type.isArray,
					modifier: field.type.modifier,
					pgAlias: field.type.pgAlias,
					pgType: field.type.pgType,
					subtype: field.type.subtype,
					typmod: field.type.typmod,
					...(field.type.encoding ? { encoding: field.type.encoding } : {}),
				},
				isNotNull: field.isNotNull ?? field.type.isNotNull ?? null,
				hasDefault: field.hasDefault ?? field.type.hasDefault ?? null,
				...(field.description != null ? { description: field.description } : {}),
				...(field.isPrimaryKey != null ? { isPrimaryKey: field.isPrimaryKey } : {}),
				...(field.isForeignKey != null ? { isForeignKey: field.isForeignKey } : {}),
				...(field.enumValues?.values ? { enumValues: field.enumValues.values } : {}),
			})),
		indexes: (metaTable.indexes ?? []).filter((index): index is NonNullable<typeof index> => index != null),
		storage: metaTable.storage ?? null,
		search: metaTable.search ?? null,
		i18n: metaTable.i18n ?? null,
		realtime: metaTable.realtime ?? null,
		scope: metaTable.scope ?? null,
		relations: {
			belongsTo: (relations?.belongsTo || [])
				.filter((r): r is NonNullable<typeof r> => r != null)
				.map((relation) => ({
					fieldName: relation.fieldName ?? null,
					isUnique: relation.isUnique,
					referencesTable: codecNameToTableName(relation.references?.name || ''),
					type: relation.type ?? null,
					keys: (relation.keys || [])
						.filter((k): k is NonNullable<typeof k> => k != null)
						.map((key) => ({
							name: pgFieldToCamelCase(key.name),
							type: {
								gqlType: key.type?.gqlType || '',
								isArray: key.type?.isArray || false,
								modifier: key.type?.modifier,
								pgAlias: key.type?.pgAlias,
								pgType: key.type?.pgType,
								subtype: key.type?.subtype,
								typmod: key.type?.typmod,
							},
						})),
				})),
			hasOne: (relations?.hasOne || [])
				.filter((r): r is NonNullable<typeof r> => r != null)
				.map((relation) => ({
					fieldName: relation.fieldName ?? null,
					isUnique: relation.isUnique,
					referencedByTable: codecNameToTableName(relation.referencedBy?.name || ''),
					type: relation.type ?? null,
					keys: (relation.keys || [])
						.filter((k): k is NonNullable<typeof k> => k != null)
						.map((key) => ({
							name: pgFieldToCamelCase(key.name),
							type: {
								gqlType: key.type?.gqlType || '',
								isArray: key.type?.isArray || false,
								modifier: key.type?.modifier,
								pgAlias: key.type?.pgAlias,
								pgType: key.type?.pgType,
								subtype: key.type?.subtype,
								typmod: key.type?.typmod,
							},
						})),
				})),
			hasMany: (relations?.hasMany || [])
				.filter((r): r is NonNullable<typeof r> => r != null)
				.map((relation) => ({
					fieldName: relation.fieldName ?? null,
					isUnique: relation.isUnique,
					referencedByTable: codecNameToTableName(relation.referencedBy?.name || ''),
					type: relation.type ?? null,
					keys: (relation.keys || [])
						.filter((k): k is NonNullable<typeof k> => k != null)
						.map((key) => ({
							name: pgFieldToCamelCase(key.name),
							type: {
								gqlType: key.type?.gqlType || '',
								isArray: key.type?.isArray || false,
								modifier: key.type?.modifier,
								pgAlias: key.type?.pgAlias,
								pgType: key.type?.pgType,
								subtype: key.type?.subtype,
								typmod: key.type?.typmod,
							},
						})),
				})),
			manyToMany: (() => {
				const all = (relations?.manyToMany || [])
					.filter((r): r is NonNullable<typeof r> => r != null)
					.map((relation) => ({
						fieldName: relation.fieldName ?? null,
						rightTable: codecNameToTableName(relation.rightTable?.name || ''),
						junctionTable: codecNameToTableName(relation.junctionTable?.name || ''),
						type: relation.type ?? null,
						junctionLeftKeyFields: (relation.junctionLeftKeyAttributes || [])
							.filter((a): a is NonNullable<typeof a> => a != null)
							.map((a) => pgFieldToCamelCase(a.name)),
						junctionRightKeyFields: (relation.junctionRightKeyAttributes || [])
							.filter((a): a is NonNullable<typeof a> => a != null)
							.map((a) => pgFieldToCamelCase(a.name)),
						leftKeyFields: (relation.leftKeyAttributes || [])
							.filter((a): a is NonNullable<typeof a> => a != null)
							.map((a) => pgFieldToCamelCase(a.name)),
						rightKeyFields: (relation.rightKeyAttributes || [])
							.filter((a): a is NonNullable<typeof a> => a != null)
							.map((a) => pgFieldToCamelCase(a.name)),
					}));
				// Dedup by rightTable — when multiple M:N paths exist to the same
				// target table (e.g. via dedicated junction vs incidental junction),
				// keep the last entry (dedicated junctions come after incidental ones).
				const seen = new Map<string, typeof all[number]>();
				for (const rel of all) {
					if (!rel.rightTable) continue;
					seen.set(rel.rightTable, rel);
				}
				return Array.from(seen.values());
			})(),
		},
	};
}

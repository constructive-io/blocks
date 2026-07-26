import { TypedDocumentString } from '@constructive-io/graphql-query/client';

import type {
	MetaContractCompatibility,
	MetaContractIntrospectionQuery,
	MetaContractTypeAlias,
	MetaQuery,
	MetaschemaSearchConfig,
} from './meta-query.types';

export const META_CONTRACT_VERSION = '2026-07' as const;

/** Every GraphQL field referenced by {@link META_DOCUMENT}, grouped by owning type. */
export const META_CONTRACT_REQUIREMENTS = {
	queryType: { typeName: 'Query', fields: ['_meta'] },
	metaSchema: { typeName: 'MetaSchema', fields: ['tables'] },
	metaTable: {
		typeName: 'MetaTable',
		fields: [
			'name',
			'schemaName',
			'query',
			'fields',
			'inflection',
			'indexes',
			'constraints',
			'foreignKeyConstraints',
			'primaryKeyConstraints',
			'uniqueConstraints',
			'relations',
			'storage',
			'search',
			'i18n',
			'realtime',
			'scope',
		],
	},
	metaTableQuery: { typeName: 'MetaQuery', fields: ['all', 'one', 'create', 'update', 'delete'] },
	metaField: {
		typeName: 'MetaField',
		fields: [
			'name',
			'type',
			'isNotNull',
			'hasDefault',
			'isPrimaryKey',
			'isForeignKey',
			'description',
			'enumValues',
		],
	},
	metaEnum: { typeName: 'MetaEnum', fields: ['name', 'values'] },
	metaType: {
		typeName: 'MetaType',
		fields: ['pgType', 'gqlType', 'isArray', 'isNotNull', 'hasDefault', 'subtype', 'encoding'],
	},
	metaEncoding: {
		typeName: 'MetaScalarEncoding',
		fields: ['kind', 'elementType', 'dimensions', 'geometrySubtype', 'srid', 'dotPath'],
	},
	metaIndex: { typeName: 'MetaIndex', fields: ['name', 'isUnique', 'isPrimary', 'columns', 'fields'] },
	metaPrimaryKey: { typeName: 'MetaPrimaryKeyConstraint', fields: ['name', 'fields'] },
	metaUnique: { typeName: 'MetaUniqueConstraint', fields: ['name', 'fields'] },
	metaForeignKey: {
		typeName: 'MetaForeignKeyConstraint',
		fields: ['name', 'fields', 'referencedTable', 'referencedFields', 'refFields', 'refTable'],
	},
	metaRefTable: { typeName: 'MetaRefTable', fields: ['name'] },
	metaConstraints: { typeName: 'MetaConstraints', fields: ['primaryKey', 'unique', 'foreignKey'] },
	metaInflection: {
		typeName: 'MetaInflection',
		fields: [
			'tableType',
			'allRows',
			'connection',
			'edge',
			'filterType',
			'orderByType',
			'conditionType',
			'patchType',
			'createInputType',
			'createPayloadType',
			'updatePayloadType',
			'deletePayloadType',
		],
	},
	metaRelations: {
		typeName: 'MetaRelations',
		fields: ['belongsTo', 'has', 'hasOne', 'hasMany', 'manyToMany'],
	},
	metaBelongsTo: {
		typeName: 'MetaBelongsToRelation',
		fields: ['fieldName', 'isUnique', 'type', 'keys', 'references'],
	},
	metaHas: {
		typeName: 'MetaHasRelation',
		fields: ['fieldName', 'isUnique', 'type', 'keys', 'referencedBy'],
	},
	metaManyToMany: {
		typeName: 'MetaManyToManyRelation',
		fields: [
			'fieldName',
			'type',
			'junctionTable',
			'junctionLeftConstraint',
			'junctionLeftKeyAttributes',
			'junctionRightConstraint',
			'junctionRightKeyAttributes',
			'leftKeyAttributes',
			'rightKeyAttributes',
			'rightTable',
		],
	},
	metaStorage: { typeName: 'MetaStorage', fields: ['isFilesTable', 'isBucketsTable'] },
	metaSearch: {
		typeName: 'MetaSearch',
		fields: ['algorithms', 'columns', 'hasUnifiedSearch', 'config'],
	},
	metaSearchColumn: { typeName: 'MetaSearchColumn', fields: ['name', 'algorithm'] },
	metaSearchConfig: {
		typeName: 'MetaSearchConfig',
		fields: ['weights', 'boostRecent', 'boostRecencyField', 'boostRecencyDecay'],
	},
	metaI18n: { typeName: 'MetaI18n', fields: ['translationTable', 'translatableFields'] },
	metaI18nField: { typeName: 'MetaI18nField', fields: ['name', 'type'] },
	metaRealtime: { typeName: 'MetaRealtime', fields: ['subscriptionFieldName'] },
	metaScope: { typeName: 'MetaScope', fields: ['scope', 'tier', 'keyColumn', 'entityTable', 'source'] },
} as const satisfies Record<MetaContractTypeAlias, { typeName: string; fields: readonly string[] }>;

const metaContractIntrospectionFields = Object.entries(META_CONTRACT_REQUIREMENTS)
	.map(([alias, { typeName }]) => `${alias}: __type(name: "${typeName}") { name fields { name } }`)
	.join('\n\t\t');

export const META_CONTRACT_INTROSPECTION_SOURCE = /* GraphQL */ `
	query ConstructiveMetaContract {
		${metaContractIntrospectionFields}
	}
`;

export const META_CONTRACT_INTROSPECTION_DOCUMENT = new TypedDocumentString<
	MetaContractIntrospectionQuery,
	Record<string, never>
>(META_CONTRACT_INTROSPECTION_SOURCE);

export const META_QUERY_SOURCE = /* GraphQL */ `
	query ConstructiveMeta {
		_meta {
			tables {
				name
				schemaName
				query { all one create update delete }
				fields { ...ConstructiveMetaField }
				inflection {
					tableType
					allRows
					connection
					edge
					filterType
					orderByType
					conditionType
					patchType
					createInputType
					createPayloadType
					updatePayloadType
					deletePayloadType
				}
				indexes {
					name
					isUnique
					isPrimary
					columns
					fields { ...ConstructiveMetaField }
				}
				constraints {
					primaryKey { name fields { ...ConstructiveMetaField } }
					unique { name fields { ...ConstructiveMetaField } }
					foreignKey { ...ConstructiveMetaForeignKey }
				}
				foreignKeyConstraints { ...ConstructiveMetaForeignKey }
				primaryKeyConstraints { name fields { ...ConstructiveMetaField } }
				uniqueConstraints { name fields { ...ConstructiveMetaField } }
				relations {
					belongsTo {
						fieldName
						isUnique
						type
						keys { ...ConstructiveMetaField }
						references { name }
					}
					has {
						fieldName
						isUnique
						type
						keys { ...ConstructiveMetaField }
						referencedBy { name }
					}
					hasOne {
						fieldName
						isUnique
						type
						keys { ...ConstructiveMetaField }
						referencedBy { name }
					}
					hasMany {
						fieldName
						isUnique
						type
						keys { ...ConstructiveMetaField }
						referencedBy { name }
					}
					manyToMany {
						fieldName
						type
						junctionTable { name }
						junctionLeftConstraint { ...ConstructiveMetaForeignKey }
						junctionLeftKeyAttributes { ...ConstructiveMetaField }
						junctionRightConstraint { ...ConstructiveMetaForeignKey }
						junctionRightKeyAttributes { ...ConstructiveMetaField }
						leftKeyAttributes { ...ConstructiveMetaField }
						rightKeyAttributes { ...ConstructiveMetaField }
						rightTable { name }
					}
				}
				storage { isFilesTable isBucketsTable }
				search {
					algorithms
					columns { name algorithm }
					hasUnifiedSearch
					config { weights boostRecent boostRecencyField boostRecencyDecay }
				}
				i18n { translationTable translatableFields { name type } }
				realtime { subscriptionFieldName }
				scope { scope tier keyColumn entityTable source }
			}
		}
	}

	fragment ConstructiveMetaType on MetaType {
		pgType
		gqlType
		isArray
		isNotNull
		hasDefault
		subtype
		encoding {
			kind
			elementType
			dimensions
			geometrySubtype
			srid
			dotPath
		}
	}

	fragment ConstructiveMetaField on MetaField {
		name
		type { ...ConstructiveMetaType }
		isNotNull
		hasDefault
		isPrimaryKey
		isForeignKey
		description
		enumValues { name values }
	}

	fragment ConstructiveMetaForeignKey on MetaForeignKeyConstraint {
		name
		fields { ...ConstructiveMetaField }
		referencedTable
		referencedFields
		refFields { ...ConstructiveMetaField }
		refTable { name }
	}
`;

export const META_DOCUMENT = new TypedDocumentString<MetaQuery, Record<string, never>>(META_QUERY_SOURCE);

export function assessMetaContract(
	result: MetaContractIntrospectionQuery | null | undefined,
): MetaContractCompatibility {
	if (!result?.queryType) {
		return {
			contractVersion: META_CONTRACT_VERSION,
			status: 'unavailable',
			missing: ['Query'],
		};
	}

	const missing: string[] = [];
	for (const [typeAlias, requirement] of Object.entries(META_CONTRACT_REQUIREMENTS) as Array<
		[MetaContractTypeAlias, (typeof META_CONTRACT_REQUIREMENTS)[MetaContractTypeAlias]]
	>) {
		const type = result[typeAlias];
		if (!type) {
			missing.push(requirement.typeName);
			continue;
		}

		const available = new Set((type.fields ?? []).map((field) => field?.name).filter(Boolean));
		for (const field of requirement.fields) {
			if (!available.has(field)) missing.push(`${type.name ?? requirement.typeName}.${field}`);
		}
	}

	const hasMetaRoot = !missing.includes('Query._meta');
	return {
		contractVersion: META_CONTRACT_VERSION,
		status: missing.length === 0 ? 'compatible' : hasMetaRoot ? 'incompatible' : 'unavailable',
		missing,
	};
}

export class MetaContractError extends Error {
	readonly code: 'META_CONTRACT_UNAVAILABLE' | 'META_CONTRACT_INCOMPATIBLE';
	readonly compatibility: MetaContractCompatibility;

	constructor(compatibility: MetaContractCompatibility) {
		const unavailable = compatibility.status === 'unavailable';
		const detail = compatibility.missing.length > 0 ? ` Missing: ${compatibility.missing.join(', ')}.` : '';
		super(
			unavailable
				? `This endpoint does not expose Constructive _meta ${compatibility.contractVersion}.${detail}`
				: `This endpoint must be upgraded to Constructive _meta ${compatibility.contractVersion}.${detail}`,
		);
		this.name = 'MetaContractError';
		this.code = unavailable ? 'META_CONTRACT_UNAVAILABLE' : 'META_CONTRACT_INCOMPATIBLE';
		this.compatibility = compatibility;
	}
}

export function assertMetaContract(
	result: MetaContractIntrospectionQuery | null | undefined,
): MetaContractCompatibility {
	const compatibility = assessMetaContract(result);
	if (compatibility.status !== 'compatible') throw new MetaContractError(compatibility);
	return compatibility;
}

export function assertMetaQuery(result: MetaQuery | null | undefined): asserts result is MetaQuery {
	if (!result?._meta || !Array.isArray(result._meta.tables)) {
		throw new MetaContractError({
			contractVersion: META_CONTRACT_VERSION,
			status: 'unavailable',
			missing: ['_meta.tables'],
		});
	}
}

/** Decode the JSON-string transport used by `MetaSearchConfig.weights`. */
export function parseMetaSearchWeights(
	config: MetaschemaSearchConfig | null | undefined,
): Record<string, number> | null {
	if (!config?.weights) return null;

	try {
		const parsed: unknown = JSON.parse(config.weights);
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;

		const weights: Record<string, number> = {};
		for (const [name, value] of Object.entries(parsed)) {
			if (typeof value !== 'number' || !Number.isFinite(value)) return null;
			weights[name] = value;
		}
		return weights;
	} catch {
		return null;
	}
}

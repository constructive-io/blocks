import { TypedDocumentString } from '@constructive-io/graphql-query/client';

import { META_CONTRACT_REQUIREMENTS, assessMetaContract } from '../meta-query';
import type {
	MetaContractCompatibility,
	MetaContractIntrospectionQuery,
	MetaIntrospectionType,
	MetaQuery,
} from '../meta-query.types';

/**
 * `_meta` fields a client may use when the server has them. The required set
 * stays {@link META_CONTRACT_REQUIREMENTS}; everything here is optional, so an
 * older server keeps loading and the query only selects what exists.
 */
export const META_OPTIONAL_CAPABILITIES = {
	metaTable: { typeName: 'MetaTable', fields: ['kind', 'description', 'isJunction'] },
	metaField: {
		typeName: 'MetaField',
		fields: ['allowedValues', 'isRequiredOnCreate', 'isWritableOnCreate', 'isWritableOnUpdate', 'isComputed', 'file'],
	},
	metaType: { typeName: 'MetaType', fields: ['maxLength', 'precision', 'scale'] },
	metaBelongsTo: { typeName: 'MetaBelongsToRelation', fields: ['refKeys'] },
	metaHas: { typeName: 'MetaHasRelation', fields: ['remoteKeys'] },
	metaStorage: { typeName: 'MetaStorage', fields: ['filesType', 'bucketsType', 'downloadUrlField', 'upload'] },
	metaFileField: { typeName: 'MetaFileField', fields: ['kind', 'isMultiple', 'filesType'] },
	metaStorageUpload: {
		typeName: 'MetaStorageUpload',
		fields: ['mutation', 'inputType', 'payloadType', 'bulkMutation', 'requiresOwnerId'],
	},
} as const;

export type MetaOptionalTypeAlias = keyof typeof META_OPTIONAL_CAPABILITIES;

type OptionalField<Alias extends MetaOptionalTypeAlias> =
	(typeof META_OPTIONAL_CAPABILITIES)[Alias]['fields'][number];

/** The optional `_meta` fields this server has, per Meta type. */
export type MetaCapabilities = {
	readonly [Alias in MetaOptionalTypeAlias]: ReadonlySet<OptionalField<Alias>>;
};

/** Contract introspection plus the optional Meta types that only newer servers define. */
export type MetaCapabilityIntrospectionQuery = MetaContractIntrospectionQuery & {
	[Alias in MetaOptionalTypeAlias]?: MetaIntrospectionType | null;
};

export interface MetaCapabilityAssessment {
	/** Required-contract result, identical to {@link assessMetaContract}. */
	compatibility: MetaContractCompatibility;
	/** Optional fields the server has. */
	capabilities: MetaCapabilities;
}

const capabilityAliases = new Map<string, string>();
for (const [alias, { typeName }] of Object.entries(META_CONTRACT_REQUIREMENTS)) capabilityAliases.set(alias, typeName);
for (const [alias, { typeName }] of Object.entries(META_OPTIONAL_CAPABILITIES)) capabilityAliases.set(alias, typeName);

/** One request: the field names of every required and optional Meta type. */
export const META_CAPABILITY_INTROSPECTION_SOURCE = /* GraphQL */ `
	query ConstructiveMetaContract {
		${[...capabilityAliases]
			.map(([alias, typeName]) => `${alias}: __type(name: "${typeName}") { name fields { name } }`)
			.join('\n\t\t')}
	}
`;

export const META_CAPABILITY_INTROSPECTION_DOCUMENT = new TypedDocumentString<
	MetaCapabilityIntrospectionQuery,
	Record<string, never>
>(META_CAPABILITY_INTROSPECTION_SOURCE);

function fieldNames(type: MetaIntrospectionType | null | undefined): Set<string> {
	return new Set((type?.fields ?? []).flatMap((field) => (field?.name ? [field.name] : [])));
}

/** No optional capability: the selection an older server supports. */
export function emptyMetaCapabilities(): MetaCapabilities {
	return Object.fromEntries(
		Object.keys(META_OPTIONAL_CAPABILITIES).map((alias) => [alias, new Set()]),
	) as unknown as MetaCapabilities;
}

/** Split a contract introspection result into the required verdict and the optional fields present. */
export function assessMetaCapabilities(
	result: MetaCapabilityIntrospectionQuery | null | undefined,
): MetaCapabilityAssessment {
	const compatibility = assessMetaContract(result);
	const capabilities = Object.fromEntries(
		(Object.entries(META_OPTIONAL_CAPABILITIES) as Array<
			[MetaOptionalTypeAlias, (typeof META_OPTIONAL_CAPABILITIES)[MetaOptionalTypeAlias]]
		>).map(([alias, requirement]) => {
			const available = fieldNames(result?.[alias]);
			const fields: readonly string[] = requirement.fields;
			return [alias, new Set(fields.filter((field) => available.has(field)))];
		}),
	) as unknown as MetaCapabilities;
	return { compatibility, capabilities };
}

function has<Alias extends MetaOptionalTypeAlias>(
	capabilities: MetaCapabilities,
	alias: Alias,
	field: OptionalField<Alias>,
): boolean {
	return (capabilities[alias] as ReadonlySet<string>).has(field);
}

function present<Alias extends MetaOptionalTypeAlias>(
	capabilities: MetaCapabilities,
	alias: Alias,
	fields: readonly OptionalField<Alias>[],
): string {
	return fields.filter((field) => has(capabilities, alias, field)).join(' ');
}

function fileSelection(capabilities: MetaCapabilities): string {
	if (!has(capabilities, 'metaField', 'file') || !has(capabilities, 'metaFileField', 'kind')) return '';
	return `file { ${present(capabilities, 'metaFileField', ['kind', 'isMultiple', 'filesType'])} }`;
}

function uploadSelection(capabilities: MetaCapabilities): string {
	if (!has(capabilities, 'metaStorage', 'upload')) return '';
	const fields = present(capabilities, 'metaStorageUpload', [
		'mutation',
		'inputType',
		'payloadType',
		'bulkMutation',
		'requiresOwnerId',
	]);
	return fields ? `upload { ${fields} }` : '';
}

/**
 * Build the `_meta` query text from what the server has. With no optional
 * capability this selects exactly the required contract, so an older server
 * loads unchanged.
 */
export function buildMetaQuerySource(capabilities: MetaCapabilities = emptyMetaCapabilities()): string {
	const tableExtras = present(capabilities, 'metaTable', ['kind', 'description', 'isJunction']);
	const typeExtras = present(capabilities, 'metaType', ['maxLength', 'precision', 'scale']);
	const tableFieldExtras = [
		present(capabilities, 'metaField', [
			'allowedValues',
			'isRequiredOnCreate',
			'isWritableOnCreate',
			'isWritableOnUpdate',
			'isComputed',
		]),
		fileSelection(capabilities),
	].filter(Boolean).join(' ');
	const refKeys = has(capabilities, 'metaBelongsTo', 'refKeys') ? 'refKeys { ...ConstructiveMetaField }' : '';
	const remoteKeys = has(capabilities, 'metaHas', 'remoteKeys') ? 'remoteKeys { ...ConstructiveMetaField }' : '';
	const storageExtras = [
		present(capabilities, 'metaStorage', ['filesType', 'bucketsType', 'downloadUrlField']),
		uploadSelection(capabilities),
	].filter(Boolean).join(' ');
	const hasRelation = (name: string) => /* GraphQL */ `
					${name} {
						fieldName
						isUnique
						type
						keys { ...ConstructiveMetaField }
						referencedBy { name }
						${remoteKeys}
					}`;

	return /* GraphQL */ `
	query ConstructiveMeta {
		_meta {
			tables {
				name
				schemaName
				${tableExtras}
				query { all one create update delete }
				fields { ...ConstructiveMetaTableField }
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
						${refKeys}
					}${hasRelation('has')}${hasRelation('hasOne')}${hasRelation('hasMany')}
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
				storage { isFilesTable isBucketsTable ${storageExtras} }
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
		${typeExtras}
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

	fragment ConstructiveMetaTableField on MetaField {
		...ConstructiveMetaField
		${tableFieldExtras}
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
}

/** Typed `_meta` document for a capability set. */
export function buildMetaDocument(
	capabilities: MetaCapabilities = emptyMetaCapabilities(),
): TypedDocumentString<MetaQuery, Record<string, never>> {
	return new TypedDocumentString<MetaQuery, Record<string, never>>(buildMetaQuerySource(capabilities));
}

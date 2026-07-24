// Meta query types
export type {
	MetaQuery,
	Metaschema,
	MetaSchema,
	MetaschemaTable,
	MetaschemaTableQuery,
	MetaschemaField,
	MetaschemaEnum,
	MetaschemaType,
	MetaType,
	MetaschemaScalarEncoding,
	ScalarEncodingKind,
	MetaschemaTableInflection,
	MetaschemaIndex,
	MetaschemaConstraints,
	MetaschemaConstraint,
	MetaschemaCheckConstraint,
	MetaschemaExclusionConstraint,
	MetaschemaForeignKeyConstraint,
	MetaschemaPrimaryKeyConstraint,
	MetaschemaUniqueConstraint,
	MetaschemaTableRelation,
	MetaschemaTableBelongsToRelation,
	MetaschemaTableHasRelation,
	MetaschemaTableManyToManyRelation,
	MetaschemaStorage,
	MetaschemaSearchColumn,
	MetaschemaSearchConfig,
	MetaschemaSearch,
	MetaschemaI18nField,
	MetaschemaI18n,
	MetaschemaRealtime,
	MetaschemaScopeTier,
	MetaschemaScope,
	MetaContractIntrospectionQuery,
	MetaContractTypeAlias,
	MetaContractCompatibility,
	MetaContractStatus,
} from './meta-query.types';

export {
	META_CONTRACT_VERSION,
	META_CONTRACT_REQUIREMENTS,
	META_CONTRACT_INTROSPECTION_SOURCE,
	META_CONTRACT_INTROSPECTION_DOCUMENT,
	META_QUERY_SOURCE,
	META_DOCUMENT,
	MetaContractError,
	assessMetaContract,
	assertMetaContract,
	assertMetaQuery,
	parseMetaSearchWeights,
} from './meta-query';

// Data types (Dashboard-specific adapter + meta types)
export {
	pgFieldToCamelCase,
	cleanTable,
} from './data.types';
export type {
	MetaTable,
	MetaField,
	MetaFieldType,
	MetaRelations,
	MetaBelongsToRelation,
	MetaHasOneRelation,
	MetaHasManyRelation,
	MetaManyToManyRelation,
	CleanTable,
	CleanField,
	CleanRelations,
	CleanBelongsToRelation,
	CleanHasOneRelation,
	CleanHasManyRelation,
	CleanManyToManyRelation,
	TableInflection,
	TableQueryNames,
} from './data.types';

export {
	DEFAULT_CONSOLE_APPLICATION_SCOPES,
	selectConsoleDataTables,
} from './console-data-tables';
export type { SelectConsoleDataTablesOptions } from './console-data-tables';

export {
	assessTableWriteCapability,
	getRowIdentityDefinition,
	resolveRowIdentity,
	rowIdentityToPrimaryKey,
	serializeRowIdentity,
} from './row-identity';
export type {
	RowIdentity,
	RowIdentityDefinition,
	RowIdentityField,
	RowIdentityObject,
	RowIdentityResolution,
	RowIdentityValue,
	TableWriteCapability,
} from './row-identity';

export {
	analyzeSchemaIntrospectionCompatibility,
	assessSchemaIntrospectionCompatibility,
	normalizeSchemaEnumInputValues,
} from './schema-introspection-compatibility';
export type {
	SchemaEnumFieldMapping,
	SchemaEnumValueToken,
	SchemaIntrospectionAnalysis,
	SchemaIntrospectionCompatibility,
	SchemaIntrospectionCompatibilityStatus,
} from './schema-introspection-compatibility';

// Query/filter/pagination types
export type {
	PageInfo,
	ConnectionResult,
	QueryOptions,
	FilterOperator,
	FieldFilter,
	RelationalFilter,
	Filter,
	OrderByItem,
} from './data.types';
export type { MutationOptions } from './data.types';

// Typed document
export { TypedDocumentString } from '@constructive-io/graphql-query/client';

// Field selector
export {
	convertToSelectionOptions,
	isRelationalField,
	getAvailableRelations,
	validateFieldSelection,
} from '@constructive-io/graphql-query/generators';
export type {
	SimpleFieldSelection,
	FieldSelectionPreset,
	FieldSelection,
	SelectionOptions,
} from '@constructive-io/graphql-query/types/selection';

// NOTE: QueryFieldSelection and QuerySelectionOptions from types/core are
// different types than FieldSelection/SelectionOptions from types/selection.
// The query-builder types use the QB-prefixed aliases below.

// Query generators and naming helpers
export {
	toCamelCasePlural,
	toCamelCaseSingular,
	toPatchFieldName,
	toCreateMutationName,
	toUpdateMutationName,
	toDeleteMutationName,
	toCreateInputTypeName,
	toUpdateInputTypeName,
	toDeleteInputTypeName,
	toFilterTypeName,
	toOrderByEnumValue,
	toOrderByTypeName,
	normalizeInflectionValue,
	cleanTableToMetaObject,
	generateIntrospectionSchema,
	createASTQueryBuilder,
	buildSelect,
	buildFindOne,
	buildCount,
	buildPostGraphileCreate,
	buildPostGraphileUpdate,
	buildPostGraphileDelete,
} from '@constructive-io/graphql-query/generators';

// Error handler
export {
	DataErrorType,
	DataError,
	createDataError,
	createError,
	PG_ERROR_CODES,
	parseGraphQLErrorCode,
	Errors,
	parseGraphQLError,
	parseError,
	handleDataError,
	withRetry,
	CONSTRAINT_MESSAGES,
	getConstraintMessage,
	getHumanReadableError,
} from './error-handler';
export type {
	DataErrorOptions,
	GraphQLErrorLocation,
	GraphQLErrorPath,
	GraphQLError,
} from './error-handler';

// Mutation input
export {
	stripEmpty,
	asFieldIds,
	prepareMutationInput,
	prepareCreateInput,
	prepareUpdateInput,
	preparePatchInput,
} from './mutation-input';
export type {
	PartialBy,
	PrepareInputOptions,
} from './mutation-input';

// Query builder
export { QueryBuilder } from '@constructive-io/graphql-query/query-builder';
export type {
	ASTNode,
	NestedProperties,
	QueryProperty,
	QueryDefinition,
	MutationDefinition,
	MetaFieldType as QBMetaFieldType,
	MetaField as QBMetaField,
	MetaConstraint,
	MetaForeignConstraint,
	MetaTable as QBMetaTable,
	MetaObject,
	GraphQLVariableValue,
	GraphQLVariables,
	QueryFieldSelection,
	QuerySelectionOptions,
	QueryBuilderInstance,
	ASTFunctionParams,
	MutationASTParams,
	QueryBuilderOptions,
	QueryBuilderResult,
	IQueryBuilder,
	ObjectArrayItem,
	StrictRecord,
	QueryIntrospectionSchema as IntrospectionSchema,
} from '@constructive-io/graphql-query/types/core';
export { isGraphQLVariableValue, isGraphQLVariables } from '@constructive-io/graphql-query/types/core';

// Standard introspection complements `_meta` for filters, pagination, input
// objects, enum values, and custom root operations.
export { SCHEMA_INTROSPECTION_QUERY } from '@constructive-io/graphql-query/introspect/schema-query';
export type { IntrospectionQueryResponse } from '@constructive-io/graphql-query/introspect/schema-query';
export {
	buildTypeRegistry,
	transformSchemaToOperations,
	filterOperations,
	getTableOperationNames,
	isTableOperation,
	getCustomOperations,
} from '@constructive-io/graphql-query/introspect/transform-schema';
export type {
	TransformSchemaResult,
	TableOperationNames,
} from '@constructive-io/graphql-query/introspect/transform-schema';

// AST builders
export {
	getAll,
	getCount,
	getMany,
	getOne,
	createOne,
	patchOne,
	deleteOne,
	getSelections,
} from '@constructive-io/graphql-query/ast';

// Custom AST builders
export {
	getCustomAst,
	getCustomAstForCleanField,
	requiresSubfieldSelection,
	geometryPointAst,
	geometryCollectionAst,
	geometryAst,
	intervalAst,
	isIntervalType,
} from '@constructive-io/graphql-query/custom-ast';

// MetaObject utilities
export { convertFromMetaSchema } from '@constructive-io/graphql-query/meta-object/convert';
export { validateMetaObject } from '@constructive-io/graphql-query/meta-object/validate';
export type { ValidationResult } from '@constructive-io/graphql-query/meta-object/validate';

// Policy provisioning contract
export {
	MEMBERSHIP_TYPES,
	CRUD_OPERATIONS,
	CRUD_TO_PRIVILEGE,
	DEFAULT_CRUD_GRANT_PRIVILEGES,
	POLICY_PROVISIONING_CONFIG,
	DATA_NODE_GENERATED_FIELDS,
	getPolicyProvisioningConfig,
	getPolicyCategory,
	getDataNodeForPolicy,
	policyRequiresDataNode,
	policyCanBeNodeless,
	getGeneratedFields,
	hasGeneratedFields,
	getPolicyFieldDefaults,
	getFieldsRequiringColumns,
	sanitizePolicyData,
	injectSchemaFields,
	buildNodeData,
	buildNodeDataForDataNodeType,
	groupCrudOperationsByConfig,
} from './policy-provisioning';
export type {
	PolicyFieldType,
	PolicyFieldComponent,
	PolicyProvisioningCategory,
	PolicyFieldOverride,
	PolicyProvisioningConfig,
	GeneratedField,
	CrudOperation,
	CrudOperationPolicyConfig,
	GroupedCrudPrivileges,
} from './policy-provisioning';

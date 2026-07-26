/**
 * Runtime types for Constructive's PostGraphile `_meta` contract.
 *
 * `_meta` describes database facts that standard GraphQL introspection cannot:
 * exact table inflections, PostgreSQL scalar encodings, relations, constraints,
 * and Constructive capabilities such as storage, search, i18n, realtime, and
 * provisioning scope. Standard introspection remains the source of truth for
 * operation arguments, input objects, enums, pagination, and custom operations.
 */

export interface MetaQuery {
	__typename?: 'Query';
	_meta?: Metaschema | null;
}

export interface Metaschema {
	__typename?: 'MetaSchema' | 'Metaschema';
	tables?: Array<MetaschemaTable | null> | null;
}

/** Preferred current-contract name. `Metaschema` remains for API compatibility. */
export type MetaSchema = Metaschema;

export interface MetaschemaTable {
	__typename?: 'MetaTable' | 'MetaschemaTable';
	name: string;
	schemaName?: string | null;
	query?: MetaschemaTableQuery | null;
	fields?: Array<MetaschemaField | null> | null;
	inflection?: MetaschemaTableInflection | null;
	indexes?: Array<MetaschemaIndex | null> | null;
	constraints?: MetaschemaConstraints | MetaschemaConstraint[] | null;
	foreignKeyConstraints?: Array<MetaschemaForeignKeyConstraint | null> | null;
	primaryKeyConstraints?: Array<MetaschemaPrimaryKeyConstraint | null> | null;
	uniqueConstraints?: Array<MetaschemaUniqueConstraint | null> | null;
	relations?: MetaschemaTableRelation | null;
	storage?: MetaschemaStorage | null;
	search?: MetaschemaSearch | null;
	i18n?: MetaschemaI18n | null;
	realtime?: MetaschemaRealtime | null;
	scope?: MetaschemaScope | null;

	/** @deprecated Legacy pre-July contract field. */
	checkConstraints?: Array<MetaschemaCheckConstraint | null> | null;
	/** @deprecated Legacy pre-July contract field. */
	exclusionConstraints?: Array<MetaschemaExclusionConstraint | null> | null;
}

/** Preferred current-contract name. */
export type MetaTable = MetaschemaTable;

export interface MetaschemaTableQuery {
	__typename?: 'MetaQuery';
	all: string;
	one?: string | null;
	create?: string | null;
	update?: string | null;
	delete?: string | null;
}

export interface MetaschemaField {
	__typename?: 'MetaField';
	name: string;
	type: MetaschemaType;
	isNotNull?: boolean | null;
	hasDefault?: boolean | null;
	isPrimaryKey?: boolean | null;
	isForeignKey?: boolean | null;
	description?: string | null;
	enumValues?: MetaschemaEnum | null;
}

/** Preferred current-contract name. */
export type MetaField = MetaschemaField;

export interface MetaschemaEnum {
	__typename?: 'MetaEnum';
	name: string;
	values: string[];
}

export type ScalarEncodingKind =
	| 'bigint'
	| 'datetime'
	| 'date'
	| 'time'
	| 'interval'
	| 'uuid'
	| 'geojson'
	| 'point'
	| 'inet'
	| 'ltree'
	| 'vector'
	| 'bytea'
	| 'composite';

export interface MetaschemaScalarEncoding {
	__typename?: 'MetaScalarEncoding';
	kind: ScalarEncodingKind;
	elementType?: string | null;
	dimensions?: number | null;
	geometrySubtype?: string | null;
	srid?: number | null;
	dotPath?: boolean | null;
}

export interface MetaschemaType {
	__typename?: 'MetaType' | 'MetaschemaType';
	gqlType: string;
	isArray: boolean;
	pgType: string;
	isNotNull?: boolean | null;
	hasDefault?: boolean | null;
	subtype?: string | null;
	encoding?: MetaschemaScalarEncoding | null;

	/** @deprecated Legacy pre-July contract field. */
	modifier?: number | null;
	/** @deprecated Legacy pre-July contract field. */
	pgAlias?: string | null;
	/** @deprecated Legacy pre-July contract field. */
	typmod?: number | null;
}

/** Preferred current-contract name. */
export type MetaType = MetaschemaType;

export interface MetaschemaTableInflection {
	__typename?: 'MetaInflection';
	tableType?: string | null;
	allRows?: string | null;
	connection?: string | null;
	edge?: string | null;
	filterType?: string | null;
	orderByType?: string | null;
	conditionType?: string | null;
	patchType?: string | null;
	createInputType?: string | null;
	createPayloadType?: string | null;
	updatePayloadType?: string | null;
	deletePayloadType?: string | null;

	/** @deprecated Legacy pre-July contract fields retained for source compatibility. */
	allRowsSimple?: string | null;
	createField?: string | null;
	deleteByPrimaryKey?: string | null;
	edgeField?: string | null;
	enumType?: string | null;
	inputType?: string | null;
	patchField?: string | null;
	tableFieldName?: string | null;
	typeName?: string | null;
	updateByPrimaryKey?: string | null;
}

export interface MetaschemaIndex {
	__typename?: 'MetaIndex';
	name: string;
	isUnique?: boolean | null;
	isPrimary?: boolean | null;
	columns?: string[] | null;
	fields?: Array<MetaschemaField | null> | null;
}

export interface MetaschemaConstraints {
	__typename?: 'MetaConstraints';
	primaryKey?: MetaschemaPrimaryKeyConstraint | null;
	unique?: Array<MetaschemaUniqueConstraint | null> | null;
	foreignKey?: Array<MetaschemaForeignKeyConstraint | null> | null;
}

/** Legacy flat constraint union retained for cached pre-July metadata. */
export type MetaschemaConstraint =
	| MetaschemaCheckConstraint
	| MetaschemaExclusionConstraint
	| MetaschemaForeignKeyConstraint
	| MetaschemaPrimaryKeyConstraint
	| MetaschemaUniqueConstraint;

export interface MetaschemaCheckConstraint {
	__typename?: 'MetaschemaCheckConstraint';
	name: string;
	fields?: Array<MetaschemaField | null> | null;
}

export interface MetaschemaExclusionConstraint {
	__typename?: 'MetaschemaExclusionConstraint';
	name: string;
	fields?: Array<MetaschemaField | null> | null;
}

export interface MetaschemaForeignKeyConstraint {
	__typename?: 'MetaForeignKeyConstraint';
	name: string;
	fields?: Array<MetaschemaField | null> | null;
	referencedTable?: string | null;
	referencedFields?: string[] | null;
	refFields?: Array<MetaschemaField | null> | null;
	refTable?: MetaschemaTableReference | null;
}

export interface MetaschemaPrimaryKeyConstraint {
	__typename?: 'MetaPrimaryKeyConstraint';
	name: string;
	fields?: Array<MetaschemaField | null> | null;
}

export interface MetaschemaUniqueConstraint {
	__typename?: 'MetaUniqueConstraint';
	name: string;
	fields?: Array<MetaschemaField | null> | null;
}

export interface MetaschemaTableReference {
	__typename?: 'MetaRefTable' | 'MetaschemaTable';
	name: string;
}

export interface MetaschemaTableRelation {
	__typename?: 'MetaRelations';
	belongsTo?: Array<MetaschemaTableBelongsToRelation | null> | null;
	has?: Array<MetaschemaTableHasRelation | null> | null;
	hasOne?: Array<MetaschemaTableHasRelation | null> | null;
	hasMany?: Array<MetaschemaTableHasRelation | null> | null;
	manyToMany?: Array<MetaschemaTableManyToManyRelation | null> | null;
}

export interface MetaschemaTableBelongsToRelation {
	__typename?: 'MetaBelongsToRelation';
	fieldName?: string | null;
	isUnique: boolean;
	type?: string | null;
	keys?: Array<MetaschemaField | null> | null;
	references: MetaschemaTableReference;
}

export interface MetaschemaTableHasRelation {
	__typename?: 'MetaHasRelation';
	fieldName?: string | null;
	isUnique: boolean;
	type?: string | null;
	keys?: Array<MetaschemaField | null> | null;
	referencedBy: MetaschemaTableReference;
	/** @deprecated Legacy pre-July contract field. */
	foreignKeys?: Array<MetaschemaField | null> | null;
}

export interface MetaschemaTableManyToManyRelation {
	__typename?: 'MetaManyToManyRelation';
	fieldName?: string | null;
	type?: string | null;
	junctionLeftConstraint: MetaschemaForeignKeyConstraint;
	junctionLeftKeyAttributes: Array<MetaschemaField | null>;
	junctionRightConstraint: MetaschemaForeignKeyConstraint;
	junctionRightKeyAttributes: Array<MetaschemaField | null>;
	junctionTable: MetaschemaTableReference;
	leftKeyAttributes: Array<MetaschemaField | null>;
	rightKeyAttributes: Array<MetaschemaField | null>;
	rightTable: MetaschemaTableReference;
}

export interface MetaschemaStorage {
	__typename?: 'MetaStorage';
	isFilesTable: boolean;
	isBucketsTable: boolean;
}

export interface MetaschemaSearchColumn {
	__typename?: 'MetaSearchColumn';
	name: string;
	algorithm: string;
}

export interface MetaschemaSearchConfig {
	__typename?: 'MetaSearchConfig';
	/** JSON-encoded `Record<string, number>` at the GraphQL boundary. */
	weights?: string | null;
	boostRecent: boolean;
	boostRecencyField?: string | null;
	boostRecencyDecay?: number | null;
}

export interface MetaschemaSearch {
	__typename?: 'MetaSearch';
	algorithms: string[];
	columns: Array<MetaschemaSearchColumn | null>;
	hasUnifiedSearch: boolean;
	config?: MetaschemaSearchConfig | null;
}

export interface MetaschemaI18nField {
	__typename?: 'MetaI18nField';
	name: string;
	type: string;
}

export interface MetaschemaI18n {
	__typename?: 'MetaI18n';
	translationTable: string;
	translatableFields: Array<MetaschemaI18nField | null>;
}

export interface MetaschemaRealtime {
	__typename?: 'MetaRealtime';
	subscriptionFieldName: string;
}

export type MetaschemaScopeTier = 'global' | 'database' | 'entity';

export interface MetaschemaScope {
	__typename?: 'MetaScope';
	scope: string;
	tier: MetaschemaScopeTier;
	keyColumn?: string | null;
	entityTable?: string | null;
	source: 'smartTag';
}

export interface MetaIntrospectionField {
	name: string;
}

export interface MetaIntrospectionType {
	name?: string | null;
	fields?: Array<MetaIntrospectionField | null> | null;
}

export type MetaContractTypeAlias =
	| 'queryType'
	| 'metaSchema'
	| 'metaTable'
	| 'metaTableQuery'
	| 'metaField'
	| 'metaEnum'
	| 'metaType'
	| 'metaEncoding'
	| 'metaIndex'
	| 'metaPrimaryKey'
	| 'metaUnique'
	| 'metaForeignKey'
	| 'metaRefTable'
	| 'metaConstraints'
	| 'metaInflection'
	| 'metaRelations'
	| 'metaBelongsTo'
	| 'metaHas'
	| 'metaManyToMany'
	| 'metaStorage'
	| 'metaSearch'
	| 'metaSearchColumn'
	| 'metaSearchConfig'
	| 'metaI18n'
	| 'metaI18nField'
	| 'metaRealtime'
	| 'metaScope';

export type MetaContractIntrospectionQuery = {
	[Key in MetaContractTypeAlias]?: MetaIntrospectionType | null;
};

export type MetaContractStatus = 'compatible' | 'incompatible' | 'unavailable';

export interface MetaContractCompatibility {
	contractVersion: string;
	status: MetaContractStatus;
	missing: string[];
}

/**
 * The normalized table model.
 *
 * One `TableModel` per table, built from two authoritative inputs: `_meta`
 * (keys, constraints, relations, write flags, labels, storage, search) and
 * targeted GraphQL introspection (every name and shape a document uses). Code
 * that reads or writes rows uses this model and never builds a GraphQL name by
 * inflection. Anything the model cannot prove is read-only and carries a
 * human-readable reason.
 */

/** Stable table identity: `${schemaName ?? ''}.${name}`. */
export type TableKey = string;

export interface TableModel {
	/** Stable identity: `${schemaName ?? ''}.${name}`. Use this, never `name` alone, for caches and lookups. */
	key: TableKey;
	/** GraphQL type name of one row. */
	name: string;
	/** Database schema that owns the table, or null when the server does not say. */
	schemaName: string | null;
	/** Whether rows come from a table or a view; 'unknown' when the server does not say. */
	kind: 'table' | 'view' | 'unknown';
	/** Table comment, or null. */
	description: string | null;
	/** Every column `_meta` reports, in `_meta` order. Check `readable` before selecting one. */
	columns: readonly ColumnModel[];
	/** GraphQL field names of the primary key, in key order. Empty means no key: rows are read-only. */
	primaryKey: readonly string[];
	/** Relations in `_meta` order: belongsTo, hasOne, hasMany, manyToMany. */
	relations: readonly RelationModel[];
	/** Root operations with their exact field, argument and input names. */
	operations: TableOperations;
	/** Fields that label one record of this table (record title, relation chips, pickers). */
	display: DisplayFieldsModel;
	/** Storage role of this table, or null for an ordinary table. */
	storage: TableStorageModel | null;
	/** Search capabilities, or null when the table has none. */
	search: TableSearchModel | null;
	/** True when the table only links rows of two other tables; null when the server does not say. */
	isJunction: boolean | null;
	/** Why parts of this table are degraded. Each message is safe to show to the user. */
	issues: readonly ModelIssue[];
}

/** What a column's values are, independent of how the grid renders them. */
export type ColumnValueKind =
	| 'text'
	| 'integer'
	| 'bigint'
	| 'decimal'
	| 'float'
	| 'boolean'
	| 'uuid'
	| 'date'
	| 'time'
	| 'datetime'
	| 'interval'
	| 'json'
	| 'enum'
	| 'bitstring'
	| 'binary'
	| 'network'
	| 'geometry'
	| 'point'
	| 'vector'
	| 'fulltext'
	| 'path'
	| 'range'
	| 'composite'
	| 'file'
	| 'unknown';

/** Presentation hint from a known value domain. Never used to decide a write. */
export type ColumnSemantic =
	| 'email'
	| 'url'
	| 'hostname'
	| 'origin'
	| 'image'
	| 'upload'
	| 'attachment'
	| 'currency';

export interface ColumnModel {
	/** GraphQL field name on the row type. */
	name: string;
	/** Column comment, or null. */
	description: string | null;
	/** Value kind, wire shape and write shape. */
	value: ColumnValueModel;
	/** False when the database requires a value. */
	nullable: boolean;
	/** True when the database supplies a value on insert. */
	hasDefault: boolean;
	/** True when the column is part of the primary key. */
	isPrimaryKey: boolean;
	/** True when the column is part of a foreign key. */
	isForeignKey: boolean;
	/** False when the list document cannot select this column; `readReason` says why. */
	readable: boolean;
	/** Why the column cannot be read, or null when it can. */
	readReason: string | null;
	/** Which writes accept this column, with reasons for the ones that do not. */
	write: ColumnWriteModel;
	/** Exact order-by enum values, or null when the column cannot be sorted. */
	sort: ColumnSortModel | null;
	/** Filter input field and the operators it really has, or null when the column cannot be filtered. */
	filter: ColumnFilterModel | null;
}

export interface ColumnValueModel {
	/** What the values are. */
	kind: ColumnValueKind;
	/** True when the column holds a list of values. */
	isArray: boolean;
	/** Named GraphQL output type of the column (wrappers removed). */
	typeName: string;
	/** Presentation hint from a known domain, or null. */
	semantic: ColumnSemantic | null;
	/** Fixed option list for enum columns and for text columns with an allowed-values list. `value` is the wire value. */
	options: readonly ColumnOption[] | null;
	/** GraphQL sub-selection for object-typed values (`{ start { value inclusive } end { value inclusive } }`), null for a leaf. */
	selection: string | null;
	/** Shape the write inputs expect for this column, or null when no input accepts it. */
	input: InputValueModel | null;
	/** Declared maximum text length, or null when unbounded or unknown. */
	maxLength: number | null;
	/** Declared numeric precision, or null. */
	precision: number | null;
	/** Declared numeric scale, or null. */
	scale: number | null;
	/** Declared vector length, or null. */
	dimensions: number | null;
	/** Declared geometry subtype (Point, Polygon, ...), or null. */
	geometrySubtype: string | null;
	/** Declared spatial reference id, or null. */
	srid: number | null;
	/** File column details, or null when the column does not hold files. */
	file: ColumnFileModel | null;
}

export interface ColumnOption {
	/** Exact value sent to and returned by the API. */
	value: string;
	/** Text to show. Equal to `value` when no label is known. */
	label: string;
}

export interface ColumnFileModel {
	/** The kind of file column. */
	kind: 'image' | 'upload' | 'attachment';
	/** True when the column holds several files. */
	multiple: boolean;
	/** GraphQL type name of the files table behind the column, or null when it is not known. */
	filesType: string | null;
}

/** How one GraphQL input position is shaped. Drives the write codec. */
export interface InputValueModel {
	/** Named GraphQL input type. */
	typeName: string;
	/** Scalar, enum, or input object. */
	shape: 'scalar' | 'enum' | 'object';
	/** True when the input takes a list of values. */
	isList: boolean;
	/** Enum wire values, for `shape: 'enum'`; otherwise null. */
	enumValues: readonly string[] | null;
	/** Input object fields, for `shape: 'object'`; otherwise null. Null for an object nested too deeply to describe. */
	fields: readonly InputFieldModel[] | null;
}

export interface InputFieldModel {
	/** Input field name. */
	name: string;
	/** True when the field must be provided (non-null without a default). */
	required: boolean;
	/** Shape of the field value. */
	value: InputValueModel;
}

export interface ColumnWriteModel {
	/** The create input accepts this column. */
	create: boolean;
	/** The update patch accepts this column. */
	update: boolean;
	/** A create must provide a value: the create input requires it and has no default. */
	requiredOnCreate: boolean;
	/** Why a create cannot set this column, or null when it can. */
	createReason: string | null;
	/** Why an update cannot change this column, or null when it can. */
	updateReason: string | null;
}

export interface ColumnSortModel {
	/** Exact order-by enum value for ascending order. */
	asc: string;
	/** Exact order-by enum value for descending order. */
	desc: string;
}

export interface ColumnFilterModel {
	/** Field name in the table's filter input. */
	field: string;
	/** Named operator input type for this column. */
	typeName: string;
	/** Operators the operator type really has, with the value shape each one takes. */
	operators: readonly FilterOperatorModel[];
}

export interface FilterOperatorModel {
	/** Operator field name, for example `equalTo`. */
	name: string;
	/** Shape of the operator value. */
	input: InputValueModel;
}

export type RelationModelKind = 'belongsTo' | 'hasOne' | 'hasMany' | 'manyToMany';

export interface RelationKeyPair {
	/** Field on this table. */
	local: string;
	/** Field on the related table. */
	remote: string;
}

export interface RelationJunctionModel {
	/** `TableModel.key` of the junction table. */
	tableKey: TableKey;
	/** GraphQL type name of the junction table. */
	tableName: string;
	/** Junction fields that point at this table, paired with the fields they reference here. */
	left: readonly { junction: string; local: string }[];
	/** Junction fields that point at the related table, paired with the fields they reference there. */
	right: readonly { junction: string; remote: string }[];
	/** False when the junction has required fields beyond the two key sets, so a link cannot be created from the two keys alone. */
	pure: boolean;
	/** Required junction fields beyond the two key sets. */
	extraRequiredFields: readonly string[];
}

export interface RelationTargetModel {
	/** Primary key fields of the related table, in key order; empty when the related records cannot be identified. */
	primaryKey: readonly string[];
	/** Fields that label a related record (the related table's display rule). */
	labelFields: readonly string[];
}

export interface RelationModel {
	/** Relation kind. */
	kind: RelationModelKind;
	/** GraphQL field on the row that returns the related record(s). */
	fieldName: string;
	/** `TableModel.key` of the related table, or null when it cannot be resolved. */
	targetKey: TableKey | null;
	/** GraphQL type name of the related rows. */
	targetName: string;
	/** What the field returns: one record, a connection (`nodes`, `totalCount`), or a plain list. Meaningful only when `readable`. */
	shape: 'object' | 'connection' | 'list';
	/** False when the list document cannot select this relation; `reason` says why. */
	readable: boolean;
	/** Key pairs. belongsTo: local foreign-key field -> referenced field. hasOne/hasMany: referenced local field -> foreign-key field on the related table. Empty for manyToMany. */
	keys: readonly RelationKeyPair[];
	/** Junction details for manyToMany, otherwise null. */
	junction: RelationJunctionModel | null;
	/** Identity and label fields of related records, selected by the list document. */
	target: RelationTargetModel;
	/** Page size argument of a list relation, or null when the field takes none. */
	pageArg: string | null;
	/** True when a connection relation reports `totalCount`, so a cell can show "+N more". */
	hasTotalCount: boolean;
	/** How this table's filter input filters by this relation, or null when it cannot. */
	filter: RelationFilterModel | null;
	/** False with `reason` when the keys are ambiguous or incomplete. */
	editable: boolean;
	/** False when unlinking would write null into a required field, or the link cannot be removed. */
	unlinkable: boolean;
	/** Why the relation is not editable or not unlinkable, or null. */
	reason: string | null;
}

/**
 * Filtering rows of this table by a relation, as the filter input really has it:
 * `{ [field]: <conditions on the linked record> }` for a one-record relation,
 * `{ [field]: { [many.some | many.every | many.none]: <conditions> } }` for a to-many one,
 * and `{ [exists]: true | false }` to test whether a linked record exists.
 */
export interface RelationFilterModel {
	/** Field in this table's filter input. */
	field: string;
	/** Named input type of that field. */
	typeName: string;
	/** Boolean field of this table's filter input that tests whether a linked record exists, or null when absent. */
	exists: string | null;
	/** Quantifier fields of a to-many filter, each taking `recordFilterType`; null for a one-record relation. */
	many: { some: string | null; every: string | null; none: string | null } | null;
	/** Filter input a condition on one linked record uses (the linked table's own filter input), or null when unproven. */
	recordFilterType: string | null;
}

/** One GraphQL argument or input field with its exact printed type, for variable definitions. */
export interface ArgumentModel {
	/** Argument name. */
	name: string;
	/** Printed GraphQL type, for example `[UserOrderBy!]`. */
	type: string;
	/** Named type with wrappers removed. */
	typeName: string;
}

export interface ListOperationModel {
	/** Root query field. */
	field: string;
	/** 'connection' returns `{ nodes totalCount pageInfo }`; 'list' returns a plain array. */
	shape: 'connection' | 'list';
	/** Filter argument, or null when the field cannot be filtered. */
	filter: ArgumentModel | null;
	/** Order-by argument, or null when the field cannot be sorted. */
	orderBy: ArgumentModel | null;
	/** Page size argument, or null. */
	first: ArgumentModel | null;
	/** Offset argument, or null. */
	offset: ArgumentModel | null;
	/** Cursor argument, or null. */
	after: ArgumentModel | null;
	/** True when the connection reports `totalCount`. */
	totalCount: boolean;
	/** True when the connection reports `pageInfo`. */
	pageInfo: boolean;
	/** Logical operators (`and`, `or`, `not`) the filter input has. */
	logicalOperators: readonly ('and' | 'or' | 'not')[];
}

export interface CreateOperationModel {
	/** Root mutation field. */
	field: string;
	/** The mutation's input argument. */
	input: ArgumentModel;
	/** Field of the input that carries the new record. */
	recordField: string;
	/** Named input type of the record field. */
	recordType: string;
	/** Payload field that returns the created row. */
	payloadField: string;
}

export interface UpdateOperationModel {
	/** Root mutation field. */
	field: string;
	/** The mutation's input argument. */
	input: ArgumentModel;
	/** Field of the input that carries the changed values. */
	patchField: string;
	/** Named input type of the patch field. */
	patchType: string;
	/** Input fields that identify the row, in primary-key order. */
	keyArgs: readonly string[];
	/** Payload field that returns the updated row. */
	payloadField: string;
}

export interface DeleteOperationModel {
	/** Root mutation field. */
	field: string;
	/** The mutation's input argument. */
	input: ArgumentModel;
	/** Input fields that identify the row, in primary-key order. */
	keyArgs: readonly string[];
	/** Payload field that returns the deleted row, or null when the payload has none. */
	payloadField: string | null;
}

export interface TableOperations {
	/** Reading rows. Null when the table has no usable list field (the table cannot load). */
	list: ListOperationModel | null;
	/** Creating a row, or null with an issue. */
	create: CreateOperationModel | null;
	/** Updating a row by its primary key, or null with an issue. */
	update: UpdateOperationModel | null;
	/** Deleting a row by its primary key, or null with an issue. */
	delete: DeleteOperationModel | null;
}

export interface DisplayFieldsModel {
	/** Fields that label a record, in display order. Empty only for a table with no readable leaf field. */
	fields: readonly string[];
	/** Which step of the display rule chose the fields. */
	source: 'host' | 'name' | 'text' | 'key' | 'none';
}

export interface TableStorageModel {
	/** 'files' for a storage files table, 'buckets' for a storage buckets table. */
	role: 'files' | 'buckets';
	/** GraphQL type name of the paired files table, or null when the server does not say. */
	filesType: string | null;
	/** GraphQL type name of the paired buckets table, or null when the server does not say. */
	bucketsType: string | null;
	/** Field on the files type that returns a download URL, or null. */
	downloadUrlField: string | null;
	/** Upload mutation names, or null when the server does not say. */
	upload: TableStorageUploadModel | null;
}

export interface TableStorageUploadModel {
	/** Root mutation for one file. */
	mutation: string | null;
	/** Input type of that mutation. */
	inputType: string | null;
	/** Payload type of that mutation. */
	payloadType: string | null;
	/** Root mutation for several files. */
	bulkMutation: string | null;
	/** Whether the upload input requires an owner id. */
	requiresOwnerId: boolean | null;
}

export interface TableSearchModel {
	/** Search algorithms active on the table. */
	algorithms: readonly string[];
	/** Searchable columns with their algorithm. */
	columns: readonly { name: string; algorithm: string }[];
	/** Filter input field for combined search, or null when the filter input has none. */
	unifiedSearchField: string | null;
	/** Per-algorithm score weights, or null. */
	weights: Readonly<Record<string, number>> | null;
}

export type ModelIssueCode =
	| 'TABLE_NOT_IN_SCHEMA'
	| 'LIST_UNAVAILABLE'
	| 'NO_PRIMARY_KEY'
	| 'CREATE_UNAVAILABLE'
	| 'UPDATE_UNAVAILABLE'
	| 'DELETE_UNAVAILABLE'
	| 'COLUMN_UNREADABLE'
	| 'COLUMN_UNWRITABLE'
	| 'COLUMN_UNSORTABLE'
	| 'RELATION_UNRESOLVED'
	| 'RELATION_AMBIGUOUS'
	| 'RELATION_INCOMPLETE'
	| 'RELATION_UNREADABLE';

export interface ModelIssue {
	/** What the issue affects. */
	scope: 'table' | 'column' | 'relation' | 'operation';
	/** Column or relation field name, the operation name (`list`, `create`, `update`, `delete`), or null for the whole table. */
	target: string | null;
	/** Stable machine-readable code. */
	code: ModelIssueCode;
	/** Human-readable reason, safe to show to the user. */
	message: string;
}

/** Host override for the display rule: table key or table name -> label fields, in order. */
export type DisplayFieldOverrides = Readonly<Record<string, readonly string[]>>;

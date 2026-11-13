import { TypedDocumentString } from '@constructive-io/graphql-query/client';

import { PAGE_INFO_FIELDS } from './build-operations';
import { TableModelError } from './table-key';
import type { ColumnModel, RelationModel, TableModel } from './types';
import { encodeColumnValue, encodeWriteValues } from './value-codec';

/**
 * Document builders. Every name in a document comes from the table model, so
 * a document the model can build is valid against the schema it was built
 * from. A request the model cannot prove (an unsortable column, a missing
 * filter argument) throws `TableModelError` instead of being dropped.
 */

/** Key under which a list row carries the `totalCount` of each connection relation. */
export const RELATION_TOTAL_COUNTS_KEY = '__relationTotalCounts';

/** Key under which a list row carries the error of each cell the API could not serve. */
export const CELL_ERRORS_KEY = '__cellErrors';

/** One error of a GraphQL response, as far as the reader needs it. */
export interface ResponseErrorLike {
	message?: string;
	path?: ReadonlyArray<string | number> | null;
}

/** Default page size of a list relation. */
export const DEFAULT_RELATION_PAGE_SIZE = 20;

export type SortDirection = 'asc' | 'desc';

export interface SortSpec {
	/** Column name. */
	field: string;
	direction: SortDirection;
}

export type RowRecord = Record<string, unknown>;

/** A key value per primary-key field. */
export type RowKey = Readonly<Record<string, unknown>>;

export interface ModelDocument<TData, TVariables extends Record<string, unknown>> {
	/** The document, typed by its result and variables. */
	document: TypedDocumentString<TData, TVariables>;
	/** The same document as text. */
	source: string;
	/** Variables to send with it. */
	variables: TVariables;
}

export interface RelationSelectionOptions {
	/** Relations to select: every readable one, none, or these field names. Default `'none'`. */
	relations?: 'all' | 'none' | readonly string[];
	/** Page size of list relations. Default {@link DEFAULT_RELATION_PAGE_SIZE}. */
	relationPageSize?: number;
}

export interface ListDocumentOptions extends RelationSelectionOptions {
	/** Page size. */
	first?: number;
	/** Rows to skip. */
	offset?: number;
	/** Cursor to start after. */
	after?: string | null;
	/** A filter in the server's filter input shape. */
	where?: Readonly<Record<string, unknown>> | null;
	/** Sort, first entry first. Each field must be a sortable column. */
	orderBy?: readonly SortSpec[];
	/** Select `totalCount` when the connection has it. Default true. */
	totalCount?: boolean;
	/** Select `pageInfo` when the connection has it. Default true. */
	pageInfo?: boolean;
	/**
	 * Columns to select. The primary key and the local key fields of every
	 * selected relation are always added, so rows keep their identity and their
	 * links. Omitted: every readable column.
	 */
	columns?: readonly string[];
}

export interface ListPageInfo {
	hasNextPage: boolean;
	hasPreviousPage: boolean;
	startCursor: string | null;
	endCursor: string | null;
}

export interface ListResult {
	/** Rows; connection relations are flattened to arrays, their totals kept under {@link RELATION_TOTAL_COUNTS_KEY}. */
	rows: RowRecord[];
	/** Total matching rows, or null when not selected or not available. */
	totalCount: number | null;
	/** Page info, or null when not selected or not available. */
	pageInfo: ListPageInfo | null;
}

export interface ListDocument extends ModelDocument<RowRecord, Record<string, unknown>> {
	/**
	 * Read the response data. Field errors that belong to one cell of one row
	 * are kept on that row under {@link CELL_ERRORS_KEY}, so the rest of the page
	 * still shows. Any other error throws.
	 */
	read(data: unknown, errors?: readonly ResponseErrorLike[]): ListResult;
}

export interface RowDocument extends ModelDocument<RowRecord, Record<string, unknown>> {
	/** Read the returned row, or null. */
	read(data: unknown): RowRecord | null;
	/**
	 * Update and delete: whether the write changed a row. True when the payload returned the
	 * record; false when it came back without one, because no row matched (a row rule hides the
	 * row from this writer, or the row is gone) and the server reports that without an error;
	 * null when the document selects no record and cannot tell.
	 */
	applied?(data: unknown): boolean | null;
}

export interface FindOneDocument extends ModelDocument<RowRecord, Record<string, unknown>> {
	/** Read the row, or null. Like a list read, an error of one cell is kept on the row under {@link CELL_ERRORS_KEY}. */
	read(data: unknown, errors?: readonly ResponseErrorLike[]): RowRecord | null;
}

export interface MutationDocumentOptions {
	/** Columns the payload returns. Default: every readable column. */
	returning?: readonly string[];
}

function documentOf(source: string, variables: Record<string, unknown>): ModelDocument<RowRecord, Record<string, unknown>> {
	return { document: new TypedDocumentString<RowRecord, Record<string, unknown>>(source), source, variables };
}

function unavailable(model: TableModel, operation: string): TableModelError {
	const issue = model.issues.find((candidate) => candidate.scope === 'operation' && candidate.target === operation);
	return new TableModelError('OPERATION_UNAVAILABLE', issue?.message ?? `This table does not support ${operation}.`, {
		tableKey: model.key,
	});
}

function columnSelection(column: ColumnModel): string {
	return column.value.selection ? `${column.name} ${column.value.selection}` : column.name;
}

function columnsSelection(model: TableModel, returning?: readonly string[]): string {
	const columns = model.columns.filter((column) => column.readable);
	if (!returning) return columns.map(columnSelection).join(' ');
	return returning
		.map((name) => {
			const column = columns.find((candidate) => candidate.name === name);
			if (!column) throw new TableModelError('UNKNOWN_FIELD', `"${name}" cannot be returned by this table.`, { tableKey: model.key });
			return columnSelection(column);
		})
		.join(' ');
}

/**
 * The columns a list selects: the requested ones plus the primary key and the
 * local key fields of the selected relations, in the model's column order.
 */
function listColumnNames(model: TableModel, requested: readonly string[] | undefined, relations: readonly RelationModel[]): string[] | undefined {
	if (!requested) return undefined;
	const readable = new Set(model.columns.filter((column) => column.readable).map((column) => column.name));
	for (const name of requested) {
		if (!readable.has(name)) {
			throw new TableModelError('UNKNOWN_FIELD', `"${name}" is not a column this table can show.`, { tableKey: model.key });
		}
	}
	const wanted = new Set([
		...requested,
		...model.primaryKey,
		...relations.flatMap((relation) => relation.keys.map((pair) => pair.local)),
		...relations.flatMap((relation) => relation.junction?.left.map((pair) => pair.local) ?? []),
	]);
	return model.columns.filter((column) => column.readable && wanted.has(column.name)).map((column) => column.name);
}

function relationSelection(relation: RelationModel, pageSize: number): string {
	const fields = [...new Set([...relation.target.primaryKey, ...relation.target.labelFields])].join(' ');
	const page = relation.pageArg ? `(${relation.pageArg}: ${pageSize})` : '';
	if (relation.shape === 'object') return `${relation.fieldName} { ${fields} }`;
	if (relation.shape === 'list') return `${relation.fieldName}${page} { ${fields} }`;
	return `${relation.fieldName}${page} { nodes { ${fields} }${relation.hasTotalCount ? ' totalCount' : ''} }`;
}

function selectedRelations(model: TableModel, choice: RelationSelectionOptions['relations']): RelationModel[] {
	if (!choice || choice === 'none') return [];
	if (choice === 'all') return model.relations.filter((relation) => relation.readable);
	return choice.flatMap((fieldName) => {
		const relation = model.relations.find((candidate) => candidate.fieldName === fieldName);
		if (!relation) {
			throw new TableModelError('UNKNOWN_FIELD', `"${fieldName}" is not a relation of this table.`, { tableKey: model.key });
		}
		// An unreadable relation carries its reason in the model; the rest of the row still loads.
		return relation.readable ? [relation] : [];
	});
}

function pageSizeOf(options: RelationSelectionOptions): number {
	const size = options.relationPageSize ?? DEFAULT_RELATION_PAGE_SIZE;
	return Number.isInteger(size) && size > 0 ? size : DEFAULT_RELATION_PAGE_SIZE;
}

/** Flatten connection relations to arrays and keep their totals beside the row. */
function readRow(row: unknown, relations: readonly RelationModel[]): RowRecord {
	if (!row || typeof row !== 'object') return {};
	const next: RowRecord = { ...(row as RowRecord) };
	const totals: Record<string, number> = {};
	for (const relation of relations) {
		if (relation.shape !== 'connection') continue;
		const value = next[relation.fieldName] as { nodes?: unknown; totalCount?: unknown } | null | undefined;
		if (!value || typeof value !== 'object') continue;
		next[relation.fieldName] = Array.isArray(value.nodes) ? value.nodes : [];
		if (typeof value.totalCount === 'number') totals[relation.fieldName] = value.totalCount;
	}
	if (Object.keys(totals).length > 0) next[RELATION_TOTAL_COUNTS_KEY] = totals;
	return next;
}

/** The error of a cell the API could not serve, or null. */
export function readCellError(row: Readonly<RowRecord> | null | undefined, fieldName: string): string | null {
	const errors = row?.[CELL_ERRORS_KEY];
	if (!errors || typeof errors !== 'object') return null;
	const message = (errors as Record<string, unknown>)[fieldName];
	return typeof message === 'string' ? message : null;
}

/**
 * Group field errors by row position and top-level field. The error path
 * starts at the list field: `[list, 'nodes', row, field, ...]` for a
 * connection, `[list, row, field, ...]` for a plain list.
 */
function cellErrorsOf(
	errors: readonly ResponseErrorLike[],
	listField: string,
	shape: 'connection' | 'list',
): Map<number, Record<string, string>> {
	const byRow = new Map<number, Record<string, string>>();
	const offset = shape === 'connection' ? 2 : 1;
	for (const error of errors) {
		const path = error.path ?? [];
		const row = path[offset];
		const field = path[offset + 1];
		const located = path[0] === listField && (shape === 'list' || path[1] === 'nodes');
		if (!located || typeof row !== 'number' || typeof field !== 'string') {
			throw new TableModelError('READ_FAILED', error.message || 'The rows could not be read.');
		}
		const cells = byRow.get(row) ?? {};
		cells[field] ??= error.message || 'This value cannot be shown.';
		byRow.set(row, cells);
	}
	return byRow;
}

function withCellErrors(rows: RowRecord[], cellErrors: Map<number, Record<string, string>>): RowRecord[] {
	if (cellErrors.size === 0) return rows;
	return rows.map((row, position) => {
		const cells = cellErrors.get(position);
		return cells ? { ...row, [CELL_ERRORS_KEY]: cells } : row;
	});
}

/** The `totalCount` of a connection relation on a list row, or null when it was not selected. */
export function readRelationTotalCount(row: Readonly<RowRecord> | null | undefined, fieldName: string): number | null {
	const totals = row?.[RELATION_TOTAL_COUNTS_KEY];
	if (!totals || typeof totals !== 'object') return null;
	const total = (totals as Record<string, unknown>)[fieldName];
	return typeof total === 'number' ? total : null;
}

function orderByValues(model: TableModel, orderBy: readonly SortSpec[]): string[] {
	return orderBy.map(({ field, direction }) => {
		const column = model.columns.find((candidate) => candidate.name === field);
		if (!column?.sort) {
			throw new TableModelError('SORT_UNAVAILABLE', `This table cannot be sorted by "${field}".`, { tableKey: model.key });
		}
		return direction === 'desc' ? column.sort.desc : column.sort.asc;
	});
}

function readPageInfo(value: unknown): ListPageInfo | null {
	if (!value || typeof value !== 'object') return null;
	const info = value as Record<string, unknown>;
	return {
		hasNextPage: info.hasNextPage === true,
		hasPreviousPage: info.hasPreviousPage === true,
		startCursor: typeof info.startCursor === 'string' ? info.startCursor : null,
		endCursor: typeof info.endCursor === 'string' ? info.endCursor : null,
	};
}

/** List rows through the table's list field. */
export function buildListDocument(model: TableModel, options: ListDocumentOptions = {}): ListDocument {
	const list = model.operations.list;
	if (!list) throw unavailable(model, 'list');

	const definitions: string[] = [];
	const args: string[] = [];
	const variables: Record<string, unknown> = {};
	const bind = (
		argument: { name: string; type: string } | null,
		variable: string,
		value: unknown,
		code: 'FILTER_UNAVAILABLE' | 'SORT_UNAVAILABLE' | 'PAGING_UNAVAILABLE',
		message: string,
	) => {
		if (!argument) throw new TableModelError(code, message, { tableKey: model.key });
		definitions.push(`$${variable}: ${argument.type}`);
		args.push(`${argument.name}: $${variable}`);
		variables[variable] = value;
	};

	if (options.first !== undefined) bind(list.first, 'first', options.first, 'PAGING_UNAVAILABLE', 'This table cannot be read page by page.');
	if (options.offset !== undefined) bind(list.offset, 'offset', options.offset, 'PAGING_UNAVAILABLE', 'This table cannot skip rows.');
	if (options.after) bind(list.after, 'after', options.after, 'PAGING_UNAVAILABLE', 'This table cannot continue from a cursor.');
	if (options.where && Object.keys(options.where).length > 0) {
		bind(list.filter, 'where', options.where, 'FILTER_UNAVAILABLE', 'This table cannot be filtered.');
	}
	if (options.orderBy && options.orderBy.length > 0) {
		bind(list.orderBy, 'orderBy', orderByValues(model, options.orderBy), 'SORT_UNAVAILABLE', 'This table cannot be sorted.');
	}

	const relations = selectedRelations(model, options.relations);
	const pageSize = pageSizeOf(options);
	const rowSelection = [
		columnsSelection(model, listColumnNames(model, options.columns, relations)),
		...relations.map((relation) => relationSelection(relation, pageSize)),
	]
		.filter(Boolean)
		.join(' ');
	const withTotal = list.totalCount && options.totalCount !== false;
	const withPageInfo = list.pageInfo && options.pageInfo !== false;
	const body = list.shape === 'connection'
		? `{ nodes { ${rowSelection} }${withTotal ? ' totalCount' : ''}${withPageInfo ? ` pageInfo { ${PAGE_INFO_FIELDS.join(' ')} }` : ''} }`
		: `{ ${rowSelection} }`;
	const source = `query ModelList_${model.name}${definitions.length ? `(${definitions.join(', ')})` : ''} {
	${list.field}${args.length ? `(${args.join(', ')})` : ''} ${body}
}`;

	return {
		...documentOf(source, variables),
		read(data, errors = []) {
			const value = (data as Record<string, unknown> | null | undefined)?.[list.field];
			if (errors.length > 0 && value == null) {
				throw new TableModelError('READ_FAILED', errors[0]?.message || 'The rows could not be read.', { tableKey: model.key });
			}
			const cellErrors = cellErrorsOf(errors, list.field, list.shape);
			if (list.shape === 'list') {
				const rows = Array.isArray(value) ? value.map((row) => readRow(row, relations)) : [];
				return { rows: withCellErrors(rows, cellErrors), totalCount: null, pageInfo: null };
			}
			const connection = (value ?? {}) as Record<string, unknown>;
			const nodes = Array.isArray(connection.nodes) ? connection.nodes : [];
			return {
				rows: withCellErrors(nodes.map((row) => readRow(row, relations)), cellErrors),
				totalCount: withTotal && typeof connection.totalCount === 'number' ? connection.totalCount : null,
				pageInfo: withPageInfo ? readPageInfo(connection.pageInfo) : null,
			};
		},
	};
}

function keyValues(model: TableModel, key: RowKey, fields: readonly string[]): Record<string, unknown> {
	const values: Record<string, unknown> = {};
	for (const field of fields) {
		const value = key[field];
		if (value === undefined || value === null) {
			throw new TableModelError('KEY_INCOMPLETE', `The record key is missing "${field}".`, { tableKey: model.key });
		}
		const column = model.columns.find((candidate) => candidate.name === field);
		values[field] = column?.value.input ? encodeColumnValue(column, value) : value;
	}
	return values;
}

/** Read one row through the list field filtered by its primary key. */
export function buildFindOneDocument(
	model: TableModel,
	key: RowKey,
	options: RelationSelectionOptions = {},
): FindOneDocument {
	if (model.primaryKey.length === 0) {
		throw new TableModelError('KEY_INCOMPLETE', 'This table has no primary key, so one record cannot be looked up.', {
			tableKey: model.key,
		});
	}
	const values = keyValues(model, key, model.primaryKey);
	const where = Object.fromEntries(
		model.primaryKey.map((field) => {
			const column = model.columns.find((candidate) => candidate.name === field);
			if (!column?.filter?.operators.some((operator) => operator.name === 'equalTo')) {
				throw new TableModelError('FILTER_UNAVAILABLE', 'One record cannot be looked up on this table.', {
					tableKey: model.key,
				});
			}
			return [column.filter.field, { equalTo: values[field] }];
		}),
	);
	const list = buildListDocument(model, {
		...options,
		where,
		first: model.operations.list?.first ? 1 : undefined,
		totalCount: false,
		pageInfo: false,
	});
	return {
		document: list.document,
		source: list.source,
		variables: list.variables,
		read: (data, errors) => list.read(data, errors).rows[0] ?? null,
	};
}

function payloadApplied(data: unknown, field: string, payloadField: string | null): boolean | null {
	if (!payloadField) return null;
	const payload = (data as Record<string, unknown> | null | undefined)?.[field] as Record<string, unknown> | null | undefined;
	if (payload === null || payload === undefined) return false;
	if (!(payloadField in payload)) return null;
	return payload[payloadField] !== null;
}

function readPayloadRow(data: unknown, field: string, payloadField: string | null): RowRecord | null {
	if (!payloadField) return null;
	const payload = (data as Record<string, unknown> | null | undefined)?.[field] as Record<string, unknown> | null | undefined;
	const row = payload?.[payloadField];
	return row && typeof row === 'object' ? (row as RowRecord) : null;
}

/** Create one row. `values` are encoded by the write codec; unknown or non-writable fields throw. */
export function buildCreateDocument(
	model: TableModel,
	values: Readonly<Record<string, unknown>>,
	options: MutationDocumentOptions = {},
): RowDocument {
	const create = model.operations.create;
	if (!create) throw unavailable(model, 'create');
	const variables = { input: { [create.recordField]: encodeWriteValues(model, values, 'create') } };
	const source = `mutation ModelCreate_${model.name}($input: ${create.input.type}) {
	${create.field}(${create.input.name}: $input) { ${create.payloadField} { ${columnsSelection(model, options.returning)} } }
}`;
	return { ...documentOf(source, variables), read: (data) => readPayloadRow(data, create.field, create.payloadField) };
}

/** Update one row by its primary key. `patch` is encoded by the write codec. */
export function buildUpdateDocument(
	model: TableModel,
	key: RowKey,
	patch: Readonly<Record<string, unknown>>,
	options: MutationDocumentOptions = {},
): RowDocument {
	const update = model.operations.update;
	if (!update) throw unavailable(model, 'update');
	const variables = {
		input: { ...keyValues(model, key, update.keyArgs), [update.patchField]: encodeWriteValues(model, patch, 'update') },
	};
	const source = `mutation ModelUpdate_${model.name}($input: ${update.input.type}) {
	${update.field}(${update.input.name}: $input) { ${update.payloadField} { ${columnsSelection(model, options.returning)} } }
}`;
	return {
		...documentOf(source, variables),
		read: (data) => readPayloadRow(data, update.field, update.payloadField),
		applied: (data) => payloadApplied(data, update.field, update.payloadField),
	};
}

/** Delete one row by its primary key. */
export function buildDeleteDocument(model: TableModel, key: RowKey): RowDocument {
	const remove = model.operations.delete;
	if (!remove) throw unavailable(model, 'delete');
	const variables = { input: keyValues(model, key, remove.keyArgs) };
	const keySelection = model.columns
		.filter((column) => column.readable && model.primaryKey.includes(column.name))
		.map(columnSelection)
		.join(' ');
	const payload = remove.payloadField && keySelection ? `${remove.payloadField} { ${keySelection} }` : '__typename';
	const source = `mutation ModelDelete_${model.name}($input: ${remove.input.type}) {
	${remove.field}(${remove.input.name}: $input) { ${payload} }
}`;
	return {
		...documentOf(source, variables),
		read: (data) => readPayloadRow(data, remove.field, remove.payloadField && keySelection ? remove.payloadField : null),
		applied: (data) => payloadApplied(data, remove.field, remove.payloadField && keySelection ? remove.payloadField : null),
	};
}

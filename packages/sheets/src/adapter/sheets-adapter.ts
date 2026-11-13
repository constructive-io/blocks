// Backend adapter contract.
//
// Sheets talks to its backend through ONE injectable seam: a SheetsBackendAdapter
// owns schema metadata, per-table models, row reads, and CRUD mutations. The
// default implementation (createPostGraphileAdapter) builds every document from
// the table model in @constructive-io/data; a host targeting a different backend
// implements this interface and passes it as `SheetsConfig.adapter`.
import type {
	DisplayFieldOverrides,
	MetaQuery,
	MutationOptions,
	SortSpec,
	TableModel,
} from '@constructive-io/data';

import type { SheetsExecuteFn } from '../context/sheets-execute';
import type { SheetsRowIdentifier } from '../row-identity';

/** The table being operated on. */
export interface AdapterTableContext {
	/** Model of the table (`useTableModel`, `fetchTableModel`). Every document the built-in adapter sends is built from it. */
	model: TableModel;
	/** The table name or `TableModel.key` the caller used. */
	tableName: string;
}

/** A normalized list query. */
export interface AdapterListQuery {
	/** A filter in the server's filter input shape. */
	where?: Readonly<Record<string, unknown>>;
	/** Sort, first entry first. Each field must be a sortable column of the model. */
	orderBy?: readonly SortSpec[];
	/** Page size. */
	limit?: number;
	/** Rows to skip. */
	offset?: number;
	/** Relay cursor for forward pagination (infinite/cursor mode). */
	after?: string;
	/** Relation fields to select: every readable relation, none (the default), or these field names. */
	relations?: 'all' | 'none' | readonly string[];
	/**
	 * Columns to select, for example the ones a view shows. The primary key and the
	 * local key fields of the selected relations are always added. Omitted: every readable column.
	 */
	columns?: readonly string[];
	/** Page size of list relations. */
	relationPageSize?: number;
	/** Count all matching rows. Default true. When false, `totalCount` is the number of rows returned. */
	includeTotalCount?: boolean;
	/** Aborts the request, for example when the filter or sort it was for has changed. */
	signal?: AbortSignal;
}

export interface AdapterPageInfo {
	endCursor?: string | null;
	startCursor?: string | null;
	hasNextPage?: boolean;
	hasPreviousPage?: boolean;
}

export interface AdapterListResult<T = Record<string, unknown>> {
	rows: T[];
	totalCount: number;
	pageInfo?: AdapterPageInfo;
}

export interface AdapterTableModelOptions {
	/** Host override for the fields that label a record. */
	displayOverrides?: DisplayFieldOverrides;
}

export interface SheetsBackendAdapter {
	/** Read the schema metadata. The default adapter checks and runs the July 2026 `_meta` contract. */
	fetchMeta(execute: SheetsExecuteFn): Promise<MetaQuery>;

	/**
	 * Model one table of a `_meta` result, by `TableModel.key` or bare name. A
	 * failure concerns that table only; other tables keep loading.
	 */
	fetchTableModel(
		execute: SheetsExecuteFn,
		meta: MetaQuery,
		tableRef: string,
		options?: AdapterTableModelOptions,
	): Promise<TableModel>;

	/** Read a page of rows, flattening relation connections into arrays. */
	listRows<T = Record<string, unknown>>(
		ctx: AdapterTableContext,
		query: AdapterListQuery,
		execute: SheetsExecuteFn,
	): Promise<AdapterListResult<T>>;

	/** Create a row; resolves to the created row (or null). */
	createRow<T = Record<string, unknown>>(
		ctx: AdapterTableContext,
		data: Record<string, unknown>,
		execute: SheetsExecuteFn,
		options?: MutationOptions,
	): Promise<T | null>;

	/** Update a row by its primary key (a scalar for a one-field key, or the key object); resolves to the updated row (or null). */
	updateRow<T = Record<string, unknown>>(
		ctx: AdapterTableContext,
		id: SheetsRowIdentifier,
		patch: Record<string, unknown>,
		execute: SheetsExecuteFn,
		options?: MutationOptions,
	): Promise<T | null>;

	/** Delete a row by its primary key (a scalar for a one-field key, or the key object). */
	deleteRow(
		ctx: AdapterTableContext,
		id: SheetsRowIdentifier,
		execute: SheetsExecuteFn,
		options?: MutationOptions,
	): Promise<void>;
}

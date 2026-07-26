// Backend adapter contract.
//
// Sheets talks to its backend through ONE injectable seam: a SheetsBackendAdapter
// owns schema introspection, row reads, and CRUD mutations. The default
// implementation (createPostGraphileAdapter) wraps the existing PostGraphile /
// @constructive-io/data logic, so nothing changes for current consumers; a host
// targeting a different backend implements this interface and passes it as
// `SheetsConfig.adapter`.
//
// Scope note (Phase 2): the table-metadata shape is still PostGraphile-flavored
// (CleanTable / MetaQuery from @constructive-io/data) and the filter dialect /
// orderBy enum resolution remain in the hooks. The decoupled surface here is the
// query-building + execution + response-parsing — the densest backend coupling.
import type { CleanTable, FieldSelection, MetaQuery, MutationOptions } from '@constructive-io/data';

import type { SheetsExecuteFn } from '../context/sheets-execute';

/** The table being operated on, plus all tables (needed for relation-aware AST building). */
export interface AdapterTableContext {
	table: CleanTable;
	allTables: CleanTable[];
	tableName: string;
}

/** A normalized list query. `relationFieldMap` is resolved by the hook (it is cache-bound). */
export interface AdapterListQuery {
	where?: unknown;
	orderBy?: Array<{ field: string; direction: 'asc' | 'desc' }>;
	limit?: number;
	offset?: number;
	/** Relay cursor for forward pagination (infinite/cursor mode). */
	after?: string;
	fieldSelection?: FieldSelection;
	/** Resolved relation field name map, threaded from the hook's cached resolution. */
	relationFieldMap?: Record<string, string>;
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

export interface SheetsBackendAdapter {
	/** Introspect the schema. Default adapter validates and runs the July 2026 `_meta` contract. */
	fetchMeta(execute: SheetsExecuteFn): Promise<MetaQuery>;

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

	/** Update a row by id (or composite PK object); resolves to the updated row (or null). */
	updateRow<T = Record<string, unknown>>(
		ctx: AdapterTableContext,
		id: string | number | Record<string, unknown>,
		patch: Record<string, unknown>,
		execute: SheetsExecuteFn,
		options?: MutationOptions,
	): Promise<T | null>;

	/** Delete a row by id (or composite PK object). */
	deleteRow(
		ctx: AdapterTableContext,
		id: string | number | Record<string, unknown>,
		execute: SheetsExecuteFn,
		options?: MutationOptions,
	): Promise<void>;
}

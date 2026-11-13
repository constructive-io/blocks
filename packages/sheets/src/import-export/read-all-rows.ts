// Every row of a list query, read page by page.
//
// A table that continues from a cursor is read that way, because a cursor keeps
// its place while rows change. Otherwise pages are read by offset, and the
// primary key is added as the last sort key so that rows with equal sort values
// keep one order from page to page. Only the first page asks for the total count.

import type { SortSpec, TableModel } from '@constructive-io/data';

import type { AdapterListQuery, SheetsBackendAdapter } from '../adapter/sheets-adapter';
import type { SheetsExecuteFn } from '../context/sheets-execute';

type RowRecord = Record<string, unknown>;

/** Where rows are read from. */
export interface RowSource {
	adapter: SheetsBackendAdapter;
	execute: SheetsExecuteFn;
	model: TableModel;
}

/** What to read: the query without its paging. */
export type RowQuery = Omit<AdapterListQuery, 'limit' | 'offset' | 'after' | 'includeTotalCount' | 'signal'>;

export interface ReadAllRowsOptions {
	/** Rows per request. Default 200. */
	pageSize?: number;
	signal?: AbortSignal;
	/** After each page: the rows read so far, and the total the first page counted (null when the table cannot count). */
	onPage?: (progress: { loaded: number; total: number | null }) => void;
}

const DEFAULT_PAGE_SIZE = 200;

function withKeyOrder(model: TableModel, orderBy: readonly SortSpec[] | undefined): readonly SortSpec[] | undefined {
	const sorted = new Set((orderBy ?? []).map((spec) => spec.field));
	const keyColumns = model.primaryKey.map((field) => model.columns.find((column) => column.name === field));
	if (keyColumns.some((column) => !column?.sort)) return orderBy;
	const tail = model.primaryKey.filter((field) => !sorted.has(field)).map((field): SortSpec => ({ field, direction: 'asc' }));
	return tail.length ? [...(orderBy ?? []), ...tail] : orderBy;
}

/** Throw the abort reason when the signal has aborted. */
export function stopIfAborted(signal: AbortSignal | undefined): void {
	if (signal?.aborted) throw signal.reason ?? new DOMException('The operation was aborted.', 'AbortError');
}

/** Read every row the query matches. Throws the abort reason when `signal` aborts. */
export async function readAllRows(source: RowSource, query: RowQuery, options: ReadAllRowsOptions = {}): Promise<RowRecord[]> {
	const { adapter, execute, model } = source;
	const list = model.operations.list;
	const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
	const ctx = { model, tableName: model.key };
	const byCursor = Boolean(list?.after && list.pageInfo);
	// A list that can neither continue from a cursor nor skip rows is read in one request.
	const paged = Boolean(list?.first && (byCursor || list.offset));
	const orderBy = byCursor || !paged ? query.orderBy : withKeyOrder(model, query.orderBy);

	const rows: RowRecord[] = [];
	let total: number | null = null;
	let cursor: string | undefined;
	for (let page = 0; ; page += 1) {
		stopIfAborted(options.signal);
		const result = await adapter.listRows<RowRecord>(
			ctx,
			{
				...query,
				orderBy,
				limit: paged ? pageSize : undefined,
				offset: paged && !byCursor && rows.length > 0 ? rows.length : undefined,
				after: byCursor ? cursor : undefined,
				includeTotalCount: page === 0 && Boolean(list?.totalCount),
				signal: options.signal,
			},
			execute,
		);
		if (page === 0 && list?.totalCount) total = result.totalCount;
		rows.push(...result.rows);
		options.onPage?.({ loaded: rows.length, total });

		if (!paged || result.rows.length === 0) break;
		if (byCursor) {
			const next = result.pageInfo?.endCursor ?? undefined;
			if (!result.pageInfo?.hasNextPage || !next || next === cursor) break;
			cursor = next;
		} else if (result.rows.length < pageSize) {
			break;
		}
	}
	return rows;
}

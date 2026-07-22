// In-memory paginating SheetsBackendAdapter for the Storybook showcase + 10k stress test.
//
// Replaces the GraphQL/fetch layer entirely: useSheets runs UNCHANGED on it. Unlike the
// shipped testing/mock-sheets-provider.tsx (whose buildListResponse hard-codes
// hasNextPage:false), this slices the in-memory rows by cursor/offset, returns the right
// totalCount + a monotonic endCursor, and reports hasNextPage until the end — so the
// infinite-scroll path (useSheetsInfiniteTable) loads page-by-page across all 10k rows.
//
// Call contract (verified against the hooks):
//   - paginated mode (use-sheets.ts): listRows gets { limit, offset, orderBy, where, fieldSelection }
//   - infinite mode  (use-sheets-infinite-table.ts): listRows gets { first, after?/offset?, orderBy, where }
//     page 0 has neither after nor offset; page 1 carries `after` = page 0's endCursor;
//     page 2+ may carry `offset`. The cursor is the absolute end index as a string, so
//     `after` parses straight back to a start index.
import type { MetaQuery, MutationOptions } from '@constructive-io/data';

import type {
	AdapterListQuery,
	AdapterListResult,
	AdapterTableContext,
	SheetsBackendAdapter
} from '../../adapter/sheets-adapter';
import type { SheetsRow } from '../../grid/row-model';
import type { MetaTable } from '../../forms/types';

export interface CreateMockAdapterOptions {
	/** The single-table _meta fixture. `table.name` MUST equal the <Sheets tableName=…> prop. */
	table: MetaTable;
	/** The full in-memory dataset; mutated in place by create/update/delete. */
	rows: SheetsRow[];
	/** Optional latency (ms) before each list resolves — exercises the loading-skeleton path. */
	delayMs?: number;
}

// A list query as it actually arrives at runtime: the contract narrows to limit/offset, but
// the hooks spread QueryOptions (which uses `first`), so we read both. (`where` is unknown.)
interface RuntimeListQuery extends AdapterListQuery {
	first?: number;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/** Parse a cursor (the absolute end index, stringified) back to a numeric start index. */
function cursorToIndex(cursor: string | undefined): number | null {
	if (cursor == null) return null;
	const n = Number(cursor);
	return Number.isFinite(n) ? n : null;
}

/** Compare two values for sorting; numbers numerically, everything else by localeCompare of String(). */
function compareValues(a: unknown, b: unknown): number {
	if (a == null && b == null) return 0;
	if (a == null) return -1;
	if (b == null) return 1;
	if (typeof a === 'number' && typeof b === 'number') return a - b;
	if (typeof a === 'boolean' && typeof b === 'boolean') return a === b ? 0 : a ? 1 : -1;
	return String(a).localeCompare(String(b));
}

/** Best-effort in-memory sort honoring the resolved orderBy array (stable, multi-key). */
function applySort(rows: SheetsRow[], orderBy: AdapterListQuery['orderBy']): SheetsRow[] {
	if (!orderBy || orderBy.length === 0) return rows;
	const sorted = [...rows];
	sorted.sort((ra, rb) => {
		for (const { field, direction } of orderBy) {
			const cmp = compareValues(ra[field], rb[field]);
			if (cmp !== 0) return direction === 'desc' ? -cmp : cmp;
		}
		return 0;
	});
	return sorted;
}

/** Resolve the id of a row to a primitive for === matching against a mutation id. */
function rowId(row: SheetsRow): unknown {
	return row.id;
}

export function createMockAdapter(opts: CreateMockAdapterOptions): SheetsBackendAdapter {
	const { table, delayMs = 0 } = opts;
	// Own a mutable reference so create/delete (which reassign) stay visible to later reads.
	let rows = opts.rows;

	return {
		async fetchMeta(): Promise<MetaQuery> {
			// Full MetaQuery shape — a single-table _meta the hooks pass through cleanTable().
			return { _meta: { tables: [table] } } as unknown as MetaQuery;
		},

		async listRows<T = Record<string, unknown>>(
			_ctx: AdapterTableContext,
			query: AdapterListQuery
		): Promise<AdapterListResult<T>> {
			if (delayMs > 0) await sleep(delayMs);

			const q = query as RuntimeListQuery;
			const view = applySort(rows, q.orderBy);
			const total = view.length;

			// Page size: paginated passes `limit`, infinite passes `first`. Default to the whole set.
			const limit = q.limit ?? q.first ?? total;
			// Start: prefer the Relay cursor (infinite forward paging), else offset (paginated / deep jump).
			const fromCursor = cursorToIndex(q.after);
			const start = fromCursor != null ? fromCursor : q.offset ?? 0;
			const end = Math.min(start + limit, total);

			const slice = view.slice(start, end);

			return {
				rows: slice as unknown as T[],
				totalCount: total,
				pageInfo: {
					hasNextPage: end < total,
					hasPreviousPage: start > 0,
					// Monotonic, non-null cursor = the absolute end index; parses back via cursorToIndex.
					endCursor: String(end),
					startCursor: String(start)
				}
			};
		},

		async createRow<T = Record<string, unknown>>(
			_ctx: AdapterTableContext,
			data: Record<string, unknown>
		): Promise<T | null> {
			if (delayMs > 0) await sleep(delayMs);
			const id = data.id ?? `mock-${Date.now()}-${rows.length}`;
			const row: SheetsRow = { ...data, id } as SheetsRow;
			rows = [...rows, row];
			opts.rows.push(row);
			return row as unknown as T;
		},

		async updateRow<T = Record<string, unknown>>(
			_ctx: AdapterTableContext,
			id: string | number | Record<string, unknown>,
			patch: Record<string, unknown>
		): Promise<T | null> {
			if (delayMs > 0) await sleep(delayMs);
			const target = typeof id === 'object' ? (id as { id?: unknown }).id : id;
			const existing = rows.find((r) => rowId(r) === target);
			if (!existing) return null;
			Object.assign(existing, patch);
			return existing as unknown as T;
		},

		async deleteRow(
			_ctx: AdapterTableContext,
			id: string | number | Record<string, unknown>,
			_execute: unknown,
			_options?: MutationOptions
		): Promise<void> {
			if (delayMs > 0) await sleep(delayMs);
			const target = typeof id === 'object' ? (id as { id?: unknown }).id : id;
			rows = rows.filter((r) => rowId(r) !== target);
			// Mirror the deletion into the caller-owned array so it stays consistent.
			const idx = opts.rows.findIndex((r) => rowId(r) === target);
			if (idx !== -1) opts.rows.splice(idx, 1);
		}
	};
}

/**
 * Infinite scroll table hook with hybrid cursor-based pagination
 *
 * Uses a hybrid pagination strategy:
 * - Page 0: Offset-based (`first: N`) to get initial data + endCursor
 * - Page N+1: Cursor-based (`first: N, after: endCursor`) for efficient deep pagination
 *
 * This leverages PostGraphile's Relay Connection spec for optimal performance on large datasets.
 *
 * Data Persistence:
 * - Uses React Query cache as the source of truth for page data
 * - Data survives component unmount/remount and route changes
 * - Only clears when table name or query options actually change (deep comparison)
 *
 * Ported from apps/admin use-infinite-table.ts with context injection.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { keepPreviousData, useQueries, useQueryClient } from '@tanstack/react-query';

import { useSheetsContext } from '../context/sheets-context';
import type { SheetsScopeKey } from '../context/sheets-context';

import {
	cleanTable,
	type CleanTable,
	type MetaTable,
	type MutationOptions,
	type PageInfo,
	type QueryOptions,
} from '@constructive-io/data';
import { createError } from '@constructive-io/data';
import type { FieldSelection } from '@constructive-io/data';
import { toOrderByEnumValue } from '@constructive-io/data';
import { useSheetsAdapter } from '../adapter/use-sheets-adapter';
import { useSheetsMeta } from './use-sheets-meta';
import { sheetsQueryKeys } from './query-keys';
import { resolveRelationFieldMap } from './relation-field-resolution';
import { validateOrderByVariables } from './orderby-enum-resolution';
import { transformToPostGraphileVariables } from './use-sheets-table';

type RowRecord = Record<string, unknown>;

/** Data for a single loaded page */
export interface PageData<T = RowRecord> {
	rows: T[];
	pageInfo: PageInfo;
	pageIndex: number;
	totalCount?: number;
}

/** Options for the infinite table hook */
export interface UseInfiniteTableOptions {
	/** Page size for fetching */
	pageSize?: number;
	/** Order by clauses */
	orderBy?: Array<{ field: string; direction: 'asc' | 'desc' }>;
	/** Filter conditions */
	where?: Record<string, unknown>;
	/** Field selection preset or custom selection */
	select?: FieldSelection;
	/** Enable/disable the hook */
	enabled?: boolean;
	/** Mutation options for CRUD operations */
	mutationOptions?: MutationOptions;
}

/** Result from the infinite table hook */
export interface UseInfiniteTableResult<T = RowRecord> {
	/** Get row at a specific index, returns null if not loaded */
	getRowAtIndex: (index: number) => T | null;
	/** Total count of rows in the table */
	totalCount: number;
	/** Check if a specific row index is loaded */
	isRowLoaded: (rowIndex: number) => boolean;
	/** Check if a specific page is currently loading */
	isPageLoading: (pageIndex: number) => boolean;
	/** Ensure rows in a range are loaded (call from onVisibleRegionChanged) */
	ensureRowsLoaded: (startRow: number, endRow: number) => void;
	/** All loaded pages */
	loadedPages: Map<number, PageData<T>>;
	/** Page size */
	pageSize: number;
	/** Overall loading state (true if any page is loading) */
	isLoading: boolean;
	/** Whether initial data has been loaded */
	hasInitialData: boolean;
	/** Error from the most recent failed fetch */
	error: Error | null;
	/** Invalidate all pages and refetch */
	invalidate: () => void;
	/** Reset to initial state (clears all pages, refetches page 0) */
	reset: () => void;
	/**
	 * Optimistically update a single row in the page cache without refetching.
	 * @param rowIndex The absolute row index
	 * @param patch Partial row data to merge with existing row
	 * @returns true if the row was found and updated, false otherwise
	 */
	updateRowAtIndex: (rowIndex: number, patch: Partial<T>) => boolean;
}

/** Query key factory for infinite table pages */
const sheetsInfiniteTableKeys = {
	all: (scope: SheetsScopeKey, tableName: string) => sheetsQueryKeys.infiniteTable(scope, tableName),
	page: (scope: SheetsScopeKey, tableName: string, pageIndex: number, optionsKey: string) =>
		[...sheetsQueryKeys.infiniteTable(scope, tableName), 'page', pageIndex, optionsKey] as const,
	totalCount: (scope: SheetsScopeKey, tableName: string, where?: Record<string, unknown>) =>
		sheetsQueryKeys.infiniteTableTotalCount(scope, tableName, where),
};

/**
 * Create a stable JSON key from options for deep comparison.
 * This ensures the key only changes when the actual values change, not object references.
 */
function createStableOptionsKey(options: {
	pageSize: number;
	orderBy?: Array<{ field: string; direction: 'asc' | 'desc' }>;
	where?: Record<string, unknown>;
	fieldSelection?: FieldSelection;
}): string {
	return JSON.stringify({
		pageSize: options.pageSize,
		orderBy: options.orderBy ?? null,
		where: options.where ?? null,
		fieldSelection: options.fieldSelection ?? null,
	});
}

/**
 * Hook for infinite scroll table with hybrid cursor-based pagination.
 * Uses React Query cache as the source of truth for data persistence.
 */
export function useSheetsInfiniteTable<T extends RowRecord = RowRecord>(
	tableName: string,
	options: UseInfiniteTableOptions = {},
): UseInfiniteTableResult<T> {
	const { pageSize = 100, orderBy, where, select: fieldSelection, enabled = true } = options;

	const queryClient = useQueryClient();
	const { execute, scopeKey } = useSheetsContext();
	const { data: meta } = useSheetsMeta({ enabled });
	const adapter = useSheetsAdapter();

	// Create stable options key using JSON serialization for deep comparison
	const stableOptionsKey = useMemo(
		() => createStableOptionsKey({ pageSize, orderBy, where, fieldSelection }),
		[pageSize, orderBy, where, fieldSelection],
	);

	// Track which pages we want to load
	const [requestedPages, setRequestedPages] = useState<Set<number>>(() => new Set([0]));

	// Cursor chain for cursor-based pagination (stored in ref for performance)
	const cursorChainRef = useRef<Map<number, string>>(new Map());
	const [cursorChainVersion, setCursorChainVersion] = useState(0);

	// Track latest total count from any page response
	const totalCountRef = useRef<number>(0);

	// Flag to defer cache invalidation to useEffect after synchronous reset
	const needsInvalidationRef = useRef(false);

	// Generation counter: incremented on every table/options reset. queryFn closures capture
	// the current generation and skip cursor writes if stale. This prevents in-flight queries
	// from a previous table/options context from poisoning cursorChainRef after a reset.
	// (PostGraphile v5 cursors include a digest hash scoped to table + ORDER BY, so a cursor
	// from one query context will be rejected by a different query context.)
	const generationRef = useRef(0);

	// Track previous stable key to detect actual changes
	const prevStableKeyRef = useRef<string>(stableOptionsKey);
	const prevTableNameRef = useRef<string>(tableName);

	// Get table metadata
	const tables = useMemo<CleanTable[]>(() => {
		if (!meta?._meta?.tables) return [];
		return meta._meta.tables
			.filter((candidate): candidate is MetaTable => candidate != null)
			.map((metaTable) => cleanTable(metaTable));
	}, [meta]);

	const table = useMemo<CleanTable | null>(
		() => tables.find((candidate) => candidate.name === tableName) ?? null,
		[tables, tableName],
	);

	// Synchronous render-time reset: clear cursors and state BEFORE pageQueries useMemo reads them.
	// This follows the React 18+ "storing information from previous renders" pattern where setState
	// during render causes React to discard the current render and retry with updated state.
	// On retry, the condition is false (refs already updated) so no infinite loop occurs.
	const tableChanged = prevTableNameRef.current !== tableName;
	const optionsChanged = prevStableKeyRef.current !== stableOptionsKey;

	if (tableChanged || optionsChanged) {
		// Clear cursors synchronously — must happen before pageQueries useMemo
		cursorChainRef.current.clear();
		totalCountRef.current = 0;

		// Bump generation so in-flight queryFn closures from the old context
		// will skip writing their stale cursors into cursorChainRef
		generationRef.current += 1;

		// Update tracking refs so condition is false on retry render
		prevTableNameRef.current = tableName;
		prevStableKeyRef.current = stableOptionsKey;

		// Flag cache invalidation for the subsequent useEffect
		needsInvalidationRef.current = true;

		// Trigger state update — React discards current render and retries
		setCursorChainVersion(0);
		setRequestedPages(new Set([0]));
	}

	// Cache invalidation is a side effect and must stay in useEffect
	useEffect(() => {
		if (needsInvalidationRef.current) {
			needsInvalidationRef.current = false;
			queryClient.invalidateQueries({
				queryKey: sheetsInfiniteTableKeys.all(scopeKey, tableName),
			});
		}
	}, [tableName, stableOptionsKey, queryClient, scopeKey]);

	// Helper to get page data from React Query cache
	const getPageDataFromCache = useCallback(
		(pageIndex: number): PageData<T> | undefined => {
			return queryClient.getQueryData<PageData<T>>(
				sheetsInfiniteTableKeys.page(scopeKey, tableName, pageIndex, stableOptionsKey),
			);
		},
		[queryClient, scopeKey, tableName, stableOptionsKey],
	);

	// Create query options for each requested page
	const pageQueries = useMemo(() => {
		if (!table || !enabled) return [];
		// Force recompute when cursor chain advances
		void cursorChainVersion;

		// Capture generation at useMemo time — queryFn closures use this to detect
		// if the query context has changed (table/options reset) before they write cursors
		const queryGeneration = generationRef.current;

		return Array.from(requestedPages).map((pageIndex) => {
			// Determine pagination strategy
			const isFirstPage = pageIndex === 0;
			const previousCursor = pageIndex > 0 ? cursorChainRef.current.get(pageIndex - 1) : undefined;
			// Pages:
			// - 0: always fetch
			// - 1: wait for cursor from page 0 (prefer cursor-based)
			// - 2+: allow offset fallback (supports scrollbar jumps without loading all intermediate pages)
			const canUseOffsetFallback = pageIndex >= 2;
			const canFetch = isFirstPage || previousCursor !== undefined || canUseOffsetFallback;

			return {
				queryKey: sheetsInfiniteTableKeys.page(scopeKey, tableName, pageIndex, stableOptionsKey),
				queryFn: async (): Promise<PageData<T>> => {
					if (!table) {
						throw createError.notFound(`Table '${tableName}' not found`);
					}

					// Build query options. `includePageInfo` is always set so the cursor
					// chain works on every page (page 0 has no `after` to imply pageInfo).
					const queryOptions: QueryOptions = {
						first: pageSize,
						orderBy,
						where: where as QueryOptions['where'],
						fieldSelection,
						includePageInfo: true, // Always include for cursor chain
					};

					// Prefer cursor-based pagination when possible; allow offset fallback for deep jumps.
					if (!isFirstPage) {
						if (previousCursor) {
							queryOptions.after = previousCursor;
						} else if (canUseOffsetFallback) {
							queryOptions.offset = pageIndex * pageSize;
						}
					}

					// Cache-bound resolution stays in the hook. The orderBy validation mutates
					// `variables.orderBy` (PostGraphile enum strings) in place; we fold that
					// result back into the `{ field, direction }[]` orderBy we hand the adapter,
					// so the adapter rebuilds an identical (validated) variables payload.
					const variables = transformToPostGraphileVariables(table, queryOptions);

					const [relationFieldMap] = await Promise.all([
						resolveRelationFieldMap({
							table,
							fieldSelection: queryOptions.fieldSelection,
							scopeKey,
							queryClient,
							execute,
						}),
						validateOrderByVariables(variables, table, scopeKey, queryClient, execute),
					]);

					const validatedOrderByEnum = new Set((variables.orderBy as string[] | undefined) ?? []);
					const availableOrderByFields = new Set(table.fields.map((field) => field.name));
					const validatedOrderBy = orderBy?.filter(
						({ field, direction }) =>
							availableOrderByFields.has(field) && validatedOrderByEnum.has(toOrderByEnumValue(field, direction)),
					);

					const res = await adapter.listRows<T>(
						{ table, allTables: tables, tableName },
						{
							...queryOptions,
							orderBy: validatedOrderBy,
							// resolveRelationFieldMap yields `string | null` (null = omit field). The
							// contract narrows to `string`, but the null values are passed through to
							// buildSelect unchanged at runtime — behavior is identical to before.
							relationFieldMap: relationFieldMap as Record<string, string>,
						},
						execute,
					);

					const rows = res.rows;
					// The adapter's AdapterPageInfo marks booleans optional; the underlying
					// PostGraphile connection always populates them (the doc selects all four),
					// so this narrows to PageInfo exactly as the inline connection cast did.
					const pageInfo: PageInfo = (res.pageInfo as PageInfo | undefined) || {
						hasNextPage: false,
						hasPreviousPage: false,
						endCursor: null,
						startCursor: null,
					};

					// Guard: only write refs if this queryFn's generation matches the current one.
					// In-flight queries from a previous table/options context will have a stale
					// generation and their writes are silently discarded.
					const isCurrentGeneration = queryGeneration === generationRef.current;

					// Update total count ref
					if (res.totalCount !== undefined && isCurrentGeneration) {
						totalCountRef.current = res.totalCount;
					}

					// Store cursor for next page (and bump version so dependent pages can enable)
					if (pageInfo.endCursor && isCurrentGeneration) {
						const prev = cursorChainRef.current.get(pageIndex);
						if (prev !== pageInfo.endCursor) {
							cursorChainRef.current.set(pageIndex, pageInfo.endCursor);
							setCursorChainVersion((v) => v + 1);
						}
					}

					const pageData: PageData<T> = {
						rows,
						pageInfo,
						pageIndex,
						totalCount: res.totalCount,
					};

					return pageData;
				},
				enabled: enabled && !!table && canFetch,
				// Keep the previously-fetched page visible while this page's KEY changes
				// (sort/filter/pageSize change `stableOptionsKey`, minting a fresh key per
				// page). Without this the new key has no data → getRowAtIndex returns null
				// for every index → the whole grid flashes to skeletons until the refetch
				// lands. Paginated mode already does this in use-sheets-table.ts.
				placeholderData: keepPreviousData,
				staleTime: 5 * 60 * 1000, // 5 minutes
				gcTime: 10 * 60 * 1000, // 10 minutes
			};
		});
		}, [
			table,
			tables,
			tableName,
			enabled,
			scopeKey,
			queryClient,
			execute,
			adapter,
			requestedPages,
			stableOptionsKey,
			pageSize,
		orderBy,
		where,
		fieldSelection,
		cursorChainVersion,
	]);

	// Execute all page queries
	const queryResults = useQueries({ queries: pageQueries });

	// Sync cursor chain from React Query cache on mount/rehydration
	// This restores cursors for pages that were cached but cursor chain was lost.
	// Guarded by generation to avoid restoring stale cursors during a reset transition.
	useEffect(() => {
		if (!enabled || !table) return;

		const gen = generationRef.current;

		// Check React Query cache for existing page data and restore cursors
		for (let i = 0; i < 100; i++) {
			// Bail if generation changed (a reset happened while this effect was running)
			if (gen !== generationRef.current) break;

			// Check up to 100 pages
			const cachedData = getPageDataFromCache(i);
			if (cachedData?.pageInfo?.endCursor && !cursorChainRef.current.has(i)) {
				cursorChainRef.current.set(i, cachedData.pageInfo.endCursor);
			}
			if (cachedData?.totalCount !== undefined) {
				totalCountRef.current = cachedData.totalCount;
			}
			if (!cachedData) break; // Stop at first missing page
		}
	}, [enabled, table, getPageDataFromCache]);

	// Compute loading states
	const isLoading = queryResults.some((result) => result.isLoading);

	// Check if we have initial data - either from current query or from cache
	const hasInitialData = useMemo(() => {
		// Check query results first
		const page0Query = queryResults.find((_, idx) => Array.from(requestedPages)[idx] === 0);
		if (page0Query?.data) return true;

		// Fall back to cache check
		const cachedPage0 = getPageDataFromCache(0);
		return cachedPage0 !== undefined;
	}, [queryResults, requestedPages, getPageDataFromCache]);

	const error = queryResults.find((result) => result.error)?.error ?? null;

	// Get row at index - reads from React Query cache
	// IMPORTANT: Always read from cache first since optimistic updates use setQueryData
	// which updates cache but doesn't immediately update queryResults references
	const getRowAtIndex = useCallback(
		(rowIndex: number): T | null => {
			const pageIndex = Math.floor(rowIndex / pageSize);
			const rowIndexInPage = rowIndex % pageSize;

			// Always read from React Query cache first - this ensures we get optimistically
			// updated data from setQueryData calls (used in updateRowAtIndex)
			const cachedData = getPageDataFromCache(pageIndex);
			if (cachedData) {
				return cachedData.rows[rowIndexInPage] ?? null;
			}

			// Fall back to query results if cache miss (shouldn't happen normally)
			const queryIndex = Array.from(requestedPages).indexOf(pageIndex);
			if (queryIndex !== -1 && queryResults[queryIndex]?.data) {
				const pageData = queryResults[queryIndex].data;
				return pageData.rows[rowIndexInPage] ?? null;
			}

			return null;
		},
		[pageSize, getPageDataFromCache, requestedPages, queryResults],
	);

	// Check if row is loaded - reads from cache first for consistency with getRowAtIndex
	const isRowLoaded = useCallback(
		(rowIndex: number): boolean => {
			const pageIndex = Math.floor(rowIndex / pageSize);
			const rowIndexInPage = rowIndex % pageSize;

			// Check cache first (consistent with getRowAtIndex)
			const cachedData = getPageDataFromCache(pageIndex);
			if (cachedData) {
				return rowIndexInPage < cachedData.rows.length;
			}

			// Fallback to query results
			const queryIndex = Array.from(requestedPages).indexOf(pageIndex);
			if (queryIndex !== -1 && queryResults[queryIndex]?.data) {
				return rowIndexInPage < queryResults[queryIndex].data.rows.length;
			}

			return false;
		},
		[pageSize, getPageDataFromCache, requestedPages, queryResults],
	);

	// Check if page is loading
	const isPageLoading = useCallback(
		(pageIndex: number): boolean => {
			const queryIndex = Array.from(requestedPages).indexOf(pageIndex);
			if (queryIndex === -1) return false;
			return queryResults[queryIndex]?.isLoading ?? false;
		},
		[requestedPages, queryResults],
	);

	// Ensure rows in range are loaded
	const ensureRowsLoaded = useCallback(
		(startRow: number, endRow: number) => {
			const startPage = Math.floor(Math.max(0, startRow) / pageSize);
			const endPage = Math.floor(Math.max(0, endRow - 1) / pageSize);

			const minPage = Math.max(0, startPage);
			const maxPage = endPage;

			setRequestedPages((prev) => {
				const next = new Set(prev);
				let changed = false;

				const maxPossiblePage =
					totalCountRef.current > 0 ? Math.max(0, Math.ceil(totalCountRef.current / pageSize) - 1) : null;
				const cappedMaxPage = maxPossiblePage === null ? maxPage : Math.min(maxPage, maxPossiblePage);

				for (let page = minPage; page <= cappedMaxPage; page++) {
					if (!next.has(page)) {
						next.add(page);
						changed = true;
					}
				}

				return changed ? next : prev;
			});
		},
		[pageSize],
	);

	// Build loadedPages map from React Query cache for backward compatibility
	const loadedPages = useMemo(() => {
		const map = new Map<number, PageData<T>>();

		// Add data from current query results
		Array.from(requestedPages).forEach((pageIndex, idx) => {
			const result = queryResults[idx];
			if (result?.data) {
				map.set(pageIndex, result.data);
			}
		});

		return map;
	}, [requestedPages, queryResults]);

	// Compute total count from query results or ref
	const totalCount = useMemo(() => {
		// Try to get from latest query result
		for (const result of queryResults) {
			if (result.data?.totalCount !== undefined) {
				return result.data.totalCount;
			}
		}
		return totalCountRef.current;
	}, [queryResults]);

	// Invalidate all pages
	const invalidate = useCallback(() => {
		// Clear cursor chain and bump generation to discard in-flight stale cursors
		cursorChainRef.current.clear();
		totalCountRef.current = 0;
		generationRef.current += 1;
		setCursorChainVersion(0);

		// Reset to page 0
		setRequestedPages(new Set([0]));

		// Invalidate React Query cache
		queryClient.invalidateQueries({ queryKey: sheetsInfiniteTableKeys.all(scopeKey, tableName) });
	}, [queryClient, scopeKey, tableName]);

	// Reset to initial state
	const reset = useCallback(() => {
		invalidate();
	}, [invalidate]);

	// Optimistically update a single row in the React Query cache
	const updateRowAtIndex = useCallback(
		(rowIndex: number, patch: Partial<T>): boolean => {
			const pageIndex = Math.floor(rowIndex / pageSize);
			const rowIndexInPage = rowIndex % pageSize;

			const queryKey = sheetsInfiniteTableKeys.page(scopeKey, tableName, pageIndex, stableOptionsKey);
			const cachedData = queryClient.getQueryData<PageData<T>>(queryKey);

			if (!cachedData || !cachedData.rows[rowIndexInPage]) {
				return false;
			}

			// Update the cache optimistically
			queryClient.setQueryData<PageData<T>>(queryKey, (old) => {
				if (!old) return old;

				const newRows = [...old.rows];
				newRows[rowIndexInPage] = { ...newRows[rowIndexInPage], ...patch } as T;

				return {
					...old,
					rows: newRows,
				};
			});

			return true;
		},
		[pageSize, queryClient, scopeKey, tableName, stableOptionsKey],
	);

	return {
		getRowAtIndex,
		totalCount,
		isRowLoaded,
		isPageLoading,
		ensureRowsLoaded,
		loadedPages,
		pageSize,
		isLoading,
		hasInitialData,
		error: error as Error | null,
		invalidate,
		reset,
		updateRowAtIndex,
	};
}

/**
 * Export query keys for external cache management
 */
export { sheetsInfiniteTableKeys };

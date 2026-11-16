/**
 * Cursor-based paginated table hook for "load more" patterns.
 *
 * Uses TanStack Query v5 `useInfiniteQuery` with PostGraphile Relay Connection
 * cursor pagination (first/after + pageInfo).
 *
 * Designed for sequential "load more" use cases (e.g., relation picker overlays).
 * For non-sequential virtual grid scrolling, see `useSheetsInfiniteTable`.
 */
import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';

import { useSheetsContext } from '../context/sheets-context';

import type { FieldSelection, PageInfo } from '@constructive-io/data';
import { useSheetsAdapter } from '../adapter/use-sheets-adapter';
import { sheetsQueryKeys } from './query-keys';
import { relationsFromSelection, sortSpecs, whereFilter } from './list-query';
import { useTableModel } from './use-table-model';

type RowRecord = Record<string, unknown>;

export interface UseSheetsTableCursorOptions {
	enabled?: boolean;
	select?: FieldSelection;
	pageSize?: number;
	/** A filter in the server's filter input shape. */
	where?: Readonly<Record<string, unknown>>;
	/** Columns to fetch (the primary key and relation keys are always added). Omitted: every readable column. */
	columns?: readonly string[];
	orderBy?: Array<{ field: string; direction: 'asc' | 'desc' }>;
}

export interface UseSheetsTableCursorResult<TData extends RowRecord = RowRecord> {
	data: TData[];
	totalCount: number;
	isLoading: boolean;
	isFetchingNextPage: boolean;
	hasNextPage: boolean;
	fetchNextPage: () => void;
	error: Error | null;
}

interface CursorPage<TData = RowRecord> {
	rows: TData[];
	totalCount: number;
	pageInfo: PageInfo;
}

export function useSheetsTableCursor<TData extends RowRecord = RowRecord>(
	tableName: string,
	options: UseSheetsTableCursorOptions = {},
): UseSheetsTableCursorResult<TData> {
	const { enabled = true, select: fieldSelection, pageSize = 20, where, orderBy, columns } = options;
	const { execute, scopeKey } = useSheetsContext();
	const adapter = useSheetsAdapter();
	const { model: table, tableKey, error: modelError } = useTableModel(tableName, { enabled });
	// Cache entries are keyed by `TableModel.key`; the bare name is only a fallback before `_meta` loads.
	const cacheRef = tableKey ?? tableName;

	// Stable options key for query cache (excludes enabled/pageSize which don't affect data identity)
	const stableOptions = useMemo(
		() => ({ fieldSelection, where, orderBy, columns }),
		[fieldSelection, where, orderBy, columns],
	);

	const {
		data,
		isLoading,
		isFetchingNextPage,
		hasNextPage,
		fetchNextPage,
		error,
	} = useInfiniteQuery<CursorPage<TData>, Error>({
		queryKey: sheetsQueryKeys.cursorTable(scopeKey, cacheRef, stableOptions),
		queryFn: async ({ pageParam, signal }) => {
			if (!table) throw modelError ?? new Error(`Table '${tableName}' not found`);
			const cursor = pageParam as string | undefined;
			const res = await adapter.listRows<TData>(
				{ model: table, tableName },
				{
					limit: pageSize,
					after: cursor,
					where: whereFilter(where),
					orderBy: sortSpecs(orderBy),
					relations: relationsFromSelection(fieldSelection),
					columns,
					signal,
				},
				execute,
			);

			// The adapter's AdapterPageInfo marks booleans optional; the underlying
			// PostGraphile connection always populates them, so this narrows to PageInfo
			// exactly as the inline connection cast did. The fallback default mirrors the
			// prior direct-array branch byte-for-byte.
			const pageInfo: PageInfo = (res.pageInfo as PageInfo | undefined) ?? {
				hasNextPage: false,
				hasPreviousPage: false,
			};

			return {
				rows: res.rows,
				totalCount: res.totalCount,
				pageInfo,
			};
		},
		initialPageParam: undefined as string | undefined,
		getNextPageParam: (lastPage) =>
			lastPage.pageInfo.hasNextPage && lastPage.pageInfo.endCursor
				? lastPage.pageInfo.endCursor
				: undefined,
		enabled: enabled && !!table,
		staleTime: 5 * 60 * 1000,
	});

	const flatData = useMemo<TData[]>(
		() => data?.pages.flatMap((page) => page.rows) ?? [],
		[data],
	);

	const totalCount = useMemo(
		() => data?.pages[data.pages.length - 1]?.totalCount ?? 0,
		[data],
	);

	return {
		data: flatData,
		totalCount,
		isLoading,
		isFetchingNextPage,
		hasNextPage: hasNextPage ?? false,
		fetchNextPage,
		error: error ?? (enabled ? modelError : null),
	};
}

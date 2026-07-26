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
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';

import { useSheetsMeta } from './use-sheets-meta';
import { useSheetsContext } from '../context/sheets-context';

import {
	cleanTable,
	type CleanTable,
	type Filter,
	type MetaTable,
	type PageInfo,
	type QueryOptions,
} from '@constructive-io/data';
import { createError } from '@constructive-io/data';
import type { FieldSelection } from '@constructive-io/data';
import { toOrderByEnumValue } from '@constructive-io/data';
import { useSheetsAdapter } from '../adapter/use-sheets-adapter';
import { sheetsQueryKeys } from './query-keys';
import { resolveRelationFieldMap } from './relation-field-resolution';
import { validateOrderByVariables } from './orderby-enum-resolution';
import { transformToPostGraphileVariables } from './use-sheets-table';

type RowRecord = Record<string, unknown>;

export interface UseSheetsTableCursorOptions {
	enabled?: boolean;
	select?: FieldSelection;
	pageSize?: number;
	where?: Filter;
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
	const queryClient = useQueryClient();
	const { execute, scopeKey } = useSheetsContext();
	const { data: meta } = useSheetsMeta();
	const adapter = useSheetsAdapter();

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

	const { enabled = true, select: fieldSelection, pageSize = 20, where, orderBy } = options;

	// Stable options key for query cache (excludes enabled/pageSize which don't affect data identity)
	const stableOptions = useMemo(
		() => ({ fieldSelection, where, orderBy }),
		[fieldSelection, where, orderBy],
	);

	const queryOptions: QueryOptions = useMemo(
		() => ({
			fieldSelection,
			where,
			orderBy,
			limit: pageSize,
			includePageInfo: true,
		}),
		[fieldSelection, where, orderBy, pageSize],
	);

	const {
		data,
		isLoading,
		isFetchingNextPage,
		hasNextPage,
		fetchNextPage,
		error,
	} = useInfiniteQuery<CursorPage<TData>, Error>({
		queryKey: sheetsQueryKeys.cursorTable(scopeKey, tableName, stableOptions),
		queryFn: async ({ pageParam }) => {
			if (!table) {
				throw createError.notFound(`Table '${tableName}' not found`);
			}

			const cursor = pageParam as string | undefined;

			const variableOptions: QueryOptions = {
				limit: pageSize,
				where,
				orderBy,
				...(cursor ? { after: cursor } : {}),
			};
			// Cache-bound resolution stays in the hook. The orderBy validation mutates
			// `variables.orderBy` (PostGraphile enum strings) in place; we fold that
			// result back into the `{ field, direction }[]` orderBy we hand the adapter,
			// so the adapter rebuilds an identical (validated) variables payload.
			const variables = transformToPostGraphileVariables(table, variableOptions);

			const [relationFieldMap] = await Promise.all([
				resolveRelationFieldMap({
					table,
					fieldSelection,
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

			const res = await adapter.listRows<TData>(
				{ table, allTables: tables, tableName },
				{
					...queryOptions,
					orderBy: validatedOrderBy,
					// resolveRelationFieldMap yields `string | null` (null = omit field). The
					// contract narrows to `string`, but the null values are passed through to
					// buildSelect unchanged at runtime — behavior is identical to before.
					relationFieldMap: relationFieldMap as Record<string, string>,
					...(cursor ? { after: cursor } : {}),
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
		error,
	};
}

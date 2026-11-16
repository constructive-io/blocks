/**
 * Page through one table's rows with the paging its list field really has
 * (cursor, offset, or one page), through the host's adapter. Cache entries
 * live under the table's cache key, so invalidating a table after a write
 * refreshes these lists too.
 */
import { useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';

import type { TableModel } from '@constructive-io/data';

import { useSheetsAdapter } from '../adapter/use-sheets-adapter';
import { useSheetsContext } from '../context/sheets-context';
import { sheetsQueryKeys } from '../hooks/query-keys';
import type { RecordValues } from './relation-keys';

/** Rows per page in the relation editor. */
export const RELATION_PAGE_SIZE = 25;

export interface ModelPagesOptions {
	/** The table to read, or null while it loads. */
	model: TableModel | null;
	/** What the list is for; part of the cache key. */
	purpose: 'relation-candidates' | 'relation-links' | 'relation-junction-links';
	/** Extra cache-key parts that change the result (filter inputs). */
	keyParts: readonly unknown[];
	/** A filter in the server's filter input shape, or null for every row. */
	where: Readonly<Record<string, unknown>> | null;
	/** Relation fields to select with each row. */
	relations?: readonly string[];
	enabled?: boolean;
	pageSize?: number;
}

export interface ModelPages {
	rows: RecordValues[];
	/** Every matching row, or null when the list does not count. */
	total: number | null;
	isLoading: boolean;
	isFetchingNextPage: boolean;
	hasNextPage: boolean;
	fetchNextPage: () => void;
	error: Error | null;
}

type PageParam = { after?: string; offset?: number } | null;

interface Page {
	rows: RecordValues[];
	total: number | null;
	nextAfter: string | null;
	hasNextPage: boolean;
}

type PagingMode = 'cursor' | 'offset' | 'single';

function pagingMode(model: TableModel): PagingMode {
	const list = model.operations.list;
	if (!list?.first) return 'single';
	if (list.after && list.pageInfo) return 'cursor';
	if (list.offset) return 'offset';
	return 'single';
}

export function useModelPages(options: ModelPagesOptions): ModelPages {
	const { model, purpose, keyParts, where, relations, enabled = true, pageSize = RELATION_PAGE_SIZE } = options;
	const { execute, scopeKey } = useSheetsContext();
	const adapter = useSheetsAdapter();
	const mode = model ? pagingMode(model) : 'single';
	const counts = Boolean(model?.operations.list?.totalCount);

	const query = useInfiniteQuery<Page, Error>({
		queryKey: [...sheetsQueryKeys.table(scopeKey, model?.key ?? ''), purpose, mode, pageSize, where, relations ?? null, ...keyParts],
		queryFn: async ({ pageParam }) => {
			if (!model) throw new Error('The table is not ready.');
			const param = pageParam as PageParam;
			const result = await adapter.listRows(
				{ model, tableName: model.key },
				{
					where: where ?? undefined,
					limit: mode === 'single' ? undefined : pageSize,
					after: param?.after,
					offset: param?.offset,
					relations: relations && relations.length > 0 ? relations : 'none',
					includeTotalCount: counts,
				},
				execute,
			);
			const loadedBefore = param?.offset ?? 0;
			const hasNextPage =
				mode === 'cursor'
					? Boolean(result.pageInfo?.hasNextPage && result.pageInfo.endCursor)
					: mode === 'offset'
						? result.rows.length === pageSize && (!counts || loadedBefore + result.rows.length < result.totalCount)
						: false;
			return {
				rows: result.rows,
				total: counts ? result.totalCount : null,
				nextAfter: result.pageInfo?.endCursor ?? null,
				hasNextPage,
			};
		},
		initialPageParam: null as PageParam,
		getNextPageParam: (last, pages): PageParam | undefined => {
			if (!last.hasNextPage) return undefined;
			if (mode === 'cursor') return last.nextAfter ? { after: last.nextAfter } : undefined;
			return { offset: pages.reduce((sum, page) => sum + page.rows.length, 0) };
		},
		enabled: enabled && Boolean(model),
		staleTime: 30 * 1000,
	});

	const rows = useMemo(() => query.data?.pages.flatMap((page) => page.rows) ?? [], [query.data]);
	const pages = query.data?.pages;
	const total = pages && pages.length > 0 ? (pages[pages.length - 1]?.total ?? null) : null;

	return {
		rows,
		total,
		isLoading: enabled && Boolean(model) && query.isPending,
		isFetchingNextPage: query.isFetchingNextPage,
		hasNextPage: Boolean(query.hasNextPage),
		fetchNextPage: () => {
			void query.fetchNextPage();
		},
		error: query.error ?? null,
	};
}

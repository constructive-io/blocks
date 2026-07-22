// src/hooks/use-sheets-meta.ts
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import type { MetaQuery } from '@constructive-io/data';

import { useSheetsAdapter } from '../adapter/use-sheets-adapter';
import { useSheetsContext, type SheetsScopeKey } from '../context/sheets-context';
import { sheetsQueryKeys } from './query-keys';

export const metaKey = (scope: SheetsScopeKey) => sheetsQueryKeys.meta(scope);

export interface UseMetaOptions {
	enabled?: boolean;
}

export function useSheetsMeta(options: UseMetaOptions = {}): UseQueryResult<MetaQuery, Error> {
	const { enabled = true } = options;
	const { execute, scopeKey } = useSheetsContext();
	const adapter = useSheetsAdapter();
	return useQuery<MetaQuery, Error>({
		queryKey: metaKey(scopeKey),
		queryFn: () => adapter.fetchMeta(execute),
		staleTime: 5 * 60 * 1000, // 5 min - finite so invalidation + remount triggers refetch
		gcTime: 30 * 60 * 1000, // 30 min - survive long schema-editing sessions
		refetchOnMount: true, // Respect staleTime and refetch stale metadata on mount
		enabled,
	});
}

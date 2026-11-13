// The rows the grid shows: server rows (normalized relations) and the client-side
// draft rows after them; in infinite mode a proxy that reads each server row lazily.
import { useMemo } from 'react';

import type { useInfiniteGridData } from '../hooks/use-infinite-grid-data';
import type { useDataLoading } from '../hooks/use-load-grid';
import { useDraftRows } from '../hooks/use-draft-rows';
import { attachDraftMeta, type SheetsRow } from '../row-model';
import { normalizeServerRow } from '../sheets.utils';

export interface UseSheetsRowsInput {
	tableKey: string;
	infiniteScroll: boolean;
	infiniteGridData: ReturnType<typeof useInfiniteGridData>;
	dataLoadingResult: ReturnType<typeof useDataLoading>;
	serverData: unknown;
	totalCount: number;
	allRelationFields: string[];
	hasCompletedInitialLoad: boolean;
}

export function useSheetsRows({
	tableKey,
	infiniteScroll,
	infiniteGridData,
	dataLoadingResult,
	serverData,
	totalCount,
	allRelationFields,
	hasCompletedInitialLoad,
}: UseSheetsRowsInput) {
	// Get CRUD operations (only available in paginated mode for now)
	const { update, create, delete: deleteRow } = dataLoadingResult.contextValue;

	const relationFieldNames = useMemo(() => new Set(allRelationFields), [allRelationFields]);

	const normalizedServerData = useMemo(() => {
		if (infiniteScroll) return [] as any[]; // Not used in infinite mode
		if (!Array.isArray(serverData) || serverData.length === 0 || relationFieldNames.size === 0) {
			return serverData as any[];
		}
		return (serverData as any[]).map((row) => normalizeServerRow(row, relationFieldNames));
	}, [infiniteScroll, serverData, relationFieldNames]);

	const {
		draftRowsTable,
		draftRows,
		hasDraftRows,
		combinedRows: paginatedCombinedRows,
		draftRowIndices: paginatedDraftRowIndices,
		createDraftRow,
		updateDraftCell,
		removeDraftRow,
		syncDraftRowsWithMeta,
		setDraftRowStatus,
	} = useDraftRows({
		tableKey,
		serverRows: normalizedServerData as any[],
		hasCompletedInitialLoad,
	});

	const serverRowCount = infiniteScroll ? totalCount : normalizedServerData.length;

	const draftDataRows = useMemo(() => {
		if (!draftRows.length) return [] as SheetsRow[];
		return draftRows.map((draft) => {
			const row = { ...draft.values } as SheetsRow;
			return attachDraftMeta(row, {
				isDraft: true,
				draftRowId: draft.id,
				status: draft.status,
				errors: draft.errors,
			});
		});
	}, [draftRows]);

	// ============== INFINITE SCROLL: Virtual rows array ==============
	// Create a proxy array for infinite scroll mode that uses getRowAtIndex and appends draft rows.
	const infiniteRowsProxy = useMemo<SheetsRow[]>(() => {
		if (!infiniteScroll) return [];

		// Create an array-like object with a Proxy to intercept index access
		const handler: ProxyHandler<any[]> = {
			get(target, prop) {
				// Handle array methods and properties
				if (prop === 'length') {
					return serverRowCount + draftDataRows.length;
				}
				if (prop === Symbol.iterator) {
					return function* () {
						const len = serverRowCount + draftDataRows.length;
						for (let i = 0; i < len; i++) {
							if (i < serverRowCount) {
								yield infiniteGridData.getRowAtIndex(i);
							} else {
								yield draftDataRows[i - serverRowCount];
							}
						}
					};
				}
				// Handle numeric indices
				if (typeof prop === 'string' && !isNaN(Number(prop))) {
					const index = Number(prop);
					if (index < serverRowCount) {
						return infiniteGridData.getRowAtIndex(index);
					}
					return draftDataRows[index - serverRowCount];
				}
				// Delegate to target for other properties
				return Reflect.get(target, prop);
			},
		};

		// Single localized cast: the Proxy intercepts numeric index + length access to
		// surface server rows (via getRowAtIndex) and appended draft rows as SheetsRow,
		// so downstream `combinedRows[i]` reads are SheetsRow with no per-use cast.
		return new Proxy([], handler) as unknown as SheetsRow[];
	}, [infiniteScroll, infiniteGridData, serverRowCount, draftDataRows]);

	// Choose the appropriate rows array based on mode
	const combinedRows: SheetsRow[] = infiniteScroll ? infiniteRowsProxy : paginatedCombinedRows;

	const draftRowIndices = useMemo(() => {
		if (!draftDataRows.length) return [] as number[];
		if (infiniteScroll) {
			return draftDataRows.map((_, index) => serverRowCount + index);
		}
		return paginatedDraftRowIndices;
	}, [draftDataRows, infiniteScroll, paginatedDraftRowIndices, serverRowCount]);

	return {
		update,
		create,
		deleteRow,
		normalizedServerData,
		draftRowsTable,
		draftRows,
		hasDraftRows,
		createDraftRow,
		updateDraftCell,
		removeDraftRow,
		syncDraftRowsWithMeta,
		setDraftRowStatus,
		serverRowCount,
		combinedRows,
		draftRowIndices,
	};
}

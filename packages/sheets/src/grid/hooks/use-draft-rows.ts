import { useMemo } from 'react';

import { useSheetsStore } from '../../store/sheets-store';
import type { DraftRow, DraftRowsSlice } from '../../store/draft-rows-slice';
import { attachDraftMeta, isDraftRow } from '../row-model';

interface DraftRowsTableState {
	order: string[];
	map: Record<string, DraftRow>;
	template: Record<string, unknown>;
	metaVersion: string;
	columnOrder: string[];
}

interface UseDraftRowsParams {
	tableKey: string;
	serverRows: any[];
	hasCompletedInitialLoad: boolean;
}

export interface DraftRowsState {
	draftRowsTable?: DraftRowsTableState;
	draftRows: DraftRow[];
	hasDraftRows: boolean;
	combinedRows: any[];
	draftRowIndices: number[];
	createDraftRow: DraftRowsSlice['createDraftRow'];
	updateDraftCell: DraftRowsSlice['updateDraftCell'];
	removeDraftRow: DraftRowsSlice['removeDraftRow'];
	syncDraftRowsWithMeta: DraftRowsSlice['syncDraftRowsWithMeta'];
	setDraftRowStatus: DraftRowsSlice['setDraftRowStatus'];
}

export function useDraftRows({
	tableKey,
	serverRows,
	hasCompletedInitialLoad,
}: UseDraftRowsParams): DraftRowsState {
	const draftRowsTable = useSheetsStore(
		(state) => state.draftRowsByTable[tableKey] as DraftRowsTableState | undefined,
	);
	const createDraftRow = useSheetsStore((state) => state.createDraftRow);
	const updateDraftCell = useSheetsStore((state) => state.updateDraftCell);
	const removeDraftRow = useSheetsStore((state) => state.removeDraftRow);
	const syncDraftRowsWithMeta = useSheetsStore((state) => state.syncDraftRowsWithMeta);
	const setDraftRowStatus = useSheetsStore((state) => state.setDraftRowStatus);

	const draftRows = useMemo(() => {
		if (!draftRowsTable) return [] as DraftRow[];
		return draftRowsTable.order.map((id) => draftRowsTable.map[id]).filter((row): row is DraftRow => Boolean(row));
	}, [draftRowsTable]);

	const mayShowDrafts = hasCompletedInitialLoad || serverRows.length > 0 || draftRows.length > 0;

	const combinedRows = useMemo(() => {
		if (!draftRows.length || !mayShowDrafts) return serverRows as any[];

		const draftDataRows = draftRows.map((draft) => {
			const row = { ...draft.values } as Record<string, unknown>;
			return attachDraftMeta(row, {
				isDraft: true,
				draftRowId: draft.id,
				status: draft.status,
				errors: draft.errors,
			});
		});

		return [...(serverRows as any[]), ...draftDataRows];
	}, [serverRows, draftRows, mayShowDrafts]);

	const draftRowIndices = useMemo(() => {
		const indices: number[] = [];
		combinedRows.forEach((row, index) => {
			if (isDraftRow(row)) {
				indices.push(index);
			}
		});
		return indices;
	}, [combinedRows]);

	const hasDraftRows = draftRows.length > 0 && mayShowDrafts;

	return {
		draftRowsTable,
		draftRows,
		hasDraftRows,
		combinedRows,
		draftRowIndices,
		createDraftRow,
		updateDraftCell,
		removeDraftRow,
		syncDraftRowsWithMeta,
		setDraftRowStatus,
	};
}

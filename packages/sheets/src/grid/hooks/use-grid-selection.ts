import { useMemo } from 'react';

import type { SheetsSelection } from '../../selection/selection-model';
import type { DraftRow } from '../../store/draft-rows-slice';
import { getDraftMeta, type DraftMeta } from '../row-model';

interface DraftRowsTableState {
	order: string[];
	map: Record<string, DraftRow>;
	template: Record<string, unknown>;
	metaVersion: string;
	columnOrder: string[];
}

export interface DraftRowEntry {
	draftRowId: string;
	draftRow: DraftRow;
}

interface UseGridSelectionStateParams {
	gridSelection: SheetsSelection | undefined;
	combinedRows: any[];
	draftRowsTable?: DraftRowsTableState;
}

export function useGridSelectionState({ gridSelection, combinedRows, draftRowsTable }: UseGridSelectionStateParams) {
	const selectedRowIndices = useMemo(() => {
		if (!gridSelection) return [] as number[];
		return gridSelection.rows.toArray();
	}, [gridSelection]);

	const selectedRowCount = selectedRowIndices.length;

	const selectedDraftRowEntries = useMemo(() => {
		if (!draftRowsTable || selectedRowIndices.length === 0) return [] as DraftRowEntry[];

		return selectedRowIndices
			.map((rowIndex) => getDraftMeta(combinedRows[rowIndex]))
			.filter((meta): meta is DraftMeta => Boolean(meta?.draftRowId))
			.map((meta) => {
				const draftRow = draftRowsTable.map[meta.draftRowId];
				return draftRow ? { draftRowId: meta.draftRowId, draftRow } : null;
			})
			.filter((entry): entry is DraftRowEntry => entry !== null);
	}, [draftRowsTable, selectedRowIndices, combinedRows]);

	const hasDraftSelection = selectedDraftRowEntries.length > 0;

	return {
		selectedRowIndices,
		selectedRowCount,
		selectedDraftRowEntries,
		hasDraftSelection,
	};
}

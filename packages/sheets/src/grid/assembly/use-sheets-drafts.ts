// Client-side draft rows: their column metadata (kept in sync with the model), adding one,
// and submitting them (all selected drafts, or one from a self-committing editor).
import { useCallback, useEffect, useMemo, useRef } from 'react';

import type { TableModel } from '@constructive-io/data';

import { computeDraftMetaSignature } from '../../store/draft-rows-slice';
import type { DraftSubmitResult } from '../draft-types';
import type { useDraftRows } from '../hooks/use-draft-rows';
import { useDraftSubmission } from '../hooks/use-draft-submission';
import { useGridSelectionState } from '../hooks/use-grid-selection';
import type { useGridState } from '../hooks/use-grid-state';
import type { useInfiniteGridData } from '../hooks/use-infinite-grid-data';
import type { useDataLoading } from '../hooks/use-load-grid';
import type { SheetsRow } from '../row-model';
import type { mapFromFieldMetaMap, mapFromRelationInfoMap } from '../sheets.utils';
import type { SheetsEmit } from './use-sheets-events';

type DraftRows = ReturnType<typeof useDraftRows>;
type FieldMetaByKey = ReturnType<typeof mapFromFieldMetaMap>;
type RelationInfoByKey = ReturnType<typeof mapFromRelationInfoMap>;

/** Draft rows carry every column; their metadata follows the model. */
export function useDraftColumnMeta({
	tableKey,
	allColumnKeys,
	fieldMetaByKey,
	relationInfoObject,
	syncDraftRowsWithMeta,
}: {
	tableKey: string;
	allColumnKeys: string[];
	fieldMetaByKey: FieldMetaByKey;
	relationInfoObject: RelationInfoByKey;
	syncDraftRowsWithMeta: DraftRows['syncDraftRowsWithMeta'];
}) {
	// Draft rows carry every column, shown or hidden.
	const effectiveColumnOrder = useMemo(() => {
		if (allColumnKeys.length > 0) return allColumnKeys;
		return Object.keys(fieldMetaByKey);
	}, [allColumnKeys, fieldMetaByKey]);

	const metaSignature = useMemo(
		() => computeDraftMetaSignature(effectiveColumnOrder, fieldMetaByKey, relationInfoObject),
		[effectiveColumnOrder, fieldMetaByKey, relationInfoObject],
	);

	useEffect(() => {
		if (!effectiveColumnOrder.length) return;
		syncDraftRowsWithMeta({
			tableKey,
			columnOrder: effectiveColumnOrder,
			fieldMetaByKey,
			relationInfoByKey: relationInfoObject,
			metaVersion: metaSignature,
		});
	}, [effectiveColumnOrder, fieldMetaByKey, relationInfoObject, metaSignature, syncDraftRowsWithMeta, tableKey]);

	return { effectiveColumnOrder, metaSignature };
}

export interface UseSheetsDraftActionsInput {
	tableKey: string;
	tableModel: TableModel | null;
	canCreate: boolean;
	emit: SheetsEmit;
	infiniteScroll: boolean;
	infiniteGridData: ReturnType<typeof useInfiniteGridData>;
	combinedRows: SheetsRow[];
	serverRowCount: number;
	draftRows: DraftRows['draftRows'];
	draftRowsTable: DraftRows['draftRowsTable'];
	createDraftRow: DraftRows['createDraftRow'];
	removeDraftRow: DraftRows['removeDraftRow'];
	setDraftRowStatus: DraftRows['setDraftRowStatus'];
	create: ReturnType<typeof useDataLoading>['contextValue']['create'];
	effectiveColumnOrder: string[];
	fieldMetaByKey: FieldMetaByKey;
	relationInfoObject: RelationInfoByKey;
	metaSignature: string;
	gridState: ReturnType<typeof useGridState>['state'];
	gridActions: ReturnType<typeof useGridState>['actions'];
	operationFeedback: Parameters<typeof useDraftSubmission>[0]['feedback'];
}

/** Add a draft row, and submit draft rows. */
export function useSheetsDraftActions({
	tableKey,
	tableModel,
	canCreate,
	emit,
	infiniteScroll,
	infiniteGridData,
	combinedRows,
	serverRowCount,
	draftRows,
	draftRowsTable,
	createDraftRow,
	removeDraftRow,
	setDraftRowStatus,
	create,
	effectiveColumnOrder,
	fieldMetaByKey,
	relationInfoObject,
	metaSignature,
	gridState,
	gridActions,
	operationFeedback,
}: UseSheetsDraftActionsInput) {
	// Ref to hold submitDraftRowForEditor - populated after useDraftSubmission
	// This breaks the circular dependency: editors need the function, but useDraftSubmission
	// needs hasDraftSelection which comes from useGridSelectionState which needs combinedRows
	const submitDraftRowForEditorRef = useRef<((draftRowId: string) => Promise<DraftSubmitResult>) | null>(null);

	const handleSubmitDraftRowForEditor = useCallback(
		async (draftRowId: string): Promise<DraftSubmitResult> => {
			if (!submitDraftRowForEditorRef.current) {
				return { createdRow: null };
			}
			return submitDraftRowForEditorRef.current(draftRowId);
		},
		[],
	);

	const handleRowAppended = useCallback(async () => {
		if (!canCreate) return undefined;
		if (draftRows.length > 0) {
			return serverRowCount + draftRows.length - 1;
		}

		// Silently skip if metadata isn't ready - this is a transient state
		if (!effectiveColumnOrder.length) return undefined;

		createDraftRow({
			tableKey,
			columnOrder: effectiveColumnOrder,
			fieldMetaByKey: fieldMetaByKey as Record<string, any>,
			relationInfoByKey: relationInfoObject,
			metaVersion: metaSignature,
		});

		const rowIndex = serverRowCount + draftRows.length;
		emit('row:create', { rowIndex });
		return rowIndex;
	}, [
		createDraftRow,
		effectiveColumnOrder,
		fieldMetaByKey,
		relationInfoObject,
		metaSignature,
		tableKey,
		draftRows,
		serverRowCount,
		canCreate,
		emit,
	]);

	const { selectedRowCount, selectedDraftRowEntries, hasDraftSelection } = useGridSelectionState({
		gridSelection: gridState.gridSelection,
		combinedRows,
		draftRowsTable,
	});

	const {
		isSubmittingDrafts,
		submitDraftButtonDisabled,
		submitDraftLabel,
		handleSubmitDraftRows,
		submitDraftRowForEditor,
	} = useDraftSubmission({
		tableKey,
		draftRowsTable,
		selectedDraftRowEntries,
		hasDraftSelection,
		create,
		removeDraftRow,
		setDraftRowStatus,
		clearSelection: () => gridActions.setGridSelection(undefined),
		tableModel,
		relationInfoByKey: relationInfoObject,
		onSubmittedSuccessfully: infiniteScroll ? infiniteGridData.invalidate : undefined,
		feedback: operationFeedback,
	});

	// Populate the ref for editor access (breaks circular dependency)
	submitDraftRowForEditorRef.current = submitDraftRowForEditor;

	return {
		handleRowAppended,
		selectedRowCount,
		isSubmittingDrafts,
		submitDraftButtonDisabled,
		submitDraftLabel,
		handleSubmitDraftRows,
		handleSubmitDraftRowForEditor,
	};
}

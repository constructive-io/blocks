/**
 * useSheets — headless grid assembly hook.
 *
 * Computes the data/state bindings the default {@link Sheets} component renders
 * with the native TanStack DOM grid: columns, the native cell-content resolver,
 * value-commit helpers, and the draft / selection / pagination APIs. The built-in
 * {@link Sheets} component is a thin consumer of this hook.
 *
 * The STABLE headless surface is {@link UseSheetsResult}. A handful of additional
 * fields under the `_shell` group are returned only so the built-in `<Sheets>`
 * chrome (toolbar, pagination, dock) can render; they are intentionally NOT part
 * of the supported headless contract and may change.
 */
import { useCallback, useEffect, useMemo } from 'react';

import { createSheetsCell } from '../cell-model/create-sheets-cell';
import { compileSlots } from '../cell-model/cell-slots';
import { createCellTypeRegistry } from '../cell-types/cell-type-registry';
import { useSheetsContext } from '../context/sheets-context';
import { useSheetsMeta } from '../hooks/use-sheets-meta';
import type { SheetsSelection } from '../selection/selection-model';
import { useSheetsCellContent } from './assembly/use-sheets-cell-content';
import { useSheetsColumns } from './assembly/use-sheets-columns';
import { useSheetsData } from './assembly/use-sheets-data';
import { useDraftColumnMeta, useSheetsDraftActions } from './assembly/use-sheets-drafts';
import { useLoadEvents, useSheetsEmit, useViewChangeEvents } from './assembly/use-sheets-events';
import { useSheetsRows } from './assembly/use-sheets-rows';
import { useSheetsViewQuery } from './assembly/use-sheets-view-query';
import { useSheetsWrites } from './assembly/use-sheets-writes';
import type { UseSheetsInternalResult } from './assembly/use-sheets.types';
import { useFeedback } from './feedback';
import type { VisibleRowRange } from './hooks/use-infinite-grid-data';
import { useGridState } from './hooks/use-grid-state';
import type { SheetsRow } from './row-model';
import type { DataGridProps } from './sheets.types';
import { filterConditionsOf } from './view-state/view-state';

export type {
	SheetsDraftBindings,
	SheetsSelectionBindings,
	SheetsPaginationBindings,
	UseSheetsResult,
	SheetsShellBindings,
	UseSheetsInternalResult,
} from './assembly/use-sheets.types';

/**
 * Headless grid hook — returns the data/state bindings the built-in {@link Sheets}
 * component renders with the native DOM grid.
 *
 * Preconditions:
 * - You MUST render inside a `<FeedbackProvider>` (exported from this package) —
 *   the hook uses the bulk-operation feedback context and throws without it.
 *
 * NOTE: the generic `TRow` flows through {@link DataGridProps}'s row callbacks
 * (e.g. `onRowSelect`). It does not retype the cell bindings, which operate on
 * the dynamic schema-derived row shape.
 */
export function useSheets<TRow extends SheetsRow = SheetsRow>(
	props: DataGridProps<TRow>,
): UseSheetsInternalResult<TRow> {
	const {
		tableName,
		pageSize = 100,
		onRowSelect,
		onCellEdit,
		relationChipLimit,
		relationLabelMaxLength,
		infiniteScroll = false,
		cellTypes,
		cellSlots,
		onEvent,
	} = props;

	// Get feedback context for bulk operation status indicators and failed writes
	const feedback = useFeedback();
	const { clearOperationFeedback, clearWriteErrors } = feedback;

	// Observational onEvent emitter (see assembly/use-sheets-events).
	const emit = useSheetsEmit(tableName, onEvent);

	const { config, canUpload, scopeKey } = useSheetsContext();

	// Per-instance cell-type registry: consumer overrides (provider plugins, then
	// per-instance cellTypes) layered over the built-in native engine. With no consumer
	// cell types this delegates 1:1 to createSheetsCell.
	const cellRegistry = useMemo(
		() =>
			createCellTypeRegistry(
				// Compiled cell-component slots go LAST so they win over plugins + cellTypes.
				[...(config.plugins ?? []).flatMap((p) => p.cellTypes), ...(cellTypes ?? []), ...compileSlots(cellSlots)],
				{
					// Native display builtin: the SheetsCell dispatcher.
					toSheetsCell: (value, ctx) => createSheetsCell(value, ctx.metadata),
				},
			),
		[config.plugins, cellTypes, cellSlots],
	);

	const tableKey = useMemo(() => {
		if (config.databaseId) return `${config.databaseId}::${tableName}`;
		return `default::${tableName}`;
	}, [config.databaseId, tableName]);

	// Clear stale operation feedback and failed writes when switching tables
	useEffect(() => {
		clearOperationFeedback();
		clearWriteErrors();
	}, [tableName, clearOperationFeedback, clearWriteErrors]);

	// Centralized state management
	const { state: gridState, actions: gridActions } = useGridState();

	const { data: filterMeta } = useSheetsMeta();

	// ============== FILTERS / SORT / SEARCH → LIST VARIABLES ==============
	const {
		columnLabel,
		view,
		effectiveWhere,
		orderByClause,
		viewSignature,
		viewQuery,
		fetchColumns,
		fetchRelations,
		savedViews,
	} = useSheetsViewQuery({ tableName, props, config, scopeKey, infiniteScroll, gridActions });

	// ============== ROWS SOURCE (infinite or paginated), CAPABILITIES, ROW IDENTITY ==============
	const {
		infiniteGridData,
		dataLoadingResult,
		serverData,
		totalCount,
		tableModel,
		fieldMetaMap,
		allRelationFields,
		hasCompletedInitialLoad,
		dataError,
		isInitialLoading,
		isFetchingRows,
		canCreate,
		canUpdate,
		canDelete,
		primaryKeyFields,
		readOnlyReason,
		getRowIdentifier,
		getRowId,
	} = useSheetsData({ tableName, pageSize, infiniteScroll, orderByClause, effectiveWhere, fetchColumns, fetchRelations, gridState });
	useLoadEvents({ dataError, hasCompletedInitialLoad, totalCount, emit });

	// ============== ROWS (server rows + drafts) ==============
	const {
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
	} = useSheetsRows({
		tableKey,
		infiniteScroll,
		infiniteGridData,
		dataLoadingResult,
		serverData,
		totalCount,
		allRelationFields,
		hasCompletedInitialLoad,
	});

	// ============== COLUMNS ==============
	const { fieldMetaByKey, allColumnKeys, columnKeys, gridColumnKeys, columns, frozenCount, resizeColumn } = useSheetsColumns({
		tableName,
		infiniteScroll,
		infiniteGridData,
		normalizedServerData,
		combinedRows,
		fieldMetaMap,
		tableModel,
		view,
		hasDraftRows,
		gridState,
		gridActions,
	});

	// Pagination helpers
	const totalPages = Math.max(1, Math.ceil((totalCount || 0) / pageSize));
	useEffect(() => {
		gridActions.resetPageIfNeeded(totalPages);
	}, [totalPages, gridActions]);


	// Handle row selection
	useEffect(() => {
		if (!onRowSelect || !gridState.gridSelection) return;
		const selectedIndices = gridState.gridSelection.rows.toArray();
		const selected = selectedIndices.map((i: number) => combinedRows[i]).filter(Boolean);
		// The grid's rows ARE the consumer's row type, so widen SheetsRow[] -> TRow[].
		onRowSelect(selected as TRow[]);
	}, [gridState.gridSelection, combinedRows, onRowSelect]);

	// ============== CELL CONTENT ==============
	const { relationInfoByField, relationInfoObject, getSheetsCellContent } = useSheetsCellContent({
		tableName,
		tableModel,
		combinedRows,
		gridColumnKeys,
		fieldMetaMap,
		cellRegistry,
		relationChipLimit,
		relationLabelMaxLength,
		filterMeta,
		canCreate,
		canUpdate,
		primaryKeyFields,
		getRowIdentifier,
		canUpload,
		config,
	});

	// ============== DRAFT COLUMN METADATA ==============
	const { effectiveColumnOrder, metaSignature } = useDraftColumnMeta({
		tableKey,
		allColumnKeys,
		fieldMetaByKey,
		relationInfoObject,
		syncDraftRowsWithMeta,
	});

	// ============== WRITES ==============
	const { operationFeedback, deleteSelected, commitCells, commitCellValue, commitCellPatch, invalidateData, history } = useSheetsWrites({
		tableName,
		tableKey,
		config,
		feedback,
		emit,
		infiniteScroll,
		infiniteGridData,
		tableModel,
		combinedRows,
		fieldMetaMap,
		relationInfoByField,
		getSheetsCellContent,
		getRowIdentifier,
		primaryKeyFields,
		canUpdate,
		canDelete,
		update,
		deleteRow,
		updateDraftCell,
		removeDraftRow,
		gridState,
		gridActions,
		columnLabel,
		onCellEdit,
	});

	// ============== DRAFT ROWS: ADD + SUBMIT ==============
	const {
		handleRowAppended,
		selectedRowCount,
		isSubmittingDrafts,
		submitDraftButtonDisabled,
		submitDraftLabel,
		handleSubmitDraftRows,
		handleSubmitDraftRowForEditor,
	} = useSheetsDraftActions({
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
	});

	// Observational sort:change / filter:apply / search:change events.
	useViewChangeEvents({ view, effectiveWhere, emit });

	// ============== INFINITE SCROLL: onVisibleRegionChanged handler ==============
	// Translate the DOM viewport's inclusive {startIndex,endIndex} window into the
	// prefetch range the infinite source loads (clamped to the server row count).
	const handleVisibleRegionChanged = useCallback(
		(range: VisibleRowRange) => {
			if (!infiniteScroll) return;
			if (serverRowCount <= 0) return;

			const start = Math.max(0, Math.min(range.startIndex, serverRowCount - 1));
			const end = Math.max(start, Math.min(range.endIndex, serverRowCount - 1));
			infiniteGridData.onVisibleRegionChanged({ startIndex: start, endIndex: end });
		},
		[infiniteScroll, infiniteGridData, serverRowCount],
	);

	const setGridSelectionForControls = useCallback(
		(selection: SheetsSelection | null) => {
			gridActions.setGridSelection(selection ?? undefined);
		},
		[gridActions],
	);

	const filterConditionCount = useMemo(() => filterConditionsOf(view.state.filters).length, [view.state.filters]);

	// Unified, mode-aware refetch. Shared by the load-state retry path and the
	// imperative handle in the Sheets shell.
	const refetch = useCallback(() => {
		if (infiniteScroll) {
			infiniteGridData.invalidate();
		} else {
			void dataLoadingResult.contextValue.refetch?.();
		}
	}, [infiniteScroll, infiniteGridData, dataLoadingResult.contextValue]);

	// Pagination setter that mirrors the default chrome behavior (emit page:change).
	const setPageIndex = useCallback(
		(updater: number | ((prev: number) => number)) => {
			const next = typeof updater === 'function' ? updater(gridState.pageIndex) : updater;
			gridActions.setPageIndex(next);
			emit('page:change', { pageIndex: next });
		},
		[gridActions, gridState.pageIndex, emit],
	);

	// Loaded successfully but no server rows and nothing drafted yet, with no filter or search.
	const isEmpty =
		hasCompletedInitialLoad &&
		serverRowCount === 0 &&
		draftRows.length === 0 &&
		filterConditionCount === 0 &&
		view.state.search.trim() === '';

	return {
		// -- Stable headless surface (see UseSheetsResult) --
		columns,
		rowCount: combinedRows.length,
		draft: {
			hasDrafts: hasDraftRows,
			appendRow: handleRowAppended,
			submitDrafts: handleSubmitDraftRows,
			deleteSelected,
		},
		selection: {
			gridSelection: gridState.gridSelection,
			setGridSelection: gridActions.setGridSelection,
			setActiveCell: gridActions.setActiveCell,
			moveActive: gridActions.moveActiveCell,
		},
		pagination: {
			pageIndex: gridState.pageIndex,
			pageCount: totalPages,
			setPageIndex,
		},
		isInitialLoading,
		dataError,
		hasCompletedInitialLoad,
		isEmpty,
		refetch,

		// -- Internal chrome bindings (not a stable API) --
		_shell: {
			combinedRows,
			columnKeys,
			totalCount,
			serverRowCount,
			draftRowCount: draftRows.length,
			infiniteScroll,
			view,
			savedViews,
			filterConditionCount,
			viewQuery,
			isFetchingRows,
			setGridSelectionForControls,
			onVisibleRegionChanged: handleVisibleRegionChanged,
			viewSignature,
			columnWidths: gridState.columnWidths,
			resizeColumn,
			frozenCount,
			rowHeightPx: view.layout.rowHeightPx,
			selectedRowCount,
			canCreate,
			canUpdate,
			canDelete,
			readOnlyReason,
			tableModel,
			getRowId,
			isSubmittingDrafts,
			submitDraftButtonDisabled,
			submitDraftLabel,
			getSheetsCellContent,
			cellRegistry,
			commitCellValue,
			commitCells,
			commitCellPatch,
			submitDraftRow: handleSubmitDraftRowForEditor,
			invalidateData,
			undo: history.undo,
			redo: history.redo,
			canUndo: history.canUndo,
			canRedo: history.canRedo,
			emit,
		},
	};
}

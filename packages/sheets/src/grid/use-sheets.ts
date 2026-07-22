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
import { useCallback, useEffect, useMemo, useRef } from 'react';

import type { SheetsSelection } from '../selection/selection-model';
import type { RelationInfo } from '../store/relation-info-slice';

import { useDataGridColumns, type RelationGridColumn } from '../hooks/use-relation-columns';
import { useSheetsContext } from '../context/sheets-context';
import { useSheetsStore } from '../store/sheets-store';
import { sheetsLogger } from '../utils/sheets-logger';
import { computeDraftMetaSignature } from '../store/draft-rows-slice';
import { toast } from '@constructive-io/ui/toast';
import type { DataGridProps, SheetsEvent } from './sheets.types';
import { attachDraftMeta, getDraftMeta, type SheetsRow } from './row-model';

import { createCellTypeRegistry, type CellTypeRegistry } from '../cell-types/cell-type-registry';
import { createSheetsCell } from '../cell-model/create-sheets-cell';
import { compileSlots } from '../cell-model/cell-slots';
import { DRAFT_ACTION_COLUMN_KEY } from './sheets.constants';
import { countConditions } from './sheets.controls';
import { useFeedback } from './feedback';
import {
	buildWhereFromFilters,
	createHeaderClickHandler,
	mapFromFieldMetaMap,
	mapFromRelationInfoMap,
	normalizeServerRow,
} from './sheets.utils';
import { useSheetsMeta } from '../hooks/use-sheets-meta';
import type { DraftSubmitResult } from './draft-types';
import { useCellEditing } from './hooks/use-cell-editing';
import { useBatchCommit, type CellWrite, type CommitCellsOptions, type CommitCellsResult } from './hooks/use-batch-commit';
import { useUndoRedo } from './hooks/use-undo-redo';
import { useDraftRows } from './hooks/use-draft-rows';
import { useDraftSubmission } from './hooks/use-draft-submission';
import { useSheetsContent, type SheetsCellResolution } from '../grid-dom/use-sheets-content';
import { useGridOperations } from './hooks/use-grid-operations';
import { useGridSelectionState } from './hooks/use-grid-selection';
import { useGridState } from './hooks/use-grid-state';
import { useInfiniteGridData, type VisibleRowRange } from './hooks/use-infinite-grid-data';
import { useDataLoading } from './hooks/use-load-grid';

const EMPTY_RELATION_INFO_BY_FIELD = new Map<string, RelationInfo>();

/** Draft-row bindings for a headless shell. */
export interface SheetsDraftBindings {
	/** Whether any client-side draft rows exist. */
	hasDrafts: boolean;
	/** Append a new draft row. Returns the new row index. */
	appendRow: () => Promise<number | undefined>;
	/** Submit all pending draft rows. */
	submitDrafts: () => Promise<void>;
	/** Delete the currently selected rows (draft + server). */
	deleteSelected: () => Promise<void>;
}

/**
 * Selection bindings for a headless shell.
 *
 * The selection value is the native {@link SheetsSelection} (RangeSet-backed `rows`).
 */
export interface SheetsSelectionBindings {
	/** Current native grid selection. */
	gridSelection: SheetsSelection | undefined;
	/** Setter. */
	setGridSelection: (selection: SheetsSelection | undefined) => void;
	/** Park the active cell on `[col, row]` (preserves row/column selection). */
	setActiveCell: (col: number, row: number) => void;
	/** Move the active cell by `[dCol, dRow]`, clamped to grid bounds. */
	moveActive: (dCol: number, dRow: number, colCount: number, rowCount: number) => void;
}

/** Pagination bindings for a headless shell (paginated mode). */
export interface SheetsPaginationBindings {
	/** Current zero-based page index. */
	pageIndex: number;
	/** Total page count (>= 1). */
	pageCount: number;
	/** Set the page index (emits a `page:change` event). */
	setPageIndex: (updater: number | ((prev: number) => number)) => void;
}

/**
 * Stable headless surface returned by {@link useSheets}. (The hook also returns a
 * few `_shell`-grouped extras consumed only by the built-in {@link Sheets} chrome —
 * those are not part of this supported contract.)
 */
export interface UseSheetsResult {
	/** Native column descriptors (key/title/width). */
	columns: RelationGridColumn[];
	/** Number of rows to render. */
	rowCount: number;
	/** Draft-row bindings. */
	draft: SheetsDraftBindings;
	/** Selection bindings. */
	selection: SheetsSelectionBindings;
	/** Pagination bindings. */
	pagination: SheetsPaginationBindings;
	/** True only during the very first load (refetches keep previous data). */
	isInitialLoading: boolean;
	/** Data-load error, if any. */
	dataError: Error | null;
	/** Whether the initial load has completed (success). */
	hasCompletedInitialLoad: boolean;
	/** True when loaded, no server rows, no drafts, and no active filter. */
	isEmpty: boolean;
	/** Refetch the underlying data (mode-aware: infinite vs paginated). */
	refetch: () => void;
}

/**
 * Internal bindings consumed only by the built-in {@link Sheets} chrome
 * (toolbar, dock, pagination chrome). NOT a supported part of the headless contract.
 */
export interface SheetsShellBindings {
	combinedRows: SheetsRow[];
	columnKeys: string[];
	totalCount: number;
	serverRowCount: number;
	draftRowCount: number;
	infiniteScroll: boolean;
	filterTree: ReturnType<typeof useGridState>['state']['filterTree'];
	filtersOpen: boolean;
	setFilterTree: ReturnType<typeof useGridState>['actions']['setFilterTree'];
	setFiltersOpen: ReturnType<typeof useGridState>['actions']['setFiltersOpen'];
	clearAllFilters: ReturnType<typeof useGridState>['actions']['clearAllFilters'];
	applyFilters: () => void;
	fieldTypeMap: Record<string, { gqlType: string; isArray: boolean }>;
	setGridSelectionForControls: (selection: SheetsSelection | null) => void;
	/** Header sort toggle (colIndex → toggleSorting on the sortable column). */
	onHeaderClicked: (colIndex: number) => void;
	/** Prefetch the rows in an inclusive visible window (native range, infinite mode). */
	onVisibleRegionChanged: (range: VisibleRowRange) => void;
	/** @internal Sort state mirror ({ id, desc }) — the DOM header reads this for its caret. NOT a stable API. */
	sorting: ReturnType<typeof useGridState>['state']['sorting'];
	/** @internal Committed column widths (id → px) — the DOM grid maps these to v9 columnSizing. NOT a stable API. */
	columnWidths: ReturnType<typeof useGridState>['state']['columnWidths'];
	/** @internal Commit a column width (id, px) — the DOM resize handle drives this directly. NOT a stable API. */
	resizeColumn: ReturnType<typeof useGridState>['actions']['resizeColumn'];
	frozenCount: number;
	selectedRowCount: number;
	isSubmittingDrafts: boolean;
	submitDraftButtonDisabled: boolean;
	submitDraftLabel: string;
	/** @internal Native DOM content resolver for the TanStack DOM grid. NOT a stable API. */
	getSheetsCellContent: (rowIndex: number, colKey: string) => SheetsCellResolution;
	/** @internal Per-instance cell-type registry (consumer overrides over built-ins). NOT a stable API. */
	cellRegistry: CellTypeRegistry;
	/** @internal Native value-commit for the TanStack DOM portal editors. NOT a stable API. */
	commitCellValue: (rowIndex: number, colKey: string, nextValue: unknown) => void;
	/** @internal Batched server-row value commit (paste/fill/bulk + the single cell). NOT a stable API. */
	commitCells: (writes: CellWrite[], opts?: CommitCellsOptions) => Promise<CommitCellsResult>;
	/** @internal Native MULTI-field patch-commit for self-committing DOM portal editors (relation/image). NOT a stable API. */
	commitCellPatch: (rowIndex: number, patch: Record<string, unknown>) => void;
	/** @internal Submit a client-side draft row for a self-committing DOM portal editor. NOT a stable API. */
	submitDraftRow: (draftRowId: string) => Promise<DraftSubmitResult>;
	/** @internal Invalidate cached grid data after a self-committing DOM portal editor mutates out-of-band. NOT a stable API. */
	invalidateData: () => void;
	/** @internal Undo the last recorded server-row value write. NOT a stable API. */
	undo: () => Promise<void>;
	/** @internal Redo the last undone server-row value write. NOT a stable API. */
	redo: () => Promise<void>;
	/** @internal Whether an undo is available. NOT a stable API. */
	canUndo: boolean;
	/** @internal Whether a redo is available. NOT a stable API. */
	canRedo: boolean;
	/** @internal Observational event emitter (analytics/telemetry) — threaded into the command context. NOT a stable API. */
	emit: (type: SheetsEvent['type'], meta?: Record<string, unknown>) => void;
}

export type UseSheetsInternalResult<TRow extends SheetsRow = SheetsRow> = UseSheetsResult & {
	/** @internal Bindings for the built-in <Sheets> chrome — not a stable API. */
	_shell: SheetsShellBindings;
};

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

	// Get feedback context for bulk operation status indicators
	const { startOperation, updateOperationProgress, completeOperation, clearOperationFeedback } = useFeedback();

	// Keep the latest onEvent in a ref so firing events never depends on (or churns)
	// the callbacks/effects below — purely observational, no behavioral coupling.
	const onEventRef = useRef(onEvent);
	onEventRef.current = onEvent;
	const emit = useCallback((type: SheetsEvent['type'], meta?: Record<string, unknown>) => {
		onEventRef.current?.({ type, tableName, at: Date.now(), meta });
	}, [tableName]);

	const { config } = useSheetsContext();

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

	// Clear stale operation feedback when switching tables
	useEffect(() => {
		clearOperationFeedback();
	}, [tableName, clearOperationFeedback]);

	// Centralized state management
	const { state: gridState, actions: gridActions } = useGridState();

	// Build orderBy from grid state
	const orderByClause = useMemo(
		() =>
			gridState.sorting.id
				? [{ field: gridState.sorting.id, direction: gridState.sorting.desc ? ('desc' as const) : ('asc' as const) }]
				: undefined,
		[gridState.sorting],
	);

	// ============== FILTER / SEARCH → WHERE CLAUSE ==============
	// Fetch meta independently so we can build the where clause before data hooks run
	const { data: filterMeta } = useSheetsMeta();
	const filterTableMeta = useMemo(
		() => filterMeta?._meta?.tables?.find((t) => t?.name === tableName) ?? null,
		[filterMeta, tableName],
	);

	const effectiveWhere = useMemo(
		() => buildWhereFromFilters(gridState.filterTree, filterTableMeta),
		[gridState.filterTree, filterTableMeta],
	);

	// Reset to page 0 when filters change (paginated mode)
	const prevWhereRef = useRef(effectiveWhere);
	useEffect(() => {
		if (prevWhereRef.current !== effectiveWhere) {
			prevWhereRef.current = effectiveWhere;
			if (!infiniteScroll) {
				gridActions.setPageIndex(0);
			}
		}
	}, [effectiveWhere, infiniteScroll, gridActions]);

	// ============== INFINITE SCROLL MODE ==============
	const infiniteGridData = useInfiniteGridData({
		tableName,
		pageSize,
		orderBy: orderByClause,
		where: effectiveWhere,
		enabled: infiniteScroll,
	});

	// ============== PAGINATED MODE ==============
	const initialQueryOptions = useMemo(
		() => ({
			limit: pageSize,
			offset: gridState.pageIndex * pageSize,
			orderBy: orderByClause,
			where: effectiveWhere,
		}),
		[pageSize, gridState.pageIndex, orderByClause, effectiveWhere],
	);

	// In infinite scroll mode we still use mutations from useDataLoading,
	// but disable row/count queries to avoid duplicate fetching.
	const dataLoadingResult = useDataLoading({
		tableName,
		queryOptions: initialQueryOptions,
		enabled: !infiniteScroll,
	});

	// ============== UNIFIED DATA ACCESS ==============
	// Choose data source based on mode
	const {
		serverData,
		totalCount,
		tableMeta,
		fieldMetaMap,
		allRelationFields,
		hasCompletedInitialLoad,
		dataError,
		isInitialLoading,
	} = useMemo(() => {
		if (infiniteScroll) {
			return {
				serverData: [] as any[], // Not used directly in infinite mode
				totalCount: infiniteGridData.totalCount,
				tableMeta: infiniteGridData.tableMeta,
				fieldMetaMap: infiniteGridData.fieldMetaMap,
				allRelationFields: infiniteGridData.allRelationFields,
				hasCompletedInitialLoad: infiniteGridData.hasInitialData,
				dataError: infiniteGridData.error,
				// Only the first load (no rows yet) should show the loading screen; refetches keep previous data.
				isInitialLoading: infiniteGridData.isLoading && !infiniteGridData.hasInitialData,
			};
		}
		const ctx = dataLoadingResult.contextValue;
		const rows = ctx.data || [];
		return {
			serverData: rows,
			totalCount: ctx.totalCount,
			tableMeta: ctx.tableMeta,
			fieldMetaMap: ctx.fieldMetaMap,
			allRelationFields: ctx.allRelationFields,
			hasCompletedInitialLoad: !ctx.isLoading,
			dataError: ctx.error,
			// isLoading is true only until first data arrives (keepPreviousData keeps rows on refetch).
			isInitialLoading: ctx.isLoading && rows.length === 0,
		};
	}, [infiniteScroll, infiniteGridData, dataLoadingResult.contextValue]);

	// Emit load:success / load:error once per transition. Tracked via a ref so we
	// don't re-fire on unrelated re-renders.
	const lastLoadEmitRef = useRef<'success' | 'error' | null>(null);
	useEffect(() => {
		if (dataError) {
			if (lastLoadEmitRef.current !== 'error') {
				lastLoadEmitRef.current = 'error';
				emit('load:error', { error: dataError });
			}
			return;
		}
		if (hasCompletedInitialLoad && lastLoadEmitRef.current !== 'success') {
			lastLoadEmitRef.current = 'success';
			emit('load:success', { totalCount });
		}
	}, [dataError, hasCompletedInitialLoad, totalCount, emit]);

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

	const fieldMetaByKey = useMemo(() => mapFromFieldMetaMap(fieldMetaMap), [fieldMetaMap]);

	// Build columns with actual data
	// In infinite scroll mode, check if we have initial data
	const hasServerRows = infiniteScroll ? infiniteGridData.hasInitialData : normalizedServerData.length > 0;

	const { columns: baseColumns, columnKeys } = useDataGridColumns(
		tableName,
		hasServerRows ? combinedRows : undefined,
	);

	const gridColumnKeys = useMemo(() => {
		if (!hasDraftRows) return columnKeys;
		return [...columnKeys, DRAFT_ACTION_COLUMN_KEY];
	}, [columnKeys, hasDraftRows]);

	// Pagination helpers
	const totalPages = Math.max(1, Math.ceil((totalCount || 0) / pageSize));
	useEffect(() => {
		gridActions.resetPageIfNeeded(totalPages);
	}, [totalPages, gridActions]);

	// Apply custom widths and sort indicators to columns
	const columns = useMemo<RelationGridColumn[]>(() => {
		const sortedColId = gridState.sorting.id;
		const isDesc = gridState.sorting.desc;

		const mapped = baseColumns.map((col) => {
			const isSorted = col.id === sortedColId;
			// Append sort indicator to title if this column is sorted
			const sortIndicator = isSorted ? (isDesc ? ' ↓' : ' ↑') : '';
			return {
				...col,
				title: col.title + sortIndicator,
				width: gridState.columnWidths.get(col.id || '') ?? col.width,
			};
		});

		if (hasDraftRows) {
			mapped.push({
				id: DRAFT_ACTION_COLUMN_KEY,
				title: '',
				width: gridState.columnWidths.get(DRAFT_ACTION_COLUMN_KEY) ?? 132,
			});
		}

		return mapped;
	}, [baseColumns, gridState.columnWidths, gridState.sorting, hasDraftRows]);

	// Handle row selection
	useEffect(() => {
		if (!onRowSelect || !gridState.gridSelection) return;
		const selectedIndices = gridState.gridSelection.rows.toArray();
		const selected = selectedIndices.map((i: number) => combinedRows[i]).filter(Boolean);
		// The grid's rows ARE the consumer's row type, so widen SheetsRow[] -> TRow[].
		onRowSelect(selected as TRow[]);
	}, [gridState.gridSelection, combinedRows, onRowSelect]);

	// ============== RELATION INFO (store-derived) ==============
	// The store owns relation metadata; ensure it for this table once and read the
	// per-field map. Used by the native content resolver + draft/relation routing.
	const ensureRelationInfo = useSheetsStore((st) => st.ensureRelationInfo);
	const relationInfoByFieldFromStore = useSheetsStore((st) =>
		tableName ? st.relationInfoMapCache[tableName] : undefined,
	);
	const relationInfoByField = relationInfoByFieldFromStore ?? EMPTY_RELATION_INFO_BY_FIELD;
	useEffect(() => {
		if (!tableName) return;
		ensureRelationInfo(tableName, filterMeta);
	}, [tableName, filterMeta, ensureRelationInfo]);

	const relationInfoObject = useMemo(() => mapFromRelationInfoMap(relationInfoByField), [relationInfoByField]);

	// Native DOM content resolver (mirrors the canvas getCellContent routing → SheetsCell).
	const { getSheetsCell: getSheetsCellContent } = useSheetsContent({
		data: combinedRows,
		columnKeys: gridColumnKeys,
		fieldMetaMap,
		registry: cellRegistry,
		tableName,
		options: { relationChipLimit, relationLabelMaxLength },
		relationInfoByField,
		meta: filterMeta,
	});

	const effectiveColumnOrder = useMemo(() => {
		if (columnKeys.length > 0) return columnKeys;
		return Object.keys(fieldMetaByKey);
	}, [columnKeys, fieldMetaByKey]);

	const metaSignature = useMemo(
		() => computeDraftMetaSignature(effectiveColumnOrder, fieldMetaByKey, relationInfoObject),
		[effectiveColumnOrder, fieldMetaByKey, relationInfoObject],
	);

	const allowedColumns = useMemo(() => {
		const tableFields = tableMeta?.fields as { name: string }[] | undefined;
		return tableFields ? new Set(tableFields.map((field) => field.name).filter(Boolean) as string[]) : undefined;
	}, [tableMeta?.fields]);

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

	/**
	 * Unified optimistic update handler for overlay editors. Editors that handle
	 * mutations internally (RelationEditor, ImageEditor, etc.) call this callback with
	 * a patch to update the grid cache without full refetch. The DOM grid re-renders
	 * reactively off `combinedRows`, so no surgical per-cell repaint is needed.
	 */
	const handleEditorSaveComplete = useCallback(
		(colKey: string, rowIndex: number, patch: Record<string, unknown>) => {
			void colKey;
			const rowData = combinedRows[rowIndex];

			// Draft row: update draft store directly
			const dm = getDraftMeta(rowData);
			if (dm) {
				for (const [key, value] of Object.entries(patch)) {
					updateDraftCell({ tableKey, draftRowId: dm.draftRowId, columnKey: key, value });
				}
				return;
			}

			// Server row: update infinite scroll cache (paginated handled by React Query)
			if (!infiniteScroll) return;

			// Apply optimistic update to infinite scroll cache; self-heal on a cache
			// miss (patch targeted a not-yet-cached page) by falling back to a refetch.
			const ok = infiniteGridData.updateRowAtIndex(rowIndex, patch);
			if (!ok) infiniteGridData.invalidate();
		},
		[combinedRows, infiniteScroll, infiniteGridData, updateDraftCell, tableKey],
	);

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

	// Memoize feedback callbacks for grid operations
	const operationFeedback = useMemo(
		() => ({
			onStart: startOperation,
			onProgress: updateOperationProgress,
			onComplete: completeOperation,
		}),
		[startOperation, updateOperationProgress, completeOperation],
	);

	const gridOpsOptions = useMemo(
		() => ({
			onRemoveDraftRow: (draftRowId: string) => removeDraftRow(tableKey, draftRowId),
			feedback: operationFeedback,
		}),
		[removeDraftRow, tableKey, operationFeedback],
	);

	const { deleteSelected: baseDeleteSelected } = useGridOperations(
		combinedRows,
		deleteRow,
		gridState.gridSelection,
		() => gridActions.setGridSelection(undefined),
		{
			...gridOpsOptions,
			onAfterServerDeletes: infiniteScroll ? infiniteGridData.invalidate : undefined,
		},
	);

	// Wrap the delete handler to emit an observational row:delete event with the
	// selected-row count, then delegate to the real deletion logic.
	const deleteSelected = useCallback(async () => {
		const count = gridState.gridSelection?.rows.length ?? 0;
		emit('row:delete', { count });
		await baseDeleteSelected();
	}, [baseDeleteSelected, emit, gridState.gridSelection]);

	// Infinite-mode optimistic cache patch, handed to `useCellEditing` so a server-row
	// edit flips the cell BEFORE the `update` round-trip. Snapshots the prior values for
	// the patched keys and returns a revert thunk replayed only if the mutation rejects.
	// A cache miss (unloaded page) self-heals via `invalidate()`. Paginated mode returns
	// undefined here — its optimism lives in the update mutation's onMutate (use-table.ts).
	const applyOptimisticCellPatch = useCallback(
		(rowIndex: number, patch: Record<string, unknown>): (() => void) | void => {
			if (!infiniteScroll) return;
			const current = infiniteGridData.getRowAtIndex(rowIndex) as Record<string, unknown> | null;
			const ok = infiniteGridData.updateRowAtIndex(rowIndex, patch);
			if (!ok) {
				infiniteGridData.invalidate();
				return;
			}
			const snapshot: Record<string, unknown> = {};
			for (const key of Object.keys(patch)) snapshot[key] = current ? current[key] : undefined;
			return () => {
				const reverted = infiniteGridData.updateRowAtIndex(rowIndex, snapshot);
				if (!reverted) infiniteGridData.invalidate();
			};
		},
		[infiniteScroll, infiniteGridData],
	);

	const editCell = useCellEditing({
		combinedRows,
		fieldMetaMap,
		relationInfoByField,
		updateDraftCell,
		tableKey,
		update,
		onCellEdit,
		applyOptimisticPatch: applyOptimisticCellPatch,
	});

	// History (undo/redo) for server-row value writes. Draft edits are NOT recorded.
	const history = useUndoRedo();

	// Re-sync a canonical server row over the optimistic patch after the mutation
	// resolves (infinite mode only; paginated reconciles via React Query).
	const resyncRow = useCallback(
		(rowIndex: number, updatedRow: Record<string, unknown>) => {
			if (!infiniteScroll) return;
			const ok = infiniteGridData.updateRowAtIndex(rowIndex, updatedRow);
			if (!ok) infiniteGridData.invalidate();
		},
		[infiniteScroll, infiniteGridData],
	);

	// BATCHED commit primitive — the single server-row value-write path (paste / fill /
	// bulk AND, routed below, the single cell). Coalesces optimistic patches + server
	// mutations per row and records an undoable HistoryEntry (unless opts.record===false).
	const commitCells = useBatchCommit({
		combinedRows,
		fieldMetaMap,
		relationInfoByField,
		update,
		applyOptimisticPatch: applyOptimisticCellPatch,
		resyncRow,
		editCell,
		onCellEdit,
		record: history.record,
	});

	// @internal NATIVE value-commit for the TanStack DOM grid's portal editors.
	// Maps a (rowIndex, colKey, rawValue) commit straight onto the native `editCell`
	// (draft `updateDraftCell` / server mutation) — the raw value flows through with
	// NO glide cell round-trip (this is what keeps a boolean `false` as `false`). For
	// server edits `editCell` already applied the OPTIMISTIC infinite-cache patch before
	// awaiting the mutation (and reverted it on failure); here we only re-sync the
	// canonical server row when it comes back, then emit the observational `cell:edit`.
	// The DOM grid re-renders reactively from `combinedRows`.
	const commitCellValue = useCallback(
		(rowIndex: number, colKey: string, nextValue: unknown): void => {
			void (async () => {
				try {
					// Single-cell edits route through the SAME batched primitive so a normal cell
					// edit becomes undoable (server rows) — coercion / readonly / optimistic patch
					// / re-sync all live inside commitCells (draft rows take its per-cell branch).
					const isDraft = !!getDraftMeta(combinedRows[rowIndex]);
					const { applied } = await commitCells([{ rowIndex, colKey, value: nextValue }]);

					// Observational: a real cell edit landed — skip no-ops (applied 0 + non-draft).
					if (applied > 0 || isDraft) {
						emit('cell:edit', { field: colKey, rowIndex, target: isDraft ? 'draft' : 'server' });
					}
				} catch (e) {
					const description = e instanceof Error ? e.message : 'Failed to update cell';
					toast.error({ message: 'Update failed', description });
					sheetsLogger().error('Cell edit error:', e);
					config.onError?.(e, { source: 'mutation', tableName });
				}
			})();
		},
		[commitCells, combinedRows, config, tableName, emit],
	);

	// @internal NATIVE patch-commit for self-committing DOM portal editors (relation/
	// image). These editors mutate server-side themselves, then push a MULTI-field
	// patch — routes straight through the EXISTING `handleEditorSaveComplete` (draft
	// store update / infinite-cache patch), using the FIRST patch key as the primary colKey.
	const commitCellPatch = useCallback(
		(rowIndex: number, patch: Record<string, unknown>): void => {
			const primaryColKey = Object.keys(patch)[0];
			if (!primaryColKey) return;
			handleEditorSaveComplete(primaryColKey, rowIndex, patch);
		},
		[handleEditorSaveComplete],
	);

	// @internal NATIVE data-invalidate for self-committing DOM portal editors. Mirrors
	// the canvas wiring: infinite mode refetches via the React Query cache; paginated
	// invalidation is already handled by React Query in use-table, so this is a no-op there.
	const invalidateData = useCallback(() => {
		if (infiniteScroll) infiniteGridData.invalidate();
	}, [infiniteScroll, infiniteGridData]);

	const handleRowAppended = useCallback(async () => {
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
		allowedColumns,
		relationInfoByKey: relationInfoObject,
		fieldMetaByKey: fieldMetaByKey as Record<string, any>,
		onSubmittedSuccessfully: infiniteScroll ? infiniteGridData.invalidate : undefined,
		feedback: operationFeedback,
	});

	// Populate the ref for editor access (breaks circular dependency)
	submitDraftRowForEditorRef.current = submitDraftRowForEditor;

	// Compute sortable columns (exclude relation fields - only simple data types are sortable)
	const sortableColumns = useMemo(() => {
		return new Set(gridColumnKeys.filter((key) => !relationFieldNames.has(key)));
	}, [gridColumnKeys, relationFieldNames]);

	// Header click handler for sorting (only allows sorting on non-relation columns; the
	// draft-action column is excluded because it is never in `sortableColumns`).
	const onHeaderClicked = useMemo(
		() => createHeaderClickHandler(gridColumnKeys, gridActions.toggleSorting, sortableColumns),
		[gridColumnKeys, gridActions.toggleSorting, sortableColumns],
	);

	// Emit sort:change whenever the resolved sort state transitions. Watching the
	// state (rather than the toggle call) reflects the real outcome and covers any
	// path that mutates sorting. Skip the initial mount so we don't fire on render.
	const didMountSortRef = useRef(false);
	useEffect(() => {
		if (!didMountSortRef.current) {
			didMountSortRef.current = true;
			return;
		}
		emit('sort:change', {
			field: gridState.sorting.id || null,
			direction: gridState.sorting.id ? (gridState.sorting.desc ? 'desc' : 'asc') : null,
		});
	}, [gridState.sorting, emit]);

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

	// Build fieldTypeMap for filter controls
	const fieldTypeMap = useMemo(() => {
		const map: Record<string, { gqlType: string; isArray: boolean }> = {};
		fieldMetaMap.forEach((meta, key) => {
			if (meta?.type?.gqlType) {
				map[key] = { gqlType: meta.type.gqlType, isArray: !!meta.type.isArray };
			}
		});
		return map;
	}, [fieldMetaMap]);

	const applyFilters = useCallback(() => {
		gridActions.setFiltersOpen(false);
		emit('filter:apply', { conditionCount: countConditions(gridState.filterTree) });
	}, [gridActions, emit, gridState.filterTree]);

	// Compute frozen columns: id column if present
	const frozenCount = useMemo(() => {
		const idFrozen = columnKeys[0] === 'id' ? 1 : 0;
		return idFrozen; // Row markers are separate
	}, [columnKeys]);

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

	// Loaded successfully but no server rows and nothing drafted yet, with no active filter.
	const isEmpty =
		hasCompletedInitialLoad &&
		serverRowCount === 0 &&
		draftRows.length === 0 &&
		countConditions(gridState.filterTree) === 0;

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
			filterTree: gridState.filterTree,
			filtersOpen: gridState.filtersOpen,
			setFilterTree: gridActions.setFilterTree,
			setFiltersOpen: gridActions.setFiltersOpen,
			clearAllFilters: gridActions.clearAllFilters,
			applyFilters,
			fieldTypeMap,
			setGridSelectionForControls,
			onHeaderClicked,
			onVisibleRegionChanged: handleVisibleRegionChanged,
			sorting: gridState.sorting,
			columnWidths: gridState.columnWidths,
			resizeColumn: gridActions.resizeColumn,
			frozenCount,
			selectedRowCount,
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

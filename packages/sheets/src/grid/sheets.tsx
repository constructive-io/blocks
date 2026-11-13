import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import type React from 'react';

import { useSheetsContext } from '../context/sheets-context';
import { cn } from '../utils/cn';
import type { DataGridProps, SheetsHandle } from './sheets.types';
import type { SheetsRow } from './row-model';

import { SheetsControls } from './sheets.controls';
import { SheetsContextMenu } from './sheets.context-menu';
import { FeedbackProvider, ModelIssuesNotice, SaveStatus, WriteErrorStack } from './feedback';
import { SheetsReadOnlyProvider } from '../context/sheets-read-only';
import { createViewCommandTarget, viewCommandReason } from './view-state/view-command-target';
import { ColumnHeaderMenu } from './columns/column-header-menu';
import { ExportViewControl, ImportRecordsControl } from '../import-export';
import { SheetsErrorBoundary } from './feedback/sheets-error-boundary';
import { SheetsEmptyState, SheetsErrorState, SheetsLoadingState } from './feedback/sheets-error-state';
import { SheetsPagination } from './sheets.pagination';
import { SheetsStatusBar } from './sheets.status-bar';
import { useSheets } from './use-sheets';
import { usePressOutside } from './hooks/use-press-outside';
import { useViewRowCount } from './use-view-row-count';
import { openUriCellLink, uriCellHref } from '../cell-model/uri-link';
import { GridViewport, type GridViewportHandle, type RenderCell, type VisibleRange } from '../table/grid-viewport';
import { SheetsCellHost } from '../grid-dom/sheets-cell-host';
import { OverlayManager } from '../grid-dom/overlay/overlay-manager';
import { copyText } from '../cell-types/column-value';
import { SheetsOpenRecordContext, SheetsOpenTableContext } from '../relations/relation-navigation';
import { RecordPanel, useGridRecordPanel } from '../record';
import { RelationSection } from '../relations/relation-section';
import { emptySheetsSelection, extendRangeToCell } from '../selection/selection-model';
import type { SelectionRect } from '../selection/selection-model';
import { getCellsInRange as extractCellsInRange, toTSV as serializeTSV } from '../selection/cell-extract';
import type { GridCommandContext, CellMatrix } from '../commands/context';
import { activeEditorElement } from './render/active-editor';
import { SheetsFilteredEmpty } from './render/sheets-filtered-empty';
import { useGridCommandPipeline } from './render/use-grid-command-pipeline';
import { useGridContextMenu } from './render/use-grid-context-menu';
import { useGridCsvExport } from './render/use-grid-csv-export';
import { useGridEditing } from './render/use-grid-editing';
import { useGridKeyboard } from './render/use-grid-keyboard';
import { useGridTableState } from './render/use-grid-table-state';
import { useRowMarker } from './render/use-row-marker';

function SheetsInnerComponent<TRow extends SheetsRow = SheetsRow>(
	props: DataGridProps<TRow>,
	ref: React.ForwardedRef<SheetsHandle>,
) {
	// The native TanStack DOM grid is the only render path (the canvas <DataEditor>
	// branch was removed at the glide cutover).
	// A host read-only grid applies to every table model read inside it (see `SheetsReadOnlyProvider`).
	return (
		<SheetsReadOnlyProvider readOnly={props.readOnly}>
			<FeedbackProvider>
				<SheetsDomInner {...props} forwardedRef={ref} />
			</FeedbackProvider>
		</SheetsReadOnlyProvider>
	);
}

// forwardRef erases the component's own generic parameter; the cast restores a
// generic call signature so `Sheets<MyRow>` keeps inferring TRow. This is the
// single allowed `as` cast for Unit A (well-known generic-forwardRef pattern).
export const Sheets = forwardRef(SheetsInnerComponent) as <TRow extends SheetsRow = SheetsRow>(
	props: DataGridProps<TRow> & { ref?: React.Ref<SheetsHandle> },
) => React.ReactElement;

// ============================================================================
// The (only) render path. Reuses the useSheets hook for data/state, feeds its
// bindings into the v9 table instance + GridViewport, and renders native DOM
// cells via SheetsCellHost. Surfaces the same load states (error / loading /
// empty + consumer slots) the removed canvas branch owned.
// ============================================================================

function SheetsDomInner<TRow extends SheetsRow = SheetsRow>({
	forwardedRef,
	...props
}: DataGridProps<TRow> & { forwardedRef?: React.ForwardedRef<SheetsHandle> }) {
	const {
		tableName,
		className,
		pageSize = 100,
		showSelection = true,
		showPagination = true,
		infiniteScroll = false,
		slots,
	} = props;
	const s = useSheets<TRow>(props);
	const shell = s._shell;

	const { config, canUpload, scopeKey } = useSheetsContext();

	const viewportRef = useRef<GridViewportHandle>(null);

	// ============== EVENT->COMMAND DISPATCH (P4 Phase 1) ==============
	// ONE interceptable pipeline: every grid event resolves to a named command and runs
	// through the stable `dispatch` (see render/use-grid-command-pipeline). `ctxRef.current`
	// is the assembled GridCommandContext, repointed each render below.
	const { keymapRef, ctxRef, dispatch, isCommandEnabled } = useGridCommandPipeline(props);

	// ============== TABLE INSTANCE + STATE MIRRORS (Stage 2, Phase 6) ==============
	// Column descriptors, sizing and pinning, and the row selection in both directions
	// (see render/use-grid-table-state); the native SheetsSelection stays canonical.
	const {
		columns,
		table,
		resizeColumn,
		fixedWidthColumns,
		narrowColumns,
		combinedRows,
		getRowId,
		selection,
		setSelection,
		activeCell,
		lastActiveCellRef,
	} = useGridTableState(s);

	// ============== LEADING CHECKBOX / SELECT-ALL COLUMN (drives the canonical RangeSet) ==============
	const { rowMarker, toggleRowImpl, toggleAllImpl, canOpenRecords } = useRowMarker({
		combinedRows,
		selection,
		setSelection,
		tableModel: shell.tableModel,
		dispatch,
	});

	// Selected rows, and the grid's own CSV export (toolbar "Export selected" + SheetsHandle.exportCsv()).
	const { getSelectedRows, runCsvExport, handleExport, defaultProtectFormulas } = useGridCsvExport({
		tableName,
		csvExport: props.csvExport,
		selection,
		combinedRows,
		shell,
	});

	// ============== RECORD PANEL ==============
	// One record in a side panel (record/): opened from a row, the keyboard, the context menu,
	// the host (`recordId`) or a linked-record chip; it hands focus back to the grid on close.
	const recordPanel = useGridRecordPanel({
		tableModel: shell.tableModel,
		rows: shell.combinedRows,
		serverRowCount: shell.serverRowCount,
		recordId: props.recordId,
		onRecordOpenChange: props.onRecordOpenChange,
	});
	const sheetsContainerRef = useRef<HTMLDivElement | null>(null);

	useImperativeHandle(
		forwardedRef,
		(): SheetsHandle => ({
			scrollToRow: (index) => viewportRef.current?.scrollToIndex(index),
			submitDrafts: () => s.draft.submitDrafts(),
			refetch: () => s.refetch(),
			getSelectedRows,
			exportCsv: (opts) => runCsvExport(opts),
			openRecord: (recordId) => recordPanel.openRecordById(recordId),
			openNewRecord: () => recordPanel.openNewRecord(),
			closeRecord: () => recordPanel.controller.close(),
		}),
		[s.draft.submitDrafts, s.refetch, getSelectedRows, runCsvExport, recordPanel],
	);

	// ============== ADD ROW (toolbar) ==============
	// Append a draft via the shell API, then scroll it into view. appendRow resolves to the
	// new draft's index (or undefined when metadata isn't ready yet — then there's nothing to
	// scroll to). Threaded into <SheetsControls onAddRow=…> so the toolbar renders an Add-row button.
	const appendRow = s.draft.appendRow;
	const handleAddRow = useCallback(() => {
		void appendRow().then((index) => {
			if (index !== undefined) viewportRef.current?.scrollToIndex(index);
		});
	}, [appendRow]);

	// ============== SCROLL + SELECTION RESET ON SORT/FILTER CHANGE ==============
	// When sort or filter changes the infinite query re-keys and the row set is a different,
	// index-based window — so any held selection/active-cell now points at the wrong rows.
	// Per the locked decision we CLEAR selection + active cell and scroll back to the top.
	// Keyed precisely on the same sort+filter inputs the query derives its where/orderBy from,
	// so it fires only on a real sort/filter transition (not on data refetch or draft edits).
	const optionsKey = shell.viewSignature;
	const didMountResetRef = useRef(false);
	useEffect(() => {
		if (!didMountResetRef.current) {
			didMountResetRef.current = true;
			return;
		}
		setSelection(emptySheetsSelection);
		viewportRef.current?.scrollToIndex(0);
	}, [optionsKey, setSelection]);

	// ============== NATIVE OVERLAY + INLINE EDITING (Phase 4, Stage B) ==============
	// The overlay and inline editors, activation through the edit-intent resolver, the
	// range-aware commit and following the edited cell on scroll (see render/use-grid-editing).
	// The refs it returns are the latches the command context reads.
	const {
		overlay,
		overlayClose,
		mediaDraft,
		activeMediaDraft,
		getSheetsCellContent,
		getEditorComponent,
		submitDraftRow,
		undo,
		redo,
		commitCells,
		emit,
		getSheetsCellContentRef,
		combinedRowsRef,
		selectionRef,
		columnsRef,
		openEditorImpl,
		openEditor,
		commitBulkOrSingle,
		inlineKey,
		inlineInitialText,
		onInlineCommit,
		openEditorAtActiveCell,
		handleOverlayScroll,
	} = useGridEditing({ tableName, shell, config, canUpload, scopeKey, combinedRows, selection, columns, dispatch });

	// ============== CELL-RANGE SELECTION (Stage B) ==============
	// `anchorRef` holds the FIXED corner a contiguous range extends FROM. A plain activate
	// (click / non-shift Arrow) resets it to the new active cell; a shift extend keeps it put.
	// It is the caller-owned anchor `extendRangeToCell` expects (the model stays a pure value).
	const anchorRef = useRef<[number, number] | null>(null);
	const setSelectionRange = s.selection.setGridSelection;
	// Extend the contiguous range from the latched anchor to `[col, row]`. Reads the LATEST
	// selection (post-sort-clear safe) and falls back to the target as anchor when none latched.
	const extendToCell = useCallback(
		(col: number, row: number) => {
			const sel = selectionRef.current ?? emptySheetsSelection;
			const anchor = anchorRef.current ?? sel.current?.cell ?? [col, row];
			anchorRef.current = anchor;
			setSelectionRange(extendRangeToCell(sel, col, row, anchor[0], anchor[1]));
		},
		[setSelectionRange],
	);
	// Click-to-activate: park the active cell on the clicked cell. Stable (the shell's
	// setActiveCell is a stable useCallback), so it never busts the per-cell memo. Shift-click
	// EXTENDS the range from the latched anchor; a plain click activates AND resets the anchor.
	const setActiveCell = s.selection.setActiveCell;
	const handleActivateCell = useCallback(
		(col: number, row: number, shiftKey?: boolean) =>
			dispatch(shiftKey ? 'cell.extendToClicked' : 'cell.activate', undefined, { col, row }),
		[dispatch],
	);

	// ============== RIGHT-CLICK CONTEXT MENU (Stage B) ==============
	// A menu is just another EVENT SOURCE → dispatch, rendered ONCE at the grid level.
	const { contextMenu, setContextMenu, handleContextMenu, closeContextMenu } = useGridContextMenu({ selectionRef, dispatch });

	const renderCell = useCallback<RenderCell>(
		(c, ctx) => {
			const editingThisCell = inlineKey != null && inlineKey === `${c.row.index}:${c.column.id}`;
			return (
				<SheetsCellHost
					cell={c}
					ctx={ctx}
					getSheetsCellContent={getSheetsCellContent}
					openEditor={openEditor}
					isEditing={editingThisCell}
					inlineInitialText={editingThisCell ? inlineInitialText : undefined}
					onInlineCommit={onInlineCommit}
					onInlineCancel={overlayClose}
					onActivateCell={handleActivateCell}
					onContextMenu={handleContextMenu}
					onSubmitDraftRow={submitDraftRow}
				/>
			);
		},
		[inlineKey, inlineInitialText, onInlineCommit, overlayClose, getSheetsCellContent, openEditor, handleActivateCell, handleContextMenu, submitDraftRow],
	);

	// ============== SPREADSHEET KEYBOARD NAV (grid root owns keys) ==============
	// The grid root (role=grid, tabIndex=0, aria-activedescendant) owns spreadsheet keys.
	// Arrows move the active cell (clamped); Enter/F2 open the overlay at the active cell.
	// IGNORE keydowns while an overlay editor is open so nav doesn't fight editing. The
	// active cell + col/row counts are read LATEST (refs) so a post-sort/filter clear wins.
	const moveActiveCell = s.selection.moveActive;
	const isOverlayOpen = overlay.isOpen;

	// Every grid key and the native copy / cut / paste events resolve to NAMED commands
	// through the ONE dispatch pipeline (see render/use-grid-keyboard).
	const { handleGridKeyDown, handleCopy, handleCut, handlePaste } = useGridKeyboard({
		isOverlayOpen,
		dispatch,
		keymapRef,
		rowHeightPx: shell.rowHeightPx,
	});

	// Dismissing the cursor: a press outside the grid (and outside its own toolbar, editors,
	// popovers, menus, dialogs and record panel) clears the active cell and range. Keyboard focus
	// on a grid with no active cell brings the cursor back.
	// A press on the grid's own empty space (below the rows, past the last column) clears it too.
	const clearCursor = useCallback(() => dispatch('selection.clear', undefined, { whole: true }), [dispatch]);
	const pressOutside = usePressOutside(activeCell != null, clearCursor);
	const handleGridFocus = useCallback(() => dispatch('cell.resume'), [dispatch]);

	// The status bar's count waits for the current view's first count (filter and search decide it).
	const viewRowCount = useViewRowCount(
		shell.totalCount,
		`${tableName}|${JSON.stringify(shell.viewQuery.where ?? null)}`,
		s.hasCompletedInitialLoad && !shell.isFetchingRows,
	);

	// The active overlay editor and its placement, computed in render (see render/active-editor).
	const active = overlay.active;
	const editorNode = activeEditorElement({
		active,
		mediaDraft,
		activeMediaDraft,
		getSheetsCellContent,
		getEditorComponent,
		combinedRows,
		getRowId,
		tableName: props.tableName,
		tableModel: shell.tableModel,
		commitBulkOrSingle,
		overlayClose,
		commitCellPatch: shell.commitCellPatch,
		submitDraftRow: shell.submitDraftRow,
		invalidateData: shell.invalidateData,
	});

	// INFINITE SCROLL: the virtualizer COUNT is left to its default (`rows.length`) — in
	// infinite mode `combinedRows` IS the full-length proxy (`serverRowCount + drafts`, null-backing
	// unloaded indices), so `rows.length` already spans every lazy row AND includes drafts; forcing
	// `count = totalCount` would drop the appended draft rows. We only wire the prefetch handler:
	// the viewport's overscan-inclusive {startIndex,endIndex} window IS the native range the shell
	// prefetches against (handleVisibleRegionChanged no-ops when paginated + clamps to the server
	// row count, but we still attach only in infinite mode, matching the prior paginated omission).
	const onVisibleRegionChanged = shell.onVisibleRegionChanged;
	const onVisibleRangeChange = useCallback(
		(range: VisibleRange) => {
			onVisibleRegionChanged(range);
		},
		[onVisibleRegionChanged],
	);

	// Filter, sort and search bindings (useSheetsView). Latched so the command context and the
	// view command target read the latest without re-creating.
	const viewRef = useRef(shell.view);
	viewRef.current = shell.view;
	const hasToolbarRef = useRef(!slots?.toolbar);
	hasToolbarRef.current = !slots?.toolbar;
	const savedViewsRef = useRef(shell.savedViews);
	savedViewsRef.current = shell.savedViews;
	const viewCommandTarget = useMemo(
		() => createViewCommandTarget(() => viewRef.current, () => hasToolbarRef.current, () => savedViewsRef.current),
		[],
	);
	// Each header's menu runs column commands through the ONE pipeline, with the column as payload.
	const renderHeaderMenu = useCallback(
		(colKey: string) => (
			<ColumnHeaderMenu
				colKey={colKey}
				view={shell.view}
				run={(commandId, payload) => dispatch(commandId, undefined, payload)}
				canRun={isCommandEnabled}
			/>
		),
		[shell.view, dispatch, isCommandEnabled],
	);
	// Why a context-menu view item (sort by this column) is disabled, read off the active cell.
	const openRecordReasonRef = useRef(recordPanel.openRecordReason);
	openRecordReasonRef.current = recordPanel.openRecordReason;
	const commandReason = useCallback((commandId: string) => {
		const cell = selectionRef.current?.current?.cell;
		if (commandId === 'record.open') return cell ? openRecordReasonRef.current(cell[1]) : null;
		return viewCommandReason(viewRef.current, commandId, cell ? columnsRef.current[cell[0]]?.key ?? null : null);
	}, []);
	// Header click routes through the ONE pipeline as `header.sortToggle` (Shift+click adds the
	// column to the sort); the command body calls ctx.sortToggle(colKey, additive).
	const onHeaderClick = useCallback(
		(colKey: string, additive: boolean) => dispatch('header.sortToggle', undefined, { colKey, additive }),
		[dispatch],
	);

	// Fill-handle drag release routes through the ONE pipeline as `fill.drag`; the command extends
	// the source band toward `target`, replicates the source values, and widens the selection.
	const handleFillDrag = useCallback(
		(sourceRange: SelectionRect, target: [number, number]) => dispatch('fill.drag', undefined, { from: sourceRange, to: target }),
		[dispatch],
	);

	// ============== ASSEMBLE + LATCH THE GRID COMMAND CONTEXT ==============
	// ONE object the commands run against: live GETTERS read the existing refs/derived render
	// values; methods are the EXISTING stable callbacks wrapped VERBATIM (no dispatcher is
	// reinvented). Rebuilt each render (cheap) and REPOINTED into `ctxRef` so `dispatch`
	// (stable, reads ctxRef.current) always sees the latest values — mirrors the openEditor
	// ref-latch. The pointer callbacks threaded into renderCell close over `dispatch`, not this,
	// so the per-cell memo is unaffected.
	ctxRef.current = {
		get rowCount() {
			return combinedRowsRef.current.length;
		},
		get colCount() {
			return columnsRef.current.length;
		},
		get activeCell() {
			return selectionRef.current?.current?.cell;
		},
		get resumeCell() {
			const last = lastActiveCellRef.current;
			return last && last[0] < columnsRef.current.length && last[1] < combinedRowsRef.current.length ? last : undefined;
		},
		get selection() {
			return selectionRef.current;
		},
		get combinedRows() {
			return combinedRowsRef.current;
		},
		get columnKeys() {
			return columnsRef.current.map((c) => c.key);
		},
		getAnchor: () => anchorRef.current,
		setAnchor: (anchor) => {
			anchorRef.current = anchor;
		},
		setActiveCell,
		moveActiveCell,
		extendToCell,
		setSelection: setSelectionRange,
		commitCells,
		openEditorAtActive: openEditorAtActiveCell,
		openEditorAt: openEditorImpl,
		undo,
		redo,
		scrollToCell: (col, row) => viewportRef.current?.scrollToCell(col, row),
		sortToggle: (colKey, additive) => viewRef.current.toggleSort(colKey, additive === true),
		toggleRow: toggleRowImpl,
		toggleAll: toggleAllImpl,
		getCellsInRange: (rect: SelectionRect): CellMatrix => {
			const r = extractCellsInRange(rect, combinedRowsRef.current, columnsRef.current.map((c) => c.key), (value, _row, colKey) =>
				copyText(shell.tableModel?.columns, colKey, value),
			);
			return { cols: r.cols, rows: r.rows, values: r.values };
		},
		toTSV: (values) => serializeTSV(values),
		emit,
		view: viewCommandTarget,
		record: canOpenRecords
			? {
				canOpen: (rowIndex) => recordPanel.openRecordReason(rowIndex) === null,
				open: (rowIndex) => {
					recordPanel.openRecordAt(rowIndex);
				},
				isOpen: () => recordPanel.controller.current !== null,
				close: () => recordPanel.controller.close(),
			}
			: undefined,
		newRecord: {
			canCreate: () => Boolean(shell.tableModel?.operations.create),
			open: () => {
				recordPanel.openNewRecord();
			},
		},
		// The address an email or web-address cell opens, by the same rule as the link in the cell.
		link: {
			hrefAt: (col, row) => {
				const colKey = columnsRef.current[col]?.key;
				return colKey && combinedRowsRef.current[row] ? uriCellHref(getSheetsCellContentRef.current(row, colKey).cell) : null;
			},
			open: openUriCellLink,
		},
		// From the keyboard (Shift+F10, the menu key): the menu opens under the cell.
		contextMenu: {
			open: (col, row) => {
				const rect = document.getElementById(`sheets-cell-${row}-${col}`)?.getBoundingClientRect();
				if (rect) setContextMenu({ clientX: rect.left, clientY: rect.bottom });
			},
		},
	} satisfies GridCommandContext;

	// The record panel renders beside the grid and also over the empty state, so a new record
	// can be filled in on an empty table.
	const recordPanelElement = (
		<RecordPanel
			controller={recordPanel.controller}
			registry={shell.cellRegistry}
			typeOverrides={config.fieldTypeOverrides}
			mediaReason={canUpload ? null : 'Uploads need a storage endpoint'}
			navigationFor={recordPanel.navigationFor}
			onGridInvalidate={shell.invalidateData}
			onOpenTable={props.onOpenTable ?? null}
			returnFocus={() => sheetsContainerRef.current?.querySelector<HTMLElement>('[role="grid"]') ?? null}
			RelationSection={RelationSection}
		/>
	);

	// ============== LOAD STATES ==============
	// Surface real error/empty/loading states instead of a blank grid (moved here from
	// the removed canvas branch). The full-screen error is for INITIAL-load failure only
	// (no server rows AND no drafts); background-refetch errors keep the populated grid
	// mounted and surface via the `load:error` onEvent emission instead.
	if (!activeMediaDraft && s.dataError && shell.combinedRows.length === 0) {
		const retry = () => s.refetch();
		if (slots?.error) {
			return <>{slots.error({ error: s.dataError, retry })}</>;
		}
		return <SheetsErrorState error={s.dataError} onRetry={retry} tableName={tableName} />;
	}

	// Initial load only; same-scope refetches retain their current query data.
	if (!activeMediaDraft && s.isInitialLoading) {
		if (slots?.loading) return <>{slots.loading}</>;
		return <SheetsLoadingState />;
	}

	// Loaded successfully but no server rows and nothing drafted yet (and no active filter).
	if (!activeMediaDraft && s.isEmpty) {
		if (slots?.empty) {
			return <>{typeof slots.empty === 'function' ? slots.empty({ tableName }) : slots.empty}</>;
		}
		return (
			<>
				<SheetsEmptyState
					tableName={tableName}
					readOnlyReason={shell.readOnlyReason}
					onAddRow={shell.canCreate ? () => {
						void s.draft.appendRow();
					} : undefined}
				/>
				{recordPanelElement}
			</>
		);
	}

	// Filtered-empty: the server returned 0 rows while a filter is active (so `isEmpty` above is
	// false — it requires no filter). Without this the body renders blank under the header and looks
	// broken; instead we keep the toolbar/filter bar mounted and overlay a "No matching rows" panel
	// with a one-click clear back to the unfiltered set.
	const activeFilterCount = shell.filterConditionCount;
	const searching = shell.view.state.search.trim() !== '';
	const isFilteredEmpty = shell.serverRowCount === 0 && shell.draftRowCount === 0 && (activeFilterCount > 0 || searching);
	const clearFiltersAndSearch = () => {
		shell.view.clearFilters();
		shell.view.setSearch('');
	};

	return (
		<SheetsErrorBoundary onError={config.onError}>
			{/* Layout-neutral root: a press under it (portals included) is a press inside the grid. */}
			<div data-part-id='sheets-root' style={{ display: 'contents' }} onPointerDownCapture={pressOutside.onPointerDownCapture}>
			{/* Controls — consumer toolbar slot replaces the default <SheetsControls> block. */}
			<div data-part-id='sheets-controls-container'>
				{slots?.toolbar ? (
					<>{typeof slots.toolbar === 'function' ? slots.toolbar({ tableName }) : slots.toolbar}</>
				) : (
					<SheetsControls
						view={shell.view}
						columnKeys={shell.columnKeys}
						showSelection={showSelection}
						gridSelection={s.selection.gridSelection ?? null}
						setGridSelection={shell.setGridSelectionForControls}
						deleteSelected={s.draft.deleteSelected}
						onAddRow={shell.canCreate ? handleAddRow : undefined}
						canDelete={shell.canDelete}
						readOnlyReason={shell.readOnlyReason}
						onExport={handleExport}
						savedViews={shell.savedViews}
						newRecord={
							ctxRef.current.newRecord
								? { open: () => dispatch('record.new'), disabledReason: viewCommandReason(shell.view, 'record.new', null) }
								: undefined
						}
						tools={
							<>
								<ImportRecordsControl model={shell.tableModel} tableLabel={tableName} />
								<ExportViewControl
									model={shell.tableModel}
									where={shell.viewQuery.where}
									orderBy={shell.viewQuery.orderBy}
									columns={shell.view.layout.visibleKeys}
									filename={`${tableName}.csv`}
									protectFormulas={defaultProtectFormulas}
								/>
							</>
						}
					/>
				)}
				<ModelIssuesNotice
					model={shell.tableModel}
					dropped={[...shell.view.dropped, ...shell.savedViews.activeDropped]}
					columnLabel={shell.view.columnLabel}
				/>
			</div>

			<div
				ref={sheetsContainerRef}
				data-part-id='sheets-container'
				role='region'
				aria-label={`${tableName} table`}
				className={cn('bg-background relative isolate flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-lg border', className)}
			>
				{/* The scroll area and what floats over it; the status bar below stays outside the scroll. */}
				<div className='relative min-h-0 flex-1'>
					{/* Relation chips in the active cell open their record in the panel. */}
					<SheetsOpenRecordContext.Provider value={recordPanel.openLinkedRecord}>
					<GridViewport
						table={table}
						renderCell={renderCell}
						handleRef={viewportRef}
						onScroll={handleOverlayScroll}
						sort={shell.view.state.sort}
						onHeaderClick={onHeaderClick}
						getUnsortableReason={shell.view.unsortableReason}
						onResize={resizeColumn}
						frozenCount={shell.frozenCount}
						rowHeight={shell.rowHeightPx}
						onColumnMove={shell.view.layout.moveBeside}
						renderHeaderMenu={renderHeaderMenu}
						onVisibleRangeChange={infiniteScroll ? onVisibleRangeChange : undefined}
						rowMarker={showSelection ? rowMarker : undefined}
						activeCell={activeCell}
						activeRange={s.selection.gridSelection?.current?.range}
						onGridKeyDown={handleGridKeyDown}
						onGridFocus={handleGridFocus}
						onCopy={handleCopy}
						onCut={handleCut}
						onPaste={handlePaste}
						onFillDrag={handleFillDrag}
						fixedWidthColumns={fixedWidthColumns}
						narrowColumns={narrowColumns}
						onPressEmpty={clearCursor}
						activeDescendantId={activeCell ? `sheets-cell-${activeCell[1]}-${activeCell[0]}` : undefined}
					/>
					</SheetsOpenRecordContext.Provider>

					{/* Filtered-empty panel — overlays the empty body while the filter bar stays visible above. */}
					{isFilteredEmpty && (
						<SheetsFilteredEmpty activeFilterCount={activeFilterCount} searching={searching} onClear={clearFiltersAndSearch} />
					)}

					{/* Failed writes keep their full messages here until dismissed; the save status is in the bar. */}
					<div className='pointer-events-none absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2'>
						<WriteErrorStack />
					</div>
				</div>

				<SheetsStatusBar
					total={viewRowCount}
					filtered={shell.view.appliedCount > 0 || searching}
					updating={shell.isFetchingRows}
				>
					<SaveStatus />
				</SheetsStatusBar>
			</div>

			{/* Pagination — hidden in infinite scroll mode (canvas parity). */}
			{showPagination && !infiniteScroll && s.pagination.pageCount > 1 && (
				<SheetsPagination
					pageIndex={s.pagination.pageIndex}
					pageSize={pageSize}
					totalCount={shell.totalCount}
					totalPages={s.pagination.pageCount}
					setPageIndex={s.pagination.setPageIndex}
				/>
			)}

			<OverlayManager
				open={overlay.isOpen && editorNode != null}
				anchorRect={active?.anchorRect ?? null}
				presetClass={editorNode?.presetClass}
				dismissMode={editorNode?.dismissMode}
				onCancel={overlayClose}
			>
				<SheetsOpenTableContext.Provider value={props.onOpenTable ?? null}>
					<SheetsOpenRecordContext.Provider value={recordPanel.openLinkedRecord}>{editorNode?.element}</SheetsOpenRecordContext.Provider>
				</SheetsOpenTableContext.Provider>
			</OverlayManager>

			{/* Right-click context menu — items dispatch through the SAME pipeline as keys/clicks
			    (clipboard.* with no native event take the navigator.clipboard fallback). Rendered once. */}
			<SheetsContextMenu
				state={contextMenu}
				onClose={closeContextMenu}
				onAction={(commandId) => dispatch(commandId)}
				isEnabled={isCommandEnabled}
				reasonFor={commandReason}
				onAddRow={handleAddRow}
				onDeleteRows={s.draft.deleteSelected}
				selectedRowCount={selection?.rows.length ?? 0}
				canAddRows={shell.canCreate}
				canDeleteRows={shell.canDelete}
				canOpenRecords={Boolean(ctxRef.current.record)}
			/>

			{recordPanelElement}
			</div>
		</SheetsErrorBoundary>
	);
}

// Public props alias — generic over the consumer's row type (default SheetsRow keeps
// existing untyped callers compiling). Carries DataGridProps' TRow through.
export type SheetsProps<TRow extends SheetsRow = SheetsRow> = DataGridProps<TRow>;

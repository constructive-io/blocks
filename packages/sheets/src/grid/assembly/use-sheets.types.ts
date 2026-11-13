// The public and internal result types of `useSheets` (re-exported from `../use-sheets`).
import type { SortSpec, TableModel } from '@constructive-io/data';

import type { CellTypeRegistry } from '../../cell-types/cell-type-registry';
import type { SheetsCellResolution } from '../../grid-dom/use-sheets-content';
import type { RelationGridColumn } from '../../hooks/use-relation-columns';
import type { SheetsSelection } from '../../selection/selection-model';
import type { DraftSubmitResult } from '../draft-types';
import type { CellWrite, CommitCellsOptions, CommitCellsResult } from '../hooks/use-batch-commit';
import type { useGridState } from '../hooks/use-grid-state';
import type { VisibleRowRange } from '../hooks/use-infinite-grid-data';
import type { SheetsRow } from '../row-model';
import type { SheetsEvent } from '../sheets.types';
import type { SheetsViewBindings } from '../view-state/use-sheets-view';
import type { SavedViewsBindings } from '../views/use-saved-views';

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
	/** @internal Filter, sort and search state and actions (toolbar, header, view commands). NOT a stable API. */
	view: SheetsViewBindings;
	/** @internal Saved views of the table (switcher, save, discard). NOT a stable API. */
	savedViews: SavedViewsBindings;
	/** Number of filter conditions in the state, applied or not. */
	filterConditionCount: number;
	/** The list filter and sort of the view, as the data hooks get them (full-result export). */
	viewQuery: { where: Readonly<Record<string, unknown>> | undefined; orderBy: readonly SortSpec[] | undefined };
	/** True while rows for the current filter, sort or search are being fetched (the previous rows may still show). */
	isFetchingRows: boolean;
	setGridSelectionForControls: (selection: SheetsSelection | null) => void;
	/** Prefetch the rows in an inclusive visible window (native range, infinite mode). */
	onVisibleRegionChanged: (range: VisibleRowRange) => void;
	/** Changes exactly when sort, filters or search change the rows (selection resets on it). */
	viewSignature: string;
	/** @internal Committed column widths (id → px) — the DOM grid maps these to v9 columnSizing. NOT a stable API. */
	columnWidths: ReturnType<typeof useGridState>['state']['columnWidths'];
	/** @internal Commit a column width (id, px) — the DOM resize handle drives this directly. NOT a stable API. */
	resizeColumn: ReturnType<typeof useGridState>['actions']['resizeColumn'];
	/** Leading columns that stay in place under horizontal scroll (the view's layout). */
	frozenCount: number;
	/** Row height in pixels (the view's layout). */
	rowHeightPx: number;
	selectedRowCount: number;
	canCreate: boolean;
	canUpdate: boolean;
	canDelete: boolean;
	/** Human-readable reason shown when the table model proves rows cannot be changed. */
	readOnlyReason: string | null;
	/** @internal The table model (kinds, options, write flags, relations, sort and filter names), or null while it loads. NOT a stable API. */
	tableModel: TableModel | null;
	/** Stable identity for selection, TanStack rows, and editor instances. */
	getRowId: (row: SheetsRow | null | undefined, index: number) => string;
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

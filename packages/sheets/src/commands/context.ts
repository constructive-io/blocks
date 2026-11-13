/**
 * GridCommandContext — the ONE object every {@link GridCommand} runs against.
 *
 * In SheetsDomInner it is REF-LATCHED exactly like the existing `openEditor` latch
 * (grid/sheets.tsx): churning values (selection / combinedRows / counts) are read
 * through live GETTERS off the existing refs, while the dispatcher methods are the
 * EXISTING stable callbacks wrapped VERBATIM — no dispatcher is reinvented. The context
 * identity therefore stays stable across renders, so wiring it into `renderCell` (Phase 2)
 * will not bust the per-cell memo.
 *
 * Getters (live reads off the existing refs):
 *   rowCount / colCount / activeCell / resumeCell / selection / combinedRows / columnKeys
 *
 * Anchor access wraps the existing `anchorRef` (the FIXED corner a range extends FROM):
 *   getAnchor / setAnchor
 *
 * Dispatchers (the existing stable functions, verbatim — see sheets.tsx for each):
 *   setActiveCell, moveActiveCell, extendToCell, setSelection, commitCells,
 *   openEditorAtActive, openEditorAt, undo, redo, scrollToCell, sortToggle,
 *   getCellsInRange, toTSV, emit
 *
 * View (filter, sort and search): `view`, see {@link GridViewCommandTarget}.
 */

import type { SheetsSelection, SelectionRect } from '../selection/selection-model';
import type { CellWrite, CommitCellsOptions, CommitCellsResult } from '../grid/hooks/use-batch-commit';
import type { SheetsEvent } from '../grid/sheets.types';

/**
 * The filter, sort, search, column layout and saved-view actions the view
 * commands run. Each `can*` / `has*` reads the table model and the view, so a
 * command is only runnable when it would do something.
 */
export interface GridViewCommandTarget {
	/** The table can be searched and the search box is on screen. */
	readonly canSearch: boolean;
	/** A search is active. */
	readonly hasSearch: boolean;
	/** The filter builder can open: the built-in toolbar is shown and the table has a filterable field. */
	readonly canFilter: boolean;
	/** At least one filter condition exists. */
	readonly hasFilters: boolean;
	/** The sort control can open: the built-in toolbar is shown and the table has a sortable column. */
	readonly canSortAny: boolean;
	/** At least one sort key exists. */
	readonly hasSort: boolean;
	/** The grid column can be sorted. */
	canSort(colKey: string): boolean;
	/** Focus the toolbar search box; false when it is not there. */
	focusSearch(): boolean;
	clearSearch(): void;
	openFilters(): void;
	clearFilters(): void;
	openSort(): void;
	clearSort(): void;
	/** Sort by this column alone. */
	sortBy(colKey: string, direction: 'asc' | 'desc'): void;

	// ---- column layout ----
	/** The column can be filtered (the built-in toolbar is shown). */
	canFilterBy(colKey: string): boolean;
	/** Add a condition on the column and open the filters. */
	filterBy(colKey: string): void;
	/** The column can be hidden (it is not the last one shown). */
	canHide(colKey: string): boolean;
	hide(colKey: string): void;
	/** The column can move one place left (-1) or right (1) among the shown columns. */
	canMove(colKey: string, step: -1 | 1): boolean;
	move(colKey: string, step: -1 | 1): void;
	/** How many leading columns stay in place. */
	readonly frozenCount: number;
	/** Freeze the shown columns up to and including this one. */
	freezeUpTo(colKey: string): void;
	unfreeze(): void;
	/** Open the header menu of a column. */
	openColumnMenu(colKey: string): void;
	/** The Fields control can open (the built-in toolbar is shown). */
	readonly canOpenFields: boolean;
	openFields(): void;

	// ---- saved views ----
	/** The view switcher can open (the built-in toolbar is shown). */
	readonly canOpenViews: boolean;
	openViews(): void;
	/** The active saved view has unsaved changes. */
	readonly canSaveView: boolean;
	saveView(): void;
}

/** The record panel, when the grid has one: open one row as a record. */
export interface GridRecordCommandTarget {
	/** The row can be opened (it is loaded and is a record). */
	canOpen(rowIndex: number): boolean;
	open(rowIndex: number): void;
	/** The panel is open. Escape in the grid closes it only then. */
	isOpen?(): boolean;
	close?(): void;
}

/** The record panel's new-record form, when the grid has one. */
export interface GridNewRecordCommandTarget {
	/** The table allows new records. */
	canCreate(): boolean;
	open(): void;
}

/** Links in cells (an email or web address): find the one a cell holds, and open it. */
export interface GridLinkCommandTarget {
	/** The address the cell's link opens, or null when the cell holds no link. */
	hrefAt(col: number, row: number): string | null;
	/** Open an address: a web address in a new tab, an email in the mail app. */
	open(href: string): void;
}

/** The grid's context menu, opened from the keyboard at a cell. */
export interface GridContextMenuCommandTarget {
	open(col: number, row: number): void;
}

/** Extracted cell matrix — mirrors `getCellsInRange`'s return shape. */
export interface CellMatrix {
	cols: string[];
	rows: number[];
	values: (readonly unknown[])[];
}

export interface GridCommandContext {
	// ---- live getters (read the existing refs / derived render values) ----
	/** Current row count (`combinedRows.length`). */
	readonly rowCount: number;
	/** Current column count (`columns.length`). */
	readonly colCount: number;
	/** The active (keyboard cursor) cell `[col, row]`, or undefined. */
	readonly activeCell: [number, number] | undefined;
	/**
	 * Where the cursor comes back after the active cell was cleared: the last active cell while
	 * it is still inside the grid. Absent means the first cell.
	 */
	readonly resumeCell?: [number, number];
	/** The LATEST canonical selection (post-sort/filter-clear safe). */
	readonly selection: SheetsSelection | undefined;
	/** The current combined (server + draft) row window. */
	readonly combinedRows: readonly unknown[];
	/** The ordered column keys. */
	readonly columnKeys: readonly string[];

	// ---- anchor access (over the existing anchorRef) ----
	/** Read the latched range anchor `[col, row]` (the corner a range extends FROM). */
	getAnchor(): [number, number] | null;
	/** Latch / reset the range anchor. */
	setAnchor(anchor: [number, number] | null): void;

	// ---- dispatchers (existing stable functions, wrapped verbatim) ----
	/** Park the active cell on `[col, row]` (preserves row/col selection). */
	setActiveCell(col: number, row: number): void;
	/** Move the active cell by a delta, clamped to bounds. */
	moveActiveCell(dCol: number, dRow: number, colCount: number, rowCount: number): void;
	/** Extend the contiguous range from the latched anchor to `[col, row]`. */
	extendToCell(col: number, row: number): void;
	/** Write the canonical selection directly (`s.selection.setGridSelection`). */
	setSelection(selection: SheetsSelection | undefined): void;
	/** Batched cell commit (the same setter cell edits round-trip through). */
	commitCells(writes: CellWrite[], opts?: CommitCellsOptions): Promise<CommitCellsResult>;
	/** Open the overlay editor at the active cell; optional seed text (type-to-edit). Returns true when opened. */
	openEditorAtActive(initialText?: string): boolean;
	/** Open the overlay editor at an explicit cell + anchor rect (dblclick path). */
	openEditorAt(rowIndex: number, colKey: string, anchorRect: DOMRect, initialText?: string): void;
	/** Undo the last edit (may kick a Promise). */
	undo(): void | Promise<void>;
	/** Redo the last undone edit (may kick a Promise). */
	redo(): void | Promise<void>;
	/** Scroll a cell into view. */
	scrollToCell(col: number, row: number): void;
	/**
	 * Header sort click for a column key: cycle that column alone, or with `additive`
	 * (Shift+click) add it to the sort, flip it, or remove it.
	 */
	sortToggle(colKey: string, additive?: boolean): void;
	/** Toggle a single row in the checkbox selection (the existing rowMarker.onToggleRow). */
	toggleRow(rowIndex: number, shift: boolean): void;
	/** Toggle select-all in the checkbox selection (the existing rowMarker.onToggleAll). */
	toggleAll(): void;
	/** Extract a cell matrix for a range (pure helper, re-exported into ctx for copy). */
	getCellsInRange(rect: SelectionRect): CellMatrix;
	/** Serialize a value matrix to TSV (pure helper). */
	toTSV(values: (readonly unknown[])[]): string;
	/** Emit an observational event (analytics/telemetry; never changes behavior). */
	emit(type: SheetsEvent['type'], meta?: Record<string, unknown>): void;

	// ---- view (filter, sort, search) ----
	readonly view: GridViewCommandTarget;

	// ---- record panel (optional: absent when the grid has none) ----
	readonly record?: GridRecordCommandTarget;
	readonly newRecord?: GridNewRecordCommandTarget;

	// ---- links and the context menu (optional) ----
	readonly link?: GridLinkCommandTarget;
	readonly contextMenu?: GridContextMenuCommandTarget;
}

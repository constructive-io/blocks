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
 *   rowCount / colCount / activeCell / selection / combinedRows / columnKeys
 *
 * Anchor access wraps the existing `anchorRef` (the FIXED corner a range extends FROM):
 *   getAnchor / setAnchor
 *
 * Dispatchers (the existing stable functions, verbatim — see sheets.tsx for each):
 *   setActiveCell, moveActiveCell, extendToCell, setSelection, commitCells,
 *   openEditorAtActive, openEditorAt, undo, redo, scrollToCell, sortToggle,
 *   getCellsInRange, toTSV, emit
 */

import type { SheetsSelection, SelectionRect } from '../selection/selection-model';
import type { CellWrite, CommitCellsOptions, CommitCellsResult } from '../grid/hooks/use-batch-commit';
import type { SheetsEvent } from '../grid/sheets.types';

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
	/** Toggle the sort for a column key (the existing header-click sort toggle). */
	sortToggle(colKey: string): void;
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
}

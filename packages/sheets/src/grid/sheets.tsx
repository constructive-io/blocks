import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type React from 'react';
import { functionalUpdate, type ColumnSizingState, type OnChangeFn, type RowSelectionState } from '@tanstack/react-table';
import { RiFilterOffLine, RiSearchEyeLine } from '@remixicon/react';

import { useSheetsContext } from '../context/sheets-context';
import { cn } from '../utils/cn';
import { Button } from '@constructive-io/ui/button';
import type { DataGridProps, SheetsHandle } from './sheets.types';
import type { SheetsRow } from './row-model';

import { SheetsControls, countConditions } from './sheets.controls';
import { SheetsContextMenu, type ContextMenuState } from './sheets.context-menu';
import { FeedbackProvider, FloatingStatus } from './feedback';
import { SheetsErrorBoundary } from './feedback/sheets-error-boundary';
import { SheetsEmptyState, SheetsErrorState, SheetsLoadingState } from './feedback/sheets-error-state';
import { SheetsPagination } from './sheets.pagination';
import { useSheets } from './use-sheets';
import { useSheetsTableInstance, type SheetsColumnDescriptor } from '../table/use-sheets-table-instance';
import { GridViewport, type GridViewportHandle, type RenderCell, type RowMarker, type VisibleRange } from '../table/grid-viewport';
import { SheetsCellHost, type OpenEditor } from '../grid-dom/sheets-cell-host';
import { useOverlayController } from '../grid-dom/overlay/use-overlay-controller';
import { OverlayManager } from '../grid-dom/overlay/overlay-manager';
import { resolveEditIntent } from '../grid-dom/editors/edit-intent';
import { computeOverlayGeometry } from './editors/overlay-viewport-guard';
import { RangeSet } from '../selection/range-set';
import { clear, emptySheetsSelection, extendRangeToCell, selectRange, toggleRow } from '../selection/selection-model';
import type { SelectionRect } from '../selection/selection-model';
import { getCellsInRange as extractCellsInRange, toTSV as serializeTSV } from '../selection/cell-extract';
import { bulkEditWrites } from '../selection/fill';
import { createGridCommandRegistry, type NavAbsolutePayload } from '../commands/registry';
import type { GridCommandRegistry } from '../commands/types';
import type { GridCommandContext, CellMatrix } from '../commands/context';
import { makeDispatch, tailObserver, type Dispatch, type Interceptor } from '../commands/dispatch';
import { resolveKeyCommand, DEFAULT_KEYMAP, type Binding } from '../commands/keymap';

// Rows moved per PageUp/PageDown when the scroll element's clientHeight can't be read
// (jsdom / detached). A sensible spreadsheet page span.
const FALLBACK_PAGE_ROWS = 10;
/** Estimated body row height — MUST match grid-viewport's ESTIMATED_ROW_HEIGHT (page-span math). */
const ESTIMATED_ROW_HEIGHT = 34;

/** Escape a single CSV field: wrap in quotes when it contains comma/quote/newline. */
function escapeCsvField(value: unknown): string {
	const str = value == null ? '' : String(value);
	if (/[",\n\r]/.test(str)) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

/**
 * Build a CSV string from rows + columns and trigger a browser download.
 * Dependency-free: values are stringified via String() (objects become
 * "[object Object]" — callers wanting rich serialization should pre-flatten).
 */
function downloadCsv(rows: Record<string, unknown>[], columns: string[], filename?: string): void {
	if (typeof document === 'undefined') return;
	const header = columns.map(escapeCsvField).join(',');
	const body = rows.map((row) => columns.map((col) => escapeCsvField(row?.[col])).join(',')).join('\n');
	const csv = body ? `${header}\n${body}` : header;

	const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename ?? 'export.csv';
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

/**
 * Coerce a cell's raw row value to a boolean for the inline-toggle commit — MUST
 * match the boolean SheetsCell factory (cell-model/factories/boolean.ts) so the
 * toggle flips against the SAME boolean the cell renders: null/undefined -> false,
 * a boolean passes through, anything else via Boolean(). The host commits the
 * negation, so an unset boolean toggles on first.
 */
function coerceCellBoolean(value: unknown): boolean {
	if (value === null || value === undefined) return false;
	return typeof value === 'boolean' ? value : Boolean(value);
}

/** The absolute-nav keys whose command (`cell.navAbsolute`) needs the payload below. */
const ABSOLUTE_NAV_KEYS = new Set(['Tab', 'Home', 'End', 'PageUp', 'PageDown']);

/**
 * Build the dispatch payload for a key event. Only `cell.navAbsolute` (Tab/Home/End/Page*)
 * needs one — the funnel's old inline branch derived the page span from the scroll element's
 * clientHeight (e.currentTarget IS the scroll root), falling back to a constant under jsdom.
 * Arrows / extends / undo / redo / select-all / open read everything from the command context,
 * so they get `undefined`.
 */
function buildKeyPayload(e: React.KeyboardEvent): NavAbsolutePayload | undefined {
	if (!ABSOLUTE_NAV_KEYS.has(e.key)) return undefined;
	const clientHeight = (e.currentTarget as HTMLElement).clientHeight;
	const pageRows = clientHeight > 0 ? Math.max(1, Math.floor(clientHeight / ESTIMATED_ROW_HEIGHT)) : FALLBACK_PAGE_ROWS;
	return { key: e.key, ctrlOrMeta: e.ctrlKey || e.metaKey, shift: e.shiftKey, pageRows };
}

function SheetsInnerComponent<TRow extends SheetsRow = SheetsRow>(
	props: DataGridProps<TRow>,
	ref: React.ForwardedRef<SheetsHandle>,
) {
	// The native TanStack DOM grid is the only render path (the canvas <DataEditor>
	// branch was removed at the glide cutover).
	return (
		<FeedbackProvider>
			<SheetsDomInner {...props} forwardedRef={ref} />
		</FeedbackProvider>
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

// Row selection (Phase 6), column sizing + pinning (Stage 2) are all wired to the shell now.
// Pinning is shell-DERIVED (frozenCount), never edited from the grid, so its onChange is a no-op.
// EMPTY_OBJ is the stable empty rowSelection map returned when nothing is selected.
const EMPTY_OBJ = {} as const;
const noop = () => {};

/**
 * Row id for `combinedRows[index]` — MUST match `useSheetsTableInstance`'s
 * `defaultGetRowId` (`row.id` when present, else the index) so the rowSelection
 * map ↔ RangeSet projection is an exact inverse.
 */
function rowIdAt(rows: readonly unknown[], index: number): string {
	const id = (rows[index] as { id?: unknown } | undefined)?.id;
	return id != null ? String(id) : String(index);
}

// Overlay flip-geometry knobs — MUST match the OverlayManager's private constants so
// the geometry we hand the editor via EditorProps.overlay matches where it's placed.
const OVERLAY_MARGIN_PX = 12;
const OVERLAY_MIN_BELOW_PX = 320;

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

	const { config } = useSheetsContext();

	const viewportRef = useRef<GridViewportHandle>(null);

	// ============== EVENT->COMMAND DISPATCH (P4 Phase 1) ==============
	// ONE interceptable pipeline: every grid event resolves to a named command and runs
	// through `dispatch`. The registry + keymap are latched (so a Phase 2 consumer override
	// is a ref swap, not a new dispatch identity); `ctxRef.current` is the assembled
	// GridCommandContext, repointed each render below (mirrors the openEditor ref-latch).
	// `dispatch` is useCallback([]) reading the refs, so it stays referentially STABLE — the
	// per-cell memo gates on the pointer callbacks that close over it, so it must never churn.
	// PUBLIC CUSTOMIZATION SEAM (P4 Phase 2): registry / keymap / interceptors derive from the
	// consumer props but rebuild ONLY when the prop IDENTITY changes (useMemo), so omitting them
	// is identical to the defaults. Each is latched into a ref so the keydown handler + dispatch
	// read the latest without re-creating. The PUBLIC `dispatch` callback stays referentially
	// STABLE (reads dispatchRef.current), so the per-cell memo never churns; dispatchRef itself is
	// rebuilt when the registry or interceptor list identity changes (additive, no identity leak).
	const { commands, keymap, interceptors, onCommand } = props;
	const registry = useMemo<GridCommandRegistry>(() => createGridCommandRegistry(commands), [commands]);
	// Consumer bindings scan FIRST (resolveKeyCommand is first-match-wins) so a rebind of a
	// built-in chord wins over the default; the defaults follow as the fallback set.
	const fullKeymap = useMemo<Binding[]>(() => [...(keymap ?? []), ...DEFAULT_KEYMAP], [keymap]);
	const keymapRef = useRef<Binding[]>(fullKeymap);
	keymapRef.current = fullKeymap;
	// Consumer interceptors are OUTERMOST (first-listed); the onCommand tail observer is appended
	// LAST so it sits innermost (after every consumer interceptor) and observes the real result.
	const chain = useMemo<Interceptor[]>(
		() => [...(interceptors ?? []), ...(onCommand ? [tailObserver(onCommand)] : [])],
		[interceptors, onCommand],
	);
	const ctxRef = useRef<GridCommandContext>(undefined as unknown as GridCommandContext);
	const dispatchRef = useRef<Dispatch>(undefined as unknown as Dispatch);
	dispatchRef.current = useMemo<Dispatch>(() => makeDispatch(registry, () => ctxRef.current, chain), [registry, chain]);
	const dispatch = useCallback<Dispatch>((command, native, payload) => dispatchRef.current(command, native, payload), []);

	const columns = useMemo<SheetsColumnDescriptor[]>(
		() => s.columns.map((col) => ({ key: col.id, name: col.title, size: col.width })),
		[s.columns],
	);

	// ============== COLUMN SIZING + PINNING STATE MIRROR (Stage 2) ==============
	// Sizing: project the shell's columnWidths Map → v9 ColumnSizingState; a width committed
	// by the header drag-resize handle goes STRAIGHT to resizeColumn (the same setter the canvas
	// onColumnResize uses), so the Map stays the single source of truth and the table just mirrors.
	// Pinning: pin col0 ('id') exactly when the canvas freezes it (frozenCount), else nothing —
	// GridViewport's findStickyColumnIndex falls back to col0 anyway, so the sticky column is identical.
	const columnWidths = shell.columnWidths;
	const resizeColumn = shell.resizeColumn;
	const frozenCount = shell.frozenCount;
	const firstColumnKey = shell.columnKeys[0];

	const columnSizing = useMemo<Record<string, number>>(() => {
		const sizing: Record<string, number> = {};
		columnWidths.forEach((width, key) => {
			sizing[key] = width;
		});
		return sizing;
	}, [columnWidths]);

	const columnPinning = useMemo<{ left: string[]; right: string[] }>(
		() => ({ left: frozenCount > 0 && firstColumnKey ? [firstColumnKey] : [], right: [] }),
		[frozenCount, firstColumnKey],
	);

	const onColumnSizingChange = useCallback<OnChangeFn<ColumnSizingState>>(
		(updater) => {
			const next = functionalUpdate(updater, columnSizing);
			for (const key of Object.keys(next)) {
				if (next[key] !== columnSizing[key]) resizeColumn(key, next[key]);
			}
		},
		[columnSizing, resizeColumn],
	);

	// ============== ROW-SELECTION STATE MIRROR (Phase 6, both directions) ==============
	// The native SheetsSelection (RangeSet of ROW indices) stays canonical; the v9
	// table only needs a derived `Record<rowId, true>` view. Row ids match the table's
	// default getRowId (`row.id` else index), so the two maps below are exact inverses.
	const combinedRows = shell.combinedRows;
	const selection = s.selection.gridSelection;
	const setSelection = s.selection.setGridSelection;
	// Active (keyboard cursor) cell `[col, row]`, threaded to the viewport for the focus ring +
	// aria-activedescendant. Derived in render (a plain read, no setState) per the no-setState-in-render rule.
	const activeCell = selection?.current?.cell;

	const rowSelection = useMemo<Record<string, boolean>>(() => {
		if (!selection) return EMPTY_OBJ;
		const map: Record<string, boolean> = {};
		for (const index of selection.rows.toArray()) {
			map[rowIdAt(combinedRows, index)] = true;
		}
		return map;
	}, [selection, combinedRows]);

	const onRowSelectionChange = useCallback<OnChangeFn<RowSelectionState>>(
		(updater) => {
			const next = functionalUpdate(updater, rowSelection);
			// Map the selected row IDS back to row INDICES via combinedRows, then fold
			// into a fresh RangeSet. Active cell follows the lowest selected index (or
			// clears to the empty selection when nothing is selected).
			const indexById = new Map<string, number>();
			for (let i = 0; i < combinedRows.length; i++) indexById.set(rowIdAt(combinedRows, i), i);

			let rows = RangeSet.empty();
			let lowest: number | undefined;
			for (const id of Object.keys(next)) {
				if (!next[id]) continue;
				const index = indexById.get(id);
				if (index === undefined) continue;
				rows = rows.add(index);
				if (lowest === undefined || index < lowest) lowest = index;
			}

			if (lowest === undefined) {
				setSelection(emptySheetsSelection);
				return;
			}
			setSelection({ current: { cell: [0, lowest] }, rows, columns: RangeSet.empty() });
		},
		[rowSelection, combinedRows, setSelection],
	);

	const table = useSheetsTableInstance({
		columns,
		data: combinedRows,
		columnSizing,
		columnPinning,
		rowSelection,
		onColumnSizingChange,
		// Pinning is shell-derived (frozenCount), never edited from the grid → no writer needed.
		onColumnPinningChange: noop,
		onRowSelectionChange,
	});

	// ============== LEADING CHECKBOX / SELECT-ALL COLUMN (drives the canonical RangeSet) ==============
	// The DOM grid has no canvas rowMarkers, so the GridViewport paints a sticky checkbox column whose
	// toggles write the canonical SheetsSelection directly (the rowSelection mirror above derives FROM
	// it). selectRange/toggleRow/clear are the same pure helpers the canvas projection round-trips, so
	// shift-range and ctrl-toggle behave identically. `shiftAnchorRef` records the last-toggled index so
	// a subsequent shift-click selects the contiguous block — caller-owned, matching selectRange's contract.
	const rowCount = combinedRows.length;
	const shiftAnchorRef = useRef<number | null>(null);
	// Latch selection + rowCount so the STABLE toggle impls (ctx methods) read the latest values
	// without re-creating, while rowMarker's handlers dispatch the named commands through `dispatch`.
	const rowMarkerSelectionRef = useRef(selection);
	rowMarkerSelectionRef.current = selection;
	const rowCountRef = useRef(rowCount);
	rowCountRef.current = rowCount;
	// Verbatim toggle bodies, lifted from the previous inline rowMarker handlers — the rowMarker
	// dispatches `rowmarker.toggleRow` / `rowmarker.toggleAll`, whose commands call these.
	const toggleRowImpl = useCallback((index: number, shiftKey: boolean) => {
		const sel = rowMarkerSelectionRef.current ?? emptySheetsSelection;
		const anchor = shiftAnchorRef.current;
		const next = shiftKey && anchor !== null ? selectRange(sel, anchor, index) : toggleRow(sel, index);
		shiftAnchorRef.current = index;
		setSelection(next);
	}, [setSelection]);
	const toggleAllImpl = useCallback(() => {
		const sel = rowMarkerSelectionRef.current ?? emptySheetsSelection;
		const rc = rowCountRef.current;
		const allSelected = rc > 0 && sel.rows.length === rc;
		shiftAnchorRef.current = null;
		setSelection(
			allSelected || rc === 0
				? clear(sel)
				: { current: { cell: [0, 0] }, rows: RangeSet.fromSingleSelection([0, rc]), columns: RangeSet.empty() },
		);
	}, [setSelection]);
	const rowMarker = useMemo<RowMarker>(() => {
		const sel = selection ?? emptySheetsSelection;
		const selectedCount = sel.rows.length;
		const allSelected = rowCount > 0 && selectedCount === rowCount;
		return {
			isSelected: (index) => sel.rows.hasIndex(index),
			// Toggle handlers route through the ONE dispatch pipeline (rowmarker.toggleRow /
			// rowmarker.toggleAll); the command bodies call toggleRowImpl / toggleAllImpl (the
			// verbatim selectRange/toggleRow/clear logic lifted above).
			onToggleRow: (index, shiftKey) => dispatch('rowmarker.toggleRow', undefined, { rowIndex: index, shift: shiftKey }),
			allSelected,
			someSelected: selectedCount > 0 && !allSelected,
			onToggleAll: () => dispatch('rowmarker.toggleAll'),
		};
	}, [selection, rowCount, dispatch]);

	// Imperative getSelectedRows reads the SAME canonical RangeSet the canvas handle uses.
	const getSelectedRows = useCallback(
		(): Record<string, unknown>[] =>
			(selection?.rows.toArray() ?? []).map((i) => combinedRows[i]).filter(Boolean) as Record<string, unknown>[],
		[selection, combinedRows],
	);

	// Shared CSV export body — selected rows if any, else the loaded/filtered set. Reused by
	// the imperative SheetsHandle.exportCsv() and the toolbar Export button (handleExport).
	const runCsvExport = useCallback(
		(opts?: { columns?: string[]; filename?: string }) => {
			const selected = getSelectedRows();
			const rows = selected.length ? selected : (shell.combinedRows as Record<string, unknown>[]);
			downloadCsv(rows, opts?.columns ?? shell.columnKeys, opts?.filename);
		},
		[getSelectedRows, shell.combinedRows, shell.columnKeys],
	);

	useImperativeHandle(
		forwardedRef,
		(): SheetsHandle => ({
			scrollToRow: (index) => viewportRef.current?.scrollToIndex(index),
			submitDrafts: () => s.draft.submitDrafts(),
			refetch: () => s.refetch(),
			getSelectedRows,
			exportCsv: (opts) => runCsvExport(opts),
		}),
		[s.draft.submitDrafts, s.refetch, getSelectedRows, runCsvExport],
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

	// Toolbar Export button — same path as the imperative SheetsHandle.exportCsv().
	const handleExport = useCallback(() => runCsvExport({ filename: `${tableName}.csv` }), [runCsvExport, tableName]);

	// ============== SCROLL + SELECTION RESET ON SORT/FILTER CHANGE ==============
	// When sort or filter changes the infinite query re-keys and the row set is a different,
	// index-based window — so any held selection/active-cell now points at the wrong rows.
	// Per the locked decision we CLEAR selection + active cell and scroll back to the top.
	// Keyed precisely on the same sort+filter inputs the query derives its where/orderBy from,
	// so it fires only on a real sort/filter transition (not on data refetch or draft edits).
	const optionsKey = useMemo(
		() => JSON.stringify({ id: shell.sorting.id, desc: shell.sorting.desc, filter: shell.filterTree }),
		[shell.sorting.id, shell.sorting.desc, shell.filterTree],
	);
	const didMountResetRef = useRef(false);
	useEffect(() => {
		if (!didMountResetRef.current) {
			didMountResetRef.current = true;
			return;
		}
		setSelection(emptySheetsSelection);
		viewportRef.current?.scrollToIndex(0);
	}, [optionsKey, setSelection]);

	// ============== NATIVE OVERLAY EDITING (Phase 4, additive) ==============
	// Open/close state for the native React-portal overlay editor. The host measures
	// the activated cell's rect (only it knows the cell DOM node) and calls openEditor.
	const overlay = useOverlayController();
	const overlayOpen = overlay.open;
	const overlayClose = overlay.close;
	const overlayReanchor = overlay.reanchor;

	// Inject the shell's native content resolver into the cell host (Phase 3): the
	// host renders the consumer component when registered, else the kind→view map.
	// openEditor is threaded so the cell wrapper can activate the overlay editor;
	// submitDraftRow is threaded so the draft-action cell's Button can submit (Stage 4).
	const getSheetsCellContent = shell.getSheetsCellContent;
	const submitDraftRow = shell.submitDraftRow;
	const commitCellValue = shell.commitCellValue;
	const getEditorComponent = shell.cellRegistry.getEditorComponent;
	// Undo/redo handlers (stable from useUndoRedo) — wired into the edit.undo / edit.redo commands.
	const undo = shell.undo;
	const redo = shell.redo;
	// Batched commit + observational emit — threaded into the command context (commitCells/emit).
	const commitCells = shell.commitCells;
	const emit = shell.emit;

	// REF-LATCH (perf): `openEditor` is a dep of `renderCell`, which the cell host
	// memo-gates on (prev.openEditor === next.openEditor). Closing over `combinedRows` /
	// `commitCellValue` / the resolver directly would give `openEditor` a NEW identity on
	// every data/draft change, busting the per-cell memo for the ENTIRE visible window.
	// Instead we latch each churning value into a ref kept current every render and read
	// `*Ref.current` inside the callback, so `openEditor` stays referentially STABLE while
	// still seeing the latest values. (`overlayOpen` is already stable — useCallback([]) —
	// so it stays a direct, guaranteed-stable dep.)
	const getSheetsCellContentRef = useRef(getSheetsCellContent);
	getSheetsCellContentRef.current = getSheetsCellContent;
	const getEditorComponentRef = useRef(getEditorComponent);
	getEditorComponentRef.current = getEditorComponent;
	const combinedRowsRef = useRef(combinedRows);
	combinedRowsRef.current = combinedRows;
	const commitCellValueRef = useRef(commitCellValue);
	commitCellValueRef.current = commitCellValue;
	const commitCellsRef = useRef(commitCells);
	commitCellsRef.current = commitCells;
	// Read the LATEST selection inside the keydown handler so a queued move can't resurrect a
	// stale active cell right after a sort/filter clear (the optionsKey effect resets selection).
	const selectionRef = useRef(selection);
	selectionRef.current = selection;

	// EDIT-INTENT BRANCH (Stage 2): activation routes through the SINGLE edit-intent
	// resolver off the resolved `typeKey` — NOT the broken `cell.meta?.cellType ?? 'text'`
	// lookup that mis-routed every non-text cell to TextEditor. The cell-host fires this
	// on double-click / Enter / F2 (it already no-ops readonly cells); here we branch
	// BEFORE opening any overlay:
	//   • inline-toggle (booleans): commit `!currentBool` in place, no overlay.
	//   • overlay: open the portal (the editorNode block resolves intent.editor).
	//   • none (readonly / non-editable): do nothing.
	const openEditorImpl = useCallback<OpenEditor>(
		(rowIndex, colKey, anchorRect, initialText) => {
			const resolution = getSheetsCellContentRef.current(rowIndex, colKey);
			const intent = resolveEditIntent(
				resolution.typeKey,
				{ readonly: resolution.cell.readonly },
				getEditorComponentRef.current,
			);
			if (intent.mode === 'none') return;
			if (intent.mode === 'inline-toggle') {
				const current = (combinedRowsRef.current[rowIndex] as Record<string, unknown> | undefined)?.[colKey];
				commitCellValueRef.current(rowIndex, colKey, !coerceCellBoolean(current));
				return;
			}
			// inline-edit (simple text/number): edit IN PLACE — same active-cell controller (so nav/
			// clipboard suppression + scroll commit-on-unmount are shared) but the cell host renders
			// the input and the portal is skipped (editorNode is null for a non-overlay intent).
			if (intent.mode === 'inline-edit') {
				overlayOpen({ rowIndex, colKey, anchorRect, initialText, mode: 'inline' });
				return;
			}
			overlayOpen({ rowIndex, colKey, anchorRect, initialText, mode: 'overlay' });
		},
		[overlayOpen],
	);
	// The dblclick entrypoint threaded into the cell host: route through the ONE pipeline as
	// `editor.open`; the command body calls ctx.openEditorAt → openEditorImpl. STABLE (closes
	// over the stable `dispatch`), so it never busts the per-cell memo.
	const openEditor = useCallback<OpenEditor>(
		(rowIndex, colKey, anchorRect, initialText) =>
			dispatch('editor.open', undefined, { rowIndex, colKey, anchorRect, initialText }),
		[dispatch],
	);
	// ============== RANGE-AWARE BULK EDIT (Stage B) ==============
	// The editor's onCommit routes through here. When a MULTI-CELL range is selected AND the
	// active (edited) cell sits inside it, the committed value FANS OUT across the whole range
	// as ONE undo-aware batch (single optimistic patch + coalesced per-row mutations + one undo
	// entry — commitCells skips readonly/UUID internally and resolveServerPatch coerces the
	// string value PER target column). A single-cell selection (or none, or an active cell
	// outside the range) keeps the existing single-cell commit byte-for-byte. The LATEST range
	// is read off `selectionRef` so a queued sort/filter clear wins (same latch the keymap uses).
	const columnKeysRef = useRef(shell.columnKeys);
	columnKeysRef.current = shell.columnKeys;
	const commitBulkOrSingle = useCallback(
		(rowIndex: number, colKey: string, value: unknown) => {
			const range = selectionRef.current?.current?.range;
			const keys = columnKeysRef.current;
			const activeCol = keys.indexOf(colKey);
			const multiCell = !!range && range.width * range.height > 1;
			const inside =
				!!range &&
				activeCol >= 0 &&
				activeCol >= range.x &&
				activeCol < range.x + range.width &&
				rowIndex >= range.y &&
				rowIndex < range.y + range.height;
			if (multiCell && inside && range) {
				const writes = bulkEditWrites(range, value, keys);
				if (writes.length) void commitCellsRef.current(writes);
				return;
			}
			commitCellValueRef.current(rowIndex, colKey, value);
		},
		[],
	);
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
	// A menu is just another EVENT SOURCE → dispatch. State is the pointer anchor (null = closed),
	// rendered ONCE at the grid level. `handleContextMenu` is STABLE (reads selectionRef + the stable
	// dispatch), so it never busts the per-cell memo. When the right-clicked cell sits OUTSIDE the
	// current active cell / selection range, we activate it first so the menu acts on the clicked cell.
	const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
	const handleContextMenu = useCallback(
		(col: number, row: number, clientX: number, clientY: number) => {
			const sel = selectionRef.current;
			const active = sel?.current?.cell;
			const range = sel?.current?.range;
			const inRange =
				!!range && col >= range.x && col < range.x + range.width && row >= range.y && row < range.y + range.height;
			const isActive = !!active && active[0] === col && active[1] === row;
			if (!isActive && !inRange) dispatch('cell.activate', undefined, { col, row });
			setContextMenu({ clientX, clientY });
		},
		[dispatch],
	);
	const closeContextMenu = useCallback(() => setContextMenu(null), []);
	// Enabled-state probe for the menu items: run the resolved command's `canRun` against the latched
	// context (same gate the dispatch core applies). A missing canRun means "always runnable".
	const isCommandEnabled = useCallback(
		(commandId: string) => {
			const cmd = registry.get(commandId);
			return cmd ? (cmd.canRun ? cmd.canRun(ctxRef.current, undefined) : true) : false;
		},
		[registry],
	);

	// ============== INLINE (IN-CELL) EDIT WIRING ==============
	// Simple text/number types edit in place via the cell host's <input> instead of the portal.
	// They ride the SAME active-editor controller (`overlay`) tagged `mode: 'inline'`, so the only
	// extra wiring here is (a) telling the editing cell to render the input and (b) commit/cancel
	// routed through the existing value-commit pipeline. The inline KEY is the editing cell identity,
	// NULL during overlay editing — so `renderCell` stays referentially stable across overlay
	// scroll-reanchors (which mutate `overlay.active.anchorRect` but never this key).
	const inlineActive = overlay.active?.mode === 'inline' ? overlay.active : null;
	const inlineKey = inlineActive ? `${inlineActive.rowIndex}:${inlineActive.colKey}` : null;
	const inlineInitialText = inlineActive?.initialText;
	const onInlineCommit = useCallback(
		(rowIndex: number, colKey: string, value: unknown) => {
			commitBulkOrSingle(rowIndex, colKey, value);
			overlayClose();
		},
		[commitBulkOrSingle, overlayClose],
	);

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

	// Shared open-at-active-cell path (Enter / F2 / type-to-edit): resolve the active cell's
	// DOM node by its stable id, null-guarding the row (infinite-mode proxy rows can be null at
	// unloaded indices) + the colKey, then open the overlay. `initialText` seeds type-to-edit
	// (OVERWRITE). Returns true when an overlay was opened.
	const openEditorAtActiveCell = useCallback(
		(initialText?: string): boolean => {
			const cell = selectionRef.current?.current?.cell;
			if (!cell) return false;
			const [col, row] = cell;
			const rowData = combinedRowsRef.current[row];
			if (!rowData) return false;
			const colKey = columns[col]?.key;
			if (!colKey) return false;
			const node = document.getElementById(`sheets-cell-${row}-${col}`);
			if (!node) return false;
			// Open directly via the impl (NOT the dispatching `openEditor`) — this fn is itself the
			// body of the editor.openActive / editor.typeToEdit commands' canRun, so going through
			// dispatch again would double-route. Matches the original (which called openEditor directly).
			openEditorImpl(row, colKey, node.getBoundingClientRect(), initialText);
			return true;
		},
		[columns, openEditorImpl],
	);

	// Every grid key now resolves to a NAMED command through the ONE dispatch pipeline. The
	// keymap (first-match-wins) covers undo/redo/select-all/arrows/extend/abs-nav/open; an
	// UNRESOLVED key that is a single printable char (no ctrl/meta/alt) falls to the
	// `editor.typeToEdit` sentinel (also through dispatch, so it is interceptable). Any other
	// unresolved key is left untouched — NO dispatch, NO preventDefault — so it reaches the
	// browser. preventDefault lives in the dispatch CORE, gated on a resolved+runnable command.
	const handleGridKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			// Don't intercept while editing — the overlay editor owns its own keys.
			if (isOverlayOpen) return;
			const cmd = resolveKeyCommand(e.nativeEvent, keymapRef.current);
			if (cmd) {
				dispatch(cmd, e.nativeEvent, buildKeyPayload(e));
				return;
			}
			// Unresolved: only the printable-key sentinel routes through dispatch; everything
			// else falls through to the browser with no preventDefault.
			if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
				dispatch('editor.typeToEdit', e.nativeEvent, { char: e.key });
			}
		},
		[isOverlayOpen, dispatch],
	);

	// ============== NATIVE CLIPBOARD (Stage B) ==============
	// The grid root (role=grid, tabIndex=0) receives the browser's native copy/cut/paste events
	// when focused. We do NOT bind Ctrl/Cmd+C/X/V in the keymap — pressing them fires these native
	// events directly, so binding the keys too would double-handle. Each handler is SKIPPED while an
	// overlay editor is open (the editor owns its own clipboard) and routes through the ONE dispatch
	// pipeline as `clipboard.copy`/`cut`/`paste`, threading the native ClipboardData as the payload.
	// preventDefault happens in the dispatch core (so the browser does not also copy/paste).
	const handleCopy = useCallback(
		(e: React.ClipboardEvent) => {
			if (isOverlayOpen) return;
			dispatch('clipboard.copy', e.nativeEvent, { clipboard: (e.nativeEvent as ClipboardEvent).clipboardData });
		},
		[isOverlayOpen, dispatch],
	);
	const handleCut = useCallback(
		(e: React.ClipboardEvent) => {
			if (isOverlayOpen) return;
			dispatch('clipboard.cut', e.nativeEvent, { clipboard: (e.nativeEvent as ClipboardEvent).clipboardData });
		},
		[isOverlayOpen, dispatch],
	);
	const handlePaste = useCallback(
		(e: React.ClipboardEvent) => {
			if (isOverlayOpen) return;
			dispatch('clipboard.paste', e.nativeEvent, { clipboard: (e.nativeEvent as ClipboardEvent).clipboardData });
		},
		[isOverlayOpen, dispatch],
	);

	// FOLLOW-CELL-ON-SCROLL (Stage B): on viewport scroll, re-measure the active cell's DOM
	// node and re-anchor the overlay to it (cheap, passive — DOM read + a position state set)
	// instead of closing. If the node is GONE (the cell scrolled out of the virtual window and
	// unmounted), we COMMIT-AND-CLOSE rather than silently discard: blur the focused editor
	// element so a commit-on-blur editor (text/number) commits its in-progress value, then
	// close. (Backgrounded-tab rAF throttling is irrelevant — this runs straight off scroll.)
	const activeRef = useRef(overlay.active);
	activeRef.current = overlay.active;
	const columnsRef = useRef(columns);
	columnsRef.current = columns;
	const handleOverlayScroll = useCallback(() => {
		const a = activeRef.current;
		if (!a) return;
		// The cell DOM id is `sheets-cell-${rowIndex}-${columnIndex}` — map the stored colKey
		// back to its rendered column index (same ordering the cell host + activedescendant use).
		const colIndex = columnsRef.current.findIndex((c) => c.key === a.colKey);
		const node = colIndex >= 0 ? document.getElementById(`sheets-cell-${a.rowIndex}-${colIndex}`) : null;
		if (node) {
			// Inline edits live INSIDE the cell, so they ride the virtualized row natively — no
			// reposition needed (and reanchoring would churn state every scroll frame). Only the
			// portal overlay re-anchors to the cell on scroll.
			if (a.mode !== 'inline') overlayReanchor(node.getBoundingClientRect());
			return;
		}
		// Cell unmounted (scrolled out of the virtual window) — commit any in-progress value
		// (commit-on-blur editors, incl. the inline input) then close.
		const focused = document.activeElement;
		if (focused instanceof HTMLElement) focused.blur();
		overlayClose();
	}, [overlayReanchor, overlayClose]);

	// Resolve the active editor + its EditorProps. Computed in render (cheap, only when
	// an overlay is open) — the cell resolution, value, native editor and flip geometry
	// all derive from overlay.active, so no effect/state mirror is needed.
	const active = overlay.active;
	const editorNode = (() => {
		if (!active) return null;
		const resolution = getSheetsCellContent(active.rowIndex, active.colKey);
		// Resolve the editor through the SAME edit-intent resolver the activation branch
		// used (typeKey-driven, consumer-override aware). Only `overlay` intents ever open
		// here (openEditor short-circuits inline-toggle/none), but resolving again keeps a
		// single source of truth — and guards against a non-overlay intent slipping through.
		const intent = resolveEditIntent(resolution.typeKey, { readonly: resolution.cell.readonly }, getEditorComponent);
		if (intent.mode !== 'overlay') return null;
		const Editor = intent.editor;
		const rowValue = (combinedRows[active.rowIndex] as Record<string, unknown> | undefined)?.[active.colKey];
		const geom = computeOverlayGeometry(
			typeof window !== 'undefined' ? window.innerHeight : 800,
			active.anchorRect.top,
			active.anchorRect.height,
			OVERLAY_MARGIN_PX,
			OVERLAY_MIN_BELOW_PX,
		);
		return {
			presetClass: Editor.overlayPresetClass,
			// Commit-on-click-away (Stage B): editors that own an onBlur→onCommit advertise it
			// so the OverlayManager dismisses by blurring (commit) instead of cancelling.
			dismissMode: Editor.commitsOnBlur ? ('commit' as const) : ('cancel' as const),
			element: (
				<Editor
					value={rowValue}
					cell={resolution.cell}
					colKey={active.colKey}
					rowId={String((combinedRows[active.rowIndex] as Record<string, unknown> | undefined)?.id ?? '')}
					rowIndex={active.rowIndex}
					tableName={props.tableName}
					fieldMeta={resolution.fieldMeta}
					relationInfo={resolution.relationInfo}
					initialText={active.initialText}
					onCommit={(next) => {
						commitBulkOrSingle(active.rowIndex, active.colKey, next);
						overlayClose();
					}}
					onCommitPatch={(patch) => {
						shell.commitCellPatch(active.rowIndex, patch);
						overlayClose();
					}}
					onSubmitDraftRow={shell.submitDraftRow}
					onInvalidateData={shell.invalidateData}
					onCancel={overlayClose}
					overlay={{ maxHeight: geom.maxHeight, flipped: geom.shouldFlip }}
				/>
			),
		};
	})();

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

	// Sort caret state mirror (the shell owns it via useGridState). The shell's onHeaderClicked is
	// the sort toggle keyed by colIndex (the draft-action column is excluded as non-sortable); the
	// DOM header speaks colKey, so map back to the colIndex it expects via columnKeys.
	const sorting = shell.sorting;
	const onHeaderClicked = shell.onHeaderClicked;
	const columnKeys = shell.columnKeys;
	// Header click routes through the ONE pipeline as `header.sortToggle`; the command body calls
	// ctx.sortToggle(colKey), which maps the colKey back to the colIndex onHeaderClicked expects.
	const onHeaderClick = useCallback((colKey: string) => dispatch('header.sortToggle', undefined, { colKey }), [dispatch]);

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
		sortToggle: (colKey) => onHeaderClicked(columnKeys.indexOf(colKey)),
		toggleRow: toggleRowImpl,
		toggleAll: toggleAllImpl,
		getCellsInRange: (rect: SelectionRect): CellMatrix => {
			const r = extractCellsInRange(rect, combinedRowsRef.current, columnsRef.current.map((c) => c.key));
			return { cols: r.cols, rows: r.rows, values: r.values };
		},
		toTSV: (values) => serializeTSV(values),
		emit,
	} satisfies GridCommandContext;

	// ============== LOAD STATES ==============
	// Surface real error/empty/loading states instead of a blank grid (moved here from
	// the removed canvas branch). The full-screen error is for INITIAL-load failure only
	// (no server rows AND no drafts); background-refetch errors keep the populated grid
	// mounted (keepPreviousData) and surface via the `load:error` onEvent emission instead.
	if (s.dataError && shell.combinedRows.length === 0) {
		const retry = () => s.refetch();
		if (slots?.error) {
			return <>{slots.error({ error: s.dataError, retry })}</>;
		}
		return <SheetsErrorState error={s.dataError} onRetry={retry} />;
	}

	// Initial load only — keepPreviousData means refetches won't trip this.
	if (s.isInitialLoading) {
		if (slots?.loading) return <>{slots.loading}</>;
		return <SheetsLoadingState />;
	}

	// Loaded successfully but no server rows and nothing drafted yet (and no active filter).
	if (s.isEmpty) {
		if (slots?.empty) {
			return <>{typeof slots.empty === 'function' ? slots.empty({ tableName }) : slots.empty}</>;
		}
		return (
			<SheetsEmptyState
				tableName={tableName}
				onAddRow={() => {
					void s.draft.appendRow();
				}}
			/>
		);
	}

	// Filtered-empty: the server returned 0 rows while a filter is active (so `isEmpty` above is
	// false — it requires no filter). Without this the body renders blank under the header and looks
	// broken; instead we keep the toolbar/filter bar mounted and overlay a "No matching rows" panel
	// with a one-click clear back to the unfiltered set.
	const activeFilterCount = shell.filterTree ? countConditions(shell.filterTree) : 0;
	const isFilteredEmpty = shell.serverRowCount === 0 && shell.draftRowCount === 0 && activeFilterCount > 0;

	return (
		<SheetsErrorBoundary onError={config.onError}>
			{/* Controls — consumer toolbar slot replaces the default <SheetsControls> block. */}
			<div data-part-id='sheets-controls-container'>
				{slots?.toolbar ? (
					<>{typeof slots.toolbar === 'function' ? slots.toolbar({ tableName }) : slots.toolbar}</>
				) : (
					<SheetsControls
						filterTree={shell.filterTree}
						setFilterTree={shell.setFilterTree}
						filtersOpen={shell.filtersOpen}
						setFiltersOpen={shell.setFiltersOpen}
						clearAllFilters={shell.clearAllFilters}
						applyFilters={shell.applyFilters}
						columnKeys={shell.columnKeys}
						fieldTypeMap={shell.fieldTypeMap}
						showSelection={showSelection}
						gridSelection={s.selection.gridSelection ?? null}
						setGridSelection={shell.setGridSelectionForControls}
						deleteSelected={s.draft.deleteSelected}
						onAddRow={handleAddRow}
						onExport={handleExport}
					/>
				)}
			</div>

			<div
				data-part-id='sheets-container'
				role='region'
				aria-label={`${tableName} table`}
				className={cn('bg-background relative isolate h-full min-h-0 flex-1 overflow-hidden rounded-lg border', className)}
			>
				<GridViewport
					table={table}
					renderCell={renderCell}
					handleRef={viewportRef}
					onScroll={handleOverlayScroll}
					sorting={sorting}
					onHeaderClick={onHeaderClick}
					onResize={resizeColumn}
					onVisibleRangeChange={infiniteScroll ? onVisibleRangeChange : undefined}
					rowMarker={showSelection ? rowMarker : undefined}
					activeCell={activeCell}
					activeRange={s.selection.gridSelection?.current?.range}
					onGridKeyDown={handleGridKeyDown}
					onCopy={handleCopy}
					onCut={handleCut}
					onPaste={handlePaste}
					onFillDrag={handleFillDrag}
					activeDescendantId={activeCell ? `sheets-cell-${activeCell[1]}-${activeCell[0]}` : undefined}
				/>

				{/* Filtered-empty panel — overlays the empty body while the filter bar stays visible above. */}
				{isFilteredEmpty && (
					<div className='bg-background/80 absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center'>
						<RiSearchEyeLine className='text-muted-foreground h-8 w-8' />
						<div className='space-y-1'>
							<p className='text-foreground text-sm font-medium'>No matching rows</p>
							<p className='text-muted-foreground max-w-md text-sm'>
								No rows match the active {activeFilterCount === 1 ? 'filter' : 'filters'}.
							</p>
						</div>
						<Button variant='outline' size='sm' onClick={shell.clearAllFilters}>
							<RiFilterOffLine className='h-4 w-4' />
							<span className='ms-1'>Clear filters</span>
						</Button>
					</div>
				)}

				{/* Floating status indicator — surfaces save/delete/submit feedback from the FeedbackProvider. */}
				<div className='pointer-events-none absolute bottom-4 left-1/2 z-10 -translate-x-1/2'>
					<FloatingStatus />
				</div>
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
				{editorNode?.element}
			</OverlayManager>

			{/* Right-click context menu — items dispatch through the SAME pipeline as keys/clicks
			    (clipboard.* with no native event take the navigator.clipboard fallback). Rendered once. */}
			<SheetsContextMenu
				state={contextMenu}
				onClose={closeContextMenu}
				onAction={(commandId) => dispatch(commandId)}
				isEnabled={isCommandEnabled}
				onAddRow={handleAddRow}
				onDeleteRows={s.draft.deleteSelected}
				selectedRowCount={selection?.rows.length ?? 0}
			/>
		</SheetsErrorBoundary>
	);
}

// Public props alias — generic over the consumer's row type (default SheetsRow keeps
// existing untyped callers compiling). Carries DataGridProps' TRow through.
export type SheetsProps<TRow extends SheetsRow = SheetsRow> = DataGridProps<TRow>;

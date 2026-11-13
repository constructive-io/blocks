// Cell editing in the DOM grid: the overlay (portal) and inline editors, their activation
// by the single edit-intent resolver, the range-aware commit, and following the edited
// cell while the grid scrolls. Churning values are latched into refs so the callbacks the
// cell host memo-gates on stay referentially stable.
import { useCallback, useEffect, useRef } from 'react';

import type { SheetsConfig, SheetsScopeKey } from '../../context/sheets-context';
import type { Dispatch } from '../../commands/dispatch';
import { nextToggleValue } from '../../cell-types/column-value';
import { resolveEditIntent } from '../../grid-dom/editors/edit-intent';
import { ImageEditorDom } from '../../grid-dom/editors/image-editor';
import { useDateEditorPreload } from '../../grid-dom/editors/use-date-editor-preload';
import { useOverlayController } from '../../grid-dom/overlay/use-overlay-controller';
import type { OpenEditor } from '../../grid-dom/sheets-cell-host';
import { bulkEditWrites } from '../../selection/fill';
import type { SheetsSelection } from '../../selection/selection-model';
import type { SheetsColumnDescriptor } from '../../table/use-sheets-table-instance';
import { getDraftMeta, type SheetsRow } from '../row-model';
import type { SheetsShellBindings } from '../use-sheets';
import { reportReadOnlyCell } from '../write-feedback';

export interface UseGridEditingInput {
	tableName: string;
	shell: SheetsShellBindings;
	config: SheetsConfig;
	canUpload: boolean;
	scopeKey: SheetsScopeKey;
	combinedRows: SheetsRow[];
	selection: SheetsSelection | undefined;
	columns: SheetsColumnDescriptor[];
	dispatch: Dispatch;
}

export function useGridEditing({ tableName, shell, config, canUpload, scopeKey, combinedRows, selection, columns, dispatch }: UseGridEditingInput) {
	// ============== NATIVE OVERLAY EDITING (Phase 4, additive) ==============
	// Open/close state for the native React-portal overlay editor. The host measures
	// the activated cell's rect (only it knows the cell DOM node) and calls openEditor.
	const overlay = useOverlayController();
	const overlayOpen = overlay.open;
	const overlayClose = overlay.close;
	const overlayReanchor = overlay.reanchor;
	const mediaDraft = overlay.active?.mediaDraft;
	const activeMediaDraft = canUpload && mediaDraft?.scopeKey === scopeKey && mediaDraft?.tableName === tableName
		? mediaDraft
		: undefined;
	useEffect(() => {
		if (mediaDraft && !activeMediaDraft) overlayClose();
	}, [mediaDraft, activeMediaDraft, overlayClose]);

	// Inject the shell's native content resolver into the cell host (Phase 3): the
	// host renders the consumer component when registered, else the kind→view map.
	// openEditor is threaded so the cell wrapper can activate the overlay editor;
	// submitDraftRow is threaded so the draft-action cell's Button can submit (Stage 4).
	const getSheetsCellContent = shell.getSheetsCellContent;
	const submitDraftRow = shell.submitDraftRow;
	const commitCellValue = shell.commitCellValue;
	const getEditorComponent = shell.cellRegistry.getEditorComponent;
	// Load the date editor's code in idle time once rows show, when a column opens it.
	useDateEditorPreload({
		table: shell.tableModel,
		typeOverrides: config.fieldTypeOverrides,
		hasRows: combinedRows.length > 0,
		getEditorComponent,
	});
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
			if (intent.mode === 'none') {
				// A cell that cannot be changed says why, instead of silently ignoring the attempt.
				if (resolution.readOnlyReason) reportReadOnlyCell(colKey, resolution.readOnlyReason);
				return;
			}
			if (intent.mode === 'inline-toggle') {
				const current = (combinedRowsRef.current[rowIndex] as Record<string, unknown> | undefined)?.[colKey];
				commitCellValueRef.current(rowIndex, colKey, nextToggleValue(current));
				return;
			}
			// inline-edit (simple text/number): edit IN PLACE — same active-cell controller (so nav/
			// clipboard suppression + scroll commit-on-unmount are shared) but the cell host renders
			// the input and the portal is skipped (editorNode is null for a non-overlay intent).
			if (intent.mode === 'inline-edit') {
				overlayOpen({ rowIndex, colKey, anchorRect, initialText, mode: 'inline' });
				return;
			}
			const row = combinedRowsRef.current[rowIndex];
			const draft = intent.editor === ImageEditorDom ? getDraftMeta(row) : undefined;
			overlayOpen({
				rowIndex,
				colKey,
				anchorRect,
				initialText,
				mode: 'overlay',
				mediaDraft: draft ? {
					rowId: draft.draftRowId,
					tableName,
					scopeKey,
					value: row[colKey],
					resolution,
				} : undefined,
			});
		},
		[overlayOpen, tableName, scopeKey],
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
		if (a.mediaDraft && getDraftMeta(combinedRowsRef.current[a.rowIndex])?.draftRowId !== a.mediaDraft.rowId) return;
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

	return {
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
	};
}

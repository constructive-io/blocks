/**
 * DEFAULT_COMMANDS + createGridCommandRegistry (P4 Phase 1).
 *
 * Each command body is LIFTED VERBATIM from grid/sheets.tsx's handleGridKeyDown /
 * handleActivateCell / openEditor / openEditorAtActiveCell branches — same dispatcher
 * calls, same anchor resets, same clamp/scroll order. The handler's local guards
 * (`if (rows === 0 || colCount === 0) return`) are preserved as `canRun` where the
 * original returned WITHOUT preventing default, and inline where the original DID
 * prevent default first (Ctrl+A / arrows / nav: the original called preventDefault()
 * before the empty-grid early return, so the no-op must still preventDefault — that is
 * the core's job once the command resolves, and the body simply returns early).
 *
 * Phase 1 is a refactor: these bodies call `ctx.<dispatcher>` (the existing stable fns).
 */

import { computeKeyNavTarget, emptySheetsSelection, selectAllCells } from '../selection/selection-model';
import type { SelectionRect } from '../selection/selection-model';
import { parseTSV, tileMatrix } from '../selection/tsv';
import { fillDownWrites, fillRightWrites, extendedFillRect, fillDragWrites } from '../selection/fill';
import type { CellWrite } from '../grid/hooks/use-batch-commit';
import type { GridCommand, GridCommandRegistry } from './types';
import type { GridCommandContext, CellMatrix } from './context';

/** Payload for `cell.activate` / `cell.extendToClicked` (pointer). */
export interface CellPointerPayload {
	col: number;
	row: number;
}

/** Payload for `editor.open` (dblclick). */
export interface EditorOpenPayload {
	rowIndex: number;
	colKey: string;
	anchorRect: DOMRect;
	initialText?: string;
}

/** Payload for `editor.typeToEdit` (printable key sentinel). */
export interface TypeToEditPayload {
	char: string;
}

/** Payload for `cell.navAbsolute` (Tab/Home/End/PageUp/PageDown). */
export interface NavAbsolutePayload {
	key: string;
	ctrlOrMeta: boolean;
	shift: boolean;
	/** Visible page span (rows); the funnel derives this from the scroll element clientHeight. */
	pageRows: number;
}

/** Payload for `header.sortToggle`. */
export interface SortTogglePayload {
	colKey: string;
}

/** Payload for `rowmarker.toggleRow`. */
export interface ToggleRowPayload {
	rowIndex: number;
	shift: boolean;
}

/** Payload for `fill.drag` (fill-handle nub release). `from` = source band, `to` = `[col,row]` under the pointer. */
export interface FillDragPayload {
	from: SelectionRect;
	to: [number, number];
}

/**
 * The minimal `DataTransfer` slice the clipboard commands read/write — `ClipboardEvent.clipboardData`
 * conforms (so does a test stub). Kept narrow so the command never depends on the full DOM type.
 */
export interface ClipboardLike {
	getData(format: string): string;
	setData(format: string, data: string): void;
}

/** Payload for `clipboard.copy` / `clipboard.cut` / `clipboard.paste` (native clipboard event). */
export interface ClipboardPayload {
	clipboard: ClipboardLike | null;
}

/** Shared empty-grid guard (the original `rows === 0 || colCount === 0` short-circuit). */
function gridNonEmpty(ctx: GridCommandContext): boolean {
	return ctx.rowCount > 0 && ctx.colCount > 0;
}

/**
 * The cell range the clipboard commands act on: the active selection range when present,
 * else a 1×1 rect at the active cell. `null` when there is no active cell (empty grid /
 * no cursor) — the copy/cut/paste `canRun` guards return false on null.
 */
function clipboardRange(ctx: GridCommandContext): SelectionRect | null {
	const range = ctx.selection?.current?.range;
	if (range) return range;
	const cell = ctx.activeCell;
	if (!cell) return null;
	return { x: cell[0], y: cell[1], width: 1, height: 1 };
}

/** Build a `null` write for every cell in `rect` (clamped to the column keys). */
function clearRangeWrites(rect: SelectionRect, columnKeys: readonly string[]): CellWrite[] {
	const writes: CellWrite[] = [];
	for (let r = 0; r < rect.height; r++) {
		for (let c = 0; c < rect.width; c++) {
			const colKey = columnKeys[rect.x + c];
			if (colKey == null) continue;
			writes.push({ rowIndex: rect.y + r, colKey, value: null });
		}
	}
	return writes;
}

/** True when the async `navigator.clipboard` API is reachable (secure context, browser). */
function navigatorClipboard(): Clipboard | null {
	return typeof navigator !== 'undefined' && navigator.clipboard ? navigator.clipboard : null;
}

/** The `null` writes that clear every cell of a copied/cut matrix (cut's source clear). */
function cutRangeWrites(matrix: CellMatrix): CellWrite[] {
	const writes: CellWrite[] = [];
	for (let r = 0; r < matrix.rows.length; r++) {
		for (let c = 0; c < matrix.cols.length; c++) {
			const colKey = matrix.cols[c];
			if (colKey == null) continue;
			writes.push({ rowIndex: matrix.rows[r], colKey, value: null });
		}
	}
	return writes;
}

/**
 * Tile a parsed TSV `source` onto the target and build the clamped writes — the shared body
 * of both paste paths (native event + navigator fallback). `anchor` is the active cell's
 * top-left; `range` (when present + larger than the source) drives tiling.
 */
function pasteWrites(ctx: GridCommandContext, anchor: readonly [number, number], text: string): CellWrite[] {
	const source = parseTSV(text);
	const range = ctx.selection?.current?.range;
	const targetW = range ? range.width : source[0]?.length ?? 0;
	const targetH = range ? range.height : source.length;
	const matrix = tileMatrix(source, targetW, targetH);

	const [anchorCol, anchorRow] = anchor;
	const writes: CellWrite[] = [];
	for (let r = 0; r < matrix.length; r++) {
		const rowIndex = anchorRow + r;
		if (rowIndex >= ctx.rowCount) break; // clamp to grid bottom
		const line = matrix[r];
		for (let c = 0; c < line.length; c++) {
			const colIndex = anchorCol + c;
			if (colIndex >= ctx.colCount) break; // clamp to grid right
			const colKey = ctx.columnKeys[colIndex];
			if (colKey == null) continue;
			writes.push({ rowIndex, colKey, value: line[c] });
		}
	}
	return writes;
}

/**
 * The default command set. Authored as plain objects (no classes). Frozen array so the
 * registry factory can clone it; consumer overrides replace by id (Phase 2 seam).
 */
export const DEFAULT_COMMANDS: GridCommand[] = [
	// ---- UNDO / REDO (lifted: handleGridKeyDown undo/redo branch) ----
	{
		id: 'edit.undo',
		run: (ctx) => {
			void ctx.undo();
		},
	},
	{
		id: 'edit.redo',
		run: (ctx) => {
			void ctx.redo();
		},
	},

	// ---- SELECT ALL (lifted: Ctrl/Cmd+A branch) ----
	{
		id: 'selection.all',
		canRun: gridNonEmpty,
		run: (ctx) => {
			ctx.setAnchor([0, 0]);
			ctx.setSelection(selectAllCells(ctx.selection ?? emptySheetsSelection, ctx.colCount, ctx.rowCount));
		},
	},

	// ---- CLIPBOARD COPY (serialize range → TSV → clipboard) ----
	// Serializes the active range (or the 1×1 active cell) to TSV. TWO paths:
	//   • NATIVE: `payload.clipboard` is the `copy` event's DataTransfer — write it synchronously.
	//     preventDefault happens in the dispatch CORE (so the browser does not ALSO copy its own —
	//     empty — selection).
	//   • MENU/PROGRAMMATIC: no DataTransfer (the context menu has no native event) — fall back to
	//     the async `navigator.clipboard.writeText` (rejection caught → no-op; secure-context gated).
	// canRun gates on an active cell/range existing.
	{
		id: 'clipboard.copy',
		canRun: (ctx) => clipboardRange(ctx) !== null,
		run: (ctx, payload) => {
			const range = clipboardRange(ctx);
			if (!range) return;
			const tsv = ctx.toTSV(ctx.getCellsInRange(range).values);
			const clipboard = (payload as ClipboardPayload | undefined)?.clipboard;
			if (clipboard) {
				clipboard.setData('text/plain', tsv);
				return;
			}
			const nav = navigatorClipboard();
			if (nav) return nav.writeText(tsv).catch(() => {});
		},
	},

	// ---- CLIPBOARD CUT (copy serialize + clear the source range) ----
	// Runs the copy serialize (native DataTransfer or navigator fallback, same branch as copy),
	// then commits `null` across every cell of the source range as ONE undo-aware batch
	// (commitCells skips readonly/UUID cells internally). Same range source.
	{
		id: 'clipboard.cut',
		canRun: (ctx) => clipboardRange(ctx) !== null,
		run: (ctx, payload) => {
			const range = clipboardRange(ctx);
			if (!range) return;
			const matrix = ctx.getCellsInRange(range);
			const tsv = ctx.toTSV(matrix.values);
			const writes = cutRangeWrites(matrix);
			const clipboard = (payload as ClipboardPayload | undefined)?.clipboard;
			if (clipboard) {
				clipboard.setData('text/plain', tsv);
				void ctx.commitCells(writes);
				return;
			}
			const nav = navigatorClipboard();
			if (!nav) return;
			// Clear only once the write resolves so a clipboard rejection leaves the source intact.
			return nav.writeText(tsv).then(() => {
				void ctx.commitCells(writes);
			}).catch(() => {});
		},
	},

	// ---- CLIPBOARD PASTE (parse TSV → tile → commitCells) ----
	// Parses the clipboard TSV, TILES it onto the target (a 1×N / N×1 source repeats to fill a
	// larger selection range; a 2-D block writes from the anchor as-is), clamps to grid bounds, and
	// commits ONE batch (single optimistic patch + coalesced per-row mutations + ONE undo entry).
	// commitCells skips readonly/UUID cells. The anchor is the active cell's top-left. TWO paths:
	//   • NATIVE: `payload.clipboard` is the `paste` event's DataTransfer — read it synchronously.
	//   • MENU/PROGRAMMATIC: no DataTransfer — fall back to async `navigator.clipboard.readText`
	//     (rejection caught → no-op; secure-context gated).
	{
		id: 'clipboard.paste',
		canRun: (ctx) => ctx.activeCell != null,
		run: (ctx, payload) => {
			const anchor = ctx.activeCell;
			if (!anchor) return;
			const clipboard = (payload as ClipboardPayload | undefined)?.clipboard;
			if (clipboard) {
				const text = clipboard.getData('text/plain');
				if (!text) return;
				const writes = pasteWrites(ctx, anchor, text);
				if (writes.length) void ctx.commitCells(writes);
				return;
			}
			const nav = navigatorClipboard();
			if (!nav) return;
			return nav.readText().then((text) => {
				if (!text) return;
				const writes = pasteWrites(ctx, anchor, text);
				if (writes.length) void ctx.commitCells(writes);
			}).catch(() => {});
		},
	},

	// ---- CELL CLEAR (Delete / Backspace: write null over the active range) ----
	// range = the active selection range, else a 1×1 rect at the active cell. Builds a
	// {rowIndex, colKey, value: null} write for every cell in the rect and commits ONE
	// undo-aware batch (commitCells skips readonly/UUID internally; non-nullable columns
	// reject server-side and the optimistic patch reverts — null is the DB-clear default).
	// canRun gates on an active cell/range existing.
	{
		id: 'cell.clear',
		canRun: (ctx) => clipboardRange(ctx) !== null,
		run: (ctx) => {
			const range = clipboardRange(ctx);
			if (!range) return;
			const writes = clearRangeWrites(range, ctx.columnKeys);
			if (writes.length) void ctx.commitCells(writes);
		},
	},

	// ---- FILL DOWN (Mod+D: replicate the TOP row of the range downward) ----
	// SOURCE = the range's top row; every lower row in the range gets the seed value of the
	// column above it. ONE undo-aware batch via commitCells (readonly/UUID skipped internally).
	// SCOPE: value replication only — numeric/date SERIES detection is DEFERRED.
	{
		id: 'fill.down',
		canRun: (ctx) => {
			const range = ctx.selection?.current?.range;
			return !!range && range.height > 1;
		},
		run: (ctx) => {
			const range = ctx.selection?.current?.range;
			if (!range) return;
			const writes = fillDownWrites(range, ctx.combinedRows, ctx.columnKeys);
			if (writes.length) void ctx.commitCells(writes);
		},
	},

	// ---- FILL RIGHT (Mod+R: replicate the LEFT column of the range rightward) ----
	// SOURCE = the range's left column; every column to its right gets that row's left-column
	// seed. ONE undo-aware batch. SCOPE: value replication only — SERIES detection DEFERRED.
	{
		id: 'fill.right',
		canRun: (ctx) => {
			const range = ctx.selection?.current?.range;
			return !!range && range.width > 1;
		},
		run: (ctx) => {
			const range = ctx.selection?.current?.range;
			if (!range) return;
			const writes = fillRightWrites(range, ctx.combinedRows, ctx.columnKeys);
			if (writes.length) void ctx.commitCells(writes);
		},
	},

	// ---- FILL DRAG (fill-handle nub release: extend `from` toward `to`, tile the source) ----
	// The pointer-driven analogue of fill.down/right: extend the SOURCE band toward the dropped
	// cell along the dominant axis, REPLICATE the band across the new cells (one undo-aware batch),
	// then WIDEN the selection to the extended rect so the band grows to match. canRun gates on a
	// payload (from + to) being present. SCOPE: value replication only — SERIES detection DEFERRED.
	{
		id: 'fill.drag',
		canRun: (_ctx, payload) => {
			const p = payload as FillDragPayload | undefined;
			return !!p && !!p.from && !!p.to;
		},
		run: (ctx, payload) => {
			const { from, to } = payload as FillDragPayload;
			const extended = extendedFillRect(from, to);
			// Target inside the source band — nothing to extend.
			if (extended.width === from.width && extended.height === from.height && extended.x === from.x && extended.y === from.y)
				return;
			const writes = fillDragWrites(from, extended, ctx.combinedRows, ctx.columnKeys);
			if (writes.length) void ctx.commitCells(writes);
			// Grow the band: active cell parks on the far corner, range becomes the extended rect.
			const base = ctx.selection ?? emptySheetsSelection;
			ctx.setSelection({
				...base,
				current: {
					cell: [extended.x + extended.width - 1, extended.y + extended.height - 1],
					range: extended,
				},
			});
		},
	},

	// ---- ARROW MOVE (plain arrow: setAnchor + moveActiveCell + scroll) ----
	// Each direction is its own named command; the funnel resolves the arrow key to it.
	makeMoveCommand('cell.moveUp', 0, -1),
	makeMoveCommand('cell.moveDown', 0, 1),
	makeMoveCommand('cell.moveLeft', -1, 0),
	makeMoveCommand('cell.moveRight', 1, 0),

	// ---- ARROW EXTEND (shift+arrow: extendToCell + scroll) ----
	makeExtendCommand('cell.extendUp', 0, -1),
	makeExtendCommand('cell.extendDown', 0, 1),
	makeExtendCommand('cell.extendLeft', -1, 0),
	makeExtendCommand('cell.extendRight', 1, 0),

	// ---- ABSOLUTE NAV (Tab/Home/End/PageUp/PageDown: computeKeyNavTarget) ----
	{
		id: 'cell.navAbsolute',
		canRun: gridNonEmpty,
		run: (ctx, payload) => {
			const p = payload as NavAbsolutePayload;
			const base = ctx.selection?.current?.cell ?? [0, 0];
			const target = computeKeyNavTarget(
				p.key,
				{ ctrlOrMeta: p.ctrlOrMeta, shift: p.shift },
				base,
				ctx.colCount,
				ctx.rowCount,
				p.pageRows,
			);
			if (!target) return;
			// Absolute moves are plain activates — reset the range anchor to the landing cell.
			ctx.setAnchor([target[0], target[1]]);
			ctx.setActiveCell(target[0], target[1]);
			ctx.scrollToCell(target[0], target[1]);
		},
	},

	// ---- OPEN EDITOR AT ACTIVE (Enter / F2) ----
	{
		id: 'editor.openActive',
		// Mirrors the original `if (openEditorAtActiveCell()) e.preventDefault()`: only
		// prevent default when an overlay actually opened. canRun probes the same path.
		canRun: (ctx) => ctx.openEditorAtActive(),
		run: () => {
			// canRun already opened the editor (it returns true only when it opened) — running
			// again would double-open, so the effect lives in canRun and run is a no-op. This is
			// the verbatim "open then conditionally preventDefault" semantics, expressed through
			// the gate so a non-opening Enter falls through WITHOUT preventDefault.
		},
	},

	// ---- TYPE-TO-EDIT SENTINEL (printable key: openEditorAtActive(char)) ----
	// The LAST-RESOLVED sentinel for printable keys — it goes THROUGH dispatch (so it is
	// interceptable), NOT an out-of-band fallback. canRun opens with the seed char and gates
	// preventDefault on a real open (readonly cells return false → key falls through).
	{
		id: 'editor.typeToEdit',
		canRun: (ctx, payload) => ctx.openEditorAtActive((payload as TypeToEditPayload).char),
		run: () => {
			// effect performed in canRun (same conditional-preventDefault rationale as openActive).
		},
	},

	// ---- POINTER ACTIVATE (click: setAnchor + setActiveCell) ----
	{
		id: 'cell.activate',
		run: (ctx, payload) => {
			const { col, row } = payload as CellPointerPayload;
			ctx.setAnchor([col, row]);
			ctx.setActiveCell(col, row);
		},
	},

	// ---- POINTER SHIFT-EXTEND (shift-click: extendToCell) ----
	{
		id: 'cell.extendToClicked',
		run: (ctx, payload) => {
			const { col, row } = payload as CellPointerPayload;
			ctx.extendToCell(col, row);
		},
	},

	// ---- DBLCLICK OPEN (openEditorAt) ----
	{
		id: 'editor.open',
		run: (ctx, payload) => {
			const { rowIndex, colKey, anchorRect, initialText } = payload as EditorOpenPayload;
			ctx.openEditorAt(rowIndex, colKey, anchorRect, initialText);
		},
	},

	// ---- STRUCTURAL POINTER (routed through dispatch for invariant completeness) ----
	{
		id: 'header.sortToggle',
		run: (ctx, payload) => {
			ctx.sortToggle((payload as SortTogglePayload).colKey);
		},
	},
	{
		id: 'rowmarker.toggleRow',
		run: (ctx, payload) => {
			const { rowIndex, shift } = payload as ToggleRowPayload;
			// Delegated to the existing rowMarker.onToggleRow (anchor + selectRange/toggleRow). Phase 1
			// keeps that handler the source of truth; the command threads it so the id exists in the map.
			ctx.toggleRow(rowIndex, shift);
		},
	},
	{
		id: 'rowmarker.toggleAll',
		run: (ctx) => {
			ctx.toggleAll();
		},
	},
];

/**
 * Plain-arrow MOVE command factory (verbatim: arrow branch, non-shift path). Computes the
 * clamped target off the LATEST selection, RESETS the anchor, moves, then scrolls.
 */
function makeMoveCommand(id: string, dCol: number, dRow: number): GridCommand {
	return {
		id,
		canRun: gridNonEmpty,
		run: (ctx) => {
			const base = ctx.selection?.current?.cell ?? [0, 0];
			const nextCol = Math.max(0, Math.min(base[0] + dCol, ctx.colCount - 1));
			const nextRow = Math.max(0, Math.min(base[1] + dRow, ctx.rowCount - 1));
			ctx.setAnchor([nextCol, nextRow]);
			ctx.moveActiveCell(dCol, dRow, ctx.colCount, ctx.rowCount);
			ctx.scrollToCell(nextCol, nextRow);
		},
	};
}

/**
 * Shift-arrow EXTEND command factory (verbatim: arrow branch, shift path). Extends the
 * range from the FIXED anchor to the clamped target, then scrolls the target into view.
 */
function makeExtendCommand(id: string, dCol: number, dRow: number): GridCommand {
	return {
		id,
		canRun: gridNonEmpty,
		run: (ctx) => {
			const base = ctx.selection?.current?.cell ?? [0, 0];
			const nextCol = Math.max(0, Math.min(base[0] + dCol, ctx.colCount - 1));
			const nextRow = Math.max(0, Math.min(base[1] + dRow, ctx.rowCount - 1));
			ctx.extendToCell(nextCol, nextRow);
			ctx.scrollToCell(nextCol, nextRow);
		},
	};
}

/**
 * Build a command registry: DEFAULT_COMMANDS, with optional consumer overrides folded in
 * LAST so a matching id REPLACES the default and a new id ADDS a command (Phase 2 seam).
 */
export function createGridCommandRegistry(overrides?: GridCommand[]): GridCommandRegistry {
	const registry: GridCommandRegistry = new Map();
	for (const cmd of DEFAULT_COMMANDS) registry.set(cmd.id, cmd);
	if (overrides) {
		for (const cmd of overrides) registry.set(cmd.id, cmd);
	}
	return registry;
}

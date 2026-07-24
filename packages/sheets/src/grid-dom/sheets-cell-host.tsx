// The DOM cell host — the `getCellContent` → React port. Given a v9 cell it asks
// the injected resolver for the {@link SheetsCellResolution} ({ cell, component? })
// and renders the consumer component when present, else dispatches on the neutral
// `kind` to the matching built-in view (cell-model/views/*).
//
// Phase 3 replaces the Phase-1 value→kind STOPGAP (`deriveSheetsCell`) with
// registry-driven resolution: the host no longer guesses a kind from the JS value
// — `getSheetsCellContent(rowIndex, colKey)` runs the full `createCellContent` →
// `toSheetsCell` routing and (when the consumer registered a `cellComponent` for
// the resolved typeKey) hands back the component to render instead of a built-in
// view. SheetsDomInner injects the resolver via the `renderCell` closure.
//
// The kind→view map covers every native SheetsCellKind. datetime/interval cells
// carry kind 'text' (formatted text in v1), so they route through TextCellView
// alongside the grid-internal kinds (loading/draft-action/custom); their dedicated
// DateTimeCellView/IntervalCellView stay exported for per-typeKey use later.
// Dependency-light: local `cn` only, NO @constructive-io/ui.
import { memo, useCallback, useRef } from 'react';
import type React from 'react';
import type { Cell } from '@tanstack/react-table';

import { cn } from '../utils/cn';
import { getDraftMeta, type SheetsRow } from '../grid/row-model';
import { DRAFT_ACTION_COLUMN_KEY } from '../grid/sheets.constants';
import type { SheetsTableFeatures } from '../table/features';
import type { RenderCellContext } from '../table/grid-viewport';
import type { CellProps } from '../cell-model/cell-props';
import { BadgesCellView } from '../cell-model/views/badges-view';
import { BooleanCellView } from '../cell-model/views/boolean-view';
import { DraftActionCellView, type DraftActionStatus } from '../cell-model/views/draft-action-view';
import { GeometryCellView } from '../cell-model/views/geometry-view';
import { ImageCellView } from '../cell-model/views/image-view';
import { LoadingCellView } from '../cell-model/views/loading-view';
import { NumberCellView } from '../cell-model/views/number-view';
import { RelationCellView } from '../cell-model/views/relation-view';
import { TextCellView } from '../cell-model/views/text-view';
import { UriCellView } from '../cell-model/views/uri-view';
import { InlineCellEditor } from './inline-cell-editor';
import type { SheetsCellResolution } from './use-sheets-content';

type SheetsTableCell = Cell<SheetsTableFeatures, SheetsRow, unknown>;

/** Native DOM content resolver injected by the shell — mirrors `getCellContent`. */
export type GetSheetsCellContent = (rowIndex: number, colKey: string) => SheetsCellResolution;

/**
 * Open the native overlay editor for a cell. Threaded from `SheetsDomInner` through
 * `renderCell` so only the host knows the cell's DOM node (it measures the anchor
 * rect off `getBoundingClientRect`). Phase-4 additive — the canvas path is untouched.
 */
export type OpenEditor = (rowIndex: number, colKey: string, anchorRect: DOMRect, initialText?: string) => void;

/**
 * Submit a client-side draft row by its draft id. Threaded from `SheetsDomInner` (the
 * shell's `submitDraftRow`) so the draft-action cell's REAL `<Button>` can wire its
 * onClick. Phase-7 Stage-4 consumes it; Stage-2 only plumbs it through.
 */
export type SubmitDraftRow = (draftRowId: string) => Promise<unknown>;

// COMPLETE kind→view map. `loading` routes to its skeleton view; `draft-action` is
// special-cased UPSTREAM (rendered as DraftActionCellView with explicit props, never
// reaching here), so it — like `custom`/`text` — falls back to TextCellView if it ever does.
function renderKindView(props: CellProps) {
	switch (props.cell.kind) {
		case 'number':
			return <NumberCellView {...props} />;
		case 'boolean':
			return <BooleanCellView {...props} />;
		case 'badges':
			return <BadgesCellView {...props} />;
		case 'uri':
			return <UriCellView {...props} />;
		case 'image':
			return <ImageCellView {...props} />;
		case 'geometry':
			return <GeometryCellView {...props} />;
		case 'relation':
			return <RelationCellView {...props} />;
		case 'loading':
			return <LoadingCellView {...props} />;
		case 'text':
		case 'draft-action':
		case 'custom':
		default:
			return <TextCellView {...props} />;
	}
}

/** Explicit draft-action descriptor for a draft row, derived from its DraftMeta. */
interface DraftActionInfo {
	draftRowId: string;
	status: DraftActionStatus;
	errored: boolean;
	disabled: boolean;
}

/**
 * Derive the draft-action cell's props from a row's draft metadata — the DOM analogue
 * of the canvas draft-action-cell reading the draft slice. `errored`/`disabled` mirror
 * the canvas: an error status surfaces the red dot but keeps the button live (the canvas
 * painter never disabled on error); `saving` disables (DraftActionCellView also self-locks).
 */
function deriveDraftActionInfo(row: SheetsRow | undefined): DraftActionInfo | null {
	const meta = getDraftMeta(row);
	if (!meta) return null;
	const status: DraftActionStatus = meta.status;
	return { draftRowId: meta.draftRowId, status, errored: status === 'error', disabled: status === 'saving' };
}

interface SheetsCellHostInnerProps {
	resolution: SheetsCellResolution;
	rowId: string;
	colKey: string;
	rowIndex: number;
	columnIndex: number;
	value: unknown;
	isEditing: boolean;
	/** True when this is the active (keyboard cursor) cell — drives the focus ring + aria-selected + id. */
	isActive: boolean;
	/** Open the overlay editor for this cell; undefined on render paths without editing (e.g. tests). */
	openEditor?: OpenEditor;
	/** Type-to-edit seed for the inline editor (only meaningful when `isEditing`). */
	inlineInitialText?: string;
	/** Commit an inline (in-cell) edit. Set on the inline-edit render path; reuses the host's
	 * value-commit pipeline (bulk-or-single). */
	onInlineCommit?: (rowIndex: number, colKey: string, value: unknown) => void;
	/** Cancel an inline (in-cell) edit — discards and closes. */
	onInlineCancel?: () => void;
	/** Park the active cell on this cell (click-to-activate). `shiftKey` extends the range from the
	 * anchor instead of resetting it. Undefined on render paths without nav. */
	onActivateCell?: (col: number, row: number, shiftKey?: boolean) => void;
	/** Right-click this cell — opens the grid context menu anchored at the pointer. The grid first
	 * activates the cell when it is outside the current selection, so the menu acts on it. */
	onContextMenu?: (col: number, row: number, clientX: number, clientY: number) => void;
	/** Submit a draft row by id — wired to the draft-action cell's Button (Stage 4). */
	onSubmitDraftRow?: SubmitDraftRow;
	/** Draft-action descriptor when this is the draft-action column of a draft row; null otherwise. */
	draftAction?: DraftActionInfo | null;
	className?: string;
}

/** Build the full {@link CellProps} for a resolved cell. `onStartEdit` is supplied by the host. */
function toCellProps(props: SheetsCellHostInnerProps, onStartEdit: () => void): CellProps {
	const { cell } = props.resolution;
	return {
		cell,
		value: props.value,
		colKey: props.colKey,
		rowId: props.rowId,
		rowIndex: props.rowIndex,
		column: { key: props.colKey, name: props.colKey, cellType: cell.meta?.cellType ?? 'unknown' },
		isEditing: props.isEditing,
		onStartEdit,
		disabled: false,
	};
}

// Memoized on (rowId, colKey, value, isEditing, openEditor) — the DOM analogue of
// glide's `updateCells`: only the changed cell re-renders, never the whole window.
// The resolution is derived from the first four inputs, so they fully gate the
// output; openEditor is added so the wrapper's handlers stay current.
const SheetsCellHostInner = memo(
	function SheetsCellHostInner(props: SheetsCellHostInnerProps) {
		const wrapperRef = useRef<HTMLDivElement | null>(null);

		// Start editing anchored to THIS cell's DOM node — the host is the only place
		// that knows the cell's rect (read off getBoundingClientRect, viewport coords,
		// matching the OverlayManager's window.innerHeight assumption). No-op when the
		// cell is readonly or no openEditor was threaded in.
		const startEdit = useCallback(() => {
			const open = props.openEditor;
			const el = wrapperRef.current;
			if (!open || !el || props.resolution.cell.readonly) return;
			open(props.rowIndex, props.colKey, el.getBoundingClientRect());
		}, [props.openEditor, props.rowIndex, props.colKey, props.resolution.cell.readonly]);

		// Click parks the active cell here (the grid root owns keys via aria-activedescendant).
		// A shift-click EXTENDS the cell range from the latched anchor instead of resetting it.
		const onActivateCell = props.onActivateCell;
		const columnIndex = props.columnIndex;
		const cellRowIndex = props.rowIndex;
		const activate = useCallback((e: React.MouseEvent) => {
			onActivateCell?.(columnIndex, cellRowIndex, e.shiftKey);
		}, [onActivateCell, columnIndex, cellRowIndex]);

		// Right-click: open the grid context menu at the pointer. preventDefault suppresses the
		// browser menu; the grid handler activates this cell first when it is outside the selection.
		const onContextMenu = props.onContextMenu;
		const contextMenu = useCallback((e: React.MouseEvent) => {
			if (!onContextMenu) return;
			e.preventDefault();
			onContextMenu(columnIndex, cellRowIndex, e.clientX, e.clientY);
		}, [onContextMenu, columnIndex, cellRowIndex]);

		const onSubmitDraftRow = props.onSubmitDraftRow;
		const draftAction = props.draftAction;
		const submitDraft = useCallback(() => {
			if (draftAction && onSubmitDraftRow) void onSubmitDraftRow(draftAction.draftRowId);
		}, [draftAction, onSubmitDraftRow]);

		const cellProps = toCellProps(props, startEdit);
		const Component = props.resolution.component;
		const styleHint = props.resolution.cell.styleHint;
		// DOM equivalent of applyDraftDisabledStyle / applyDraftErrorStyle: a draft cell
		// fades (muted text + tinted bg); a per-cell error overrides with a red bg/text.
		const draftClasses = cn(
			styleHint?.draft && 'bg-muted/40 text-muted-foreground',
			styleHint?.error && 'bg-destructive/10 text-destructive',
		);
		// The draft-action column renders the REAL <Button> (DraftActionCellView), which
		// takes its own prop shape — bypass the kind→view map and the value/editor wiring.
		const isDraftActionCell = props.colKey === DRAFT_ACTION_COLUMN_KEY || props.resolution.cell.kind === 'draft-action';
		// Border wrapper carries the mouse activation handlers (click parks the active cell,
		// double-click opens the editor). Keys are owned by the grid root (aria-activedescendant
		// pattern), so the wrapper is NOT individually focusable. The gridcell role lives on the
		// built-in view (or the consumer component) inside, so the host adds no second role="gridcell".
		return (
			<div
				ref={wrapperRef}
				id={`sheets-cell-${props.rowIndex}-${props.columnIndex}`}
				aria-selected={props.isActive || undefined}
				onClick={activate}
				onDoubleClick={startEdit}
				onContextMenu={contextMenu}
				className={cn(
					'relative h-full w-full overflow-hidden outline-none',
					props.isActive && 'z-20 ring-2 ring-inset ring-primary',
					draftClasses,
					props.className,
				)}
			>
				{isDraftActionCell ? (
					draftAction ? (
						<DraftActionCellView
							status={draftAction.status}
							errored={draftAction.errored}
							disabled={draftAction.disabled}
							onSubmit={submitDraft}
						/>
					) : null
				) : props.isEditing ? (
					// Inline (in-cell) edit for the simple text-representable types — a bare <input>
					// overlaying the view. `isEditing` is set true ONLY for inline-edit intents (the
					// shell short-circuits inline-toggle/overlay/none before here), so the cell kind is
					// always text or number → derive the numeric variant from it.
					<InlineCellEditor
						value={props.value}
						initialText={props.inlineInitialText}
						numeric={props.resolution.cell.kind === 'number'}
						onCommit={(next) => props.onInlineCommit?.(props.rowIndex, props.colKey, next)}
						onCancel={() => props.onInlineCancel?.()}
					/>
				) : Component ? (
					<Component {...cellProps} />
				) : (
					renderKindView(cellProps)
				)}
			</div>
		);
	},
	(prev, next) =>
		prev.rowId === next.rowId &&
		prev.colKey === next.colKey &&
		prev.value === next.value &&
		prev.isEditing === next.isEditing &&
		// initialText seeds the inline editor on open; it only differs for the editing cell.
		prev.inlineInitialText === next.inlineInitialText &&
		prev.onInlineCommit === next.onInlineCommit &&
		prev.onInlineCancel === next.onInlineCancel &&
		// isActive must gate the memo or the focus ring will not move between cells.
		prev.isActive === next.isActive &&
		prev.openEditor === next.openEditor &&
		prev.onActivateCell === next.onActivateCell &&
		prev.onContextMenu === next.onContextMenu &&
		prev.onSubmitDraftRow === next.onSubmitDraftRow &&
		// styleHint.draft/error and the draft-action status can flip while `value` is
		// unchanged (validation result arrives, save in flight), so gate on them too.
		prev.resolution.cell.styleHint?.draft === next.resolution.cell.styleHint?.draft &&
		prev.resolution.cell.styleHint?.error === next.resolution.cell.styleHint?.error &&
		sameDraftAction(prev.draftAction, next.draftAction)
);

/** Draft-action equality for the memo gate — status/errored/disabled drive the Button. */
function sameDraftAction(a: DraftActionInfo | null | undefined, b: DraftActionInfo | null | undefined): boolean {
	if (a === b) return true;
	if (!a || !b) return false;
	return a.draftRowId === b.draftRowId && a.status === b.status && a.errored === b.errored && a.disabled === b.disabled;
}

export interface SheetsCellHostProps {
	cell: SheetsTableCell;
	ctx: RenderCellContext;
	getSheetsCellContent: GetSheetsCellContent;
	/** Open the overlay editor for the activated cell (double-click; grid root owns Enter / F2). */
	openEditor?: OpenEditor;
	/** True when this cell is being edited IN PLACE (inline-edit intent); renders the bare <input>. */
	isEditing?: boolean;
	/** Type-to-edit seed for the inline editor (only meaningful when `isEditing`). */
	inlineInitialText?: string;
	/** Commit an inline (in-cell) edit — reuses the host value-commit pipeline. */
	onInlineCommit?: (rowIndex: number, colKey: string, value: unknown) => void;
	/** Cancel an inline (in-cell) edit. */
	onInlineCancel?: () => void;
	/** Park the active cell on click; `shiftKey` extends the cell range from the anchor. */
	onActivateCell?: (col: number, row: number, shiftKey?: boolean) => void;
	/** Right-click → open the grid context menu anchored at the pointer. */
	onContextMenu?: (col: number, row: number, clientX: number, clientY: number) => void;
	/** Submit a draft row by id — wired to the draft-action cell's Button (Stage 4). */
	onSubmitDraftRow?: SubmitDraftRow;
	className?: string;
}

/**
 * Render a v9 cell as DOM. Wire via the {@link GridViewport} `renderCell` closure,
 * which injects the shell's resolver: `(c, ctx) => <SheetsCellHost cell={c} ctx={ctx}
 * getSheetsCellContent={getSheetsCellContent} openEditor={openEditor} />`.
 */
export function SheetsCellHost({ cell, ctx, getSheetsCellContent, openEditor, isEditing, inlineInitialText, onInlineCommit, onInlineCancel, onActivateCell, onContextMenu, onSubmitDraftRow, className }: SheetsCellHostProps) {
	const rowIndex = cell.row.index;
	const colKey = cell.column.id;
	const value = cell.getValue();
	const resolution = getSheetsCellContent(rowIndex, colKey);
	// Only the draft-action column needs the row's draft status; for every other column
	// this is null and the inner skips the Button branch. `cell.row.original` carries the
	// Symbol-keyed DraftMeta (it's the live row ref, never spread away by the table).
	const draftAction = colKey === DRAFT_ACTION_COLUMN_KEY ? deriveDraftActionInfo(cell.row.original) : null;
	return (
		<SheetsCellHostInner
			resolution={resolution}
			rowId={cell.row.id}
			colKey={colKey}
			rowIndex={rowIndex}
			columnIndex={ctx.columnIndex}
			value={value}
			isEditing={!!isEditing}
			inlineInitialText={inlineInitialText}
			onInlineCommit={onInlineCommit}
			onInlineCancel={onInlineCancel}
			isActive={ctx.isActive}
			openEditor={openEditor}
			onActivateCell={onActivateCell}
			onContextMenu={onContextMenu}
			onSubmitDraftRow={onSubmitDraftRow}
			draftAction={draftAction}
			className={className}
		/>
	);
}

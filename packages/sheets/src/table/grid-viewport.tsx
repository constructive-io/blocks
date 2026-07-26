// The DOM viewport for the TanStack port — where LAYOUT happens (the v9 table
// instance from S3 is a pure state-mirror; this is the dual-axis TanStack
// Virtual shell that paints it).
//
// VERTICAL virtualizer over rows (dynamic height via measureElement), HORIZONTAL
// virtualizer over columns. The STICKY column (left-pinned via columnPinning, or
// the first column when nothing is pinned) is painted OUTSIDE the horizontal
// virtual window — a separate `left: 0` element per row — so it stays put under
// horizontal scroll. The horizontal virtualizer still counts it (so column start
// offsets stay correct), but the item loop SKIPS the sticky index; it is never
// double-painted.
//
// A sticky HEADER band (S1) sits at the top of the scroll content, reusing the
// SAME column layout as the body (sticky-col header + the virtualized non-sticky
// headers at the identical translateX offsets). Each header carries a sort caret
// (clickable -> onHeaderClick) and a drag-resize handle on its right edge.
//
// `renderCell` is injected so S4 stays host-decoupled and testable: S5 supplies
// the real cell host. The root carries `data-impl="dom"` so tests / Chrome can
// assert the DOM path is live.
import { useImperativeHandle, useMemo, useRef } from 'react';
import type { Ref } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Cell, Column, Row, Table } from '@tanstack/react-table';

import { Checkbox } from '@constructive-io/ui/checkbox';

import { cn } from '../utils/cn';
import type { SheetsRow } from '../grid/row-model';
import type { SelectionRect } from '../selection/selection-model';
import type { SheetsTableFeatures } from './features';

/** Comfortable density default (DESIGN_SPEC §5). Drives the v-virtualizer estimate,
 *  range-band / fill-nub geometry, and hit-testing — change here propagates everywhere. */
const ESTIMATED_ROW_HEIGHT = 44;
/** Extra rows rendered above/below the visible window — fewer blank rows on fast vertical scroll. */
const ROW_OVERSCAN = 12;
/** Extra columns rendered left/right of the visible window — fewer blank cells on fast horizontal scroll. */
const COLUMN_OVERSCAN = 6;
/** Header band height (DESIGN_SPEC §5 comfortable) — slightly shorter than the body row. */
const HEADER_HEIGHT = 40;
/** Width of the optional leading row-marker (checkbox) column — glide's rowMarker analogue. */
const MARKER_WIDTH = 40;

// Row-hover tint for the PINNED (sticky) cells. The pinned column/marker sit OVER the
// horizontally-scrolled body, so their hover background must be fully OPAQUE — a translucent
// `bg-muted/50` (as used on the row itself) would let the scrolled-away cells bleed through the
// pinned column on hover. `color-mix` precomputes the SAME tint as opaque: 50% muted over the
// surface, so the pinned column matches the row exactly while staying solid. Theme-safe (the raw
// `--muted`/`--background` vars flip in dark mode). Uses raw vars, not `--color-*`, because the UI
// theme is `@theme inline` (the `--color-*` aliases aren't emitted at runtime).
const PINNED_HOVER_BG = 'group-hover:bg-[color-mix(in_oklab,var(--muted)_50%,var(--background))]';

type SheetsTable = Table<SheetsTableFeatures, SheetsRow>;
type SheetsTableCell = Cell<SheetsTableFeatures, SheetsRow, unknown>;
type SheetsTableColumn = Column<SheetsTableFeatures, SheetsRow, unknown>;

/** Sorting state mirror (the shell owns it via useGridState — `id:null` = unsorted). */
export interface GridViewportSorting {
	id: string | null;
	desc: boolean;
}

/** Per-cell layout context handed to the host alongside the v9 cell. */
export interface RenderCellContext {
	rowIndex: number;
	columnIndex: number;
	/** True for the sticky column, painted outside the h-virtual window. */
	isStickyColumn: boolean;
	/** True when this cell is the active (keyboard cursor) cell. Drives the focus ring. */
	isActive: boolean;
}

export type RenderCell = (cell: SheetsTableCell, ctx: RenderCellContext) => React.ReactNode;

/** Imperative handle for the later SheetsHandle scrollToRow path. */
export interface GridViewportHandle {
	scrollToIndex: (rowIndex: number) => void;
	/** Scroll the given cell into view (row + column virtualizers). Used by keyboard nav. */
	scrollToCell: (columnIndex: number, rowIndex: number) => void;
}

/** Visible row window (overscan-inclusive) reported to the shell for infinite-scroll prefetch. */
export interface VisibleRange {
	startIndex: number;
	endIndex: number;
}

export interface GridViewportProps {
	table: SheetsTable;
	renderCell: RenderCell;
	handleRef?: Ref<GridViewportHandle>;
	/**
	 * Fired on the scroll root's `scroll`. The DOM grid uses this to close (commit-or-
	 * dismiss) any open overlay editor: a virtualized cell anchor can unmount under
	 * scroll, so Phase-4 closes rather than re-positions against a stale rect.
	 */
	onScroll?: (e: React.UIEvent<HTMLDivElement>) => void;
	/** Sort caret state for the header. Defaults to unsorted (`{ id: null, desc: false }`). */
	sorting?: GridViewportSorting;
	/** Toggle sort for a column. The shell wires this to onHeaderClicked / toggleSorting. */
	onHeaderClick?: (colKey: string) => void;
	/**
	 * Commit a column width from the header drag-resize handle. When provided, the handle
	 * drives a manual pointer-drag against this (shell sizing lives in useGridState). When
	 * omitted, the handle falls back to the v9 `header.getResizeHandler()` (columnResizeMode
	 * 'onChange' feeds the table's own columnSizing state).
	 */
	onResize?: (colKey: string, width: number) => void;
	/**
	 * Total row count for the VERTICAL virtualizer. Defaults to the table's row-model length.
	 * Infinite scroll passes the server total here so the scrollbar spans every (lazily loaded)
	 * row — the table's `data` is the same-length proxy, so this matches `rows.length` in practice
	 * but is threaded explicitly so the shell stays the single source of truth for row count.
	 */
	count?: number;
	/**
	 * Fired (effect-free, via the row virtualizer's `onChange`) with the current overscan-inclusive
	 * visible window. The shell maps this to the canvas `onVisibleRegionChanged({ y, height })` so
	 * infinite-scroll prefetch runs identically. Omitted in paginated mode.
	 */
	onVisibleRangeChange?: (range: VisibleRange) => void;
	/**
	 * Optional leading checkbox / select-all column (glide's `rowMarkers` analogue). When supplied,
	 * a sticky MARKER column (fixed {@link MARKER_WIDTH}px) is painted to the LEFT of the sticky col0,
	 * driving the canonical {@link SheetsSelection} RangeSet. When OMITTED, the grid renders exactly as
	 * before (no marker column) so existing tests/stories that pass no rowMarker are unaffected.
	 */
	rowMarker?: RowMarker;
	/** Active (keyboard cursor) cell `[col, row]`. Drives the per-cell focus ring + aria-activedescendant. */
	activeCell?: [number, number];
	/** Active range (cell coords) — rendered as an inert pointer-events-none band overlay. P2 populates it. */
	activeRange?: SelectionRect;
	/** Keydown handler for the grid root — the shell owns spreadsheet nav (arrows / Enter / F2). */
	onGridKeyDown?: (e: React.KeyboardEvent) => void;
	/**
	 * Native clipboard handlers for the grid root. They fire only when the root (tabIndex=0) holds
	 * focus and an overlay editor is NOT open (the editor owns its own clipboard while editing). The
	 * shell routes each to the `clipboard.copy`/`cut`/`paste` command through the ONE dispatch pipeline.
	 */
	onCopy?: (e: React.ClipboardEvent) => void;
	onCut?: (e: React.ClipboardEvent) => void;
	onPaste?: (e: React.ClipboardEvent) => void;
	/** DOM id of the active cell node, mirrored to `aria-activedescendant` on the grid root. */
	activeDescendantId?: string;
	/**
	 * Fired on a fill-handle (nub) drag RELEASE when the dropped cell extends the source range.
	 * `sourceRange` is the active range (or a 1×1 rect at the active cell) the drag started from;
	 * `target` is the `[col,row]` under the pointer at release (clamped to grid bounds). The shell
	 * routes this to the `fill.drag` command. Omitted = no nub rendered.
	 */
	onFillDrag?: (sourceRange: SelectionRect, target: [number, number]) => void;
	className?: string;
}

/** Selection wiring for the leading checkbox column. The shell derives this from SheetsSelection. */
export interface RowMarker {
	/** True when row `rowIndex` is in the canonical selection. */
	isSelected: (rowIndex: number) => boolean;
	/** Toggle row `rowIndex`; `shiftKey` requests a contiguous range-select from the last anchor. */
	onToggleRow: (rowIndex: number, shiftKey: boolean) => void;
	/** Every row selected — the header checkbox shows checked. */
	allSelected: boolean;
	/** Some (but not all) rows selected — the header checkbox shows indeterminate. */
	someSelected: boolean;
	/** Select-all / clear-all from the header checkbox. */
	onToggleAll: () => void;
}

function cellForColumnIndex(row: Row<SheetsTableFeatures, SheetsRow>, columnIndex: number): SheetsTableCell {
	return row.getAllCells()[columnIndex];
}

/**
 * Project a half-open active {@link SelectionRect} (cell coords) into px box geometry for
 * the inert range-band overlay. X/width sum `columns[i].getSize()` across the spanned cols
 * (honoring the leading `markerWidth` offset); Y/height use the uniform ESTIMATED_ROW_HEIGHT.
 * INERT in P1 (nothing sets `activeRange`); wired so P2 just populates `current.range`.
 */
function rangeBandStyle(range: SelectionRect, columns: SheetsTableColumn[], markerWidth: number): React.CSSProperties {
	let left = markerWidth;
	for (let i = 0; i < range.x && i < columns.length; i++) left += columns[i].getSize();
	let width = 0;
	for (let i = range.x; i < range.x + range.width && i < columns.length; i++) width += columns[i].getSize();
	return {
		transform: `translate(${left}px, ${range.y * ESTIMATED_ROW_HEIGHT}px)`,
		width,
		height: range.height * ESTIMATED_ROW_HEIGHT
	};
}

/** Side of the square fill-handle nub (px). Centered on the source rect's bottom-right corner. */
const FILL_NUB_SIZE = 8;

/**
 * Position the fill-handle nub centered on the BOTTOM-RIGHT corner of the source {@link SelectionRect}.
 * Reuses {@link rangeBandStyle}'s left/width math (column-width sum + markerWidth) so the nub tracks
 * scroll in the SAME body coordinate space as the range band; the corner is `(left+width, top+height)`.
 */
function fillNubStyle(source: SelectionRect, columns: SheetsTableColumn[], markerWidth: number): React.CSSProperties {
	let left = markerWidth;
	for (let i = 0; i < source.x && i < columns.length; i++) left += columns[i].getSize();
	let width = 0;
	for (let i = source.x; i < source.x + source.width && i < columns.length; i++) width += columns[i].getSize();
	const right = left + width;
	const bottom = (source.y + source.height) * ESTIMATED_ROW_HEIGHT;
	return {
		transform: `translate(${right - FILL_NUB_SIZE / 2}px, ${bottom - FILL_NUB_SIZE / 2}px)`,
		width: FILL_NUB_SIZE,
		height: FILL_NUB_SIZE
	};
}

/**
 * Hit-test a client pointer position to a `[col, row]` cell index over the virtualized body.
 *
 * Converts to CONTENT space (add the scroll element's scroll offset, subtract its bounding-rect
 * origin), then: X walks the per-column widths from the leading `markerWidth` to find the column
 * whose band the pointer is over; Y subtracts the sticky `headerHeight` and floors by the uniform
 * `rowHeight`. Both axes CLAMP to `[0, count-1]` so a drag past the grid edge lands on the last
 * cell. PURE (takes the geometry, returns indices) — testable without a DOM.
 */
export function hitTestCell(
	clientX: number,
	clientY: number,
	geom: {
		rect: { left: number; top: number };
		scrollLeft: number;
		scrollTop: number;
		markerWidth: number;
		headerHeight: number;
		rowHeight: number;
		colWidths: readonly number[];
		rowCount: number;
	},
): [number, number] {
	const { rect, scrollLeft, scrollTop, markerWidth, headerHeight, rowHeight, colWidths, rowCount } = geom;
	// Column: walk widths in content space from the marker offset.
	const localX = clientX - rect.left + scrollLeft - markerWidth;
	let col = 0;
	let acc = 0;
	for (let i = 0; i < colWidths.length; i++) {
		acc += colWidths[i];
		if (localX < acc) {
			col = i;
			break;
		}
		col = i;
	}
	col = Math.max(0, Math.min(col, colWidths.length - 1));
	// Row: subtract the sticky header, floor by the uniform row height.
	const localY = clientY - rect.top + scrollTop - headerHeight;
	let row = Math.floor(localY / rowHeight);
	row = Math.max(0, Math.min(row, rowCount - 1));
	return [col, row];
}

/** Index of the left-pinned column, else the first column (sticky-by-default). */
function findStickyColumnIndex(columns: SheetsTableColumn[]): number {
	const pinned = columns.findIndex((col) => col.getIsPinned() === 'left');
	return pinned >= 0 ? pinned : columns.length > 0 ? 0 : -1;
}

/** Header label: shell meta title -> string header -> column id. `meta` is the empty v9 type, so read it loosely. */
function columnTitle(column: SheetsTableColumn): string {
	const meta = column.columnDef.meta as { title?: string } | undefined;
	if (meta?.title) return meta.title;
	const header = column.columnDef.header;
	if (typeof header === 'string') return header;
	return column.id;
}

interface HeaderCellProps {
	column: SheetsTableColumn;
	header: import('@tanstack/react-table').Header<SheetsTableFeatures, SheetsRow, unknown>;
	sorting: GridViewportSorting;
	onHeaderClick?: (colKey: string) => void;
	onResize?: (colKey: string, width: number) => void;
}

/** A single header cell: title + sort caret (click toggles) + right-edge resize handle. */
function HeaderCell({ column, header, sorting, onHeaderClick, onResize }: HeaderCellProps) {
	const isSorted = sorting.id === column.id;
	const direction: 'asc' | 'desc' | 'none' = isSorted ? (sorting.desc ? 'desc' : 'asc') : 'none';

	function onResizePointerDown(e: React.PointerEvent<HTMLDivElement>) {
		// Don't toggle sort while grabbing the handle, and don't select header text.
		e.preventDefault();
		e.stopPropagation();
		if (onResize) {
			const startX = e.clientX;
			const startWidth = column.getSize();
			const onMove = (move: PointerEvent) => onResize(column.id, Math.max(40, startWidth + (move.clientX - startX)));
			const onUp = () => {
				window.removeEventListener('pointermove', onMove);
				window.removeEventListener('pointerup', onUp);
			};
			window.addEventListener('pointermove', onMove);
			window.addEventListener('pointerup', onUp);
			return;
		}
		// Fall back to the v9 feature handler (columnResizeMode 'onChange').
		header.getResizeHandler()(e.nativeEvent);
	}

	return (
		<div
			role='columnheader'
			data-part-id='sheets-header-cell'
			data-col-key={column.id}
			aria-sort={direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none'}
			onClick={() => onHeaderClick?.(column.id)}
			className={cn(
				'group relative flex h-full w-full select-none items-center gap-1 border-b border-border bg-background px-3 text-xs font-medium text-muted-foreground',
				onHeaderClick && 'cursor-pointer hover:bg-muted/50 hover:text-foreground'
			)}
		>
			<span className='truncate'>{columnTitle(column)}</span>
			<SortCaret direction={direction} />
			<div
				role='separator'
				aria-orientation='vertical'
				data-part-id='sheets-resize-handle'
				onClick={(e) => e.stopPropagation()}
				onPointerDown={onResizePointerDown}
				className='absolute right-0 top-0 h-full w-1 cursor-col-resize touch-none select-none bg-transparent hover:bg-primary/50'
			/>
		</div>
	);
}

/** Up/down/neutral sort caret (inline SVG, no icon-lib dep — matches the package's glyph style). */
function SortCaret({ direction }: { direction: 'asc' | 'desc' | 'none' }) {
	return (
		<svg
			data-part-id='sheets-sort-caret'
			data-direction={direction}
			width='8'
			height='8'
			viewBox='0 0 8 8'
			aria-hidden='true'
			className={cn('ml-auto shrink-0', direction === 'none' && 'opacity-30')}
		>
			{direction === 'desc' ? <path d='M0 2 L4 6 L8 2 Z' fill='currentColor' /> : <path d='M0 6 L4 2 L8 6 Z' fill='currentColor' />}
		</svg>
	);
}

/** Header marker cell: the select-all checkbox (checked = all, indeterminate = some). */
function RowMarkerHeaderCell({ rowMarker }: { rowMarker: RowMarker }) {
	return (
		<div
			role='columnheader'
			data-part-id='sheets-row-marker-header'
			data-slot='row-marker-header'
			className='flex h-full w-full select-none items-center justify-center border-b border-border bg-background'
		>
			<Checkbox
				checked={rowMarker.allSelected}
				indeterminate={rowMarker.someSelected}
				onClick={() => rowMarker.onToggleAll()}
				aria-label={rowMarker.allSelected ? 'Deselect all rows' : 'Select all rows'}
			/>
		</div>
	);
}

/** Body marker cell per row: a checkbox reflecting selection; click (with shiftKey) drives the toggle. */
function RowMarkerCell({ rowIndex, rowMarker }: { rowIndex: number; rowMarker: RowMarker }) {
	const selected = rowMarker.isSelected(rowIndex);
	// Reveal-on-hover (DESIGN_SPEC §9): checkbox is hidden until the row is hovered, but stays
	// visible once this row is checked OR any selection is active (so multi-select stays legible).
	const reveal = selected || rowMarker.someSelected || rowMarker.allSelected;
	return (
		<div
			data-part-id='sheets-row-marker-cell'
			data-slot='row-marker-cell'
			// Stop the click from bubbling into the row (which would also start a cell edit).
			onClick={(e) => e.stopPropagation()}
			onDoubleClick={(e) => e.stopPropagation()}
			className={`flex h-full w-full select-none items-center justify-center bg-background ${PINNED_HOVER_BG}`}
		>
			<Checkbox
				checked={selected}
				// base-ui Checkbox renders a <button>; onClick carries the native shiftKey for range-select.
				onClick={(e) => rowMarker.onToggleRow(rowIndex, e.shiftKey)}
				aria-label={`Select row ${rowIndex}`}
				className={cn(!reveal && 'opacity-0 transition-opacity group-hover:opacity-100 motion-reduce:transition-none')}
			/>
		</div>
	);
}

export function GridViewport({
	table,
	renderCell,
	handleRef,
	onScroll,
	sorting = { id: null, desc: false },
	onHeaderClick,
	onResize,
	count,
	onVisibleRangeChange,
	rowMarker,
	activeCell,
	activeRange,
	onGridKeyDown,
	onCopy,
	onCut,
	onPaste,
	activeDescendantId,
	onFillDrag,
	className
}: GridViewportProps) {
	const scrollRef = useRef<HTMLDivElement>(null);

	const rows = table.getRowModel().rows;
	const columns = table.getAllLeafColumns();

	// Report the visible window WITHOUT an effect: the virtualizer's `onChange` fires on every
	// recompute (scroll/resize/measure) with the live instance, whose `.range` is the overscan-
	// inclusive {startIndex,endIndex}. Keep the ref current each render so the latch never goes stale.
	const onVisibleRangeChangeRef = useRef(onVisibleRangeChange);
	onVisibleRangeChangeRef.current = onVisibleRangeChange;

	const rowVirtualizer = useVirtualizer({
		count: count ?? rows.length,
		getScrollElement: () => scrollRef.current,
		estimateSize: () => ESTIMATED_ROW_HEIGHT,
		overscan: ROW_OVERSCAN,
		onChange: (instance) => {
			const range = instance.range;
			if (range) onVisibleRangeChangeRef.current?.({ startIndex: range.startIndex, endIndex: range.endIndex });
		}
	});

	const columnVirtualizer = useVirtualizer({
		horizontal: true,
		count: columns.length,
		getScrollElement: () => scrollRef.current,
		estimateSize: (index) => columns[index].getSize(),
		getItemKey: (index) => columns[index]?.id ?? index,
		overscan: COLUMN_OVERSCAN
	});

	useImperativeHandle(
		handleRef,
		() => ({
			scrollToIndex: (rowIndex: number) => rowVirtualizer.scrollToIndex(rowIndex),
			scrollToCell: (columnIndex: number, rowIndex: number) => {
				rowVirtualizer.scrollToIndex(rowIndex);
				columnVirtualizer.scrollToIndex(columnIndex);
			}
		}),
		[rowVirtualizer, columnVirtualizer]
	);

	const stickyIndex = findStickyColumnIndex(columns);
	const hasStickyColumn = stickyIndex >= 0;
	const stickyColumn = hasStickyColumn ? columns[stickyIndex] : undefined;
	const stickyWidth = stickyColumn ? stickyColumn.getSize() : 0;
	const stickyHeader = stickyColumn ? table.getLeafHeaders().find((h) => h.column.id === stickyColumn.id) : undefined;
	const headersByColumnId = useMemo(() => new Map(table.getLeafHeaders().map((h) => [h.column.id, h])), [table, columns]);

	const totalWidth = columnVirtualizer.getTotalSize();
	const virtualColumns = columnVirtualizer.getVirtualItems();

	// The optional leading marker column shifts EVERYTHING right by MARKER_WIDTH: the sticky col0
	// pins at `left: markerWidth` (the marker owns `left: 0`), virtualized columns translate by an
	// extra markerWidth, and the header/body content width grows by markerWidth. When no rowMarker
	// is supplied, markerWidth is 0 and the layout is byte-identical to before.
	const markerWidth = rowMarker ? MARKER_WIDTH : 0;
	const contentWidth = totalWidth + markerWidth;

	// Fill-handle SOURCE rect: the active range, else a 1×1 rect at the active cell. Drives the nub
	// position (its bottom-right corner) and is the `from` handed to onFillDrag. Absent when neither.
	const fillSource: SelectionRect | undefined = onFillDrag
		? activeRange ?? (activeCell ? { x: activeCell[0], y: activeCell[1], width: 1, height: 1 } : undefined)
		: undefined;

	function onFillNubPointerDown(e: React.PointerEvent<HTMLDivElement>) {
		// Don't start a cell selection / text-select while grabbing the nub.
		e.preventDefault();
		e.stopPropagation();
		if (!onFillDrag || !fillSource) return;
		const source = fillSource;
		const scrollEl = scrollRef.current;
		if (!scrollEl) return;
		const colWidths = columns.map((c) => c.getSize());
		let target: [number, number] = [source.x + source.width - 1, source.y + source.height - 1];
		const onMove = (move: PointerEvent) => {
			const rect = scrollEl.getBoundingClientRect();
			target = hitTestCell(move.clientX, move.clientY, {
				rect: { left: rect.left, top: rect.top },
				scrollLeft: scrollEl.scrollLeft,
				scrollTop: scrollEl.scrollTop,
				markerWidth,
				headerHeight: HEADER_HEIGHT,
				rowHeight: ESTIMATED_ROW_HEIGHT,
				colWidths,
				rowCount: count ?? rows.length
			});
		};
		const onUp = () => {
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onUp);
			onFillDrag(source, target);
		};
		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
	}

	return (
		<div
			ref={scrollRef}
			data-impl='dom'
			data-part-id='sheets-viewport'
			role='grid'
			tabIndex={0}
			onScroll={onScroll}
			onKeyDown={(e) => onGridKeyDown?.(e)}
			onCopy={onCopy}
			onCut={onCut}
			onPaste={onPaste}
			aria-activedescendant={activeDescendantId}
			aria-rowcount={count ?? rows.length}
			aria-colcount={columns.length}
			className={cn('relative h-full w-full overflow-auto outline-none', className)}
		>
			{/* Sticky HEADER band — same column layout as the body. */}
			<div
				role='row'
				data-part-id='sheets-header-row'
				className='sticky top-0 z-30 flex bg-background'
				style={{ height: HEADER_HEIGHT, width: contentWidth }}
			>
				{rowMarker && (
					<div className='sticky left-0 z-40 flex shrink-0' style={{ width: markerWidth, height: '100%' }}>
						<RowMarkerHeaderCell rowMarker={rowMarker} />
					</div>
				)}
				{stickyColumn && stickyHeader && (
					<div className='sticky z-40 flex shrink-0 border-r border-border' style={{ left: markerWidth, width: stickyWidth, height: '100%' }}>
						<HeaderCell
							column={stickyColumn}
							header={stickyHeader}
							sorting={sorting}
							onHeaderClick={onHeaderClick}
							onResize={onResize}
						/>
					</div>
				)}
				{virtualColumns.map((virtualCol) => {
					if (virtualCol.index === stickyIndex) return null; // sticky header painted above
					const column = columns[virtualCol.index];
					const header = headersByColumnId.get(column.id);
					if (!header) return null;
					return (
						<div
							key={virtualCol.key}
							className='absolute top-0 flex'
							style={{ transform: `translateX(${virtualCol.start + markerWidth}px)`, width: virtualCol.size, height: '100%' }}
						>
							<HeaderCell
								column={column}
								header={header}
								sorting={sorting}
								onHeaderClick={onHeaderClick}
								onResize={onResize}
							/>
						</div>
					);
				})}
			</div>

			{/* BODY — virtualized rows × columns. */}
			<div style={{ height: rowVirtualizer.getTotalSize(), width: contentWidth, position: 'relative' }}>
				{rowVirtualizer.getVirtualItems().map((virtualRow) => {
					const row = rows[virtualRow.index];
					// Defensive: when `count` (server total) leads the loaded `rows` window, the proxy
					// should still back every index — but guard the off-by-one race rather than crash.
					if (!row) return null;
					const rowSelected = rowMarker?.isSelected(virtualRow.index) ?? false;
					return (
						<div
							key={virtualRow.key}
							role='row'
							data-index={virtualRow.index}
							data-row={virtualRow.index}
							data-selected={rowSelected || undefined}
							aria-rowindex={virtualRow.index + 1}
							className={cn(
							'group absolute left-0 top-0 flex border-b border-border',
							rowSelected ? 'bg-primary/5' : 'hover:bg-muted/50'
						)}
							style={{ transform: `translateY(${virtualRow.start}px)`, height: ESTIMATED_ROW_HEIGHT, width: '100%' }}
						>
							{rowMarker && (
								<div className='sticky left-0 z-20 flex shrink-0' style={{ width: markerWidth }}>
									<RowMarkerCell rowIndex={virtualRow.index} rowMarker={rowMarker} />
								</div>
							)}
							{hasStickyColumn && (
								<div
									className={`sticky z-10 flex shrink-0 border-r border-border bg-background ${PINNED_HOVER_BG}`}
									data-col={stickyIndex}
									aria-colindex={stickyIndex + 1}
									style={{ left: markerWidth, width: stickyWidth }}
								>
									{renderCell(cellForColumnIndex(row, stickyIndex), {
										rowIndex: virtualRow.index,
										columnIndex: stickyIndex,
										isStickyColumn: true,
										isActive: activeCell?.[0] === stickyIndex && activeCell?.[1] === virtualRow.index
									})}
								</div>
							)}
							{virtualColumns.map((virtualCol) => {
								if (virtualCol.index === stickyIndex) return null; // sticky col painted by the element above
								return (
									<div
										key={virtualCol.key}
										className='absolute top-0 flex'
										data-col={virtualCol.index}
										aria-colindex={virtualCol.index + 1}
										style={{ transform: `translateX(${virtualCol.start + markerWidth}px)`, width: virtualCol.size, height: '100%' }}
									>
										{renderCell(cellForColumnIndex(row, virtualCol.index), {
											rowIndex: virtualRow.index,
											columnIndex: virtualCol.index,
											isStickyColumn: false,
											isActive: activeCell?.[0] === virtualCol.index && activeCell?.[1] === virtualRow.index
										})}
									</div>
								);
							})}
						</div>
					);
				})}
				{activeRange && (
					<div
						data-part-id='sheets-range-band'
						aria-hidden='true'
						className='pointer-events-none absolute z-[5] border border-primary/50 bg-primary/10'
						style={rangeBandStyle(activeRange, columns, markerWidth)}
					/>
				)}
				{fillSource && (
					<div
						data-part-id='sheets-fill-handle'
						role='button'
						aria-label='Fill handle'
						onPointerDown={onFillNubPointerDown}
						className='absolute z-10 cursor-crosshair touch-none select-none rounded-[1px] border border-background bg-primary'
						style={fillNubStyle(fillSource, columns, markerWidth)}
					/>
				)}
			</div>
		</div>
	);
}

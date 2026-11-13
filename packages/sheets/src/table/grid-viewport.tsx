// The DOM viewport for the TanStack port — where LAYOUT happens (the v9 table
// instance from S3 is a pure state-mirror; this is the dual-axis TanStack
// Virtual shell that paints it).
//
// VERTICAL virtualizer over rows, HORIZONTAL virtualizer over columns. The
// FROZEN columns (the first `frozenCount` columns; without `frozenCount`, the
// start-pinned column or else the first column) are painted OUTSIDE the
// horizontal virtual window — sticky elements per row — so they stay put under
// horizontal scroll. The horizontal virtualizer still counts them (so column
// start offsets stay correct), but the item loop SKIPS them; they are never
// double-painted.
//
// A sticky HEADER band sits at the top of the scroll content, reusing the SAME
// column layout as the body (see `grid-header.tsx` for one header cell: sort
// caret with priority, the column's menu, resize handle, drag to reorder).
//
// `renderCell` is injected so the viewport stays host-decoupled and testable. The
// root carries `data-impl="dom"` so tests / Chrome can assert the DOM path is live.
import { useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import type { Ref } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Cell, Column, Row, Table } from '@tanstack/react-table';

import { cn } from '../utils/cn';
import type { SheetsRow } from '../grid/row-model';
import type { SelectionRect } from '../selection/selection-model';
import type { SheetsTableFeatures } from './features';
import { HeaderCell, type GridViewportSortKey, type HeaderDrag, type HeaderDropTarget } from './grid-header';
import { PINNED_HOVER_BG, RowMarkerCell, RowMarkerHeaderCell, markerWidthOf, type RowMarker } from './row-marker';
import { fillColumnWidths } from './column-fill';
import { useInnerWidth } from './use-inner-width';
import { isEmptyGridPress } from './empty-press';

export type { GridViewportSortKey } from './grid-header';
export type { RowMarker } from './row-marker';

/** Default row height (the "medium" setting). Drives the v-virtualizer estimate, range-band /
 *  fill-nub geometry, and hit-testing when the shell passes no `rowHeight`. */
const DEFAULT_ROW_HEIGHT = 44;
/** Extra rows rendered above/below the visible window — fewer blank rows on fast vertical scroll. */
const ROW_OVERSCAN = 12;
/** Extra columns rendered left/right of the visible window — fewer blank cells on fast horizontal scroll. */
const COLUMN_OVERSCAN = 6;
/** Header band height (DESIGN_SPEC §5 comfortable) — slightly shorter than the body row. */
const HEADER_HEIGHT = 40;

type SheetsTable = Table<SheetsTableFeatures, SheetsRow>;
type SheetsTableCell = Cell<SheetsTableFeatures, SheetsRow, unknown>;
type SheetsTableColumn = Column<SheetsTableFeatures, SheetsRow, unknown>;

const NO_SORT: readonly GridViewportSortKey[] = [];

/** Per-cell layout context handed to the host alongside the v9 cell. */
export interface RenderCellContext {
	rowIndex: number;
	columnIndex: number;
	/** True for a frozen column, painted outside the h-virtual window. */
	isStickyColumn: boolean;
	/** True when this cell is the active (keyboard cursor) cell. Drives the focus ring. */
	isActive: boolean;
	/** True for the active cell and every cell of the active range: the cell is selected (`aria-selected`). */
	isSelected: boolean;
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
	/** Sort keys, first key first, for the header carets. Defaults to unsorted. */
	sort?: readonly GridViewportSortKey[];
	/** Header click on a sortable column; `additive` is true for Shift+click. */
	onHeaderClick?: (colKey: string, additive: boolean) => void;
	/**
	 * Why a column cannot be sorted, or null when it can. A column with a reason is not
	 * clickable and shows the reason. Omitted: every column is sortable when `onHeaderClick` is set.
	 */
	getUnsortableReason?: (colKey: string) => string | null;
	/**
	 * Commit a column width from the header drag-resize handle. When provided, the handle
	 * drives a manual pointer-drag against this. When omitted, the handle falls back to the
	 * v9 `header.getResizeHandler()` (columnResizeMode 'onChange' feeds the table's own columnSizing state).
	 */
	onResize?: (colKey: string, width: number) => void;
	/**
	 * How many leading columns stay in place under horizontal scroll. Omitted: the start-pinned
	 * column, else the first column.
	 */
	frozenCount?: number;
	/** Row height in pixels. Default 44. */
	rowHeight?: number;
	/** Move a column beside another one (header drag). Omitted: headers cannot be dragged. */
	onColumnMove?: (colKey: string, target: string, side: 'before' | 'after') => void;
	/** The menu of a column's header (trigger and popup). Omitted: headers have no menu. */
	renderHeaderMenu?: (colKey: string) => React.ReactNode;
	/**
	 * Total row count for the VERTICAL virtualizer. Defaults to the table's row-model length.
	 * Infinite scroll passes the server total here so the scrollbar spans every (lazily loaded)
	 * row — the table's `data` is the same-length proxy, so this matches `rows.length` in practice
	 * but is threaded explicitly so the shell stays the single source of truth for row count.
	 */
	count?: number;
	/**
	 * Fired (effect-free, via the row virtualizer's `onChange`) with the current overscan-inclusive
	 * visible window, for infinite-scroll prefetch. Omitted in paginated mode.
	 */
	onVisibleRangeChange?: (range: VisibleRange) => void;
	/**
	 * Optional leading checkbox / select-all column. When supplied, a sticky MARKER column is
	 * painted to the LEFT of the frozen columns, driving the canonical SheetsSelection RangeSet.
	 * When OMITTED, the grid renders without a marker column.
	 */
	rowMarker?: RowMarker;
	/** Active (keyboard cursor) cell `[col, row]`. Drives the per-cell focus ring + aria-activedescendant. */
	activeCell?: [number, number];
	/** Active range (cell coords) — rendered as an inert pointer-events-none band overlay. */
	activeRange?: SelectionRect;
	/**
	 * Keydown handler for the grid root — the shell owns spreadsheet nav (arrows / Enter / F2).
	 * Keys from a portalled surface rendered inside the grid (a header menu) are not grid keys
	 * and do not reach it.
	 */
	onGridKeyDown?: (e: React.KeyboardEvent) => void;
	/** The grid root took keyboard focus (Tab, or a script), not focus from a pointer press. */
	onGridFocus?: () => void;
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
	/**
	 * Columns that keep their width when the columns are narrower than the grid (the
	 * user resized them). The others share the spare width; see {@link fillColumnWidths}.
	 */
	fixedWidthColumns?: ReadonlySet<string>;
	/** Narrow kinds (checkbox and number columns): they take spare width only when no other column can. */
	narrowColumns?: ReadonlySet<string>;
	/**
	 * A primary-button press on empty grid space (below the last row, a row line past the
	 * last column, the header band past the last header). The shell clears the cursor.
	 */
	onPressEmpty?: () => void;
	className?: string;
}

/** The element shows keyboard focus (`:focus-visible`); true where the selector is unknown. */
function isKeyboardFocus(element: HTMLElement): boolean {
	try {
		return element.matches(':focus-visible');
	} catch {
		return true;
	}
}

function cellForColumnIndex(row: Row<SheetsTableFeatures, SheetsRow>, columnIndex: number): SheetsTableCell {
	return row.getAllCells()[columnIndex];
}

/** The cell is the active cell or lies inside the active range. */
function isCellSelected(col: number, row: number, activeCell: [number, number] | undefined, range: SelectionRect | undefined): boolean {
	if (activeCell?.[0] === col && activeCell[1] === row) return true;
	return !!range && col >= range.x && col < range.x + range.width && row >= range.y && row < range.y + range.height;
}

/** Left offset and width (px) of a column span, from the drawn column widths plus the marker offset. */
function spanGeometry(x: number, width: number, widths: readonly number[], markerWidth: number) {
	let left = markerWidth;
	for (let i = 0; i < x && i < widths.length; i++) left += widths[i]!;
	let span = 0;
	for (let i = x; i < x + width && i < widths.length; i++) span += widths[i]!;
	return { left, width: span };
}

/** Box of the inert range-band overlay for a half-open {@link SelectionRect} (cell coords). */
function rangeBandStyle(range: SelectionRect, widths: readonly number[], markerWidth: number, rowHeight: number): React.CSSProperties {
	const { left, width } = spanGeometry(range.x, range.width, widths, markerWidth);
	return {
		transform: `translate(${left}px, ${range.y * rowHeight}px)`,
		width,
		height: range.height * rowHeight
	};
}

/** Side of the square fill-handle nub (px). Centered on the source rect's bottom-right corner. */
const FILL_NUB_SIZE = 8;

/** Position the fill-handle nub centered on the BOTTOM-RIGHT corner of the source {@link SelectionRect}. */
function fillNubStyle(source: SelectionRect, widths: readonly number[], markerWidth: number, rowHeight: number): React.CSSProperties {
	const { left, width } = spanGeometry(source.x, source.width, widths, markerWidth);
	const right = left + width;
	const bottom = (source.y + source.height) * rowHeight;
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

/**
 * The column indices painted frozen: the first `frozenCount` columns, or without it the
 * start-pinned column, else the first column (the grid's earlier sticky-by-default rule).
 */
function frozenColumnIndices(columns: SheetsTableColumn[], frozenCount: number | undefined): number[] {
	if (frozenCount !== undefined) {
		return Array.from({ length: Math.max(0, Math.min(frozenCount, columns.length)) }, (_, index) => index);
	}
	const pinned = columns.findIndex((col) => col.getIsPinned() === 'start');
	if (pinned >= 0) return [pinned];
	return columns.length > 0 ? [0] : [];
}

/** Drag-to-reorder state for the header cells of one viewport. */
function useHeaderDrag(onColumnMove: GridViewportProps['onColumnMove']): HeaderDrag | undefined {
	const [dragging, setDragging] = useState<string | null>(null);
	const [dropTarget, setDropTarget] = useState<HeaderDropTarget | null>(null);
	const latest = useRef({ dragging, dropTarget, onColumnMove });
	latest.current = { dragging, dropTarget, onColumnMove };
	return useMemo<HeaderDrag | undefined>(() => {
		if (!onColumnMove) return undefined;
		const end = () => {
			setDragging(null);
			setDropTarget(null);
		};
		return {
			dragging,
			dropTarget,
			start: (key) => setDragging(key),
			over: (target) =>
				setDropTarget((current) => (current?.key === target?.key && current?.side === target?.side ? current : target)),
			drop: () => {
				const { dragging: key, dropTarget: target, onColumnMove: move } = latest.current;
				if (key && target && key !== target.key) move?.(key, target.key, target.side);
				end();
			},
			end,
		};
	}, [onColumnMove, dragging, dropTarget]);
}

export function GridViewport({
	table,
	renderCell,
	handleRef,
	onScroll,
	sort = NO_SORT,
	onHeaderClick,
	getUnsortableReason,
	onResize,
	frozenCount,
	rowHeight = DEFAULT_ROW_HEIGHT,
	onColumnMove,
	renderHeaderMenu,
	count,
	onVisibleRangeChange,
	rowMarker,
	activeCell,
	activeRange,
	onGridKeyDown,
	onGridFocus,
	onCopy,
	onCut,
	onPaste,
	activeDescendantId,
	onFillDrag,
	fixedWidthColumns,
	narrowColumns,
	onPressEmpty,
	className
}: GridViewportProps) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const innerWidth = useInnerWidth(scrollRef);

	const rows = table.getRowModel().rows;
	const columns = table.getAllLeafColumns();

	// Report the visible window WITHOUT an effect: the virtualizer's `onChange` fires on every
	// recompute (scroll/resize/measure) with the live instance, whose `.range` is the overscan-
	// inclusive {startIndex,endIndex}. Keep the ref current each render so the latch never goes stale.
	const onVisibleRangeChangeRef = useRef(onVisibleRangeChange);
	onVisibleRangeChangeRef.current = onVisibleRangeChange;
	const lastRangeRef = useRef<string | null>(null);

	const rowVirtualizer = useVirtualizer({
		count: count ?? rows.length,
		getScrollElement: () => scrollRef.current,
		estimateSize: () => rowHeight,
		overscan: ROW_OVERSCAN,
		onChange: (instance) => {
			const range = instance.range;
			if (!range) return;
			// Report only real changes, and after the render: the virtualizer can notify while this
			// component renders (first measure), and a host state update there re-renders it mid-render
			// in a loop ("Too many re-renders" once a table has rows).
			const key = `${range.startIndex}:${range.endIndex}`;
			if (key === lastRangeRef.current) return;
			lastRangeRef.current = key;
			const { startIndex, endIndex } = range;
			queueMicrotask(() => onVisibleRangeChangeRef.current?.({ startIndex, endIndex }));
		}
	});

	// A new row height changes every row's size: drop the measured sizes so rows lay out again.
	const measuredRowHeight = useRef(rowHeight);
	useEffect(() => {
		if (measuredRowHeight.current === rowHeight) return;
		measuredRowHeight.current = rowHeight;
		rowVirtualizer.measure();
	}, [rowHeight, rowVirtualizer]);

	// The optional leading marker column shifts EVERYTHING right by its width: the frozen columns
	// pin after it, virtualized columns translate by it, and the content width grows by it.
	const markerWidth = markerWidthOf(rowMarker);
	const frozen = frozenColumnIndices(columns, frozenCount);
	const frozenSet = new Set(frozen);

	// The widths drawn: the columns' own widths, with spare grid width shared among the columns
	// the user has not resized (O(columns), recomputed only when an input changes). Never stored.
	const baseWidths = columns.map((column) => column.getSize());
	const fixedFlags = columns.map((column) => fixedWidthColumns?.has(column.id) ?? false);
	const narrowFlags = columns.map((column) => narrowColumns?.has(column.id) ?? false);
	const fillKey = `${innerWidth - markerWidth}|${baseWidths.join()}|${fixedFlags.join()}|${narrowFlags.join()}|${frozen.join()}`;
	const fill = useMemo(
		() =>
			fillColumnWidths({
				widths: baseWidths,
				fixed: fixedFlags,
				frozen: columns.map((_, index) => frozenSet.has(index)),
				narrow: narrowFlags,
				available: innerWidth - markerWidth,
			}),
		// eslint-disable-next-line react-hooks/exhaustive-deps -- the key covers every input
		[fillKey],
	);
	const widths = fill.widths;

	const columnVirtualizer = useVirtualizer({
		horizontal: true,
		count: columns.length,
		getScrollElement: () => scrollRef.current,
		estimateSize: (index) => widths[index] ?? columns[index].getSize(),
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

	const headersByColumnId = useMemo(() => new Map(table.getLeafHeaders().map((h) => [h.column.id, h])), [table, columns]);
	const drag = useHeaderDrag(onColumnMove);

	const frozenLefts: number[] = [];
	let frozenLeft = markerWidth;
	for (const index of frozen) {
		frozenLefts.push(frozenLeft);
		frozenLeft += widths[index]!;
	}
	const lastFrozen = frozen[frozen.length - 1];

	const totalWidth = columnVirtualizer.getTotalSize();
	const virtualColumns = columnVirtualizer.getVirtualItems();
	const contentWidth = totalWidth + markerWidth;
	// Every column keeps its width and they end before the grid's edge: the rows (lines, hover,
	// selection) still run to the edge over an inert filler, with no cell and no focus stop.
	const rowWidth = contentWidth + fill.filler;

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
		const colWidths = widths;
		let target: [number, number] = [source.x + source.width - 1, source.y + source.height - 1];
		const onMove = (move: PointerEvent) => {
			const rect = scrollEl.getBoundingClientRect();
			target = hitTestCell(move.clientX, move.clientY, {
				rect: { left: rect.left, top: rect.top },
				scrollLeft: scrollEl.scrollLeft,
				scrollTop: scrollEl.scrollTop,
				markerWidth,
				headerHeight: HEADER_HEIGHT,
				rowHeight,
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

	const headerCell = (index: number) => {
		const column = columns[index]!;
		const header = headersByColumnId.get(column.id);
		if (!header) return null;
		return (
			<HeaderCell
				column={column}
				header={header}
				sort={sort}
				onHeaderClick={onHeaderClick}
				getUnsortableReason={getUnsortableReason}
				onResize={onResize}
				width={widths[index]}
				drag={drag}
				menu={renderHeaderMenu?.(column.id)}
			/>
		);
	};

	return (
		<div
			ref={scrollRef}
			data-impl='dom'
			data-part-id='sheets-viewport'
			role='grid'
			tabIndex={0}
			onScroll={onScroll}
			onPointerDown={(e) => {
				if (onPressEmpty && e.button === 0 && isEmptyGridPress(e.target as Element, e.currentTarget, e.clientX, e.clientY)) onPressEmpty();
			}}
			onKeyDown={(e) => {
				if (e.currentTarget.contains(e.target as Node)) onGridKeyDown?.(e);
			}}
			onFocus={(e) => {
				if (e.target === e.currentTarget && isKeyboardFocus(e.currentTarget)) onGridFocus?.();
			}}
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
				style={{ height: HEADER_HEIGHT, width: rowWidth }}
			>
				{rowMarker && (
					<div className='sticky left-0 z-40 flex shrink-0' style={{ width: markerWidth, height: '100%' }}>
						<RowMarkerHeaderCell rowMarker={rowMarker} />
					</div>
				)}
				{frozen.map((index, position) => (
					<div
						key={columns[index].id}
						data-frozen=''
						className={cn('sticky z-40 flex shrink-0', index === lastFrozen && 'border-r border-border')}
						style={{ left: frozenLefts[position], width: widths[index], height: '100%' }}
					>
						{headerCell(index)}
					</div>
				))}
				{virtualColumns.map((virtualCol) => {
					if (frozenSet.has(virtualCol.index)) return null; // frozen header painted above
					return (
						<div
							key={virtualCol.key}
							className='absolute top-0 flex'
							style={{ transform: `translateX(${virtualCol.start + markerWidth}px)`, width: virtualCol.size, height: '100%' }}
						>
							{headerCell(virtualCol.index)}
						</div>
					);
				})}
				{fill.filler > 0 && (
					<div
						aria-hidden='true'
						data-part-id='sheets-header-filler'
						className='absolute top-0 h-full border-b border-border'
						style={{ left: contentWidth, width: fill.filler }}
					/>
				)}
			</div>

			{/* BODY — virtualized rows × columns. Cells are not text: a double-click or a drag must not
			    leave a native text selection on them. An inline editor's field stays selectable. */}
			<div
				className='select-none [&_[contenteditable=true]]:select-text [&_input]:select-text [&_textarea]:select-text'
				style={{ height: rowVirtualizer.getTotalSize(), width: rowWidth, position: 'relative' }}
			>
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
							style={{ transform: `translateY(${virtualRow.start}px)`, height: rowHeight, width: '100%' }}
						>
							{rowMarker && (
								<div className='sticky left-0 z-20 flex shrink-0' style={{ width: markerWidth }}>
									<RowMarkerCell rowIndex={virtualRow.index} rowMarker={rowMarker} isActiveRow={activeCell?.[1] === virtualRow.index} />
								</div>
							)}
							{frozen.map((index, position) => (
								<div
									key={columns[index].id}
									className={cn('sticky z-10 flex shrink-0 bg-background', PINNED_HOVER_BG, index === lastFrozen && 'border-r border-border')}
									data-col={index}
									style={{ left: frozenLefts[position], width: widths[index] }}
								>
									{renderCell(cellForColumnIndex(row, index), {
										rowIndex: virtualRow.index,
										columnIndex: index,
										isStickyColumn: true,
										isActive: activeCell?.[0] === index && activeCell?.[1] === virtualRow.index,
										isSelected: isCellSelected(index, virtualRow.index, activeCell, activeRange)
									})}
								</div>
							))}
							{virtualColumns.map((virtualCol) => {
								if (frozenSet.has(virtualCol.index)) return null; // frozen col painted above
								return (
									<div
										key={virtualCol.key}
										className='absolute top-0 flex'
										data-col={virtualCol.index}
										style={{ transform: `translateX(${virtualCol.start + markerWidth}px)`, width: virtualCol.size, height: '100%' }}
									>
										{renderCell(cellForColumnIndex(row, virtualCol.index), {
											rowIndex: virtualRow.index,
											columnIndex: virtualCol.index,
											isStickyColumn: false,
											isActive: activeCell?.[0] === virtualCol.index && activeCell?.[1] === virtualRow.index,
											isSelected: isCellSelected(virtualCol.index, virtualRow.index, activeCell, activeRange)
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
						style={rangeBandStyle(activeRange, widths, markerWidth, rowHeight)}
					/>
				)}
				{fillSource && (
					<div
						data-part-id='sheets-fill-handle'
						role='button'
						aria-label='Fill handle'
						onPointerDown={onFillNubPointerDown}
						className='absolute z-10 cursor-crosshair touch-none select-none rounded-[1px] border border-background bg-primary'
						style={fillNubStyle(fillSource, widths, markerWidth, rowHeight)}
					/>
				)}
			</div>
		</div>
	);
}

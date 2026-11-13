// One header cell of the DOM grid: title, sort caret with priority, a slot for
// the column's menu, a right-edge resize handle, and drag to reorder. The cell
// knows nothing about views; the viewport passes plain callbacks.
import type { Column, Header } from '@tanstack/react-table';

import { cn } from '../utils/cn';
import type { SheetsRow } from '../grid/row-model';
import type { SheetsTableFeatures } from './features';

type SheetsTableColumn = Column<SheetsTableFeatures, SheetsRow, unknown>;

/** One sort key as the header shows it. The first key sorts first. */
export interface GridViewportSortKey {
	column: string;
	direction: 'asc' | 'desc';
}

/** Where a dragged header would land, shown as a bar on that side of the target. */
export interface HeaderDropTarget {
	key: string;
	side: 'before' | 'after';
}

/** Header drag-to-reorder wiring, shared by every header cell of one viewport. */
export interface HeaderDrag {
	/** The key being dragged, or null. */
	dragging: string | null;
	dropTarget: HeaderDropTarget | null;
	start: (key: string) => void;
	over: (target: HeaderDropTarget | null) => void;
	/** Drop on the current target; the viewport reports the move. */
	drop: () => void;
	end: () => void;
}

/** Narrowest width the resize handle drags a column to. */
const MIN_DRAG_WIDTH = 40;

/** Header label: shell meta title -> string header -> column id. `meta` is the empty v9 type, so read it loosely. */
export function columnTitle(column: SheetsTableColumn): string {
	const meta = column.columnDef.meta as { title?: string } | undefined;
	if (meta?.title) return meta.title;
	const header = column.columnDef.header;
	if (typeof header === 'string') return header;
	return column.id;
}

export interface HeaderCellProps {
	column: SheetsTableColumn;
	header: Header<SheetsTableFeatures, SheetsRow, unknown>;
	sort: readonly GridViewportSortKey[];
	onHeaderClick?: (colKey: string, additive: boolean) => void;
	getUnsortableReason?: (colKey: string) => string | null;
	onResize?: (colKey: string, width: number) => void;
	/** The width the column is drawn at (it may be wider than its own width when the grid fills). A resize starts from it. */
	width?: number;
	/** Drag to reorder; omitted when columns cannot be moved. */
	drag?: HeaderDrag;
	/** The column's menu (trigger and popup), rendered after the caret. */
	menu?: React.ReactNode;
}

/** A single header cell: title + sort caret and priority (click toggles) + menu + right-edge resize handle. */
export function HeaderCell({ column, header, sort, onHeaderClick, getUnsortableReason, onResize, width, drag, menu }: HeaderCellProps) {
	const position = sort.findIndex((key) => key.column === column.id);
	const direction: 'asc' | 'desc' | 'none' = position === -1 ? 'none' : sort[position]!.direction;
	const priority = position !== -1 && sort.length > 1 ? position + 1 : null;
	const unsortableReason = onHeaderClick ? getUnsortableReason?.(column.id) ?? null : null;
	const sortable = Boolean(onHeaderClick) && unsortableReason === null;
	// An unsortable column shows no caret, so its menu takes the right edge.
	const noCaret = Boolean(onHeaderClick) && !sortable;
	const title = columnTitle(column);
	const hint = !onHeaderClick
		? undefined
		: unsortableReason !== null
			? unsortableReason || undefined
			: `Sort by ${title}. Shift+click to add it to the sort.`;
	const dropSide = drag?.dropTarget?.key === column.id && drag.dragging !== column.id ? drag.dropTarget.side : null;

	function onResizePointerDown(e: React.PointerEvent<HTMLDivElement>) {
		// Don't toggle sort while grabbing the handle, and don't select header text or start a drag.
		e.preventDefault();
		e.stopPropagation();
		if (onResize) {
			const startX = e.clientX;
			const startWidth = width ?? column.getSize();
			const onMove = (move: PointerEvent) => onResize(column.id, Math.max(MIN_DRAG_WIDTH, startWidth + (move.clientX - startX)));
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
			data-sortable={onHeaderClick ? String(sortable) : undefined}
			data-dragging={drag?.dragging === column.id || undefined}
			aria-sort={direction === 'asc' ? 'ascending' : direction === 'desc' ? 'descending' : 'none'}
			title={hint}
			draggable={drag ? true : undefined}
			onDragStart={
				drag
					? (e) => {
							e.dataTransfer?.setData('text/plain', column.id);
							if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
							drag.start(column.id);
						}
					: undefined
			}
			onDragOver={
				drag
					? (e) => {
							if (drag.dragging === null) return;
							e.preventDefault();
							const rect = e.currentTarget.getBoundingClientRect();
							drag.over({ key: column.id, side: e.clientX < rect.left + rect.width / 2 ? 'before' : 'after' });
						}
					: undefined
			}
			onDrop={
				drag
					? (e) => {
							e.preventDefault();
							drag.drop();
						}
					: undefined
			}
			onDragEnd={drag ? () => drag.end() : undefined}
			onClick={(e) => {
				if (sortable) onHeaderClick?.(column.id, e.shiftKey);
			}}
			className={cn(
				'group relative flex h-full w-full select-none items-center gap-1 border-b border-border bg-background px-3 text-xs font-medium text-muted-foreground',
				sortable && 'cursor-pointer hover:bg-muted/50 hover:text-foreground',
				onHeaderClick && !sortable && unsortableReason && 'cursor-not-allowed',
				drag?.dragging === column.id && 'opacity-50',
			)}
		>
			{dropSide && (
				<span
					aria-hidden='true'
					data-part-id='sheets-header-drop-indicator'
					className={cn('bg-primary absolute top-0 z-10 h-full w-0.5', dropSide === 'before' ? 'left-0' : 'right-0')}
				/>
			)}
			{/* The raw field name, for people who know the schema; saved views and commands use it too. */}
			<span className='truncate' title={column.id === title ? undefined : column.id}>
				{title}
			</span>
			{noCaret ? (
				unsortableReason && <span className='sr-only'>{unsortableReason}</span>
			) : (
				<SortCaret direction={direction} priority={priority} />
			)}
			{menu && (
				// The menu trigger neither sorts nor starts a drag.
				<span
					className={cn('shrink-0', noCaret && 'ml-auto')}
					onClick={(e) => e.stopPropagation()}
					onDragStart={(e) => {
						e.preventDefault();
						e.stopPropagation();
					}}
				>
					{menu}
				</span>
			)}
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

/**
 * Up/down/neutral sort caret (inline SVG, no icon-lib dep — matches the package's glyph style),
 * with the key's priority when several columns sort.
 */
function SortCaret({ direction, priority }: { direction: 'asc' | 'desc' | 'none'; priority: number | null }) {
	return (
		<span className='ml-auto inline-flex shrink-0 items-center gap-0.5'>
			{priority !== null && (
				<span data-part-id='sheets-sort-priority' className='text-foreground text-[0.625rem] tabular-nums' aria-label={`sort priority ${priority}`}>
					{priority}
				</span>
			)}
			<svg
				data-part-id='sheets-sort-caret'
				data-direction={direction}
				width='8'
				height='8'
				viewBox='0 0 8 8'
				aria-hidden='true'
				className={cn('shrink-0', direction === 'none' && 'opacity-30')}
			>
				{direction === 'desc' ? <path d='M0 2 L4 6 L8 2 Z' fill='currentColor' /> : <path d='M0 6 L4 2 L8 6 Z' fill='currentColor' />}
			</svg>
		</span>
	);
}

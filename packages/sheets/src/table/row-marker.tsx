// The leading row-marker column: a select-all checkbox in the header and, per
// row, a selection checkbox plus an optional "open record" button. The shell
// derives the wiring from the canonical SheetsSelection.
import { RiExpandDiagonalLine } from '@remixicon/react';

import { Checkbox } from '@constructive-io/ui/checkbox';

import { cn } from '../utils/cn';

/** Width of the marker column with the checkbox only, and with the open-record button too. */
export const MARKER_WIDTH = 40;
export const MARKER_WIDTH_WITH_EXPAND = 64;

// Row-hover tint for the PINNED (sticky) cells. The pinned column/marker sit OVER the
// horizontally-scrolled body, so their hover background must be fully OPAQUE — a translucent
// `bg-muted/50` (as used on the row itself) would let the scrolled-away cells bleed through the
// pinned column on hover. `color-mix` precomputes the SAME tint as opaque: 50% muted over the
// surface, so the pinned column matches the row exactly while staying solid. Theme-safe (the raw
// `--muted`/`--background` vars flip in dark mode). Uses raw vars, not `--color-*`, because the UI
// theme is `@theme inline` (the `--color-*` aliases aren't emitted at runtime).
export const PINNED_HOVER_BG = 'group-hover:bg-[color-mix(in_oklab,var(--muted)_50%,var(--background))]';

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
	/**
	 * Open one record (the record panel). When set, each row's marker shows an open
	 * button: on row hover or focus, and always on the active row.
	 */
	onExpandRow?: (rowIndex: number) => void;
	/** Accessible name of a row's open button. Default "Open record". */
	expandLabel?: (rowIndex: number) => string;
}

export function markerWidthOf(rowMarker: RowMarker | undefined): number {
	if (!rowMarker) return 0;
	return rowMarker.onExpandRow ? MARKER_WIDTH_WITH_EXPAND : MARKER_WIDTH;
}

/** Header marker cell: the select-all checkbox (checked = all, indeterminate = some). */
export function RowMarkerHeaderCell({ rowMarker }: { rowMarker: RowMarker }) {
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

/** Body marker cell per row: a checkbox reflecting selection, and the open-record button when wired. */
export function RowMarkerCell({ rowIndex, rowMarker, isActiveRow }: { rowIndex: number; rowMarker: RowMarker; isActiveRow: boolean }) {
	const selected = rowMarker.isSelected(rowIndex);
	// Reveal-on-hover (DESIGN_SPEC §9): checkbox is hidden until the row is hovered, but stays
	// visible once this row is checked OR any selection is active (so multi-select stays legible).
	const reveal = selected || rowMarker.someSelected || rowMarker.allSelected;
	const onExpandRow = rowMarker.onExpandRow;
	return (
		<div
			data-part-id='sheets-row-marker-cell'
			data-slot='row-marker-cell'
			// Stop the click from bubbling into the row (which would also start a cell edit).
			onClick={(e) => e.stopPropagation()}
			onDoubleClick={(e) => e.stopPropagation()}
			className={`flex h-full w-full select-none items-center justify-center gap-1 bg-background ${PINNED_HOVER_BG}`}
		>
			<Checkbox
				checked={selected}
				// base-ui Checkbox renders a <button>; onClick carries the native shiftKey for range-select.
				onClick={(e) => rowMarker.onToggleRow(rowIndex, e.shiftKey)}
				aria-label={`Select row ${rowIndex}`}
				className={cn(!reveal && 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100')}
			/>
			{onExpandRow && (
				<button
					type='button'
					data-part-id='sheets-row-expand'
					aria-label={rowMarker.expandLabel?.(rowIndex) ?? 'Open record'}
					title={rowMarker.expandLabel?.(rowIndex) ?? 'Open record'}
					onClick={() => onExpandRow(rowIndex)}
					className={cn(
						'text-muted-foreground hover:text-foreground rounded p-0.5 focus-visible:opacity-100',
						!isActiveRow && 'opacity-0 group-hover:opacity-100',
					)}
				>
					<RiExpandDiagonalLine className='size-3.5' aria-hidden='true' />
				</button>
			)}
		</div>
	);
}

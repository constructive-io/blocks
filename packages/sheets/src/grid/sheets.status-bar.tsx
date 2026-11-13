'use client';

// The thin bar pinned to the bottom of the table frame: what the table holds for the
// current view, then the save status. It sits outside the scroll area, so it stays put
// while the rows scroll. The frame clips its corners, so the bar needs no radius.

import type { ReactNode } from 'react';

export interface SheetsStatusBarProps {
	/** Rows the server reports for the current filter and search; null until the first count for this view arrives. */
	total: number | null;
	/** A filter or a search narrows the rows ("12 matching rows"). */
	filtered: boolean;
	/** The rows are being fetched again; the count may change. */
	updating?: boolean;
	/** More status after the count (the grid passes its save status). */
	children?: ReactNode;
}

export function SheetsStatusBar({ total, filtered, updating, children }: SheetsStatusBarProps) {
	const noun = total === 1 ? 'row' : 'rows';
	return (
		<div
			data-part-id='sheets-status-bar'
			className='bg-muted/30 text-muted-foreground flex h-8 shrink-0 items-center gap-3 border-t px-3 text-xs'
		>
			{/* Tabular figures: the count changes while the rows load, and its digits stay put.
			    A refetch dims the count only when it lasts over 400 ms, so a refetch after a save
			    does not make it blink; it comes back at once. */}
			<span
				data-part-id='sheets-row-count'
				role='status'
				aria-live='polite'
				aria-busy={updating || total === null || undefined}
				className='tabular-nums transition-opacity duration-150 ease-out aria-busy:opacity-50 aria-busy:delay-400 motion-reduce:transition-none'
			>
				{/* No count until this view's first count arrives: a placeholder would flash "0 rows". */}
				{total === null ? null : `${total.toLocaleString()} ${filtered ? `matching ${noun}` : noun}`}
			</span>
			{children}
		</div>
	);
}

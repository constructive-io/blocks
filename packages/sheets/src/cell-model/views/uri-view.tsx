// Native DOM view for the URI family (url | email). Dependency-light: plain JSX
// + Tailwind v4 + local `cn`. Reads the render payload off `props.cell`
// (`data` -> address, `displayData` -> visible label). Only an address that may open
// (`uriCellHref`: http, https or mailto) is shown as a link; an empty cell or any other
// text is plain text.
//
// The link works only in the active cell, the same rule as the relation chips: the
// first click on a cell selects it, and a deliberate click on the link in the active
// cell opens it (a new tab, or the mail app for an email). Before that the label is
// plain text in the link color, so a selecting click never leaves the grid. The second
// click of a double-click belongs to the cell (it opens the editor), so it never follows
// the link. From the keyboard, Enter edits the cell and the grid's "Open link" command
// opens it (through `openUriCellLink`, the same rule).

import type { CellProps } from '../cell-props';
import { uriCellHref } from '../uri-link';
import { cn } from '../../utils/cn';

export function UriCellView(props: CellProps) {
	const label = props.cell.displayData;
	const href = uriCellHref(props.cell);

	return (
		<div data-slot="uri-cell" className="flex h-full w-full min-w-0 items-center px-3 text-sm">
			{href && props.isActive ? (
				<a
					href={href}
					// The mail app takes a mailto address without leaving the page; a new tab would stay empty.
					target={href.startsWith('mailto:') ? undefined : '_blank'}
					rel="noreferrer"
					title={label}
					className={cn('truncate text-info underline-offset-2 hover:underline', 'focus-visible:outline-hidden')}
					onClick={(event) => {
						if (event.detail >= 2) event.preventDefault();
					}}
				>
					{label}
				</a>
			) : (
				<span className={cn('truncate', href && 'text-info')} title={label || undefined}>
					{label}
				</span>
			)}
		</div>
	);
}

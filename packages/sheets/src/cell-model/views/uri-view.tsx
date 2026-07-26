// Native DOM view for the URI family (url | email). Dependency-light: plain JSX
// + Tailwind v4 + local `cn`. Reads the render payload off `props.cell`
// (`data` -> href, `displayData` -> visible label). The view owns the click
// (v1's UriCellFactory dropped its onClickUri side-effect): the anchor opens in
// a new tab. Empty cells (`data === ''`) render inert text, not a dead link.

import type { CellProps } from '../cell-props';
import { cn } from '../../utils/cn';

export function UriCellView(props: CellProps) {
	const { cell } = props;
	const href = String(cell.data ?? '');
	const label = cell.displayData;
	const hasHref = href.length > 0;

	return (
		<div role="gridcell" data-slot="uri-cell" className="flex h-full w-full min-w-0 items-center px-3 text-sm">
			{hasHref ? (
				<a
					href={href}
					target="_blank"
					rel="noreferrer"
					title={label}
					className={cn('truncate text-info underline-offset-2 hover:underline', 'focus-visible:outline-hidden')}
				>
					{label}
				</a>
			) : (
				<span className="truncate text-muted-foreground">{label}</span>
			)}
		</div>
	);
}

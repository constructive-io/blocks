// Default DOM view for the grid-internal `loading` SheetsCell kind — the cell an
// infinite-scroll row shows while its page is still in flight (getRowAtIndex is
// null, so there is no value to render). The native analogue of v1's canvas
// loading skeleton: a subtle `animate-pulse` placeholder bar filling the cell.
// Dependency-light: plain JSX + Tailwind v4 + local `cn`, no @constructive-io/ui.

import type { CellProps } from '../cell-props';
import { cn } from '../../utils/cn';

export function LoadingCellView(_props: CellProps) {
	return (
		<div
			role="gridcell"
			data-slot="loading-cell"
			aria-busy="true"
			className={cn('flex h-full w-full items-center px-3')}
		>
			<span
				aria-hidden="true"
				className={cn('h-3 w-3/5 max-w-full rounded-full bg-muted', 'animate-pulse')}
			/>
		</div>
	);
}

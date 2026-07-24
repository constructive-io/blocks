// Default DOM view for the interval SheetsCell family. Dependency-light: plain
// JSX + Tailwind v4 + a local `cn`. No @constructive-io/ui this phase. The
// compact interval label already lives in `cell.displayData` (computed by the
// interval factory), so the view is a pure read of that string.

import type { CellProps } from '../cell-props';
import { cn } from '../../utils/cn';

export function IntervalCellView(props: CellProps) {
	const { cell } = props;
	return (
		<div
			role="gridcell"
			data-slot="interval-cell"
			className={cn('flex h-full w-full items-center truncate px-3 text-sm tabular-nums')}
		>
			{cell.displayData}
		</div>
	);
}

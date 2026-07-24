// Default DOM view for the number SheetsCell family. Dependency-light: plain JSX
// + Tailwind v4 + a `data-slot` hook, no @constructive-io/ui this phase. Numbers
// render right-aligned with tabular figures so digits line up column-wise. Reads
// the already-formatted string off `props.cell.displayData` (the factory put
// String(numValue) | '' there); the view does no numeric formatting itself.

import type { CellProps } from '../cell-props';
import { cn } from '../../utils/cn';

export function NumberCellView(props: CellProps) {
	const { cell } = props;
	return (
		<div
			role="gridcell"
			data-slot="number-cell"
			className={cn('flex h-full w-full items-center justify-end truncate px-3 text-right text-sm tabular-nums text-foreground')}
		>
			{cell.displayData}
		</div>
	);
}

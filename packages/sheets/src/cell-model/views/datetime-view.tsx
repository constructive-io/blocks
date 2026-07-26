// Default DOM view for the datetime family. v1 renders the formatted date/time
// as plain text inside the canvas; the native analogue is a single truncated
// text span. Dependency-light: plain JSX + Tailwind v4 + local `cn`, no
// @constructive-io/ui this phase. Reads the rendered string off the SheetsCell
// payload (`cell.displayData`) so it stays in lockstep with the factory.

import type { CellProps } from '../cell-props';
import { cn } from '../../utils/cn';

export function DateTimeCellView(props: CellProps) {
	const text = props.cell.displayData;

	return (
		<div
			role="gridcell"
			data-slot="datetime-cell"
			title={text}
			className={cn('flex h-full w-full items-center truncate px-3 text-sm tabular-nums')}
		>
			<span className="truncate">{text}</span>
		</div>
	);
}

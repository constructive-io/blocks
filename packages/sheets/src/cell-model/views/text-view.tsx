// Default DOM view for the text family (the fallback). v1 renders the value as
// plain truncated text inside the canvas; the native analogue is a single
// truncated span. Dependency-light: plain JSX + Tailwind v4 + local `cn`, no
// @constructive-io/ui this phase. Reads the rendered string off the SheetsCell
// payload (`cell.displayData`) so it stays in lockstep with the factory.

import type { CellProps } from '../cell-props';
import { cn } from '../../utils/cn';

export function TextCellView(props: CellProps) {
	const text = props.cell.displayData;

	return (
		<div
			role="gridcell"
			data-slot="text-cell"
			title={text}
			className={cn('flex h-full w-full items-center truncate px-3 text-sm')}
		>
			<span className="truncate">{text}</span>
		</div>
	);
}

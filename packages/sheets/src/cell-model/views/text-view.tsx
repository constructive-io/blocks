// Default DOM view for the text family (the fallback). v1 renders the value as
// plain truncated text inside the canvas; the native analogue is a single
// truncated span. Dependency-light: plain JSX + Tailwind v4 + local `cn`, no
// shared primitive dependency. Reads the rendered string off the SheetsCell
// payload (`cell.displayData`) so it stays in lockstep with the factory.

import { TABULAR_TEXT_TYPES } from '../../cell-types/cell-type-groups';
import type { CellProps } from '../cell-props';
import { cn } from '../../utils/cn';

/** The title behind a display that is not the stored text: the factory's title (a date or
 * time with the zone it is shown in), else the exact stored text. */
function exactText(cell: CellProps['cell']): string {
	if (typeof cell.meta?.title === 'string' && cell.meta.title) return cell.meta.title;
	return typeof cell.data === 'string' && cell.data !== cell.displayData ? cell.data : '';
}

export function TextCellView(props: CellProps) {
	const text = props.cell.displayData;
	// Dates, times and other digit-heavy values line up down the column (tabular figures).
	const tabular = TABULAR_TEXT_TYPES.has(props.cell.meta?.cellType ?? '');

	return (
		<div
			data-slot="text-cell"
			title={[exactText(props.cell) || text, props.readOnlyReason].filter(Boolean).join('\n')}
			className={cn('flex h-full w-full items-center truncate px-3 text-sm', tabular && 'tabular-nums')}
		>
			<span className="truncate">{text}</span>
		</div>
	);
}

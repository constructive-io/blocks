// Default DOM view for the number SheetsCell family. Dependency-light: plain JSX
// + Tailwind v4 + a `data-slot` hook, with no shared primitive dependency. Numbers
// render right-aligned with tabular figures so digits line up column-wise. Reads
// the already-formatted string off `props.cell.displayData` (the factory put the
// exact value there); the view does no numeric formatting itself.
//
// A value wider than its column must never read as a different number. Right
// alignment alone would clip it on the LEFT (dropping the sign and the leading
// digits, with no marker), so the text sits in a shrinkable span: while it fits it
// is right-aligned; when it does not, it keeps its sign and leading digits and ends
// with an ellipsis. The full value is always in the title.

import type { CellProps } from '../cell-props';

export function NumberCellView(props: CellProps) {
	const text = props.cell.displayData;
	const title = [text, props.readOnlyReason].filter(Boolean).join('\n');
	return (
		<div
			data-slot="number-cell"
			title={title || undefined}
			className="flex h-full w-full min-w-0 items-center justify-end px-3 text-sm tabular-nums text-foreground"
		>
			<span data-truncate="end" className="min-w-0 truncate">
				{text}
			</span>
		</div>
	);
}

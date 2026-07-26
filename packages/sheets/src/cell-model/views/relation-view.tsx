// Default DOM view for the `relation` SheetsCell family. Dependency-light: plain
// JSX + Tailwind v4 + a local `cn`, no @constructive-io/ui this phase. Reads the
// render payload off `props.cell` (produced by relationSheetsCellFactory):
//   - list relation  -> cell.data is string[] (chips, possibly a trailing "+N")
//   - single relation -> cell.data is a string label
// The factory already truncated labels and computed overflow; the view only paints.
//
// PARITY (canvas grid/draw-relation-badge.ts): for a list relation, paint a leading
// COUNT BADGE pill — the number of related items — before the chips, mirroring the
// canvas `drawRelationBadge`. Item count matches the canvas `getRelationCount`: the
// trailing "+N" overflow chip means count = (chips − 1) + N, otherwise chips.length.
// The single-relation (string) path stays plain text.

import React from 'react';

import { cn } from '../../utils/cn';
import type { CellProps } from '../cell-props';

// Mirrors canvas `getRelationCount` for the Bubble (list) branch: a trailing "+N"
// element is an overflow indicator, so the true count is (visible chips) + N.
function getListRelationCount(chips: unknown[]): number {
	const last = chips[chips.length - 1];
	if (typeof last === 'string' && last.startsWith('+')) {
		const overflow = parseInt(last.slice(1), 10);
		if (!isNaN(overflow)) return chips.length - 1 + overflow;
	}
	return chips.length;
}

export function RelationCellView(props: CellProps): React.JSX.Element {
	const { cell } = props;
	const isList = Array.isArray(cell.data);

	if (!isList) {
		return (
			<div
				data-slot="relation-cell"
				role="gridcell"
				className="flex h-full w-full items-center gap-1 overflow-hidden px-3 text-sm"
			>
				<span className="truncate text-foreground">{String(cell.data ?? '')}</span>
			</div>
		);
	}

	const chips = cell.data as unknown[];
	const count = getListRelationCount(chips);

	return (
		<div
			data-slot="relation-cell"
			role="gridcell"
			className="flex h-full w-full items-center gap-1 overflow-hidden px-3 text-sm"
		>
			{count > 0 ? (
				<span
					data-slot="relation-count-badge"
					className={cn(
						'inline-flex shrink-0 items-center rounded-sm border border-border bg-muted',
						'px-1 text-[10px] font-medium text-muted-foreground tabular-nums',
					)}
				>
					{count}
				</span>
			) : null}
			{chips.map((chip, index) => (
				<span
					key={index}
					className={cn(
						'inline-flex shrink-0 items-center rounded-md bg-muted px-1.5 py-0.5',
						'text-xs font-medium text-muted-foreground',
					)}
				>
					{String(chip)}
				</span>
			))}
		</div>
	);
}

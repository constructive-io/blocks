// Default DOM view for the `relation` SheetsCell family. Reads the payload
// relationSheetsCellFactory produced:
//   - list relation   -> cell.data is string[] chips, possibly ending in "+N";
//                        cell.meta.relationTitles holds the full chip labels and
//                        cell.meta.relationCount every linked record.
//   - single relation -> cell.data is a string label; cell.meta.relationTitle the full label.
//   - both            -> cell.meta.relationTarget / relationLinks name the shown records.
// Truncated labels carry their full text as a title. In the ACTIVE cell, when the
// host handles opening linked records (SheetsOpenRecordContext), each identifiable
// chip is a button that opens its record on a single click; a double-click keeps
// its grid meaning (open the link editor); elsewhere a click selects the cell.

import React from 'react';

import { useOpenRecordHandler, type SheetsOpenRecordHandler } from '../../relations/relation-navigation';
import { cn } from '../../utils/cn';
import type { RelationCellLink } from '../factories/relation';
import type { CellProps } from '../cell-props';

const OVERFLOW_CHIP = /^\+(\d+)$/;

function stringList(value: unknown): string[] | null {
	return Array.isArray(value) && value.every((entry) => typeof entry === 'string') ? (value as string[]) : null;
}

function linksOf(value: unknown): RelationCellLink[] {
	return Array.isArray(value) ? (value as RelationCellLink[]) : [];
}

function targetOf(value: unknown): { tableKey: string; tableName: string } | null {
	if (!value || typeof value !== 'object') return null;
	const target = value as { tableKey?: unknown; tableName?: unknown };
	return typeof target.tableKey === 'string' && typeof target.tableName === 'string'
		? { tableKey: target.tableKey, tableName: target.tableName }
		: null;
}

/** A chip label that opens its record, or plain text when it cannot. */
function ChipContent({
	text,
	title,
	link,
	open,
	className,
}: {
	text: string;
	title: string;
	link: RelationCellLink | undefined;
	open: ((link: RelationCellLink) => void) | null;
	className?: string;
}) {
	if (!open || !link?.key) {
		return (
			<span className={cn('truncate', className)} title={title || undefined}>
				{text}
			</span>
		);
	}
	return (
		<button
			type='button'
			className={cn('truncate underline-offset-2 hover:underline focus-visible:underline', className)}
			title={`Open ${title}`}
			aria-label={`Open ${title}`}
			onClick={(event) => {
				// The second click of a double-click belongs to the cell: it opens the link editor.
				if (event.detail >= 2) return;
				event.stopPropagation();
				open(link);
			}}
		>
			{text}
		</button>
	);
}

function useOpenLink(props: CellProps): ((link: RelationCellLink) => void) | null {
	const handler: SheetsOpenRecordHandler | null = useOpenRecordHandler();
	const target = targetOf(props.cell.meta?.relationTarget);
	if (!props.isActive || !handler || !target) return null;
	return (link) => {
		if (link.key) handler({ tableKey: target.tableKey, tableName: target.tableName, key: link.key, label: link.label });
	};
}

export function RelationCellView(props: CellProps): React.JSX.Element {
	const { cell } = props;
	const meta = cell.meta ?? {};
	const links = linksOf(meta.relationLinks);
	const open = useOpenLink(props);

	if (!Array.isArray(cell.data)) {
		const label = String(cell.data ?? '');
		const title = typeof meta.relationTitle === 'string' && meta.relationTitle ? meta.relationTitle : label;
		return (
			<div
				data-slot="relation-cell"
				className="flex h-full w-full items-center gap-1 overflow-hidden px-3 text-sm"
			>
				<ChipContent text={label} title={title} link={links[0]} open={open} className="text-foreground" />
			</div>
		);
	}

	const chips = cell.data as unknown[];
	const titles = stringList(meta.relationTitles) ?? [];
	const lastMatch = typeof chips[chips.length - 1] === 'string' ? OVERFLOW_CHIP.exec(chips[chips.length - 1] as string) : null;
	const labels = lastMatch ? chips.slice(0, -1) : chips;
	const overflow = lastMatch ? Number(lastMatch[1]) : 0;
	const count = typeof meta.relationCount === 'number' ? meta.relationCount : labels.length + overflow;

	return (
		<div
			data-slot="relation-cell"
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
			{labels.map((chip, index) => (
				<span
					key={index}
					className={cn(
						'inline-flex min-w-0 max-w-[12rem] shrink items-center rounded-md bg-muted px-1.5 py-0.5',
						'text-xs font-medium text-muted-foreground',
					)}
				>
					<ChipContent text={String(chip)} title={titles[index] ?? String(chip)} link={links[index]} open={open} />
				</span>
			))}
			{overflow > 0 ? (
				<span className="inline-flex shrink-0 items-center px-1 text-xs text-muted-foreground tabular-nums" title={`${overflow} more linked records`}>
					+{overflow} more
				</span>
			) : null}
		</div>
	);
}

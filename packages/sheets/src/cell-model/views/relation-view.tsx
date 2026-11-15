// Default DOM view for the `relation` SheetsCell family. Reads the payload
// relationSheetsCellFactory produced:
//   - list relation   -> cell.data is string[] chips, possibly ending in "+N";
//                        cell.meta.relationTitles holds the full chip labels and
//                        cell.meta.relationCount every linked record.
//   - single relation -> cell.data is a string label; cell.meta.relationTitle the full label.
//   - both            -> cell.meta.relationTarget / relationLinks name the shown records.
// Truncated labels carry their full text as a title. In the ACTIVE cell, when the
// host handles opening linked records (SheetsOpenRecordContext), each identifiable
// chip gets an open icon (as in the record panel) that opens its record, and a
// Mod+click on the chip does the same. A plain click or a double-click on the chip
// keeps its grid meaning (select the cell, open the link editor), so one gesture
// never opens two surfaces.

import React from 'react';
import { ExternalLink } from 'lucide-react';

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

/** A chip label, with an icon that opens its record when it can. */
function ChipContent({
	text,
	title,
	link,
	open,
	className,
	inChip = false,
}: {
	text: string;
	title: string;
	link: RelationCellLink | undefined;
	open: ((link: RelationCellLink) => void) | null;
	className?: string;
	/**
	 * In a list chip the icon shows only while the chip is hovered; a single link pins it to
	 * the cell's right edge. Either way a press on the middle of the cell selects or edits it.
	 */
	inChip?: boolean;
}) {
	const openLink = open && link?.key ? () => open(link) : null;
	return (
		<>
			<span
				className={cn('truncate', !inChip && 'min-w-0 flex-1', className)}
				title={title || undefined}
				onClick={
					openLink
						? (event) => {
								// Mod+click opens the record; a plain click belongs to the cell.
								if (!(event.metaKey || event.ctrlKey)) return;
								event.stopPropagation();
								openLink();
							}
						: undefined
				}
			>
				{text}
			</span>
			{openLink ? (
				<button
					type='button'
					data-slot='relation-open'
					className={cn(
						'text-muted-foreground hover:text-foreground focus-visible:text-foreground inline-flex size-4 shrink-0 items-center justify-center rounded-sm outline-none',
						inChip && 'invisible group-hover/chip:visible',
					)}
					title={`Open ${title}`}
					aria-label={`Open ${title}`}
					onClick={(event) => {
						event.stopPropagation();
						openLink();
					}}
					// A fast second click on the icon is still opening, never the cell's editor.
					onDoubleClick={(event) => event.stopPropagation()}
				>
					<ExternalLink className='size-3' aria-hidden='true' />
				</button>
			) : null}
		</>
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
						'group/chip inline-flex min-w-0 max-w-[12rem] shrink items-center gap-0.5 rounded-md bg-muted px-1.5 py-0.5',
						'text-xs font-medium text-muted-foreground',
					)}
				>
					<ChipContent text={String(chip)} title={titles[index] ?? String(chip)} link={links[index]} open={open} inChip />
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

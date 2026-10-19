'use client';

import { ArrowDownWideNarrowIcon, ArrowUpNarrowWideIcon, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';

import { formatCount } from '../../lib/intl';
import { cn } from '../../lib/utils';
import { Button } from '../button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '../dropdown-menu';
import { focusRingClass, pressClass } from '../workspace-kit/primitives';
import { isSortable, visibleFields } from './fields';
import type { AnyResource, ListQuery } from './types';

type Sort = NonNullable<ListQuery['sort']>;

/** The column and direction as one compact menu, for widths where headers are folded away. */
export function SortMenu({ resource, sort, onSortChange }: { resource: AnyResource; sort: Sort | undefined; onSortChange: (sort: Sort) => void }) {
	const fields = visibleFields(resource, [...new Set([...resource.columns, ...(resource.defaultSort ? [resource.defaultSort.field] : [])])]).filter(isSortable);
	if (fields.length === 0) return null;
	const active = fields.find((field) => field.name === sort?.field);
	const direction = sort?.direction ?? 'asc';
	const DirectionIcon = direction === 'asc' ? ArrowUpNarrowWideIcon : ArrowDownWideNarrowIcon;
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				aria-label={active ? `Sort by ${active.label}, ${direction === 'asc' ? 'ascending' : 'descending'}` : 'Sort'}
				className={cn(
					'inline-flex h-7 max-w-40 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-card px-2 text-[0.8125rem] text-foreground shadow-2xs hover:bg-muted data-[popup-open]:bg-muted',
					pressClass,
					focusRingClass,
				)}
			>
				<DirectionIcon aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
				<span aria-hidden="true" className="hidden truncate @md/view:inline">
					{active?.label ?? 'Sort'}
				</span>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="max-w-64 min-w-44">
				<DropdownMenuLabel>Sort by</DropdownMenuLabel>
				<DropdownMenuRadioGroup value={sort?.field ?? ''} onValueChange={(value) => onSortChange({ field: String(value), direction })}>
					{fields.map((field) => (
						<DropdownMenuRadioItem key={field.name} value={field.name}>
							<span className="truncate">{field.label}</span>
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
				<DropdownMenuSeparator />
				<DropdownMenuLabel>Direction</DropdownMenuLabel>
				<DropdownMenuRadioGroup
					value={direction}
					onValueChange={(value) => onSortChange({ field: sort?.field ?? fields[0]!.name, direction: value === 'desc' ? 'desc' : 'asc' })}
				>
					<DropdownMenuRadioItem value="asc">Ascending</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value="desc">Descending</DropdownMenuRadioItem>
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

type ListPaginationProps = {
	offset: number;
	limit: number;
	totalCount: number;
	onOffsetChange: (offset: number) => void;
	locale?: string;
	className?: string;
};

/** "26–50 of 1,284" with previous and next. Hidden when everything fits on one page. */
export function ListPagination({ offset, limit, totalCount, onOffsetChange, locale, className }: ListPaginationProps) {
	if (totalCount <= limit && offset === 0) return null;
	const first = totalCount === 0 ? 0 : offset + 1;
	const last = Math.min(offset + limit, totalCount);
	return (
		<nav aria-label="Pagination" className={cn('flex flex-wrap items-center justify-between gap-2', className)}>
			<p className="text-xs text-muted-foreground tabular-nums" aria-live="polite">
				{formatCount(first, locale)}–{formatCount(last, locale)} of {formatCount(totalCount, locale)}
			</p>
			<div className="flex items-center gap-1">
				<Button size="xs" variant="outline" disabled={offset === 0} onClick={() => onOffsetChange(Math.max(0, offset - limit))} aria-label="Previous page">
					<ChevronLeftIcon aria-hidden="true" className="rtl:rotate-180" />
					<span className="hidden @md/view:inline">Previous</span>
				</Button>
				<Button size="xs" variant="outline" disabled={last >= totalCount} onClick={() => onOffsetChange(offset + limit)} aria-label="Next page">
					<span className="hidden @md/view:inline">Next</span>
					<ChevronRightIcon aria-hidden="true" className="rtl:rotate-180" />
				</Button>
			</div>
		</nav>
	);
}

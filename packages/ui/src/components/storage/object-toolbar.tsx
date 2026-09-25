'use client';

import { ArrowDownWideNarrowIcon, ArrowUpNarrowWideIcon, Loader2Icon, Trash2Icon, UploadIcon, XIcon } from 'lucide-react';
import * as React from 'react';

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
import { enterClass, focusRingClass, pressClass, SearchField } from '../workspace-kit/primitives';
import type { ObjectSort, ObjectSortColumn } from './types';

const SORT_COLUMNS: { value: ObjectSortColumn; label: string }[] = [
	{ value: 'filename', label: 'Name' },
	{ value: 'size', label: 'Size' },
	{ value: 'createdAt', label: 'Modified' },
	{ value: 'mimeType', label: 'Type' },
];

type BulkDeleteProgress = { done: number; total: number; failed: string[] };

interface ObjectSelectionBarProps {
	selectedCount: number;
	/** Signals intent to delete the selection; the parent binds the ids and confirms. */
	onBulkDelete?: () => void;
	/** In-flight bulk delete: shows "Deleting N/M" and disables the actions; failed ids surface as a note. */
	bulkDeleteProgress?: BulkDeleteProgress;
	onClearSelection?: () => void;
	/** Float over the bottom of the list instead of sitting inline. */
	floating?: boolean;
	className?: string;
}

/**
 * `ObjectSelectionBar` — what to do with the selected files: a count, a
 * destructive Delete, and Clear. Announces the selection and bulk-delete
 * progress to screen readers; renders only the announcer when nothing is
 * selected.
 */
export function ObjectSelectionBar({ selectedCount, onBulkDelete, bulkDeleteProgress, onClearSelection, floating = false, className }: ObjectSelectionBarProps) {
	const deleting = bulkDeleteProgress != null && bulkDeleteProgress.done < bulkDeleteProgress.total;
	const failed = bulkDeleteProgress?.failed.length ?? 0;
	const noun = selectedCount === 1 ? 'file' : 'files';
	const progress = bulkDeleteProgress
		? deleting
			? ` Deleting ${bulkDeleteProgress.done} of ${bulkDeleteProgress.total}.`
			: ` Deletion finished: ${bulkDeleteProgress.done} of ${bulkDeleteProgress.total} processed.`
		: '';
	const status = selectedCount > 0 ? `${selectedCount} ${noun} selected.${progress}${failed > 0 ? ` ${failed} failed.` : ''}` : 'No files selected.';

	return (
		<>
			<span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
				{status}
			</span>
			{selectedCount > 0 ? (
				<div
					className={cn(
						'flex h-9 items-center gap-1 rounded-lg pr-1 pl-3 text-[13px]',
						floating ? cn('bg-card shadow-card-lg', enterClass) : 'bg-muted/60',
						className,
					)}
				>
					<span className="font-medium text-foreground tabular-nums">{selectedCount} selected</span>
					{failed > 0 ? <span className="text-xs text-destructive tabular-nums">· {failed} failed</span> : null}
					<span aria-hidden="true" className="mx-1.5 h-4 w-px bg-border" />
					{onBulkDelete ? (
						<button
							type="button"
							onClick={onBulkDelete}
							disabled={deleting}
							className={cn(
								'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md px-2 text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60',
								pressClass,
								focusRingClass,
							)}
						>
							{deleting ? <Loader2Icon aria-hidden="true" className="size-3.5 motion-safe:animate-spin" /> : <Trash2Icon aria-hidden="true" className="size-3.5" />}
							<span className="tabular-nums">{deleting ? `Deleting ${bulkDeleteProgress.done}/${bulkDeleteProgress.total}` : 'Delete'}</span>
						</button>
					) : null}
					{onClearSelection ? (
						<button
							type="button"
							onClick={onClearSelection}
							disabled={deleting}
							aria-label="Clear selection"
							className={cn(
								'grid size-7 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-overlay-hover hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60',
								pressClass,
								focusRingClass,
							)}
						>
							<XIcon aria-hidden="true" className="size-3.5" />
						</button>
					) : null}
				</div>
			) : null}
		</>
	);
}

interface ObjectToolbarProps {
	query: string;
	onQueryChange: (query: string) => void;
	sort: ObjectSort;
	onSortChange: (sort: ObjectSort) => void;
	onUpload?: () => void;
	/** Number of currently selected objects. >0 swaps to the selection bar. */
	selectedCount?: number;
	/** Signals intent to delete the selection; the parent binds the ids + confirms. */
	onBulkDelete?: () => void;
	/**
	 * Progress for an in-flight bulk delete: while set, the Delete button shows a
	 * "Deleting N/M" count and is disabled; any failed ids surface as a note.
	 */
	bulkDeleteProgress?: BulkDeleteProgress;
	onClearSelection?: () => void;
	className?: string;
}

/** Compact sort menu: the column and direction, as one control. */
export function ObjectSortMenu({ sort, onSortChange }: Pick<ObjectToolbarProps, 'sort' | 'onSortChange'>) {
	const active = SORT_COLUMNS.find((column) => column.value === sort.column);
	const DirectionIcon = sort.direction === 'asc' ? ArrowUpNarrowWideIcon : ArrowDownWideNarrowIcon;
	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				aria-label={`Sort by ${active?.label ?? 'column'}, ${sort.direction === 'asc' ? 'ascending' : 'descending'}`}
				className={cn(
					'inline-flex h-7 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-card px-2 text-[13px] text-foreground shadow-2xs hover:bg-muted data-[popup-open]:bg-muted',
					pressClass,
					focusRingClass,
				)}
			>
				<DirectionIcon aria-hidden="true" className="size-3.5 text-muted-foreground" />
				<span aria-hidden="true" className="hidden @md/view:inline">
					{active?.label ?? 'Sort'}
				</span>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="min-w-44">
				<DropdownMenuLabel>Sort by</DropdownMenuLabel>
				<DropdownMenuRadioGroup value={sort.column} onValueChange={(value) => onSortChange({ ...sort, column: value as ObjectSortColumn })}>
					{SORT_COLUMNS.map((column) => (
						<DropdownMenuRadioItem key={column.value} value={column.value}>
							{column.label}
						</DropdownMenuRadioItem>
					))}
				</DropdownMenuRadioGroup>
				<DropdownMenuSeparator />
				<DropdownMenuLabel>Direction</DropdownMenuLabel>
				<DropdownMenuRadioGroup value={sort.direction} onValueChange={(value) => onSortChange({ ...sort, direction: value as ObjectSort['direction'] })}>
					<DropdownMenuRadioItem value="asc">Ascending</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value="desc">Descending</DropdownMenuRadioItem>
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

/**
 * `ObjectToolbar` — search, sort, and upload. When `selectedCount > 0` it
 * swaps to the selection bar (count, destructive Delete, Clear). Fully
 * controlled; Delete only signals intent, so route it through a confirmation.
 */
export function ObjectToolbar({
	query,
	onQueryChange,
	sort,
	onSortChange,
	onUpload,
	selectedCount = 0,
	onBulkDelete,
	bulkDeleteProgress,
	onClearSelection,
	className,
}: ObjectToolbarProps) {
	if (selectedCount > 0) {
		return (
			<ObjectSelectionBar
				selectedCount={selectedCount}
				onBulkDelete={onBulkDelete}
				bulkDeleteProgress={bulkDeleteProgress}
				onClearSelection={onClearSelection}
				className={className}
			/>
		);
	}

	return (
		<>
			<ObjectSelectionBar selectedCount={0} />
			<div className={cn('flex items-center gap-2', className)}>
				<SearchField
					label="Search files"
					placeholder="Search files"
					value={query}
					onChange={(event) => onQueryChange(event.target.value)}
					className="w-full min-w-0 @md/view:w-56"
				/>
				<ObjectSortMenu sort={sort} onSortChange={onSortChange} />
				{onUpload ? (
					<Button aria-label="Upload files" size="sm" className="h-7 shrink-0" onClick={onUpload}>
						<UploadIcon aria-hidden="true" data-icon="inline-start" />
						<span className="hidden @md/view:inline">Upload</span>
					</Button>
				) : null}
			</div>
		</>
	);
}

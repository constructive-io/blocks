'use client';

/**
 * Search and pick related records. The search box drives a listbox
 * (combobox pattern): ArrowUp/ArrowDown/Home/End move the highlight, Enter
 * picks or unpicks it, and focus stays in the search box. Records load page
 * by page from the related table.
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent, type UIEvent } from 'react';
import { Check, Loader2, Search } from 'lucide-react';

import type { RelationModel } from '@constructive-io/data';
import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@constructive-io/ui/input-group';

import { cn } from '../utils/cn';
import { linkKey, type RecordValues } from './relation-keys';
import { relationRecordLabel } from './relation-label';

export interface RelationPickerProps {
	relation: RelationModel;
	/** Name of the related table, for the heading. */
	targetName: string;
	search: string;
	onSearchChange: (text: string) => void;
	/** Why the records cannot be searched, or null when they can. */
	searchReason: string | null;
	candidates: readonly RecordValues[];
	total: number | null;
	isLoading: boolean;
	error: Error | null;
	hasNextPage: boolean;
	isFetchingNextPage: boolean;
	onLoadMore: () => void;
	isSelected: (record: RecordValues) => boolean;
	onToggle: (record: RecordValues) => void;
	disabled: boolean;
	/** Text for a record that is linked elsewhere and will move here, or null. */
	moveHint?: (record: RecordValues) => string | null;
	/** Focus the search box when the picker mounts. Default true. */
	autoFocus?: boolean;
	/** Escape in the search box: close the picker (a record panel section). Omit to let Escape reach the host (the cell editor closes). */
	onEscape?: () => void;
}

const LOAD_MORE_MARGIN_PX = 48;

export function RelationPicker({
	relation,
	targetName,
	search,
	onSearchChange,
	searchReason,
	candidates,
	total,
	isLoading,
	error,
	hasNextPage,
	isFetchingNextPage,
	onLoadMore,
	isSelected,
	onToggle,
	disabled,
	moveHint,
	autoFocus = true,
	onEscape,
}: RelationPickerProps) {
	const baseId = useId();
	const listId = `${baseId}-options`;
	const [active, setActive] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);
	const count = candidates.length;

	// The picker mounts once the related table is known; start typing right away.
	useEffect(() => {
		if (autoFocus) inputRef.current?.focus();
		// Only on mount: a later prop change must not steal focus.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		setActive((index) => (count === 0 ? 0 : Math.min(index, count - 1)));
	}, [count]);
	useEffect(() => {
		setActive(0);
	}, [search]);

	// A to-one relation picks one record; a to-many relation adds records.
	const verb = relation.kind === 'belongsTo' || relation.kind === 'hasOne' ? 'Choose from' : 'Add from';
	const optionId = (index: number) => `${baseId}-option-${index}`;
	const activeRecord = candidates[active];

	const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'Escape' && onEscape) {
			event.preventDefault();
			event.stopPropagation();
			onEscape();
			return;
		}
		if (count === 0) return;
		if (event.key === 'ArrowDown') {
			event.preventDefault();
			setActive((index) => {
				const next = Math.min(index + 1, count - 1);
				if (next === count - 1 && hasNextPage && !isFetchingNextPage) onLoadMore();
				return next;
			});
		} else if (event.key === 'ArrowUp') {
			event.preventDefault();
			setActive((index) => Math.max(index - 1, 0));
		} else if (event.key === 'Home') {
			event.preventDefault();
			setActive(0);
		} else if (event.key === 'End') {
			event.preventDefault();
			setActive(count - 1);
		} else if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey) {
			event.preventDefault();
			if (activeRecord && !disabled) onToggle(activeRecord);
		}
	};

	useEffect(() => {
		if (typeof document === 'undefined') return;
		document.getElementById(optionId(active))?.scrollIntoView?.({ block: 'nearest' });
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [active]);

	const handleScroll = (event: UIEvent<HTMLDivElement>) => {
		const element = event.currentTarget;
		if (!hasNextPage || isFetchingNextPage) return;
		if (element.scrollTop + element.clientHeight >= element.scrollHeight - LOAD_MORE_MARGIN_PX) onLoadMore();
	};

	return (
		<section aria-label={`${verb} ${targetName}`} className='flex flex-col gap-1.5'>
			<div className='text-muted-foreground flex items-center gap-2 text-xs'>
				<span>{verb}</span>
				<Badge variant='outline' size='sm' className='max-w-[12rem] truncate' title={targetName}>
					{targetName}
				</Badge>
				{total !== null ? (
					<Badge variant='secondary' size='sm' className='ml-auto tabular-nums'>
						{count} / {total}
					</Badge>
				) : null}
			</div>
			<InputGroup>
				<InputGroupAddon>
					<Search />
				</InputGroupAddon>
				<InputGroupInput
					ref={inputRef}
					role='combobox'
					aria-expanded='true'
					aria-controls={listId}
					aria-autocomplete='list'
					aria-activedescendant={activeRecord ? optionId(active) : undefined}
					aria-label={`Search ${targetName}`}
					value={search}
					onChange={(event) => onSearchChange(event.target.value)}
					onKeyDown={handleKeyDown}
					// The reason sits in the box itself, so no extra line appears once it is known.
					placeholder={searchReason ?? 'Type to search…'}
					disabled={Boolean(searchReason)}
					title={searchReason ?? undefined}
					size='sm'
				/>
			</InputGroup>
			{/* A fixed height, so the editor does not change size as records load or a search narrows them. */}
			<div className='h-48 overflow-y-auto rounded-md border' onScroll={handleScroll}>
				<div id={listId} role='listbox' aria-label={targetName} aria-multiselectable={relation.kind === 'hasMany' || relation.kind === 'manyToMany'} data-testid='relation-options' className='space-y-0.5 p-1'>
					{isLoading ? (
						<div className='text-muted-foreground flex items-center justify-center gap-2 py-5 text-sm'>
							<Loader2 className='h-3.5 w-3.5 animate-spin' aria-hidden />
							Loading…
						</div>
					) : error ? (
						<div role='alert' className='text-destructive px-2 py-4 text-sm'>
							The records could not be loaded: {error.message}
						</div>
					) : count === 0 ? (
						<div className='text-muted-foreground py-5 text-center text-sm'>{search.trim() ? 'No matching records' : 'No records yet'}</div>
					) : (
						candidates.map((record, index) => {
							const label = relationRecordLabel(relation, record) || 'Unnamed record';
							const selected = isSelected(record);
							const hint = selected ? null : moveHint?.(record) ?? null;
							return (
								<div
									key={linkKey(relation, record) ?? `row-${index}`}
									id={optionId(index)}
									role='option'
									aria-selected={selected}
									aria-disabled={disabled}
									data-active={index === active || undefined}
									onMouseDown={(event) => event.preventDefault()}
									onMouseEnter={() => setActive(index)}
									onClick={() => {
										if (!disabled) onToggle(record);
									}}
									className={cn(
										// Options nest in the bordered list: radius = list radius - (border 1px + padding 4px).
										'flex items-center gap-2 rounded-[calc(var(--radius-md)-5px)] px-2 py-1.5',
										disabled ? 'cursor-not-allowed opacity-64' : 'cursor-pointer',
										index === active && 'bg-accent/60',
										selected && 'text-link',
									)}
								>
									<div className='min-w-0 flex-1'>
										<div className='truncate text-sm' title={label}>
											{label}
										</div>
										{hint ? <div className='text-muted-foreground truncate text-xs'>{hint}</div> : null}
									</div>
									{selected ? <Check className='text-primary h-3.5 w-3.5 shrink-0' aria-hidden /> : null}
								</div>
							);
						})
					)}
				</div>
				{hasNextPage && !isLoading ? (
					<div className='flex justify-center py-1'>
						<Button type='button' variant='ghost' size='sm' onClick={onLoadMore} disabled={isFetchingNextPage}>
							{isFetchingNextPage ? 'Loading…' : 'Show more'}
						</Button>
					</div>
				) : null}
			</div>
		</section>
	);
}

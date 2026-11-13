'use client';

/**
 * The links a row has, as they will be after Save: current links, links the
 * user removed (struck through, with Undo) and records the user added.
 */
import { ExternalLink, Loader2, RotateCcw, X } from 'lucide-react';

import type { RelationModel } from '@constructive-io/data';
import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';

import { cn } from '../utils/cn';
import { relationRecordLabel } from './relation-label';
import type { RecordValues } from './relation-keys';
import type { PendingLink } from './use-relation-selection';

/** The list shows about five rows before it scrolls; more placeholders would only overflow. */
const MAX_PLACEHOLDER_ROWS = 5;

export interface RelationLinkListProps {
	relation: RelationModel;
	pending: readonly PendingLink[];
	/** Every current link on the server, or null when unknown. */
	total: number | null;
	isLoading: boolean;
	error: Error | null;
	hasNextPage: boolean;
	isFetchingNextPage: boolean;
	onLoadMore: () => void;
	onToggle: (record: RecordValues) => void;
	/** Why a current link cannot be removed, or null when it can. Its remove control is then not shown; the reason is. */
	removeReason: string | null;
	/** Nothing can change: no remove or undo controls. */
	readOnly: boolean;
	/** Controls are shown but not usable for now (a save is running). */
	disabled: boolean;
	/** Text for a record that is linked elsewhere and will move here, or null. */
	moveHint?: (record: RecordValues) => string | null;
	/** Open a linked record (the record panel); omit to hide the control. */
	onOpen?: (record: RecordValues) => void;
	/** Why a record cannot be opened, or null when it can. */
	openReason?: (record: RecordValues) => string | null;
	/** Show the "Linked N" line above the list. Default true. */
	showSummary?: boolean;
	/** While loading: rows to hold space for (the links the record already shows), so the list does not grow when they arrive. */
	placeholderCount?: number;
}

export function RelationLinkList({
	relation,
	pending,
	total,
	isLoading,
	error,
	hasNextPage,
	isFetchingNextPage,
	onLoadMore,
	onToggle,
	removeReason,
	readOnly,
	disabled,
	moveHint,
	onOpen,
	openReason,
	showSummary = true,
	placeholderCount = 0,
}: RelationLinkListProps) {
	const linkedCount = total ?? pending.filter((link) => link.state === 'linked').length;

	return (
		<section aria-label='Linked records' className='space-y-1.5'>
			{showSummary ? (
				<div className='text-muted-foreground flex items-center gap-2 text-xs'>
					<span>Linked</span>
					<Badge variant='outline' size='sm' className='tabular-nums' data-testid='relation-linked-count'>
						{linkedCount}
					</Badge>
				</div>
			) : null}
			<div className='max-h-44 overflow-y-auto rounded-md border' data-testid='relation-links'>
				{isLoading && placeholderCount > 0 ? (
					<ul className='space-y-1 p-1' role='status' aria-label='Loading links'>
						{Array.from({ length: Math.min(placeholderCount, MAX_PLACEHOLDER_ROWS) }, (_, index) => (
							<li key={index} aria-hidden className='bg-muted/40 h-8 animate-pulse rounded-[calc(var(--radius-md)-5px)]' />
						))}
					</ul>
				) : isLoading ? (
					<div className='text-muted-foreground flex items-center justify-center gap-2 py-4 text-sm'>
						<Loader2 className='h-3.5 w-3.5 animate-spin' aria-hidden />
						Loading links…
					</div>
				) : error ? (
					<div role='alert' className='text-destructive px-3 py-3 text-sm'>
						The links could not be loaded: {error.message}
					</div>
				) : pending.length === 0 ? (
					<div className='text-muted-foreground py-4 text-center text-sm'>No linked records</div>
				) : (
					// Rows nest in the bordered list: radius = list radius - (border 1px + padding 4px).
					<ul className='space-y-1 p-1'>
						{pending.map((link) => {
							const label = relationRecordLabel(relation, link.record) || 'Unnamed record';
							const removing = link.state === 'removed';
							const adding = link.state === 'added';
							const hint = adding ? moveHint?.(link.record) ?? null : null;
							// A link that cannot be removed gets no remove control (the reason shows below the list).
							const showToggle = !readOnly && (adding || removing || !removeReason);
							return (
								<li
									key={`${link.state}:${link.key}`}
									data-state={link.state}
									className={cn(
										'bg-muted/60 flex items-center gap-2 rounded-[calc(var(--radius-md)-5px)] px-2 py-1',
										removing && 'opacity-64',
									)}
								>
									<div className='min-w-0 flex-1'>
										<div className={cn('truncate text-sm', removing && 'line-through')} title={label}>
											{label}
										</div>
										{hint ? <div className='text-muted-foreground truncate text-xs'>{hint}</div> : null}
									</div>
									{onOpen && !removing ? (
										<Button
											type='button'
											variant='ghost'
											size='sm'
											className='h-6 w-6 shrink-0 p-0'
											disabled={Boolean(openReason?.(link.record))}
											title={openReason?.(link.record) ?? `Open ${label}`}
											aria-label={`Open ${label}`}
											onClick={() => onOpen(link.record)}
										>
											<ExternalLink className='h-3 w-3' />
										</Button>
									) : null}
									{adding ? <Badge variant='secondary' size='sm'>New</Badge> : null}
									{removing ? <Badge variant='outline' size='sm'>Removed</Badge> : null}
									{showToggle ? (
										<Button
											type='button'
											variant='ghost'
											size='sm'
											className='h-6 w-6 shrink-0 p-0'
											disabled={disabled}
											title={removing ? `Keep ${label}` : adding ? `Don't link ${label}` : `Remove ${label}`}
											aria-label={removing ? `Keep ${label}` : adding ? `Don't link ${label}` : `Remove ${label}`}
											onClick={() => onToggle(link.record)}
										>
											{removing ? <RotateCcw className='h-3 w-3' /> : <X className='h-3 w-3' />}
										</Button>
									) : null}
								</li>
							);
						})}
					</ul>
				)}
				{hasNextPage ? (
					<div className='flex justify-center py-1'>
						<Button type='button' variant='ghost' size='sm' onClick={onLoadMore} disabled={isFetchingNextPage}>
							{isFetchingNextPage ? 'Loading…' : 'Show more links'}
						</Button>
					</div>
				) : null}
			</div>
			{removeReason && pending.some((link) => link.state === 'linked') ? (
				<p className='text-muted-foreground text-xs'>{removeReason}</p>
			) : null}
		</section>
	);
}

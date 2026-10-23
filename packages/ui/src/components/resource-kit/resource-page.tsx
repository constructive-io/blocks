'use client';

import { PlusIcon, SearchXIcon } from 'lucide-react';
import * as React from 'react';

import { formatCount } from '../../lib/intl';
import { useDebounce } from '../../lib/use-debounce';
import { cn } from '../../lib/utils';
import { Button } from '../button';
import { SearchField, ViewFrame } from '../workspace-kit/primitives';
import { EmptyState } from '../workspace-kit/surface';
import { useResourceDefinition, useResourceIcon, useResourceKit } from './context';
import { DataTable } from './data-table';
import { LoadFailure } from './failures';
import { inSentence } from './fields';
import { errorMessage } from './form-values';
import { ListPagination, SortMenu } from './list-controls';
import { useResourceList } from './queries';
import { useRecordDialogs } from './record-dialogs';
import type { ListQuery, ResourceRef } from './types';

export type ResourcePageProps = {
	resource: ResourceRef;
	/** Rows per page. Defaults to 25. */
	pageSize?: number;
	/** Fixed equality filters, e.g. `{ status: 'open' }`. */
	filters?: Record<string, unknown>;
	/** Hides the create button and the edit and delete actions. */
	readOnly?: boolean;
	className?: string;
};

/**
 * A resource's list screen: the view header with the count and a create
 * button, search and sort, the table, pagination, and empty, no-match, and
 * error states. Create and edit open in a sheet; delete asks first. Every
 * write refreshes the list.
 */
export function ResourcePage({ resource: resourceRef, pageSize = 25, filters, readOnly = false, className }: ResourcePageProps) {
	const resource = useResourceDefinition(resourceRef);
	const icon = useResourceIcon(resource);
	const { locale } = useResourceKit();
	const [search, setSearch] = React.useState('');
	const debounced = useDebounce(search.trim(), 250);
	const [sort, setSort] = React.useState(resource.defaultSort);
	const [offset, setOffset] = React.useState(0);
	const records = useRecordDialogs(resource);

	// A new search or sort starts from the first page, adjusted during render rather than in an effect.
	const pageKey = `${debounced}\u0000${sort?.field}\u0000${sort?.direction}`;
	const [lastPageKey, setLastPageKey] = React.useState(pageKey);
	if (lastPageKey !== pageKey) {
		setLastPageKey(pageKey);
		setOffset(0);
	}

	const query: ListQuery = { search: debounced || undefined, sort, offset, limit: pageSize, filters };
	const list = useResourceList(resource, query);
	const rows = list.data?.rows ?? [];
	const totalCount = list.data?.totalCount ?? 0;
	const noun = inSentence(resource.label);
	// Without search fields the source has nothing to search, so the box would only ever fail or match everything.
	const searchable = (resource.searchFields?.length ?? 0) > 0;
	const singular = inSentence(resource.singular);

	// Deleting the last row of a later page steps back a page.
	if (list.data && rows.length === 0 && offset > 0 && !list.isPlaceholderData) setOffset(Math.max(0, offset - pageSize));

	// A failed request is shown as soon as it fails, even while it retries: rows kept from an earlier search
	// or page would otherwise read as this query's answer.
	const failure = list.error ?? (list.isPlaceholderData || !list.data ? list.failureReason : null);
	const stale = list.isError && list.data && !list.isPlaceholderData;

	let body: React.ReactNode;
	if (failure && !stale) {
		body = <LoadFailure what={noun} error={failure} onRetry={() => void list.refetch()} />;
	} else if (list.data && totalCount === 0 && !debounced) {
		body = (
			<EmptyState
				className="rounded-xl bg-card shadow-card"
				icon={icon}
				title={`No ${noun} yet`}
				description={readOnly ? undefined : `Create the first ${singular} to see it here.`}
				action={
					readOnly ? undefined : (
						<Button size="sm" onClick={records.create}>
							<PlusIcon aria-hidden="true" />
							New {singular}
						</Button>
					)
				}
			/>
		);
	} else if (list.data && totalCount === 0) {
		body = (
			<EmptyState
				className="rounded-xl bg-card shadow-card"
				icon={SearchXIcon}
				title={<span className="[overflow-wrap:anywhere]">No {noun} match “{debounced}”</span>}
				description="Try a different search."
				action={
					<Button size="sm" variant="outline" onClick={() => setSearch('')}>
						Clear search
					</Button>
				}
			/>
		);
	} else {
		body = (
			<DataTable
				resource={resource}
				rows={rows}
				error={stale ? `Couldn’t refresh ${noun}: ${errorMessage(list.error)}` : undefined}
				loading={list.isPending}
				skeletonRows={Math.min(pageSize, 8)}
				sort={sort}
				onSortChange={setSort}
				onEdit={readOnly ? undefined : records.edit}
				onDelete={readOnly ? undefined : records.remove}
				className={cn(list.isPlaceholderData && 'opacity-70 transition-opacity')}
			/>
		);
	}

	return (
		<div className={cn('@container/view flex min-h-0 min-w-0 flex-1 flex-col', className)}>
			<ViewFrame
				icon={icon}
				label={resource.label}
				title={
					<span className="flex min-w-0 items-baseline gap-1.5">
						<span className="truncate">{resource.label}</span>
						{list.data ? <span className="shrink-0 text-xs font-normal text-muted-foreground tabular-nums">{formatCount(totalCount, locale)}</span> : null}
					</span>
				}
				actions={
					readOnly ? null : (
						<Button size="sm" className="h-7" onClick={records.create} aria-label={`New ${singular}`}>
							<PlusIcon aria-hidden="true" />
							<span className="hidden @md/view:inline">New {singular}</span>
						</Button>
					)
				}
				className="gap-3 @3xl/view:py-5"
			>
				{list.data && totalCount === 0 && !debounced ? null : (
					<div className="flex items-center gap-2">
						{searchable ? (
							<SearchField
								label={`Search ${noun}`}
								placeholder={`Search ${noun}`}
								value={search}
								onChange={(event) => setSearch(event.target.value)}
								className="min-w-0 flex-1 @xl/view:w-64 @xl/view:flex-none"
							/>
						) : null}
						<SortMenu resource={resource} sort={sort} onSortChange={setSort} />
					</div>
				)}
				{body}
				{list.data ? <ListPagination offset={offset} limit={pageSize} totalCount={totalCount} onOffsetChange={setOffset} locale={locale} /> : null}
			</ViewFrame>
			{records.dialogs}
		</div>
	);
}

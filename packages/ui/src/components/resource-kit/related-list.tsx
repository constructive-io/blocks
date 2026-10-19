'use client';

import { PlusIcon } from 'lucide-react';
import * as React from 'react';

import { formatCount } from '../../lib/intl';
import { Button } from '../button';
import { EmptyState, SectionHeading } from '../workspace-kit/surface';
import { useResourceIcon, useResourceKit } from './context';
import { DataTable } from './data-table';
import { DeleteDialog } from './delete-dialog';
import { EntityFormSheet } from './entity-form-sheet';
import { type HasManyRelation, inSentence } from './fields';
import { errorMessage } from './form-values';
import { useResourceList } from './queries';
import type { AnyResource, ListQuery, ResourceRow } from './types';

type RelatedListProps = {
	parent: AnyResource;
	parentId: string;
	relation: HasManyRelation;
	limit: number;
	readOnly?: boolean;
};

/**
 * The records of another resource that belong to this one, e.g. a company's
 * contacts: the first few rows, how many there are, and a create button that
 * fills in the parent.
 */
export function RelatedList({ parent, parentId, relation, limit, readOnly }: RelatedListProps) {
	const { resource, field } = relation;
	const { locale } = useResourceKit();
	const icon = useResourceIcon(resource);
	const [sheet, setSheet] = React.useState<{ open: boolean; record: ResourceRow | null }>({ open: false, record: null });
	const [deleting, setDeleting] = React.useState<{ open: boolean; record: ResourceRow | null }>({ open: false, record: null });
	const query: ListQuery = { sort: resource.defaultSort, offset: 0, limit, filters: { [field.name]: parentId } };
	const list = useResourceList(resource, query);
	const columns = React.useMemo(() => resource.columns.filter((name) => name !== field.name), [resource.columns, field.name]);
	const total = list.data?.totalCount ?? 0;
	const headingId = React.useId();
	// Two belongs-to fields on one resource pointing here (author, reviewer) need the field to tell their lists apart.
	const title = Object.values(resource.fields).filter((candidate) => candidate.relation?.resource === parent.name && !candidate.relation.many).length > 1
		? `${resource.label} · ${field.label}`
		: resource.label;

	return (
		<section aria-labelledby={headingId} className="flex flex-col gap-3">
			<SectionHeading
				id={headingId}
				title={
					<span className="flex min-w-0 items-baseline gap-1.5">
						<span className="[overflow-wrap:anywhere]">{title}</span>
						{list.data ? <span className="text-xs font-normal text-muted-foreground tabular-nums">{formatCount(total, locale)}</span> : null}
					</span>
				}
				description={list.data && total > limit ? `Showing the first ${formatCount(limit, locale)}.` : undefined}
				actions={
					readOnly ? null : (
						<Button size="xs" variant="outline" onClick={() => setSheet({ open: true, record: null })} aria-label={`New ${inSentence(resource.singular)}`}>
							<PlusIcon aria-hidden="true" />
							<span className="hidden @md/view:inline">New {inSentence(resource.singular)}</span>
						</Button>
					)
				}
			/>
			{list.data && total === 0 && !list.isError ? (
				<div className="rounded-xl bg-card shadow-card">
					<EmptyState icon={icon} title={`No ${inSentence(resource.label)} yet`} className="py-6" />
				</div>
			) : (
				<DataTable
					resource={resource}
					rows={list.data?.rows ?? []}
					columns={columns}
					loading={list.isPending && !list.failureReason}
					error={list.error || list.failureReason ? `Couldn’t load ${inSentence(resource.label)}: ${errorMessage(list.error ?? list.failureReason)}` : undefined}
					skeletonRows={Math.min(limit, 3)}
					onEdit={readOnly ? undefined : (record) => setSheet({ open: true, record })}
					onDelete={readOnly ? undefined : (record) => setDeleting({ open: true, record })}
				/>
			)}
			<EntityFormSheet
				resource={resource}
				record={sheet.record}
				open={sheet.open}
				onOpenChange={(open) => setSheet((current) => ({ ...current, open }))}
				defaultValues={{ [field.name]: parentId }}
			/>
			<DeleteDialog resource={resource} record={deleting.record} open={deleting.open} onOpenChange={(open) => setDeleting((current) => ({ ...current, open }))} />
		</section>
	);
}

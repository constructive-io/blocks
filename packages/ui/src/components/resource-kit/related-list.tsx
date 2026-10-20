'use client';

import { PlusIcon } from 'lucide-react';
import * as React from 'react';

import { formatCount } from '../../lib/intl';
import { Button } from '../button';
import { EmptyState, SectionHeading } from '../workspace-kit/surface';
import { useResourceIcon, useResourceKit } from './context';
import { DataTable } from './data-table';
import { type HasManyRelation, inSentence } from './fields';
import { errorMessage } from './form-values';
import { queryFailure, useResourceList } from './queries';
import { useRecordDialogs } from './record-dialogs';
import type { AnyResource, ListQuery } from './types';

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
	const records = useRecordDialogs(resource, { defaultValues: { [field.name]: parentId } });
	const query: ListQuery = { sort: resource.defaultSort, offset: 0, limit, filters: { [field.name]: parentId } };
	const list = useResourceList(resource, query);
	const failure = queryFailure(list);
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
						<Button size="xs" variant="outline" onClick={records.create} aria-label={`New ${inSentence(resource.singular)}`}>
							<PlusIcon aria-hidden="true" />
							<span className="hidden @md/view:inline">New {inSentence(resource.singular)}</span>
						</Button>
					)
				}
			/>
			{list.data && total === 0 && !list.isError ? (
				<EmptyState icon={icon} title={`No ${inSentence(resource.label)} yet`} className="rounded-xl bg-card py-6 shadow-card" />
			) : (
				<DataTable
					resource={resource}
					rows={list.data?.rows ?? []}
					columns={columns}
					loading={list.isPending && !list.failureReason}
					error={failure ? `Couldn’t load ${inSentence(resource.label)}: ${errorMessage(failure)}` : undefined}
					skeletonRows={Math.min(limit, 3)}
					onEdit={readOnly ? undefined : records.edit}
					onDelete={readOnly ? undefined : records.remove}
				/>
			)}
			{records.dialogs}
		</section>
	);
}

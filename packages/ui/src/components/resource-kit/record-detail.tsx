'use client';

import { ChevronRightIcon, CircleAlertIcon, PencilIcon, SearchXIcon, Trash2Icon } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button, buttonVariants } from '../button';
import { ViewFrame } from '../workspace-kit/primitives';
import { dashedRule, EmptyState, Panel } from '../workspace-kit/surface';
import { useResourceDefinition, useResourceIcon, useResourceKit } from './context';
import { FieldValue, linkClass } from './field-value';
import { detailFields, hasManyRelations, inSentence } from './fields';
import { errorMessage } from './form-values';
import { DeleteDialog } from './delete-dialog';
import { EntityFormSheet } from './entity-form-sheet';
import { useRelationLabels, useRowTitles } from './labels';
import { useResourceRecord } from './queries';
import { RelatedList } from './related-list';
import type { AnyResource, ResourceField, ResourceRef, ResourceRow } from './types';

export type RecordDetailProps = {
	resource: ResourceRef;
	id: string;
	/** Rows each related list shows. Defaults to 5. */
	relatedLimit?: number;
	/** Hides edit, delete, and the related lists' create buttons. */
	readOnly?: boolean;
	className?: string;
};

/** Long values read better stacked under their label than squeezed beside it. */
const isLong = (field: ResourceField) => field.input === 'textarea' || field.input === 'json' || Boolean(field.relation?.many);

/**
 * One record: its fields, a list for every resource that belongs to it
 * (has-many), and edit and delete. Deleting returns to the list.
 */
export function RecordDetail({ resource: resourceRef, id, relatedLimit = 5, readOnly = false, className }: RecordDetailProps) {
	const resource = useResourceDefinition(resourceRef);
	const icon = useResourceIcon(resource);
	const { router, resources } = useResourceKit();
	const record = useResourceRecord(resource, id);
	const [editing, setEditing] = React.useState(false);
	const [deleting, setDeleting] = React.useState(false);
	const related = React.useMemo(() => hasManyRelations(resource, resources), [resource, resources]);
	const row = record.data ?? null;
	const titleOf = useRowTitles(resource, row ? [row] : []);
	const title = row ? (titleOf(row) ?? '…') : '';

	const breadcrumb = (
		<span className="flex min-w-0 items-center gap-1">
			<router.Link href={router.listHref(resource.name)} className={cn(linkClass, 'shrink-0 text-muted-foreground hover:text-foreground hover:no-underline')}>
				{resource.label}
			</router.Link>
			<ChevronRightIcon aria-hidden="true" className="size-3.5 shrink-0 text-subtle-foreground rtl:rotate-180" />
			<span dir="auto" title={title} className="min-w-0 truncate">
				{row ? title : '…'}
			</span>
		</span>
	);

	let body: React.ReactNode;
	if (record.isPending) {
		body = <DetailSkeleton />;
	} else if (record.isError) {
		body = (
			<div className="rounded-xl bg-card shadow-card">
				<EmptyState
					icon={CircleAlertIcon}
					title={`Couldn’t load this ${inSentence(resource.singular)}`}
					description={<span className="[overflow-wrap:anywhere]">{errorMessage(record.error)}</span>}
					action={
						<Button size="sm" variant="outline" onClick={() => void record.refetch()}>
							Try again
						</Button>
					}
				/>
			</div>
		);
	} else if (!row) {
		body = (
			<div className="rounded-xl bg-card shadow-card">
				<EmptyState
					icon={SearchXIcon}
					title={`This ${inSentence(resource.singular)} doesn’t exist`}
					description="It may have been deleted, or you may not have access to it."
					action={
						<router.Link href={router.listHref(resource.name)} className={buttonVariants({ size: 'sm', variant: 'outline' })}>
							All {inSentence(resource.label)}
						</router.Link>
					}
				/>
			</div>
		);
	} else {
		body = (
			<>
				<DetailFields resource={resource} row={row} />
				{related.map((relation) => (
					<RelatedList
						key={`${relation.resource.name}:${relation.field.name}`}
						parent={resource}
						parentId={id}
						relation={relation}
						limit={relatedLimit}
						readOnly={readOnly}
					/>
				))}
			</>
		);
	}

	return (
		<div className={cn('@container/view flex min-h-0 min-w-0 flex-1 flex-col', className)}>
			<ViewFrame
				icon={icon}
				label={title || resource.singular}
				title={breadcrumb}
				actions={
					readOnly || !row ? null : (
						<>
							<Button size="sm" variant="outline" className="h-7" onClick={() => setEditing(true)} aria-label={`Edit ${title}`}>
								<PencilIcon aria-hidden="true" />
								<span className="hidden @md/view:inline">Edit</span>
							</Button>
							<Button size="sm" variant="destructive-outline" className="h-7" onClick={() => setDeleting(true)} aria-label={`Delete ${title}`}>
								<Trash2Icon aria-hidden="true" />
								<span className="hidden @md/view:inline">Delete</span>
							</Button>
						</>
					)
				}
				maxWidth="max-w-4xl"
			>
				{body}
			</ViewFrame>
			{row ? (
				<>
					<EntityFormSheet resource={resource} record={row} open={editing} onOpenChange={setEditing} />
					<DeleteDialog resource={resource} record={row} open={deleting} onOpenChange={setDeleting} onDeleted={() => router.navigate(router.listHref(resource.name))} />
				</>
			) : null}
		</div>
	);
}

/** Short fields as label-value rows; long text and linked sets stacked under their labels. */
function DetailFields({ resource, row }: { resource: AnyResource; row: ResourceRow }) {
	const fields = React.useMemo(() => detailFields(resource), [resource]);
	const rows = React.useMemo(() => [row], [row]);
	const relationLabel = useRelationLabels(fields, rows);
	const short = fields.filter((field) => !isLong(field));
	const long = fields.filter(isLong);
	return (
		<Panel title="Details" bodyClassName="flex flex-col gap-4">
			{short.length > 0 ? (
				<dl className="flex flex-col text-[0.8125rem]">
					{short.map((field, index) => (
						<div
							key={field.name}
							className={cn('grid grid-cols-1 gap-x-4 gap-y-0.5 py-2 @md/view:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]', index > 0 && cn('border-t', dashedRule))}
						>
							<dt className="min-w-0 text-muted-foreground [overflow-wrap:anywhere]">{field.label}</dt>
							<dd className="min-w-0 text-foreground">
								<FieldValue resource={resource} field={field} row={row} relation={relationLabel(field, row)} />
							</dd>
						</div>
					))}
				</dl>
			) : null}
			{long.map((field) => (
				<section key={field.name} aria-label={field.label} className={cn('flex flex-col gap-1.5 border-t pt-3 text-[0.8125rem]', dashedRule)}>
					<h3 className="text-muted-foreground">{field.label}</h3>
					<div className="text-foreground">
						<FieldValue resource={resource} field={field} row={row} relation={relationLabel(field, row)} />
					</div>
				</section>
			))}
		</Panel>
	);
}

function DetailSkeleton() {
	return (
		<div aria-busy="true" aria-label="Loading" className="rounded-xl bg-card p-4 shadow-card motion-safe:animate-pulse">
			{Array.from({ length: 5 }, (_, index) => (
				<div key={index} className={cn('flex items-center gap-6 py-3', index > 0 && cn('border-t', dashedRule))}>
					<span className="h-2.5 w-24 rounded-full bg-muted" />
					<span className="h-2.5 w-40 rounded-full bg-muted" />
				</div>
			))}
		</div>
	);
}

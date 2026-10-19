'use client';

import * as React from 'react';

import { cn } from '../../lib/utils';
import { useResourceDefinition, useResourceIcon, useResourceKit } from '../resource-kit/context';
import { FieldValue, linkClass } from '../resource-kit/field-value';
import { fieldFormat, inSentence, recordId, visibleFields } from '../resource-kit/fields';
import { errorMessage } from '../resource-kit/form-values';
import { formatFieldText } from '../resource-kit/format';
import { useRelationLabels, useRowTitles } from '../resource-kit/labels';
import { useResourceList } from '../resource-kit/queries';
import type { ListQuery, ResourceRef } from '../resource-kit/types';
import { dashedRule, EmptyState, Panel } from '../workspace-kit/surface';

export type RecentRecordsProps = {
	resource: ResourceRef;
	/** Rows to show. Defaults to 5. */
	limit?: number;
	/** Defaults to the resource's default sort, else newest first by `createdAt` when the resource has that field. */
	sort?: ListQuery['sort'];
	/** Equality filters, e.g. `{ status: 'open' }`. */
	filters?: Record<string, unknown>;
	/** Defaults to "Recent <label>". */
	title?: React.ReactNode;
	className?: string;
};

const DATE_FORMATS = new Set(['date', 'datetime', 'relative']);

/**
 * The latest records of a resource on a dashboard panel: each title links to
 * the record, with one detail beside it and when it was made.
 */
export function RecentRecords({ resource: resourceRef, limit = 5, sort, filters, title, className }: RecentRecordsProps) {
	const resource = useResourceDefinition(resourceRef);
	const icon = useResourceIcon(resource);
	const { router, locale, currency, now } = useResourceKit();
	const order = sort ?? resource.defaultSort ?? (resource.fields.createdAt ? { field: 'createdAt', direction: 'desc' as const } : undefined);
	const list = useResourceList(resource, { sort: order, offset: 0, limit, filters });
	const rows = list.data?.rows ?? [];
	const columns = React.useMemo(() => visibleFields(resource, resource.columns).filter((field) => field.name !== resource.titleField), [resource]);
	// One detail beside the title (the first column that is not a date) and the time on the right.
	const detail = columns.find((field) => !DATE_FORMATS.has(fieldFormat(field)) && !field.relation?.many);
	const timeField = order?.field && resource.fields[order.field] && DATE_FORMATS.has(fieldFormat(resource.fields[order.field]!)) ? resource.fields[order.field] : undefined;
	const relationLabel = useRelationLabels(detail ? [detail] : [], rows);
	const titleOf = useRowTitles(resource, rows);
	const label = inSentence(resource.label);

	return (
		<Panel
			title={title ?? `Recent ${label}`}
			actions={
				<router.Link href={router.listHref(resource.name)} className={cn(linkClass, 'text-xs text-muted-foreground hover:text-foreground')}>
					View all
				</router.Link>
			}
			bodyClassName="px-0 pb-1"
			className={cn('col-span-full @3xl/dashboard:col-span-2', className)}
		>
			{list.isPending && !list.failureReason ? (
				<ul aria-busy="true" aria-label="Loading" className="motion-safe:animate-pulse">
					{Array.from({ length: Math.min(limit, 4) }, (_, index) => (
						<li key={index} className={cn('flex items-center gap-3 px-4 py-2.5', index > 0 && cn('border-t', dashedRule))}>
							<span className="h-2.5 w-36 rounded-full bg-muted" />
							<span className="ms-auto h-2.5 w-16 rounded-full bg-muted" />
						</li>
					))}
				</ul>
			) : list.error || list.failureReason ? (
				<p role="alert" className="px-4 pb-3 text-[0.8125rem] text-destructive [overflow-wrap:anywhere]">
					{errorMessage(list.error ?? list.failureReason)}
				</p>
			) : rows.length === 0 ? (
				<EmptyState icon={icon} title={`No ${label} yet`} className="py-6" />
			) : (
				<ul className="flex flex-col text-[0.8125rem]">
					{rows.map((row, index) => {
						const id = recordId(resource, row);
						const name = titleOf(row) ?? '…';
						const time = timeField ? formatFieldText({ ...timeField, format: 'relative' }, row[timeField.name], { locale, currency, now }) : null;
						return (
							<li key={id || index} className={cn('flex min-w-0 items-center gap-3 px-4 py-2', index > 0 && cn('border-t', dashedRule))}>
								<span className="flex min-w-0 flex-1 flex-col">
									<router.Link href={router.detailHref(resource.name, id)} className={cn(linkClass, 'block min-w-0 font-medium')}>
										<span dir="auto" title={name} className="block truncate">
											{name}
										</span>
									</router.Link>
									{detail ? (
										<span className="min-w-0 text-xs text-muted-foreground">
											<FieldValue resource={resource} field={detail} row={row} relation={relationLabel(detail, row)} truncate />
										</span>
									) : null}
								</span>
								{time ? <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{time}</span> : null}
							</li>
						);
					})}
				</ul>
			)}
		</Panel>
	);
}

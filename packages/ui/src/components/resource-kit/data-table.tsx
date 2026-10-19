'use client';

import { ArrowDownIcon, ArrowUpIcon, CircleAlertIcon, ExternalLinkIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../dropdown-menu';
import { focusRingClass, pressClass } from '../workspace-kit/primitives';
import { TableSurface, tableHeadClass, tableRowClass } from '../workspace-kit/surface';
import { useResourceDefinition, useResourceKit } from './context';
import { FieldValue, LabelSkeleton, linkClass } from './field-value';
import { fieldFormat, isSortable, recordId, visibleFields } from './fields';
import { formatFieldText } from './format';
import { useRelationLabels, useRowTitles } from './labels';
import type { ListQuery, ResourceField, ResourceRef, ResourceRow } from './types';

type Sort = NonNullable<ListQuery['sort']>;

export type DataTableProps = {
	resource: ResourceRef;
	rows: readonly ResourceRow[];
	/** Column field names; defaults to the resource's `columns`. */
	columns?: readonly string[];
	sort?: Sort;
	/** Makes plain columns sortable from their headers. */
	onSortChange?: (sort: Sort) => void;
	onEdit?: (row: ResourceRow) => void;
	onDelete?: (row: ResourceRow) => void;
	loading?: boolean;
	/** Rows the skeleton draws while loading. */
	skeletonRows?: number;
	/** Shown in the body when there are no rows. */
	emptyLabel?: React.ReactNode;
	/** A failed load, announced above the rows (or in their place when there are none). */
	error?: React.ReactNode;
	className?: string;
};

const MENU_ITEM = 'gap-2 [&_svg]:size-3.5 [&_svg]:text-muted-foreground';

/**
 * Columns fold away as the table narrows: the first two always show, the next
 * two from a 36rem container, two more from 56rem, the rest from 72rem. Folded values are summarised
 * under the first cell, so a phone or a narrow pane still reads each record.
 */
function foldClass(index: number) {
	if (index < 2) return undefined;
	if (index < 4) return 'hidden @xl/table:table-cell';
	return index < 6 ? 'hidden @4xl/table:table-cell' : 'hidden @6xl/table:table-cell';
}

/** Badges, numbers, and dates: always short, so their columns fit the value and never cut it. */
const SHORT_FORMATS = new Set(['badge', 'boolean', 'number', 'currency', 'percent', 'date', 'datetime', 'relative']);
const END_ALIGNED = new Set(['number', 'currency', 'percent']);
/** Free text and relations fit their value up to a width that grows with the table. */
const TEXT_CAP = 'max-w-24 @md/table:max-w-28 @3xl/table:max-w-36 @5xl/table:max-w-48 @7xl/table:max-w-64';

/**
 * How a column takes space. The first column is the flexible one: it takes
 * whatever the table has left and truncates only when the pane is narrow.
 * Short values size to their content. Free text and relations size to their
 * content up to a cap, then truncate.
 */
function columnClasses(field: ResourceField, index: number): { cell: string; value?: string } {
	if (index === 0) return { cell: 'w-full min-w-24 @md/table:min-w-32' };
	const format = fieldFormat(field);
	if (field.relation?.many || !SHORT_FORMATS.has(format)) return { cell: 'w-px', value: TEXT_CAP };
	// A badge holds a short label, but an unknown value from the database can be long.
	if (format === 'badge') return { cell: 'w-px whitespace-nowrap', value: 'max-w-36' };
	return { cell: cn('w-px whitespace-nowrap', END_ALIGNED.has(format) && 'text-end') };
}

function SortableHeader({ field, index, sort, onSortChange }: { field: ResourceField; index: number; sort?: Sort; onSortChange?: (sort: Sort) => void }) {
	const active = sort?.field === field.name;
	const Caret = sort?.direction === 'asc' ? ArrowUpIcon : ArrowDownIcon;
	const sortable = Boolean(onSortChange) && isSortable(field);
	return (
		<th scope="col" aria-sort={active ? (sort!.direction === 'asc' ? 'ascending' : 'descending') : undefined} className={cn(columnClasses(field, index).cell, foldClass(index))}>
			{sortable ? (
				<button
					type="button"
					onClick={() => onSortChange!({ field: field.name, direction: active && sort!.direction === 'asc' ? 'desc' : 'asc' })}
					className={cn(
						'-mx-1 inline-flex cursor-pointer items-center gap-1 rounded px-1 hover:text-foreground',
						index === 0 && 'max-w-full',
						active && 'text-foreground',
						index > 0 && END_ALIGNED.has(fieldFormat(field)) && 'flex-row-reverse',
						focusRingClass,
					)}
				>
					<span title={field.label} className="max-w-40 truncate">
						{field.label}
					</span>
					{active ? <Caret aria-hidden="true" className="size-3 shrink-0" /> : null}
				</button>
			) : (
				<span title={field.label} className="block max-w-40 truncate">
					{field.label}
				</span>
			)}
		</th>
	);
}

/**
 * A page of records on the workspace table surface: cells formatted by field,
 * option badges, relation labels that link to the related record, and an
 * actions menu per row. Sorting is controlled; the table never fetches pages.
 */
export function DataTable({ resource: resourceRef, rows, columns, sort, onSortChange, onEdit, onDelete, loading, skeletonRows = 6, emptyLabel = 'Nothing here yet.', error, className }: DataTableProps) {
	const resource = useResourceDefinition(resourceRef);
	const { router, locale, currency, now } = useResourceKit();
	const fields = React.useMemo(() => visibleFields(resource, columns ?? resource.columns), [resource, columns]);
	const relationLabel = useRelationLabels(fields, rows);
	const titleOf = useRowTitles(resource, rows);
	const columnCount = fields.length + 1;

	if (loading) return <DataTableSkeleton fields={fields} rows={skeletonRows} className={className} />;

	/** Text for a folded column in the summary line under the first cell. */
	const summary = (field: ResourceField, row: ResourceRow) => {
		if (field.input === 'relation') return field.relation?.many ? null : relationLabel(field, row)?.label ?? null;
		return formatFieldText(field, row[field.name], { locale, currency, now, compact: true });
	};

	return (
		<TableSurface minWidth="18rem" className={cn('@container/table', className)}>
			<caption className="sr-only">{resource.label}</caption>
			<thead className={tableHeadClass}>
				<tr>
					{fields.map((field, index) => (
						<SortableHeader key={field.name} field={field} index={index} sort={sort} onSortChange={onSortChange} />
					))}
					<th scope="col" className="w-12">
						<span className="sr-only">Actions</span>
					</th>
				</tr>
			</thead>
			<tbody>
				{error ? (
					<tr className={tableRowClass}>
						<td colSpan={columnCount} role="alert" className="text-destructive [overflow-wrap:anywhere]">
							<span className="flex items-start gap-2">
								<CircleAlertIcon aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
								{error}
							</span>
						</td>
					</tr>
				) : null}
				{rows.length === 0 && !error ? (
					<tr className={tableRowClass}>
						<td colSpan={columnCount} className="h-24 text-center text-muted-foreground">
							{emptyLabel}
						</td>
					</tr>
				) : (
					rows.map((row, rowIndex) => {
						const id = recordId(resource, row);
						const title = titleOf(row);
						const name = title ?? id;
						const href = router.detailHref(resource.name, id);
						const folded = fields
							.slice(2, 4)
							.map((field) => summary(field, row))
							.filter((text): text is string => Boolean(text));
						return (
							<tr
								key={id || rowIndex}
								onClick={(event) => {
									if ((event.target as HTMLElement).closest('a, button, [role="menuitem"]')) return;
									router.navigate(href);
								}}
								className={cn(tableRowClass, 'group/row cursor-pointer transition-colors duration-(--duration-fast) hover:bg-overlay-hover')}
							>
								{fields.map((field, index) => (
									<td key={field.name} className={cn(columnClasses(field, index).cell, index > 0 && 'text-muted-foreground', foldClass(index))}>
										{index === 0 ? (
											// Zero width with a full-width floor: the title adds nothing to the column's size, so the column takes what is left.
											<span className="flex w-0 min-w-full flex-col">
												{field.name === resource.titleField ? (
													<router.Link href={href} className={cn(linkClass, 'block min-w-0 font-medium hover:no-underline')}>
														{title === null ? (
															<LabelSkeleton />
														) : (
															<span dir="auto" title={title} className="block truncate">
																{title}
															</span>
														)}
													</router.Link>
												) : (
													<FieldValue resource={resource} field={field} row={row} relation={relationLabel(field, row)} truncate className="font-medium text-foreground" />
												)}
												{folded.length > 0 ? (
													<span dir="auto" title={folded.join(' · ')} className="block truncate text-xs text-muted-foreground @xl/table:hidden">
														{folded.join(' · ')}
													</span>
												) : null}
											</span>
										) : (
											<FieldValue resource={resource} field={field} row={row} relation={relationLabel(field, row)} truncate className={columnClasses(field, index).value} />
										)}
									</td>
								))}
								<td className="text-end">
									<RowMenu title={name} href={href} onEdit={onEdit ? () => onEdit(row) : undefined} onDelete={onDelete ? () => onDelete(row) : undefined} />
								</td>
							</tr>
						);
					})
				)}
			</tbody>
		</TableSurface>
	);
}

function RowMenu({ title, href, onEdit, onDelete }: { title: string; href: string; onEdit?: () => void; onDelete?: () => void }) {
	const { router } = useResourceKit();
	return (
		<div className="flex justify-end opacity-0 transition-opacity duration-(--duration-fast) group-hover/row:opacity-100 group-focus-within/row:opacity-100 has-[[data-popup-open]]:opacity-100 pointer-coarse:opacity-100">
			<DropdownMenu>
				<DropdownMenuTrigger
					aria-label={`Actions for ${title}`}
					className={cn(
						'grid size-7 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-overlay-hover hover:text-foreground data-[popup-open]:bg-overlay-hover',
						pressClass,
						focusRingClass,
					)}
				>
					<MoreHorizontalIcon aria-hidden="true" className="size-3.5" />
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="w-40">
					<DropdownMenuItem className={MENU_ITEM} onClick={() => router.navigate(href)}>
						<ExternalLinkIcon aria-hidden="true" />
						Open
					</DropdownMenuItem>
					{onEdit ? (
						<DropdownMenuItem className={MENU_ITEM} onClick={onEdit}>
							<PencilIcon aria-hidden="true" />
							Edit
						</DropdownMenuItem>
					) : null}
					{onDelete ? (
						<>
							<DropdownMenuSeparator />
							<DropdownMenuItem variant="destructive" className={MENU_ITEM} onClick={onDelete}>
								<Trash2Icon aria-hidden="true" />
								Delete
							</DropdownMenuItem>
						</>
					) : null}
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

const SKELETON_WIDTHS = ['w-36', 'w-24', 'w-44', 'w-28', 'w-32', 'w-20'];

/** Loading rows in the table's own layout, so the page does not jump when data lands. */
export function DataTableSkeleton({ fields, rows = 6, className }: { fields: readonly ResourceField[]; rows?: number; className?: string }) {
	return (
		<TableSurface minWidth="18rem" className={cn('@container/table', className)}>
			<thead className={tableHeadClass}>
				<tr>
					{fields.map((field, index) => (
						<th key={field.name} scope="col" className={cn(columnClasses(field, index).cell, foldClass(index))}>
							<span className="block max-w-40 truncate">{field.label}</span>
						</th>
					))}
					<th className="w-12" />
				</tr>
			</thead>
			<tbody aria-busy="true" aria-label="Loading" className="motion-safe:animate-pulse">
				{Array.from({ length: rows }, (_, rowIndex) => (
					<tr key={rowIndex} className={tableRowClass}>
						{fields.map((field, index) => (
							<td key={field.name} className={foldClass(index)}>
								<span className={cn('block h-2.5 rounded-full bg-muted', index === 0 ? SKELETON_WIDTHS[rowIndex % SKELETON_WIDTHS.length] : 'w-16')} />
							</td>
						))}
						<td />
					</tr>
				))}
			</tbody>
		</TableSurface>
	);
}

'use client';

import { ArrowDownIcon, ArrowUpIcon, CopyIcon, DownloadIcon, MoreHorizontalIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Checkbox } from '../checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '../dropdown-menu';
import { focusRingClass, pressClass, TooltipIconButton } from '../workspace-kit/primitives';
import { TableSurface, tableHeadClass, tableRowClass } from '../workspace-kit/surface';
import { FileGlyph } from './file-type-icon';
import type { ObjectSort, ObjectSortColumn, StorageObject } from './types';
import { formatDate, humanizeBytes, keyFolder, objectDisplayName, shortMimeLabel } from './utils';

interface ObjectTableProps {
	objects: StorageObject[];
	/** Controlled selection — set of selected object ids. */
	selectedIds: string[];
	onSelectionChange: (selectedIds: string[]) => void;
	sort: ObjectSort;
	onSortChange: (sort: ObjectSort) => void;
	/** Row click (outside the checkbox/menu) opens the object. */
	onOpenObject?: (object: StorageObject) => void;
	/** Opens a folder row. Without it folder names are plain text. */
	onOpenFolder?: (object: StorageObject) => void;
	/** Show the selection checkboxes. Default: true. */
	selectable?: boolean;
	onDownload?: (object: StorageObject) => void;
	onCopyLink?: (object: StorageObject) => void;
	onRename?: (object: StorageObject) => void;
	onDelete?: (object: StorageObject) => void;
	isLoading?: boolean;
	/** Message shown in the body when there are no objects (and not loading). */
	emptyLabel?: string;
	className?: string;
}

const COLUMN_COUNT = 6;
const MENU_ITEM = 'gap-2 [&_svg]:size-3.5 [&_svg]:text-muted-foreground';

type Column = { column: ObjectSortColumn; label: string; className?: string; align?: 'end' };

const COLUMNS: Column[] = [
	{ column: 'filename', label: 'Name' },
	{ column: 'mimeType', label: 'Type', className: 'hidden w-24 @lg/table:table-cell' },
	{ column: 'size', label: 'Size', className: 'hidden w-24 @lg/table:table-cell', align: 'end' },
	{ column: 'createdAt', label: 'Modified', className: 'hidden w-32 @2xl/table:table-cell', align: 'end' },
];

function SortableHeader({ column, label, className, align, sort, onSortChange }: Column & { sort: ObjectSort; onSortChange: (sort: ObjectSort) => void }) {
	const active = sort.column === column;
	const Caret = sort.direction === 'asc' ? ArrowUpIcon : ArrowDownIcon;
	return (
		<th scope="col" aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined} className={cn(align === 'end' && 'text-right', className)}>
			<button
				type="button"
				onClick={() => onSortChange({ column, direction: active && sort.direction === 'asc' ? 'desc' : 'asc' })}
				className={cn(
					'-mx-1 inline-flex cursor-pointer items-center gap-1 rounded px-1 hover:text-foreground',
					active && 'text-foreground',
					align === 'end' && 'flex-row-reverse',
					focusRingClass,
				)}
			>
				{label}
				{active ? <Caret aria-hidden="true" className="size-3" /> : null}
			</button>
		</th>
	);
}

function Frame({ className, children }: { className?: string; children: React.ReactNode }) {
	return (
		<TableSurface minWidth="0" className={cn('@container/table', className)}>
			{children}
		</TableSurface>
	);
}

/**
 * `ObjectTable` — the object list on a workspace table surface: a tinted
 * glyph per file type, the folder path under each name, and sortable
 * columns that fold away as the table narrows. Download and the actions menu
 * appear on hover and focus. Sort and selection are controlled.
 */
export function ObjectTable({
	objects,
	selectedIds,
	onSelectionChange,
	sort,
	onSortChange,
	onOpenObject,
	onOpenFolder,
	selectable = true,
	onDownload,
	onCopyLink,
	onRename,
	onDelete,
	isLoading,
	emptyLabel = 'No files',
	className,
}: ObjectTableProps) {
	if (isLoading) return <ObjectTableSkeleton className={className} selectable={selectable} />;

	const selected = new Set(selectedIds);
	const allSelected = objects.length > 0 && objects.every((object) => selected.has(object.id));
	const someSelected = !allSelected && objects.some((object) => selected.has(object.id));
	const hasMenu = Boolean(onCopyLink || onRename || onDelete);

	const toggleOne = (objectId: string, checked: boolean) => {
		const next = new Set(selected);
		if (checked) next.add(objectId);
		else next.delete(objectId);
		onSelectionChange([...next]);
	};

	return (
		<Frame className={className}>
			<thead className={tableHeadClass}>
				<tr>
					{selectable ? (
						<th scope="col" className="w-10 !pr-0">
							<Checkbox
								aria-label="Select all files"
								checked={allSelected}
								indeterminate={someSelected}
								onCheckedChange={(checked) => onSelectionChange(checked === true ? objects.map((object) => object.id) : [])}
							/>
						</th>
					) : null}
					{COLUMNS.map((column) => (
						<SortableHeader key={column.column} {...column} sort={sort} onSortChange={onSortChange} />
					))}
					<th scope="col" className="w-20">
						<span className="sr-only">Actions</span>
					</th>
				</tr>
			</thead>
			<tbody>
				{objects.length === 0 ? (
					<tr className={tableRowClass}>
						<td colSpan={selectable ? COLUMN_COUNT : COLUMN_COUNT - 1} className="h-24 text-center text-muted-foreground">
							{emptyLabel}
						</td>
					</tr>
				) : (
					objects.map((object) => {
						const isSelected = selected.has(object.id);
						const isFolder = object.kind === 'folder';
						const name = objectDisplayName(object);
						const folder = isFolder ? '' : keyFolder(object.key);
						const size = object.sizeLabel ?? (isFolder ? '—' : humanizeBytes(object.size));
						const type = isFolder ? 'Folder' : shortMimeLabel(object.mimeType);
						const modified = formatDate(object.updatedAt ?? object.createdAt);
						const open = isFolder ? onOpenFolder : onOpenObject;
						const glyphAndName = (
							<>
								<FileGlyph mimeType={object.mimeType} kind={object.kind} />
								<span className="min-w-0 flex-1">
									<span className="block truncate font-medium text-foreground" title={name}>
										{name}
									</span>
									<span className="block truncate text-xs text-muted-foreground">
										{folder ? <span className="font-mono">{folder}</span> : null}
										<span className="@lg/table:hidden">
											{folder ? ' · ' : null}
											{isFolder ? type : `${type} · ${size}`}
										</span>
									</span>
								</span>
							</>
						);
						return (
							<tr
								key={object.id}
								data-state={isSelected ? 'selected' : undefined}
								onClick={open ? () => open(object) : undefined}
								className={cn(
									tableRowClass,
									'group/row transition-colors duration-(--duration-fast)',
									isSelected ? 'bg-primary/[0.05]' : 'hover:bg-overlay-hover',
									open && 'cursor-pointer',
								)}
							>
								{selectable ? (
									<td className="!pr-0" onClick={(event) => event.stopPropagation()}>
										<Checkbox aria-label={`Select ${name}`} checked={isSelected} onCheckedChange={(checked) => toggleOne(object.id, checked === true)} />
									</td>
								) : null}
								<td className="max-w-0">
									{open ? (
										<button
											type="button"
											aria-label={isFolder ? `Open folder ${name}` : `Open details for ${name}`}
											className={cn('flex w-full min-w-0 cursor-pointer items-center gap-2.5 rounded-md text-left', focusRingClass)}
											onClick={(event) => {
												event.stopPropagation();
												open(object);
											}}
										>
											{glyphAndName}
										</button>
									) : (
										<div className="flex min-w-0 items-center gap-2.5">{glyphAndName}</div>
									)}
								</td>
								<td className="hidden text-muted-foreground @lg/table:table-cell">{type}</td>
								<td className="hidden text-right text-foreground tabular-nums @lg/table:table-cell">{size}</td>
								<td className="hidden text-right text-muted-foreground tabular-nums @2xl/table:table-cell" suppressHydrationWarning>
									{modified}
								</td>
								<td onClick={(event) => event.stopPropagation()}>
									<div className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity duration-(--duration-fast) group-hover/row:opacity-100 group-focus-within/row:opacity-100 has-[[data-popup-open]]:opacity-100 pointer-coarse:opacity-100">
										{onDownload && !isFolder ? (
											<TooltipIconButton label={`Download ${name}`} extendHitArea={false} onClick={() => onDownload(object)}>
												<DownloadIcon aria-hidden="true" className="size-3.5" />
											</TooltipIconButton>
										) : null}
										{hasMenu ? (
											<DropdownMenu>
												<DropdownMenuTrigger
													aria-label={`Actions for ${name}`}
													className={cn(
														'grid size-7 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-overlay-hover hover:text-foreground data-[popup-open]:bg-overlay-hover',
														pressClass,
														focusRingClass,
													)}
												>
													<MoreHorizontalIcon aria-hidden="true" className="size-3.5" />
												</DropdownMenuTrigger>
												<DropdownMenuContent align="end" className="w-44">
													{onCopyLink ? (
														<DropdownMenuItem className={MENU_ITEM} onClick={() => onCopyLink(object)}>
															<CopyIcon aria-hidden="true" />
															Copy link
														</DropdownMenuItem>
													) : null}
													{onRename ? (
														<DropdownMenuItem className={MENU_ITEM} onClick={() => onRename(object)}>
															<PencilIcon aria-hidden="true" />
															Rename
														</DropdownMenuItem>
													) : null}
													{onDelete && (onCopyLink || onRename) ? <DropdownMenuSeparator /> : null}
													{onDelete ? (
														<DropdownMenuItem variant="destructive" className={cn(MENU_ITEM, '[&_svg]:text-destructive')} onClick={() => onDelete(object)}>
															<Trash2Icon aria-hidden="true" />
															Delete
														</DropdownMenuItem>
													) : null}
												</DropdownMenuContent>
											</DropdownMenu>
										) : null}
									</div>
								</td>
							</tr>
						);
					})
				)}
			</tbody>
		</Frame>
	);
}

interface ObjectTableSkeletonProps {
	/** Number of skeleton rows to render. */
	rows?: number;
	className?: string;
	/** Match a table without selection checkboxes. */
	selectable?: boolean;
}

const SKELETON_WIDTHS = ['w-40', 'w-28', 'w-48', 'w-32', 'w-36', 'w-24'];

/** `ObjectTableSkeleton` — loading rows in the object table's layout. */
export function ObjectTableSkeleton({ rows = 6, className, selectable = true }: ObjectTableSkeletonProps) {
	return (
		<Frame className={className}>
			<thead className={tableHeadClass}>
				<tr>
					{selectable ? <th className="w-10 !pr-0" /> : null}
					<th>Name</th>
					<th className="hidden w-24 @lg/table:table-cell">Type</th>
					<th className="hidden w-24 text-right @lg/table:table-cell">Size</th>
					<th className="hidden w-32 text-right @2xl/table:table-cell">Modified</th>
					<th className="w-20" />
				</tr>
			</thead>
			<tbody aria-busy="true" aria-label="Loading files" className="motion-safe:animate-pulse">
				{Array.from({ length: rows }, (_, index) => (
					<tr key={index} className={tableRowClass}>
						{selectable ? (
							<td className="!pr-0">
								<span className="block size-4 rounded-[4px] bg-muted" />
							</td>
						) : null}
						<td>
							<span className="flex items-center gap-2.5">
								<span className="size-7 shrink-0 rounded-lg bg-muted" />
								<span className="flex flex-col gap-1.5">
									<span className={cn('h-2.5 rounded-full bg-muted', SKELETON_WIDTHS[index % SKELETON_WIDTHS.length])} />
									<span className="h-2 w-16 rounded-full bg-muted/70" />
								</span>
							</span>
						</td>
						<td className="hidden @lg/table:table-cell">
							<span className="block h-2.5 w-10 rounded-full bg-muted" />
						</td>
						<td className="hidden @lg/table:table-cell">
							<span className="ml-auto block h-2.5 w-12 rounded-full bg-muted" />
						</td>
						<td className="hidden @2xl/table:table-cell">
							<span className="ml-auto block h-2.5 w-20 rounded-full bg-muted" />
						</td>
						<td />
					</tr>
				))}
			</tbody>
		</Frame>
	);
}

export { COLUMN_COUNT as OBJECT_TABLE_COLUMN_COUNT };

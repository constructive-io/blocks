'use client';

import {
  ArrowDownIcon,
  ArrowUpIcon,
  CopyIcon,
  DownloadIcon,
  MoreHorizontalIcon,
  PencilIcon,
  Trash2Icon,
} from 'lucide-react';

import { Button } from '../button';
import { Checkbox } from '../checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../dropdown-menu';
import { Skeleton } from '../skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../table';
import { FileTypeIcon } from './file-type-icon';
import type { ObjectSort, ObjectSortColumn, StorageObject } from './types';
import { humanizeBytes, formatDate, objectDisplayName, shortMimeLabel } from './utils';

interface ObjectTableProps {
  objects: StorageObject[];
  /** Controlled selection — set of selected object ids. */
  selectedIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  sort: ObjectSort;
  onSortChange: (sort: ObjectSort) => void;
  /** Row click (outside the checkbox/menu) opens the object. */
  onOpenObject?: (object: StorageObject) => void;
  onDownload?: (object: StorageObject) => void;
  onCopyLink?: (object: StorageObject) => void;
  onRename?: (object: StorageObject) => void;
  onDelete?: (object: StorageObject) => void;
  isLoading?: boolean;
  /** Message shown in the body when there are no objects (and not loading). */
  emptyLabel?: string;
  className?: string;
}

interface SortableHeaderProps {
  column: ObjectSortColumn;
  label: string;
  sort: ObjectSort;
  onSortChange: (sort: ObjectSort) => void;
  className?: string;
}

/** A column header whose click toggles/sets sort, with an asc/desc caret. */
function SortableHeader({ column, label, sort, onSortChange, className }: SortableHeaderProps) {
  const isActive = sort.column === column;
  const nextDirection: ObjectSort['direction'] = isActive && sort.direction === 'asc' ? 'desc' : 'asc';
  const CaretIcon = sort.direction === 'asc' ? ArrowUpIcon : ArrowDownIcon;

  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onSortChange({ column, direction: nextDirection })}
        aria-label={`Sort by ${label}`}
        className="-mx-1 inline-flex items-center gap-1 rounded px-1 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        {label}
        {isActive && <CaretIcon className="size-3.5" aria-hidden />}
      </button>
    </TableHead>
  );
}

const COLUMN_COUNT = 6;

/**
 * `ObjectTable` — the object browser table. Built on the `Table` primitive with
 * controlled sort + selection. Row rendering is intentionally flat (no internal
 * sorting/filtering/data-fetching) so a future data layer can wrap it with
 * virtualization without changing this API.
 */
export function ObjectTable({
  objects,
  selectedIds,
  onSelectionChange,
  sort,
  onSortChange,
  onOpenObject,
  onDownload,
  onCopyLink,
  onRename,
  onDelete,
  isLoading,
  emptyLabel = 'No files',
  className,
}: ObjectTableProps) {
  if (isLoading) {
    return <ObjectTableSkeleton className={className} />;
  }

  const selected = new Set(selectedIds);
  const allSelected = objects.length > 0 && selected.size === objects.length;
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = (checked: boolean) => {
    onSelectionChange(checked ? objects.map((object) => object.id) : []);
  };

  const toggleOne = (objectId: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(objectId);
    else next.delete(objectId);
    onSelectionChange([...next]);
  };

  return (
    <Table className={className}>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10">
            <Checkbox
              aria-label="Select all files"
              checked={allSelected}
              indeterminate={someSelected}
              onCheckedChange={(checked) => toggleAll(checked === true)}
            />
          </TableHead>
          <SortableHeader column="filename" label="Name" sort={sort} onSortChange={onSortChange} />
          <SortableHeader
            className="hidden sm:table-cell"
            column="mimeType"
            label="Type"
            onSortChange={onSortChange}
            sort={sort}
          />
          <SortableHeader
            className="hidden text-right sm:table-cell"
            column="size"
            label="Size"
            onSortChange={onSortChange}
            sort={sort}
          />
          <SortableHeader
            column="createdAt"
            label="Modified"
            sort={sort}
            onSortChange={onSortChange}
            className="hidden text-right sm:table-cell"
          />
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {objects.length === 0 ? (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={COLUMN_COUNT} className="h-24 text-center text-sm text-muted-foreground">
              {emptyLabel}
            </TableCell>
          </TableRow>
        ) : (
          objects.map((object) => {
            const isSelected = selected.has(object.id);
            const displayName = objectDisplayName(object);
            const mimeLabel = shortMimeLabel(object.mimeType);
            const formattedSize = humanizeBytes(object.size);
            const modifiedAt = formatDate(object.createdAt);
            const hasPrimaryAction = Boolean(onDownload || onCopyLink || onRename);
            const hasObjectAction = hasPrimaryAction || Boolean(onDelete);
            return (
              <TableRow
                key={object.id}
                data-state={isSelected ? 'selected' : undefined}
                onClick={onOpenObject ? () => onOpenObject(object) : undefined}
                className={onOpenObject ? 'cursor-pointer' : undefined}
              >
                <TableCell onClick={(event) => event.stopPropagation()}>
                  <Checkbox
                    aria-label={`Select ${displayName}`}
                    checked={isSelected}
                    onCheckedChange={(checked) => toggleOne(object.id, checked === true)}
                  />
                </TableCell>
                <TableCell className="max-w-0">
                  {onOpenObject ? (
                    <button
                      type="button"
                      aria-label={`Open details for ${displayName}`}
                      className="flex w-full min-w-0 items-center gap-2 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                      onClick={(event) => {
                        event.stopPropagation();
                        onOpenObject(object);
                      }}
                    >
                      <FileTypeIcon mimeType={object.mimeType} />
                      <span className="truncate font-medium">{displayName}</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <FileTypeIcon mimeType={object.mimeType} />
                      <span className="truncate font-medium">{displayName}</span>
                    </div>
                  )}
                  <span className="mt-1 block truncate text-xs text-muted-foreground sm:hidden">
                    <span className="sr-only">Type </span>
                    {mimeLabel}
                    <span aria-hidden> · </span>
                    <span className="sr-only">size </span>
                    {formattedSize}
                    <span aria-hidden> · </span>
                    <span className="sr-only">modified </span>
                    {modifiedAt}
                  </span>
                </TableCell>
                <TableCell className="hidden text-muted-foreground sm:table-cell">{mimeLabel}</TableCell>
                <TableCell className="hidden text-right tabular-nums sm:table-cell">{formattedSize}</TableCell>
                <TableCell className="hidden text-right tabular-nums text-muted-foreground sm:table-cell">
                  {modifiedAt}
                </TableCell>
                <TableCell onClick={(event) => event.stopPropagation()}>
                  {hasObjectAction ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${displayName}`}>
                          <MoreHorizontalIcon aria-hidden />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onDownload ? (
                          <DropdownMenuItem onClick={() => onDownload(object)}>
                            <DownloadIcon className="size-4" aria-hidden />
                            Download
                          </DropdownMenuItem>
                        ) : null}
                        {onCopyLink ? (
                          <DropdownMenuItem onClick={() => onCopyLink(object)}>
                            <CopyIcon className="size-4" aria-hidden />
                            Copy link
                          </DropdownMenuItem>
                        ) : null}
                        {onRename ? (
                          <DropdownMenuItem onClick={() => onRename(object)}>
                            <PencilIcon className="size-4" aria-hidden />
                            Rename
                          </DropdownMenuItem>
                        ) : null}
                        {hasPrimaryAction && onDelete ? <DropdownMenuSeparator /> : null}
                        {onDelete ? (
                          <DropdownMenuItem variant="destructive" onClick={() => onDelete(object)}>
                            <Trash2Icon className="size-4" aria-hidden />
                            Delete
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                </TableCell>
              </TableRow>
            );
          })
        )}
      </TableBody>
    </Table>
  );
}

interface ObjectTableSkeletonProps {
  /** Number of skeleton rows to render. */
  rows?: number;
  className?: string;
}

/**
 * `ObjectTableSkeleton` — structural loading placeholder matching the object
 * table's column layout. Pure render.
 */
export function ObjectTableSkeleton({ rows = 6, className }: ObjectTableSkeletonProps) {
  return (
    <Table className={className}>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10" />
          <TableHead>Name</TableHead>
          <TableHead className="hidden sm:table-cell">Type</TableHead>
          <TableHead className="hidden text-right sm:table-cell">Size</TableHead>
          <TableHead className="hidden text-right sm:table-cell">Modified</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, index) => (
          // Skeleton rows are positional and static; index key is acceptable here.
          <TableRow key={index} className="hover:bg-transparent">
            <TableCell>
              <Skeleton className="size-4 rounded-[4px]" />
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <Skeleton className="size-4" />
                <Skeleton className="h-4 w-40" />
              </div>
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              <Skeleton className="h-4 w-10" />
            </TableCell>
            <TableCell className="hidden justify-end sm:flex">
              <Skeleton className="h-4 w-12" />
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              <Skeleton className="ml-auto h-4 w-20" />
            </TableCell>
            <TableCell>
              <Skeleton className="size-4" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export { COLUMN_COUNT as OBJECT_TABLE_COLUMN_COUNT };

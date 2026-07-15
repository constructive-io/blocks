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
          <SortableHeader column="mimeType" label="Type" sort={sort} onSortChange={onSortChange} />
          <SortableHeader column="size" label="Size" sort={sort} onSortChange={onSortChange} className="text-right" />
          <SortableHeader
            column="createdAt"
            label="Modified"
            sort={sort}
            onSortChange={onSortChange}
            className="text-right"
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
            return (
              <TableRow
                key={object.id}
                data-state={isSelected ? 'selected' : undefined}
                onClick={() => onOpenObject?.(object)}
                className="cursor-pointer"
              >
                <TableCell onClick={(event) => event.stopPropagation()}>
                  <Checkbox
                    aria-label={`Select ${objectDisplayName(object)}`}
                    checked={isSelected}
                    onCheckedChange={(checked) => toggleOne(object.id, checked === true)}
                  />
                </TableCell>
                <TableCell className="max-w-0">
                  <div className="flex items-center gap-2">
                    <FileTypeIcon mimeType={object.mimeType} />
                    <span className="truncate font-medium">{objectDisplayName(object)}</span>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{shortMimeLabel(object.mimeType)}</TableCell>
                <TableCell className="text-right tabular-nums">{humanizeBytes(object.size)}</TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {formatDate(object.createdAt)}
                </TableCell>
                <TableCell onClick={(event) => event.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${objectDisplayName(object)}`}>
                        <MoreHorizontalIcon aria-hidden />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onDownload?.(object)}>
                        <DownloadIcon className="size-4" aria-hidden />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onCopyLink?.(object)}>
                        <CopyIcon className="size-4" aria-hidden />
                        Copy link
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onRename?.(object)}>
                        <PencilIcon className="size-4" aria-hidden />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => onDelete?.(object)}>
                        <Trash2Icon className="size-4" aria-hidden />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
          <TableHead>Type</TableHead>
          <TableHead className="text-right">Size</TableHead>
          <TableHead className="text-right">Modified</TableHead>
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
            <TableCell>
              <Skeleton className="h-4 w-10" />
            </TableCell>
            <TableCell className="flex justify-end">
              <Skeleton className="h-4 w-12" />
            </TableCell>
            <TableCell>
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

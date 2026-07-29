'use client';

import { ArrowDownIcon, ArrowUpIcon, ArrowUpDownIcon, SearchIcon, Trash2Icon, UploadIcon, XIcon } from 'lucide-react';

import { Button } from '../button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../dropdown-menu';
import { InputGroup, InputGroupAddon, InputGroupInput } from '../input-group';
import { cn } from '../../lib/utils';
import type { ObjectSort, ObjectSortColumn } from './types';

const SORT_COLUMNS: { value: ObjectSortColumn; label: string }[] = [
  { value: 'filename', label: 'Name' },
  { value: 'size', label: 'Size' },
  { value: 'createdAt', label: 'Modified' },
  { value: 'mimeType', label: 'Type' },
];

interface ObjectToolbarProps {
  query: string;
  onQueryChange: (query: string) => void;
  sort: ObjectSort;
  onSortChange: (sort: ObjectSort) => void;
  onUpload?: () => void;
  /** Number of currently selected objects. >0 swaps to the selection bar. */
  selectedCount?: number;
  /** Signals intent to delete the selection; the parent binds the ids + confirms. */
  onBulkDelete?: () => void;
  /**
   * Progress for an in-flight bulk delete: while set, the Delete button shows a
   * "Deleting N/M" count and is disabled; any failed ids surface as a note.
   */
  bulkDeleteProgress?: { done: number; total: number; failed: string[] };
  onClearSelection?: () => void;
  className?: string;
}

/**
 * `ObjectToolbar` — search + sort + upload. When `selectedCount > 0` it swaps to
 * a selection action bar (count, destructive Delete, Clear). Fully controlled.
 *
 * The destructive Delete here only signals intent via `onBulkDelete`; the parent
 * is expected to route it through an AlertDialog confirmation.
 */
export function ObjectToolbar({
  query,
  onQueryChange,
  sort,
  onSortChange,
  onUpload,
  selectedCount = 0,
  onBulkDelete,
  bulkDeleteProgress,
  onClearSelection,
  className,
}: ObjectToolbarProps) {
  if (selectedCount > 0) {
    const isDeleting = bulkDeleteProgress != null && bulkDeleteProgress.done < bulkDeleteProgress.total;
    const failedCount = bulkDeleteProgress?.failed.length ?? 0;
    return (
      <div className={cn('flex h-9 items-center justify-between gap-2 rounded-lg border bg-muted/40 px-2', className)}>
        <span className="flex items-center gap-2 text-sm font-medium tabular-nums">
          {selectedCount} selected
          {failedCount > 0 && <span className="text-xs font-normal text-destructive">{failedCount} failed</span>}
        </span>
        <div className="flex items-center gap-1.5">
          <Button variant="destructive-outline" size="sm" onClick={onBulkDelete} disabled={isDeleting}>
            <Trash2Icon aria-hidden />
            {isDeleting ? `Deleting ${bulkDeleteProgress.done}/${bulkDeleteProgress.total}` : 'Delete'}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClearSelection} disabled={isDeleting}>
            <XIcon aria-hidden />
            Clear
          </Button>
        </div>
      </div>
    );
  }

  const activeColumn = SORT_COLUMNS.find((column) => column.value === sort.column);
  const DirectionIcon = sort.direction === 'asc' ? ArrowUpIcon : ArrowDownIcon;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <InputGroup className="max-w-xs flex-1">
        <InputGroupAddon>
          <SearchIcon aria-hidden />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          placeholder="Search files"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </InputGroup>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <ArrowUpDownIcon aria-hidden />
            <span className="max-sm:sr-only">{activeColumn?.label ?? 'Sort'}</span>
            <DirectionIcon aria-hidden className="opacity-70" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuLabel>Sort by</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={sort.column}
            onValueChange={(value) => onSortChange({ ...sort, column: value as ObjectSortColumn })}
          >
            {SORT_COLUMNS.map((column) => (
              <DropdownMenuRadioItem key={column.value} value={column.value}>
                {column.label}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Direction</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={sort.direction}
            onValueChange={(value) => onSortChange({ ...sort, direction: value as ObjectSort['direction'] })}
          >
            <DropdownMenuRadioItem value="asc">Ascending</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="desc">Descending</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button size="sm" onClick={onUpload}>
        <UploadIcon aria-hidden />
        Upload
      </Button>
    </div>
  );
}

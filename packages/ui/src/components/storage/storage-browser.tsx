'use client';

import { Separator } from '../separator';
import { cn } from '../../lib/utils';
import { BucketRail } from './bucket-rail';
import { ObjectTable } from './object-table';
import { ObjectToolbar } from './object-toolbar';
import { StorageBreadcrumb, type StorageBreadcrumbSegment } from './storage-breadcrumb';
import { StorageEmptyState, type StorageEmptyStateVariant } from './storage-empty-state';
import type { ObjectSort, StorageBucket, StorageObject } from './types';
import { bucketDisplayName } from './utils';
import { VisibilityBadge } from './visibility-badge';

interface StorageBrowserProps {
  // Buckets (left rail)
  buckets: StorageBucket[];
  selectedBucketId?: string | null;
  onSelectBucket: (bucketId: string) => void;
  onNewBucket?: () => void;

  // Objects (right pane)
  objects: StorageObject[];
  selectedIds: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  sort: ObjectSort;
  onSortChange: (sort: ObjectSort) => void;
  query: string;
  onQueryChange: (query: string) => void;

  // Folder breadcrumb (optional)
  segments?: StorageBreadcrumbSegment[];
  onNavigate?: (path: string | null) => void;

  // Object actions
  onOpenObject?: (object: StorageObject) => void;
  onUpload?: () => void;
  /** Delete the currently selected objects. Receives the selected ids. */
  onBulkDelete?: (ids: string[]) => void;
  /**
   * Progress surface for an in-flight bulk delete: N-of-M + ids that failed.
   * When set, the toolbar shows a "Deleting N/M" indicator and a partial-failure
   * note.
   */
  bulkDeleteProgress?: { done: number; total: number; failed: string[] };
  onClearSelection?: () => void;
  onDownload?: (object: StorageObject) => void;
  onCopyLink?: (object: StorageObject) => void;
  onRename?: (object: StorageObject) => void;
  onDelete?: (object: StorageObject) => void;

  // State flags
  isLoading?: boolean;
  /** Forwarded to the object table's empty body row (e.g. when a search filters all out). */
  emptyLabel?: string;
  /**
   * When set, the right pane shows an empty state instead of the table.
   * `'empty-bucket'` still renders the toolbar; `'no-access'`/`'not-provisioned'`
   * take over the whole pane.
   */
  emptyState?: StorageEmptyStateVariant | null;
  onEmptyStateAction?: () => void;
  onEmptyStateSecondaryAction?: () => void;

  className?: string;
}

/**
 * `StorageBrowser` — master/detail page composition: a fixed-width `BucketRail`
 * on the left and an object browser on the right (header + toolbar +
 * breadcrumb + table / empty state). Owns no data logic; it arranges children
 * and forwards every callback. The detail sheet and config/upload sheets are
 * rendered by the host alongside this component.
 */
export function StorageBrowser({
  buckets,
  selectedBucketId,
  onSelectBucket,
  onNewBucket,
  objects,
  selectedIds,
  onSelectionChange,
  sort,
  onSortChange,
  query,
  onQueryChange,
  segments,
  onNavigate,
  onOpenObject,
  onUpload,
  onBulkDelete,
  bulkDeleteProgress,
  onClearSelection,
  onDownload,
  onCopyLink,
  onRename,
  onDelete,
  isLoading,
  emptyLabel,
  emptyState,
  onEmptyStateAction,
  onEmptyStateSecondaryAction,
  className,
}: StorageBrowserProps) {
  const selectedBucket = buckets.find((bucket) => bucket.id === selectedBucketId) ?? null;

  // Whole-pane empty states (no toolbar/header context to show).
  const paneTakeover = emptyState === 'no-buckets' || emptyState === 'no-access' || emptyState === 'not-provisioned';

  // Buckets exist but none is selected yet (and no takeover state). Show a
  // neutral prompt — NOT the `no-buckets` empty state, which would wrongly claim
  // there are no buckets.
  const showSelectBucketPrompt = !paneTakeover && !selectedBucket && buckets.length > 0;

  return (
    <div className={cn('flex h-full min-h-0 overflow-hidden rounded-lg border bg-background', className)}>
      <aside className="flex w-64 shrink-0 flex-col border-r">
        <div className="flex h-12 items-center px-3">
          <h2 className="text-sm font-semibold">Buckets</h2>
        </div>
        <Separator />
        <BucketRail
          buckets={buckets}
          selectedBucketId={selectedBucketId}
          onSelectBucket={onSelectBucket}
          onNewBucket={onNewBucket}
          className="min-h-0 flex-1"
        />
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        {showSelectBucketPrompt ? (
          <div className="flex h-full w-full flex-col items-center justify-center px-6 py-12 text-center">
            <p className="text-sm text-muted-foreground">Select a bucket to view its files.</p>
          </div>
        ) : !selectedBucket || paneTakeover ? (
          <StorageEmptyState
            variant={emptyState ?? 'no-buckets'}
            onAction={onEmptyStateAction ?? onNewBucket}
            onSecondaryAction={onEmptyStateSecondaryAction}
          />
        ) : (
          <>
            <header className="flex min-h-12 items-center gap-2 px-4 py-2">
              <h1 className="truncate text-sm font-semibold">{bucketDisplayName(selectedBucket)}</h1>
              <VisibilityBadge visibility={selectedBucket.visibility} size="sm" />
              <div className="ml-auto">
                <ObjectToolbar
                  query={query}
                  onQueryChange={onQueryChange}
                  sort={sort}
                  onSortChange={onSortChange}
                  onUpload={onUpload}
                  selectedCount={selectedIds.length}
                  onBulkDelete={onBulkDelete ? () => onBulkDelete(selectedIds) : undefined}
                  bulkDeleteProgress={bulkDeleteProgress}
                  onClearSelection={onClearSelection}
                />
              </div>
            </header>

            {(segments?.length ?? 0) > 0 && (
              <div className="px-4 pb-2">
                <StorageBreadcrumb
                  bucketKey={bucketDisplayName(selectedBucket)}
                  segments={segments}
                  onNavigate={onNavigate}
                />
              </div>
            )}

            <Separator />

            <div className="min-h-0 flex-1 overflow-auto">
              {emptyState === 'empty-bucket' ? (
                <StorageEmptyState variant="empty-bucket" onAction={onEmptyStateAction ?? onUpload} />
              ) : (
                <ObjectTable
                  objects={objects}
                  selectedIds={selectedIds}
                  onSelectionChange={onSelectionChange}
                  sort={sort}
                  onSortChange={onSortChange}
                  onOpenObject={onOpenObject}
                  onDownload={onDownload}
                  onCopyLink={onCopyLink}
                  onRename={onRename}
                  onDelete={onDelete}
                  isLoading={isLoading}
                  emptyLabel={emptyLabel}
                />
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

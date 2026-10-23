import type { ApplicationBlockDoc } from './types';

export const storageBrowserBlock: ApplicationBlockDoc = {
  name: 'storage-browser',
  href: '/blocks/storage/browser',
  section: 'storage',
  title: 'Storage Browser',
  description:
    'A controlled storage workspace: buckets in the workspace sidebar, a file list with type-tinted glyphs, search, sort, drag-and-drop upload, a floating selection bar, detail and bucket sheets, and distinct empty states.',
  previewDescription:
    'Switch buckets, search and sort files, select a few to see the selection bar, drop files onto the list, or open one for its preview and details.',
  previewHeight: 720,
  whenToUse: [
    'Use Storage Browser when people need to inspect and manage objects across several application buckets.',
    'Install a focused storage leaf when the surrounding product already owns navigation, tables, or configuration surfaces.',
  ],
  usage: {
    description:
      'Map GraphQL results into the storage domain types and keep selection, search, sort, folders, and actions in the host. The browser performs no fetching or authorization checks.',
    example: `'use client';

import { useMemo, useState } from 'react';

import {
  ObjectDetailSheet,
  StorageBrowser,
  type ObjectSort,
  type StorageBucket,
  type StorageObject
} from '@/components/ui/storage';

type AssetBrowserActions = Readonly<{
  confirmDelete: (objectIds: string[]) => void;
  copyLink: (object: StorageObject) => void;
  createBucket: () => void;
  download: (object: StorageObject) => void;
  rename: (objectId: string, filename?: string) => void;
  upload: () => void;
}>;

function compareObjects(
  left: StorageObject,
  right: StorageObject,
  sort: ObjectSort
) {
  let comparison = 0;
  if (sort.column === 'filename') {
    comparison = (left.filename ?? left.key).localeCompare(
      right.filename ?? right.key
    );
  } else if (sort.column === 'mimeType') {
    comparison = left.mimeType.localeCompare(right.mimeType);
  } else if (sort.column === 'size') {
    comparison = left.size - right.size;
  } else {
    comparison =
      new Date(left.createdAt).getTime() -
      new Date(right.createdAt).getTime();
  }
  return sort.direction === 'asc' ? comparison : -comparison;
}

export function AssetBrowser({
  actions,
  buckets,
  objects
}: Readonly<{
  actions: AssetBrowserActions;
  buckets: StorageBucket[];
  objects: StorageObject[];
}>) {
  const [bucketId, setBucketId] = useState<string | null>(
    buckets[0]?.id ?? null
  );
  const [openedObject, setOpenedObject] = useState<StorageObject | null>(null);
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sort, setSort] = useState<ObjectSort>({
    column: 'createdAt',
    direction: 'desc'
  });
  const visibleObjects = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return objects
      .filter((object) => {
        if (object.bucketId !== bucketId) return false;
        if (!search) return true;
        const searchable = [
          object.filename ?? '',
          object.key,
          object.mimeType
        ].join(' ');
        return searchable.toLocaleLowerCase().includes(search);
      })
      .sort((left, right) => compareObjects(left, right, sort));
  }, [bucketId, objects, query, sort]);

  return (
    <>
      <StorageBrowser
        buckets={buckets}
        objects={visibleObjects}
        query={query}
        selectedBucketId={bucketId}
        selectedIds={selectedIds}
        sort={sort}
        onBulkDelete={actions.confirmDelete}
        onClearSelection={() => setSelectedIds([])}
        onCopyLink={actions.copyLink}
        onDelete={(object) => actions.confirmDelete([object.id])}
        onDownload={actions.download}
        onNewBucket={actions.createBucket}
        onOpenObject={setOpenedObject}
        onQueryChange={setQuery}
        onRename={(object) => actions.rename(object.id)}
        onSelectBucket={(nextBucketId) => {
          setBucketId(nextBucketId);
          setSelectedIds([]);
        }}
        onSelectionChange={setSelectedIds}
        onSortChange={setSort}
        onUpload={actions.upload}
      />
      <ObjectDetailSheet
        object={openedObject}
        open={openedObject !== null}
        onCopyLink={actions.copyLink}
        onDelete={(objectId) => {
          actions.confirmDelete([objectId]);
          setOpenedObject(null);
        }}
        onDownload={actions.download}
        onOpenChange={(open) => {
          if (!open) setOpenedObject(null);
        }}
        onRename={actions.rename}
      />
    </>
  );
}`,
  },
  state: {
    title: 'Data and action boundaries',
    description:
      'Every collection, selection, filter, sort, and mutation callback is controlled. Filter and authorize records before passing them to the block, then refresh its props after a mutation succeeds.',
  },
  composition: [
    'The storage-browser registry item installs the shared storage barrel and every leaf: bucket rail, object table, upload dropzone, detail sheet, bucket configuration sheet, and empty states.',
    'StorageBrowser sits on the shared workspace shell (the same sidebar rail, drawer, and view header as Agents Builder and Billing) and composes the bucket rail, folder path, search, sort menu, object table, selection bar, and empty states; render the installed sheets and upload surface beside it.',
    'The types mirror Constructive storage records, but the UI remains transport-neutral and does not bypass PostgreSQL privileges or RLS.',
  ],
  accessibility: [
    'Preserve object filenames, MIME types, sizes, and dates as text so file state never depends on an icon or color alone.',
    'Keep selection controlled and announce the resulting count; bulk deletion should open a confirmation before calling the mutation.',
    'Treat unavailable storage, denied access, no buckets, and an empty bucket as distinct states because they require different recovery actions.',
  ],
  api: [
    {
      name: 'buckets / selectedBucketId / onSelectBucket',
      type: 'StorageBucket[] / string | null / callback',
      behavior:
        'Supplies the bucket rail and keeps the active bucket controlled by the host.',
    },
    {
      name: 'objects / selectedIds / onSelectionChange',
      type: 'StorageObject[] / string[] / callback',
      behavior:
        'Supplies visible objects and controls row and bulk selection.',
    },
    {
      name: 'sort / onSortChange',
      type: 'ObjectSort / callback',
      behavior:
        'Reports the requested column and direction; the host returns objects in the corresponding order.',
    },
    {
      name: 'query / onQueryChange',
      type: 'string / callback',
      behavior:
        'Controls the search field while filtering or remote querying remains in the host.',
    },
    {
      name: 'segments / onNavigate',
      type: 'StorageBreadcrumbSegment[] / callback',
      behavior:
        'Adds optional folder navigation beneath the active bucket header.',
    },
    {
      name: 'onUpload / onBulkDelete / object callbacks',
      type: 'Callbacks',
      behavior:
        'Delegates upload, delete, open, download, copy-link, rename, and row-delete workflows.',
    },
    {
      name: 'onDropFiles',
      type: '(files: FileList) => void',
      behavior:
        'Turns the file list into a drop target: dragging files over it shows where they will land, and dropping hands the files to the host.',
    },
    {
      name: 'locale',
      type: 'string',
      behavior:
        'Formats the counts in the rail, toolbar and selection bar with the reader\'s own separators (for example "de-DE"). Counts render with "en-US" separators by default so the server and browser agree.',
    },
    {
      name: 'title / defaultSidebarCollapsed',
      type: 'string / boolean',
      behavior:
        'Names the workspace in the sidebar header (default "Storage") and starts the sidebar as an icon rail.',
    },
    {
      name: 'isLoading / emptyState / emptyLabel',
      type: 'boolean / StorageEmptyStateVariant / string',
      behavior:
        'Distinguishes pending results, empty table results, and full-pane storage states.',
    },
    {
      name: 'bulkDeleteProgress',
      type: '{ done: number; total: number; failed: string[] }',
      behavior:
        'Shows deterministic progress and partial failures while a host-owned bulk deletion is running.',
    },
    {
      name: 'className',
      type: 'string',
      behavior:
        'Adds layout classes to the outer storage workspace.',
    },
  ],
};

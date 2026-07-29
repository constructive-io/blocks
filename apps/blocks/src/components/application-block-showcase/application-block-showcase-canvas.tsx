'use client';

import { useMemo, useState } from 'react';

import { Badge } from '@constructive-io/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@constructive-io/ui/sheet';

import {
  OrgChart,
  type OrgChartEdge,
  type OrgChartNodeData,
} from '@/components/ui/org-chart';
import {
  BucketConfigSheet,
  ObjectDetailSheet,
  StorageBrowser,
  UploadDropzone,
  type ObjectSort,
  type StorageBucket,
  type StorageObject,
  type UploadItem,
} from '@/components/ui/storage';
import type { ApplicationBlockDoc } from '@/lib/application-blocks';

const ORG_CHART_EDGES: OrgChartEdge[] = [
  {
    id: 'alex',
    parentId: null,
    displayName: 'Alex Morgan',
    positionTitle: 'Chief Executive Officer',
    avatarUrl: null,
  },
  {
    id: 'maya',
    parentId: 'alex',
    displayName: 'Maya Chen',
    positionTitle: 'VP of Product',
    avatarUrl: null,
  },
  {
    id: 'theo',
    parentId: 'alex',
    displayName: 'Theo Brooks',
    positionTitle: 'VP of Engineering',
    avatarUrl: null,
  },
  {
    id: 'jordan',
    parentId: 'maya',
    displayName: 'Jordan Lee',
    positionTitle: 'Design Lead',
    avatarUrl: null,
  },
  {
    id: 'cass',
    parentId: 'theo',
    displayName: 'Cass Taylor',
    positionTitle: 'Platform Lead',
    avatarUrl: null,
  },
];

const STORAGE_BUCKETS: StorageBucket[] = [
  {
    id: 'assets',
    key: 'product-assets',
    visibility: 'public',
    isPublic: true,
    allowCustomKeys: true,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'application/pdf'],
    maxFileSize: 25_000_000,
    description: 'Product imagery and shared launch assets.',
    provisioned: true,
    objectCount: 4,
  },
  {
    id: 'exports',
    key: 'customer-exports',
    visibility: 'private',
    isPublic: false,
    allowCustomKeys: false,
    allowedMimeTypes: ['text/csv', 'application/zip'],
    maxFileSize: 100_000_000,
    description: 'Private generated exports.',
    provisioned: true,
    objectCount: 2,
  },
  {
    id: 'scratch',
    key: 'scratch-space',
    visibility: 'temp',
    isPublic: false,
    allowCustomKeys: true,
    description: 'Temporary files for active workflows.',
    provisioned: true,
    objectCount: 0,
  },
];

const STORAGE_OBJECTS: StorageObject[] = [
  {
    id: 'launch-cover',
    bucketId: 'assets',
    key: 'launch/cover.png',
    filename: 'launch-cover.png',
    mimeType: 'image/png',
    size: 2_482_132,
    isPublic: true,
    status: 'processed',
    createdAt: '2026-07-25T08:30:00.000Z',
    updatedAt: '2026-07-27T10:12:00.000Z',
  },
  {
    id: 'brand-guidelines',
    bucketId: 'assets',
    key: 'brand/guidelines.pdf',
    filename: 'brand-guidelines.pdf',
    mimeType: 'application/pdf',
    size: 5_902_450,
    isPublic: true,
    status: 'uploaded',
    createdAt: '2026-07-22T14:45:00.000Z',
  },
  {
    id: 'team-photo',
    bucketId: 'assets',
    key: 'people/team-retreat.jpg',
    filename: 'team-retreat.jpg',
    mimeType: 'image/jpeg',
    size: 8_410_004,
    isPublic: true,
    status: 'processed',
    createdAt: '2026-07-18T09:15:00.000Z',
  },
  {
    id: 'release-notes',
    bucketId: 'assets',
    key: 'launch/release-notes.md',
    filename: 'release-notes.md',
    mimeType: 'text/markdown',
    size: 18_420,
    isPublic: true,
    status: 'uploaded',
    createdAt: '2026-07-27T06:20:00.000Z',
  },
  {
    id: 'july-customers',
    bucketId: 'exports',
    key: '2026/07/customers.csv',
    filename: 'customers-july.csv',
    mimeType: 'text/csv',
    size: 842_202,
    isPublic: false,
    status: 'processed',
    createdAt: '2026-07-27T05:05:00.000Z',
  },
  {
    id: 'audit-archive',
    bucketId: 'exports',
    key: '2026/07/audit-log.zip',
    filename: 'audit-log.zip',
    mimeType: 'application/zip',
    size: 12_734_120,
    isPublic: false,
    status: 'processed',
    createdAt: '2026-07-26T23:15:00.000Z',
  },
];

const UPLOADS: UploadItem[] = [
  {
    id: 'upload-1',
    filename: 'campaign-banner.png',
    size: 3_240_880,
    progress: 68,
    status: 'uploading',
  },
];

function OrgChartPreview() {
  const [message, setMessage] = useState(
    'Select a person or drag a non-root card onto a new manager.',
  );

  function personName(person: OrgChartNodeData) {
    return person.displayName ?? 'This person';
  }

  return (
    <div
      className="flex min-h-full w-full flex-col gap-3 p-3 sm:p-5"
      data-slot="application-block-showcase-canvas"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-base font-semibold tracking-tight">
            Product organization
          </h1>
          <p className="text-sm text-muted-foreground">
            Five people · two reporting groups
          </p>
        </div>
        <Badge variant="secondary">Editable</Badge>
      </div>

      <OrgChart
        className="h-[590px] min-h-[590px]"
        defaultEdges={ORG_CHART_EDGES}
        onAddToChart={() => setMessage('Add-person workflow requested.')}
        onEditNode={(person) =>
          setMessage(`Edit requested for ${personName(person)}.`)
        }
        onRemoveNode={(person) =>
          setMessage(`Removal confirmation requested for ${personName(person)}.`)
        }
        onReparent={(_, __, preserve) =>
          setMessage(
            preserve.positionTitle
              ? `Reporting line updated for ${preserve.positionTitle}.`
              : 'Reporting line updated.',
          )
        }
        onReparentError={setMessage}
      />

      <p
        className="min-h-6 text-pretty text-xs leading-5 text-muted-foreground"
        role="status"
      >
        {message}
      </p>
    </div>
  );
}

function compareStorageObjects(
  left: StorageObject,
  right: StorageObject,
  sort: ObjectSort,
) {
  let comparison = 0;
  if (sort.column === 'filename') {
    comparison = (left.filename ?? left.key).localeCompare(
      right.filename ?? right.key,
    );
  } else if (sort.column === 'mimeType') {
    comparison = left.mimeType.localeCompare(right.mimeType);
  } else if (sort.column === 'size') {
    comparison = left.size - right.size;
  } else {
    comparison =
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
  }
  return sort.direction === 'asc' ? comparison : -comparison;
}

function StorageBrowserPreview() {
  const [selectedBucketId, setSelectedBucketId] = useState('assets');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<ObjectSort>({
    column: 'createdAt',
    direction: 'desc',
  });
  const [openedObject, setOpenedObject] = useState<StorageObject | null>(null);
  const [bucketConfigOpen, setBucketConfigOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [message, setMessage] = useState(
    'Choose a bucket, search files, or open an object to inspect its details.',
  );

  const visibleObjects = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return STORAGE_OBJECTS.filter((object) => {
      if (object.bucketId !== selectedBucketId) return false;
      if (normalizedQuery === '') return true;
      const searchableName = `${object.filename ?? ''} ${object.key} ${object.mimeType}`;
      return searchableName.toLocaleLowerCase().includes(normalizedQuery);
    }).sort((left, right) => compareStorageObjects(left, right, sort));
  }, [query, selectedBucketId, sort]);

  const activeBucket = STORAGE_BUCKETS.find(
    (bucket) => bucket.id === selectedBucketId,
  );
  const emptyState =
    activeBucket?.objectCount === 0 ? ('empty-bucket' as const) : null;

  function selectBucket(bucketId: string) {
    setSelectedBucketId(bucketId);
    setSelectedIds([]);
    setQuery('');
    const bucket = STORAGE_BUCKETS.find((candidate) => candidate.id === bucketId);
    setMessage(`${bucket?.key ?? 'Bucket'} selected.`);
  }

  function describeObject(action: string, object: StorageObject) {
    setMessage(`${action}: ${object.filename ?? object.key}.`);
  }

  return (
    <div
      className="flex min-h-full w-full flex-col gap-3 p-3 sm:p-5"
      data-slot="application-block-showcase-canvas"
    >
      <StorageBrowser
        buckets={STORAGE_BUCKETS}
        className="h-[630px] max-sm:[&>aside]:w-36"
        emptyLabel={query ? 'No files match this search' : 'No files'}
        emptyState={emptyState}
        objects={visibleObjects}
        query={query}
        selectedBucketId={selectedBucketId}
        selectedIds={selectedIds}
        sort={sort}
        onBulkDelete={(ids) =>
          setMessage(`Bulk-delete confirmation requested for ${ids.length} files.`)
        }
        onClearSelection={() => setSelectedIds([])}
        onCopyLink={(object) => describeObject('Link copied', object)}
        onDelete={(object) => describeObject('Delete requested', object)}
        onDownload={(object) => describeObject('Download requested', object)}
        onEmptyStateAction={() => setUploadOpen(true)}
        onNewBucket={() => setBucketConfigOpen(true)}
        onOpenObject={setOpenedObject}
        onQueryChange={setQuery}
        onRename={(object) => describeObject('Rename requested', object)}
        onSelectBucket={selectBucket}
        onSelectionChange={setSelectedIds}
        onSortChange={setSort}
        onUpload={() => setUploadOpen(true)}
      />

      <p
        className="min-h-6 text-pretty text-xs leading-5 text-muted-foreground"
        role="status"
      >
        {message}
      </p>

      <ObjectDetailSheet
        object={openedObject}
        open={openedObject !== null}
        onCopyLink={(object) => describeObject('Link copied', object)}
        onDelete={(id) => {
          setOpenedObject(null);
          setMessage(`Delete confirmation accepted for object ${id}.`);
        }}
        onDownload={(object) => describeObject('Download requested', object)}
        onOpenChange={(open) => {
          if (!open) setOpenedObject(null);
        }}
        onRename={(_, newName) => setMessage(`Rename requested: ${newName}.`)}
      />

      <BucketConfigSheet
        mode="create"
        open={bucketConfigOpen}
        onOpenChange={setBucketConfigOpen}
        onSubmit={(value) => {
          setBucketConfigOpen(false);
          setMessage(`Create-bucket requested for ${value.key}.`);
        }}
      />

      <Sheet open={uploadOpen} onOpenChange={setUploadOpen}>
        <SheetContent className="w-full sm:max-w-lg" side="right">
          <SheetHeader className="text-left">
            <SheetTitle>Upload files</SheetTitle>
            <SheetDescription>
              Add objects to {activeBucket?.key ?? 'the selected bucket'}.
            </SheetDescription>
          </SheetHeader>
          <UploadDropzone
            accept="image/*,.pdf,.csv,.zip"
            maxSize={activeBucket?.maxFileSize}
            onCancel={() => setMessage('Upload cancelled.')}
            onFiles={(files) =>
              setMessage(
                `${files.length} ${files.length === 1 ? 'file' : 'files'} queued for upload.`,
              )
            }
            uploads={UPLOADS}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function ApplicationBlockShowcaseCanvas({
  name,
}: {
  name: ApplicationBlockDoc['name'];
}) {
  return name === 'org-chart' ? (
    <OrgChartPreview />
  ) : (
    <StorageBrowserPreview />
  );
}

'use client';

import { useState } from 'react';

import { ObjectDetailSheet, StorageBrowser, type ObjectSort, type StorageObject } from '@constructive-io/ui/storage';

import { Demo } from '@/components/docs/showcase-kit';
import { buckets, objects } from './storage-fixtures';

export function BlockDemo() {
  const [selectedBucketId, setSelectedBucketId] = useState<string | null>('bucket-public');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sort, setSort] = useState<ObjectSort>({ column: 'createdAt', direction: 'desc' });
  const [query, setQuery] = useState('');
  const [detailObject, setDetailObject] = useState<StorageObject | null>(null);

  const visible = objects.filter((object) =>
    query.trim() === '' ? true : (object.filename ?? object.key).toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <Demo>
      <div className="h-[520px] w-full">
        <StorageBrowser
          buckets={buckets}
          selectedBucketId={selectedBucketId}
          onSelectBucket={setSelectedBucketId}
          onNewBucket={() => {}}
          objects={visible}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          sort={sort}
          onSortChange={setSort}
          query={query}
          onQueryChange={setQuery}
          onOpenObject={setDetailObject}
          onUpload={() => {}}
          onBulkDelete={(ids) => setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)))}
          onClearSelection={() => setSelectedIds([])}
          onDownload={() => {}}
          onCopyLink={() => {}}
          onRename={setDetailObject}
          onDelete={() => {}}
        />
      </div>
      <ObjectDetailSheet
        object={detailObject}
        open={detailObject !== null}
        onOpenChange={(open) => !open && setDetailObject(null)}
        onDownload={() => {}}
        onCopyLink={() => {}}
        onRename={() => {}}
        onDelete={() => setDetailObject(null)}
      />
    </Demo>
  );
}

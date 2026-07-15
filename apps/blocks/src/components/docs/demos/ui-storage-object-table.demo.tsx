'use client';

import { useState } from 'react';

import { ObjectTable, type ObjectSort } from '@constructive-io/ui/storage';

import { Demo } from '@/components/docs/showcase-kit';
import { objects } from './storage-fixtures';

export function BlockDemo() {
  const [selectedIds, setSelectedIds] = useState<string[]>(['obj-1', 'obj-4']);
  const [sort, setSort] = useState<ObjectSort>({ column: 'createdAt', direction: 'desc' });

  return (
    <Demo>
      <div className="w-full max-w-3xl">
        <ObjectTable
          objects={objects}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          sort={sort}
          onSortChange={setSort}
          onOpenObject={() => {}}
          onDownload={() => {}}
          onCopyLink={() => {}}
          onRename={() => {}}
          onDelete={() => {}}
        />
      </div>
    </Demo>
  );
}

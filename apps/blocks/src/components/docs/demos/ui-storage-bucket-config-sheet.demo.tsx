'use client';

import { useState } from 'react';

import { Button } from '@constructive-io/ui/button';
import { BucketConfigSheet, type BucketConfigMode } from '@constructive-io/ui/storage';

import { Demo, Segmented } from '@/components/docs/showcase-kit';
import { buckets } from './storage-fixtures';

export function BlockDemo() {
  const [mode, setMode] = useState<BucketConfigMode>('create');
  const [open, setOpen] = useState(false);

  return (
    <Demo>
      <Segmented<BucketConfigMode>
        label="Mode"
        value={mode}
        options={['create', 'edit'] as const}
        onChange={setMode}
      />
      <Button variant="outline" onClick={() => setOpen(true)}>
        {mode === 'create' ? 'New bucket' : 'Edit bucket'}
      </Button>
      <BucketConfigSheet
        mode={mode}
        initial={mode === 'edit' ? buckets[0] : undefined}
        open={open}
        onOpenChange={setOpen}
        onSubmit={() => setOpen(false)}
        onCancel={() => setOpen(false)}
      />
    </Demo>
  );
}

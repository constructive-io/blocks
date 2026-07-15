'use client';

import { useState } from 'react';

import { BucketRail } from '@constructive-io/ui/storage';

import { Demo } from '@/components/docs/showcase-kit';
import { buckets } from './storage-fixtures';

export function BlockDemo() {
  const [selectedId, setSelectedId] = useState<string | null>('bucket-public');

  return (
    <Demo>
      <div className="h-96 w-64 overflow-hidden rounded-lg border bg-background">
        <BucketRail
          buckets={buckets}
          selectedBucketId={selectedId}
          onSelectBucket={setSelectedId}
          onNewBucket={() => {}}
        />
      </div>
    </Demo>
  );
}

'use client';

import { useState } from 'react';

import { StorageEmptyState, type StorageEmptyStateVariant } from '@constructive-io/ui/storage';

import { Demo, Segmented } from '@/components/docs/showcase-kit';

const VARIANTS = ['no-buckets', 'not-provisioned', 'empty-bucket', 'no-access'] as const;

export function BlockDemo() {
  const [variant, setVariant] = useState<StorageEmptyStateVariant>('empty-bucket');

  return (
    <Demo>
      <Segmented<StorageEmptyStateVariant>
        label="Variant"
        value={variant}
        options={VARIANTS}
        onChange={setVariant}
      />
      <div className="flex h-72 w-full max-w-md items-center overflow-hidden rounded-lg border bg-background">
        <StorageEmptyState variant={variant} onAction={() => {}} onSecondaryAction={() => {}} />
      </div>
    </Demo>
  );
}

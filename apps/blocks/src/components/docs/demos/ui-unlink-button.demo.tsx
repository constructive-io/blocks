'use client';

import { useState } from 'react';

import { UnlinkButton } from '@constructive-io/ui/unlink-button';

import { Demo } from '@/components/docs/showcase-kit';

const RECORDS = [
  { id: 'usr_1', label: 'Ada Lovelace', sub: 'owner · ada@acme.com' },
  { id: 'usr_2', label: 'Grace Hopper', sub: 'editor · grace@acme.com' },
];

export function BlockDemo() {
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null);

  return (
    <Demo>
      <div className="flex w-full max-w-sm flex-col gap-2">
        {RECORDS.map((record) => (
          <div
            key={record.id}
            className="flex items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2"
          >
            <div className="flex flex-col">
              <span className="text-sm font-medium">{record.label}</span>
              <span className="text-xs text-muted-foreground">{record.sub}</span>
            </div>
            <UnlinkButton
              size="sm"
              isUnlinking={unlinkingId === record.id}
              onUnlink={() => {
                setUnlinkingId(record.id);
                setTimeout(() => setUnlinkingId(null), 1200);
              }}
              aria-label={`Unlink ${record.label}`}
            />
          </div>
        ))}
      </div>
    </Demo>
  );
}

'use client';

import { useState } from 'react';

import { MultiSelect } from '@constructive-io/ui/multi-select';

import { Demo } from '@/components/docs/showcase-kit';

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'editor', label: 'Editor' },
  { value: 'developer', label: 'Developer' },
  { value: 'billing', label: 'Billing' },
  { value: 'viewer', label: 'Viewer' },
  { value: 'guest', label: 'Guest' },
];

export function BlockDemo() {
  const [selected, setSelected] = useState<string[]>(['editor', 'developer']);

  return (
    <Demo>
      <div className="w-80 space-y-3">
        <MultiSelect
          options={ROLES}
          defaultValue={selected}
          onValueChange={setSelected}
          placeholder="Assign roles"
          maxCount={3}
        />
        <p className="text-pretty text-sm text-muted-foreground">
          {selected.length} role{selected.length === 1 ? '' : 's'} selected
        </p>
      </div>
    </Demo>
  );
}

'use client';

import { useState } from 'react';

import { Button } from '@constructive-io/ui/button';
import { Progress } from '@constructive-io/ui/progress';

import { Demo } from '@/components/docs/showcase-kit';

export function BasicProgressDemo() {
  return (
    <Demo>
      <div className="flex w-full max-w-sm flex-col gap-1.5">
        <div className="flex justify-between text-sm">
          <span id="progress-storage-label">Storage used</span>
          <span className="tabular-nums text-muted-foreground">64%</span>
        </div>
        <Progress value={64} aria-labelledby="progress-storage-label" />
      </div>
    </Demo>
  );
}

export function ControlledProgressDemo() {
  const [value, setValue] = useState(32);

  return (
    <Demo>
      <div className="flex w-full max-w-sm flex-col gap-3">
        <div className="flex justify-between text-sm">
          <span id="progress-import-label">Importing seed.csv</span>
          <span className="tabular-nums text-muted-foreground">{value}%</span>
        </div>
        <Progress value={value} aria-labelledby="progress-import-label" />
        <Button size="sm" variant="outline" onClick={() => setValue((current) => (current >= 100 ? 0 : current + 17))}>
          Advance import
        </Button>
      </div>
    </Demo>
  );
}

export function IndeterminateProgressDemo() {
  return (
    <Demo>
      <div className="flex w-full max-w-sm flex-col gap-1.5">
        <span id="progress-backup-label" className="text-sm">
          Preparing backup
        </span>
        <Progress value={null} aria-labelledby="progress-backup-label" />
      </div>
    </Demo>
  );
}

export function ProgressRangeDemo() {
  return (
    <Demo>
      <div className="flex w-full max-w-sm flex-col gap-1.5">
        <div className="flex justify-between text-sm">
          <span id="progress-migration-label">Migration steps</span>
          <span className="tabular-nums text-muted-foreground">3 of 5</span>
        </div>
        <Progress
          value={3}
          min={0}
          max={5}
          aria-labelledby="progress-migration-label"
          getAriaValueText={(_, value) => (value === null ? 'Preparing migration' : `Step ${value} of 5`)}
        />
      </div>
    </Demo>
  );
}

export function BlockDemo() {
  return (
    <Demo>
      <div className="flex w-full max-w-sm flex-col gap-6">
        {[
          { id: 'hero-import', label: 'Importing seed.csv', value: 72 },
          { id: 'hero-storage', label: 'Storage used', value: 64 },
          { id: 'hero-quota', label: 'Monthly quota', value: 38 },
        ].map((item) => (
          <div key={item.id} className="flex flex-col gap-1.5">
            <div className="flex justify-between text-sm">
              <span id={item.id}>{item.label}</span>
              <span className="tabular-nums text-muted-foreground">{item.value}%</span>
            </div>
            <Progress value={item.value} aria-labelledby={item.id} />
          </div>
        ))}
      </div>
    </Demo>
  );
}

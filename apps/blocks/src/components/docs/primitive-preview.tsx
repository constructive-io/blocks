'use client';

import type { BasePrimitiveName } from '@/lib/base-primitives';

import { UI_DEMOS } from './showcase-ui';

export function PrimitivePreview({ name }: { name: BasePrimitiveName }) {
  const Demo = UI_DEMOS[name];

  return (
    <div className="flex min-h-64 w-full items-center justify-center overflow-hidden rounded-xl border border-border/50 bg-[color-mix(in_oklch,var(--card),var(--muted)_25%)] p-6 shadow-card sm:min-h-72 sm:p-10 dark:bg-background">
      <Demo />
    </div>
  );
}

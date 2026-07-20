'use client';

import type { BasePrimitiveName } from '@/lib/base-primitives';
import { cn } from '@/lib/utils';

import { UI_DEMOS } from './showcase-ui';

export function PrimitivePreview({
  name,
  framed = true,
}: {
  name: BasePrimitiveName;
  /** When false, used inside an existing registry-block stage. */
  framed?: boolean;
}) {
  const Demo = UI_DEMOS[name];

  if (!framed) {
    return (
      <div className="flex w-full items-center justify-center">
        <Demo />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex min-h-64 w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-card p-6 shadow-sm sm:min-h-72 sm:p-10',
      )}
    >
      <Demo />
    </div>
  );
}

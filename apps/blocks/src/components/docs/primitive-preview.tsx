'use client';

import type { BasePrimitiveName } from '@/lib/base-primitives';
import { cn } from '@/lib/utils';

import { getUiDemo } from './showcase-ui';

export function PrimitivePreview({
  name,
  demo = 'BlockDemo',
  framed = true,
}: {
  name: BasePrimitiveName;
  demo?: string;
  /** When false, used inside an existing registry-block stage. */
  framed?: boolean;
}) {
  const Demo = getUiDemo(name, demo);

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

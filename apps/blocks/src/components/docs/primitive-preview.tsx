'use client';

import type { BasePrimitiveName } from '@/lib/base-primitives';

import { UI_DEMOS } from './showcase-ui';

export function PrimitivePreview({ name }: { name: BasePrimitiveName }) {
  const Demo = UI_DEMOS[name];

  return (
    <div className="flex min-h-64 w-full items-center justify-center overflow-hidden rounded-xl border bg-card p-6 sm:p-10">
      <Demo />
    </div>
  );
}

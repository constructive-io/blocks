'use client';

import { Skeleton } from '@constructive-io/ui/skeleton';

import { Demo } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  return (
    <Demo>
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center gap-4">
          <Skeleton className="size-12 rounded-full" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border p-4">
          <Skeleton className="h-4 w-32" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-md" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      </div>
    </Demo>
  );
}

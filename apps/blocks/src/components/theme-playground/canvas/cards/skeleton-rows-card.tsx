import { Skeleton } from '@constructive-io/ui/skeleton';

import { SinkCard } from './sink-card';

export function SkeletonRowsCard() {
  return (
    <SinkCard contentClassName="flex flex-col gap-4">
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex items-center gap-3">
          <Skeleton className="size-9 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-2.5 w-3/5" />
            <Skeleton className="h-2.5 w-2/5" />
          </div>
        </div>
      ))}
      <Skeleton className="h-8 w-24 rounded-md" />
    </SinkCard>
  );
}

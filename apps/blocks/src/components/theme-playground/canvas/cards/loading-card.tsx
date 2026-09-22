import { Skeleton } from '@constructive-io/ui/skeleton';

import { SinkCard } from './sink-card';

export function LoadingCard() {
  return (
    <SinkCard title="Loading">
      <div className="flex items-start gap-3" role="status" aria-label="Loading activity">
        <Skeleton className="size-9 shrink-0 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-5/6" />
          <Skeleton className="h-8 w-full rounded-md" />
        </div>
      </div>
      <span className="sr-only">Loading</span>
    </SinkCard>
  );
}

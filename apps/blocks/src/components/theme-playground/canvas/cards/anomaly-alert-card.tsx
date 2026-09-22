import { Activity } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@constructive-io/ui/empty';

import { SinkCard } from './sink-card';

export function AnomalyAlertCard() {
  return (
    <SinkCard contentClassName="px-0 pt-0 pb-0">
      <Empty className="rounded-md">
        <EmptyHeader>
          <div className="mb-2 flex size-8 items-center justify-center rounded-md bg-warning/12 text-warning">
            <Activity className="size-4" aria-hidden />
          </div>
          <EmptyTitle>Anomaly detected</EmptyTitle>
          <EmptyDescription>
            Write latency on <code className="font-mono text-[12px]">orders</code> is 3.2× the 7-day baseline.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent className="flex-row justify-center gap-2">
          <Button size="sm">Investigate</Button>
          <Button variant="ghost" size="sm">
            Dismiss
          </Button>
        </EmptyContent>
      </Empty>
    </SinkCard>
  );
}

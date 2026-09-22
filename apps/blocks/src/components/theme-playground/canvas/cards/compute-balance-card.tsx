import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';

import { Area } from '../charts/area';
import { SinkCard } from './sink-card';

const TREND = [62, 70, 66, 78, 74, 88, 84, 96, 91, 100];

export function ComputeBalanceCard() {
  return (
    <SinkCard contentClassName="flex flex-col gap-4">
      <div>
        <p className="text-[12px] text-muted-foreground">Compute balance</p>
        <div className="mt-1 flex items-baseline gap-2">
          <p className="text-2xl font-semibold tracking-tight tabular-nums">1,240</p>
          <span className="text-sm text-muted-foreground">credits</span>
          <Badge variant="success" className="ml-auto">
            +120 this week
          </Badge>
        </div>
      </div>
      <Area data={TREND} color="var(--chart-1)" className="h-16" label="Credit balance trend over the last ten days" />
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1">
          Top up
        </Button>
        <Button variant="outline" size="sm" className="flex-1">
          Auto-refill
        </Button>
      </div>
    </SinkCard>
  );
}

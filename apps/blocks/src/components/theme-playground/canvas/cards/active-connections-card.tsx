import { Badge } from '@constructive-io/ui/badge';

import { Area } from '../charts/area';
import { SinkCard } from './sink-card';

const POOLED = [30, 34, 32, 40, 44, 42, 50, 54, 52, 60, 62, 66];
const DIRECT = [22, 20, 24, 26, 24, 30, 28, 32, 34, 33, 38, 40];

export function ActiveConnectionsCard() {
  return (
    <SinkCard
      title="Active connections"
      description="Last 6 months"
      action={
        <Badge variant="success" className="tabular-nums">
          +12%
        </Badge>
      }
      contentClassName="flex flex-col gap-4"
    >
      <div className="relative h-24">
        <Area
          data={DIRECT}
          color="var(--chart-2)"
          className="absolute inset-0 h-full opacity-60"
          label="Direct connections over six months"
        />
        <Area
          data={POOLED}
          color="var(--chart-1)"
          className="absolute inset-0 h-full"
          label="Pooled connections over six months"
        />
      </div>
      <div className="flex items-center gap-4 text-[12px]">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span aria-hidden className="size-2 rounded-full" style={{ background: 'var(--chart-1)' }} />
          Pooled
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span aria-hidden className="size-2 rounded-full" style={{ background: 'var(--chart-2)' }} />
          Direct
        </span>
      </div>
    </SinkCard>
  );
}

import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';

import { RadialBars } from '../charts/radial-bars';
import { SinkCard } from './sink-card';

const RINGS = [
  { name: 'p50', value: 28, color: 'var(--chart-1)' },
  { name: 'p95', value: 48, color: 'var(--chart-2)' },
  { name: 'p99', value: 96, color: 'var(--chart-3)' },
];

export function LatencyReportCard() {
  return (
    <SinkCard
      title="Latency report"
      description="Last night · 00:00–06:00"
      contentClassName="flex flex-col gap-4"
      footer={
        <Button variant="ghost" size="sm" className="-ml-2">
          Open in Logs
        </Button>
      }
    >
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-semibold tracking-tight tabular-nums">48 ms</p>
        <span className="text-[12px] text-muted-foreground">p95</span>
        <Badge variant="success" className="ml-auto">
          Within SLO
        </Badge>
      </div>
      <div className="flex items-center gap-4">
        <RadialBars
          rings={RINGS.map((r) => ({ value: r.value, max: 120, color: r.color }))}
          size={120}
          label="Latency percentiles against the 120 ms SLO"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          {RINGS.map((ring) => (
            <div key={ring.name} className="flex items-center gap-2 text-[12px]">
              <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ background: ring.color }} />
              <span className="text-muted-foreground">{ring.name}</span>
              <span className="ml-auto font-medium tabular-nums">{ring.value} ms</span>
            </div>
          ))}
        </div>
      </div>
    </SinkCard>
  );
}

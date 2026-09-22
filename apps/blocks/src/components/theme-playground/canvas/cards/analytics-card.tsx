import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';

import { Area } from '../charts/area';
import { SinkCard } from './sink-card';

const KPIS = [
  { label: 'Requests', value: '2.4M', delta: '+8.1%' },
  { label: 'Errors', value: '0.12%', delta: '-0.04' },
  { label: 'p95', value: '48 ms', delta: '-6 ms' },
];

const REQUESTS = [42, 38, 45, 51, 48, 55, 60, 57, 63, 58, 66, 71, 68, 74, 70, 77, 82, 78, 74, 80, 85, 79, 83, 88];

export function AnalyticsCard() {
  return (
    <SinkCard
      title="Analytics"
      action={<Badge>Live</Badge>}
      contentClassName="flex flex-col gap-4"
      footer={
        <>
          <span className="text-[12px] text-muted-foreground">Last 24 h</span>
          <Button variant="ghost" size="sm" className="ml-auto -mr-2">
            Export
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-3 gap-2">
        {KPIS.map((kpi) => (
          <div key={kpi.label} className="rounded-md bg-muted/60 px-3 py-2">
            <p className="text-[11px] text-subtle-foreground">{kpi.label}</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums">{kpi.value}</p>
            <p className="text-[11px] text-muted-foreground tabular-nums">{kpi.delta}</p>
          </div>
        ))}
      </div>
      <Area data={REQUESTS} color="var(--chart-1)" className="h-20" label="Requests over the last 24 hours" />
    </SinkCard>
  );
}

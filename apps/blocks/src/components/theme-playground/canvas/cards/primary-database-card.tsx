import { Badge } from '@constructive-io/ui/badge';
import { Separator } from '@constructive-io/ui/separator';

import { SinkCard } from './sink-card';

const STATS = [
  { label: 'Connections', value: '184 / 400' },
  { label: 'Replication lag', value: '12 ms' },
  { label: 'Disk', value: '61%' },
  { label: 'Uptime', value: '99.99%' },
];

export function PrimaryDatabaseCard() {
  return (
    <SinkCard title="Primary database" description="db-prod-eu-1 · Postgres 17">
      <div className="flex items-center gap-2">
        <Badge variant="success">Healthy</Badge>
        <span className="text-[12px] text-muted-foreground">Failover armed</span>
      </div>
      <Separator className="my-4" />
      <dl className="grid grid-cols-2 gap-3">
        {STATS.map((stat) => (
          <div key={stat.label} className="rounded-md bg-muted/60 px-3 py-2.5">
            <dt className="text-[11px] text-subtle-foreground">{stat.label}</dt>
            <dd className="mt-0.5 text-[13px] font-medium tabular-nums">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </SinkCard>
  );
}

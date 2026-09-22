import { Progress } from '@constructive-io/ui/progress';
import { Separator } from '@constructive-io/ui/separator';

import { RadialBars } from '../charts/radial-bars';
import { SinkCard } from './sink-card';

const USAGE = [
  { name: 'API', pct: 62, color: 'var(--chart-1)' },
  { name: 'Workers', pct: 38, color: 'var(--chart-2)' },
  { name: 'Cron', pct: 12, color: 'var(--chart-3)' },
];

export function ComputeUsageCard() {
  return (
    <SinkCard title="Compute usage" description="Whole project · today" contentClassName="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <RadialBars
          rings={USAGE.map((u) => ({ value: u.pct, max: 100, color: u.color }))}
          size={128}
          label="Compute usage by service"
        />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {USAGE.map((u) => (
            <div key={u.name} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between text-[12px]">
                <span className="text-muted-foreground">{u.name}</span>
                <span className="font-medium tabular-nums">{u.pct}%</span>
              </div>
              <Progress value={u.pct} aria-label={`${u.name} usage`} className="h-1.5" />
            </div>
          ))}
        </div>
      </div>
      <Separator />
      <div className="flex items-baseline justify-between">
        <span className="text-[13px] text-muted-foreground">Total</span>
        <span className="text-sm font-medium tabular-nums">3.4 vCPU-hours</span>
      </div>
    </SinkCard>
  );
}

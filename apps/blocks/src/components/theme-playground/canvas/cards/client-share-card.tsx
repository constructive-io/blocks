import type { CSSProperties } from 'react';
import { Badge } from '@constructive-io/ui/badge';
import { Progress } from '@constructive-io/ui/progress';

import { Donut } from '../charts/donut';
import { SinkCard } from './sink-card';

const CHANNELS = [
  { name: 'GraphQL', pct: 46, color: 'var(--chart-1)' },
  { name: 'REST', pct: 28, color: 'var(--chart-2)' },
  { name: 'Realtime', pct: 18, color: 'var(--chart-3)' },
  { name: 'CLI', pct: 8, color: 'var(--chart-4)' },
];

export function ClientShareCard() {
  return (
    <SinkCard
      title="Client share"
      description="Jan – Jun 2026"
      action={<Badge variant="secondary">+2.4%</Badge>}
      contentClassName="flex flex-col gap-4"
    >
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <Donut
            segments={CHANNELS.map((c) => ({ value: c.pct, color: c.color }))}
            size={128}
            label="Client share by channel"
          />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-semibold tabular-nums">46%</span>
            <span className="text-[11px] text-muted-foreground">GraphQL</span>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {CHANNELS.map((channel) => (
            <div key={channel.name} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between text-[12px]">
                <span className="text-muted-foreground">{channel.name}</span>
                <span className="font-medium tabular-nums">{channel.pct}%</span>
              </div>
              <Progress
                value={channel.pct}
                aria-label={`${channel.name} share`}
                className="h-1.5 bg-(--bar)/20 [&_[data-slot=progress-indicator]]:bg-(--bar)"
                style={{ '--bar': channel.color } as CSSProperties}
              />
            </div>
          ))}
        </div>
      </div>
    </SinkCard>
  );
}

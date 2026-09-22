import { Button } from '@constructive-io/ui/button';

import { StackedBars } from '../charts/stacked-bars';
import { SinkCard } from './sink-card';

const DEPLOYS = [4, 6, 5, 8, 7, 3, 5];
const BUILD_MINUTES = [18, 26, 22, 34, 30, 12, 20];
const LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function DeployLoadCard() {
  return (
    <SinkCard
      title="Weekly deploy load"
      description="Deploys and build minutes by day"
      contentClassName="flex flex-col gap-4"
      footer={
        <Button variant="ghost" size="sm" className="-ml-2">
          Open pipeline
        </Button>
      }
    >
      <StackedBars
        series={[
          { color: 'var(--chart-1)', values: DEPLOYS },
          { color: 'var(--chart-3)', values: BUILD_MINUTES.map((m) => m / 5) },
        ]}
        labels={LABELS}
        className="h-28"
        label="Deploys and scaled build minutes per day"
      />
      <div className="flex items-center gap-4 text-[12px]">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span aria-hidden className="size-2 rounded-full" style={{ background: 'var(--chart-1)' }} />
          Deploys
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span aria-hidden className="size-2 rounded-full" style={{ background: 'var(--chart-3)' }} />
          Build min
        </span>
        <span className="ml-auto font-medium tabular-nums">38 deploys · 214 min</span>
      </div>
    </SinkCard>
  );
}

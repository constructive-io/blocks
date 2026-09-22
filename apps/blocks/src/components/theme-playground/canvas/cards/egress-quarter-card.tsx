import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';

import { Area } from '../charts/area';
import { SinkCard } from './sink-card';

const POINTS = [42, 55, 48, 61, 58, 74, 66, 79, 71, 84, 78, 90, 86];

export function EgressQuarterCard() {
  return (
    <SinkCard
      title="Egress — Q2"
      footer={
        <Button variant="ghost" size="sm">
          Breakdown by region
        </Button>
      }
    >
      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-semibold tracking-tight tabular-nums">1.84 TB</p>
        <Badge variant="success">−8% vs Q1</Badge>
      </div>
      <Area data={POINTS} color="var(--chart-3)" className="mt-4 h-20" label="Egress per week this quarter" />
      <div className="mt-4 flex items-baseline justify-between text-[13px]">
        <span className="text-muted-foreground">Included</span>
        <span className="font-medium tabular-nums">2 TB</span>
      </div>
      <div className="mt-2 flex items-baseline justify-between text-[13px]">
        <span className="text-muted-foreground">Overage rate</span>
        <span className="font-medium tabular-nums">$0.09/GB</span>
      </div>
    </SinkCard>
  );
}

import { Badge } from '@constructive-io/ui/badge';

import { Bars } from '../charts/bars';
import { SinkCard } from './sink-card';

const DAYS = [38, 52, 44, 61, 58, 73, 92];
const LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function QueryVolumeCard() {
  return (
    <SinkCard title="Query volume" action={<Badge variant="success">+12%</Badge>}>
      <div>
        <p className="text-[12px] text-muted-foreground">Last 7 days</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums">48.2k queries</p>
      </div>
      <Bars
        data={DAYS}
        labels={LABELS}
        color="var(--chart-1)"
        highlightLast
        className="mt-4 h-20"
        label="Query volume per day, Monday through Sunday"
      />
      <div className="mt-3 flex items-baseline justify-between text-[12px] text-muted-foreground">
        <span>Mon–Sun</span>
        <span>vs 43.1k prior week</span>
      </div>
    </SinkCard>
  );
}

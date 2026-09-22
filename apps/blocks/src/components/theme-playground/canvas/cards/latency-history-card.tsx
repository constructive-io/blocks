import { Badge } from '@constructive-io/ui/badge';
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
} from '@constructive-io/ui/combobox';
import { Separator } from '@constructive-io/ui/separator';

import { Area } from '../charts/area';
import { SinkCard } from './sink-card';

const METRICS = [
  { value: 'p50', label: 'p50' },
  { value: 'p95', label: 'p95' },
  { value: 'p99', label: 'p99' },
];

const LATENCY = [
  52, 48, 55, 50, 47, 53, 58, 51, 49, 46, 54, 57, 52, 50, 48, 55, 60, 56, 52, 49, 51, 54, 47, 50, 53, 49, 46, 52, 50,
  48,
];

export function LatencyHistoryCard() {
  return (
    <SinkCard title="Query latency" description="p95 · last 30 days" contentClassName="flex flex-col gap-4">
      <Combobox items={METRICS} defaultValue={METRICS[1]}>
        <ComboboxInput aria-label="Latency percentile" className="w-28" />
        <ComboboxPopup>
          <ComboboxEmpty>No metric found.</ComboboxEmpty>
          <ComboboxList>
            {(item: (typeof METRICS)[number]) => (
              <ComboboxItem key={item.value} value={item}>
                {item.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxPopup>
      </Combobox>
      <Area
        data={LATENCY}
        color="var(--chart-1)"
        baseline
        className="h-24"
        label="p95 query latency over the last 30 days"
      />
      <div className="flex flex-col gap-2 text-[13px]">
        <div className="flex items-baseline justify-between">
          <span className="text-muted-foreground">Now</span>
          <span className="font-medium tabular-nums">48 ms</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-muted-foreground">30-day avg</span>
          <span className="font-medium tabular-nums">52 ms</span>
        </div>
        <Separator />
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">SLO &lt; 120 ms</span>
          <Badge variant="success">Met</Badge>
        </div>
      </div>
    </SinkCard>
  );
}

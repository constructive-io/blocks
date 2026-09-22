import { Button } from '@constructive-io/ui/button';
import { Item, ItemContent, ItemDescription, ItemTitle } from '@constructive-io/ui/item';

import { Bars } from '../charts/bars';
import { SinkCard } from './sink-card';

const MONTHS = [
  { label: 'Dec', value: 812 },
  { label: 'Jan', value: 1104 },
  { label: 'Feb', value: 938 },
  { label: 'Mar', value: 1287 },
  { label: 'Apr', value: 764 },
  { label: 'May', value: 1410 },
];

export function ComputeSpendCard() {
  return (
    <SinkCard
      title="Compute spend"
      description="Last 6 months"
      footer={<Button className="w-full">View full report</Button>}
    >
      <Bars
        data={MONTHS.map((m) => m.value)}
        labels={MONTHS.map((m) => m.label)}
        color="var(--chart-2)"
        highlightLast
        className="h-24"
        label="Monthly compute spend, December through May"
      />
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Item variant="muted" size="sm">
          <ItemContent>
            <ItemDescription className="text-[11px] uppercase tracking-wide">Next invoice</ItemDescription>
            <ItemTitle className="tabular-nums">Jun 1, 2026</ItemTitle>
            <ItemDescription>$1,240 estimated</ItemDescription>
          </ItemContent>
        </Item>
        <Item variant="muted" size="sm">
          <ItemContent>
            <ItemDescription className="text-[11px] uppercase tracking-wide">Autoscale plan</ItemDescription>
            <ItemTitle>Burst</ItemTitle>
            <ItemDescription>Scales to 8 vCPU</ItemDescription>
          </ItemContent>
        </Item>
      </div>
    </SinkCard>
  );
}

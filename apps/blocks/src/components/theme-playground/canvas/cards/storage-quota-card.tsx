import { Donut } from '../charts/donut';
import { SinkCard } from './sink-card';

const ROWS = [
  { label: 'Projected full', value: 'Oct 2026' },
  { label: 'Daily growth', value: '+38 MB' },
  { label: 'Largest bucket', value: 'attachments' },
];

export function StorageQuotaCard() {
  return (
    <SinkCard
      contentClassName="flex flex-col items-center"
      footer={
        <div className="w-full divide-y divide-border/60">
          {ROWS.map((row) => (
            <div key={row.label} className="flex items-baseline justify-between py-2 text-[13px] first:pt-0 last:pb-0">
              <span className="text-muted-foreground">{row.label}</span>
              <span className="font-medium tabular-nums">{row.value}</span>
            </div>
          ))}
        </div>
      }
    >
      <Donut
        segments={[
          { value: 24.1, color: 'var(--chart-2)' },
          { value: 5.9, color: 'color-mix(in oklch, var(--chart-1) 30%, transparent)' },
        ]}
        size={140}
        label="Storage used: 24.1 of 30 GB"
      >
        <div className="text-center">
          <p className="text-xl font-semibold tracking-tight tabular-nums">24.1 GB</p>
          <p className="text-[11px] text-muted-foreground">80% of 30 GB</p>
        </div>
      </Donut>
    </SinkCard>
  );
}

import { Database, GitBranch, Table2 } from 'lucide-react';

import { Button } from '@constructive-io/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@constructive-io/ui/input-group';
import { Progress } from '@constructive-io/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@constructive-io/ui/select';

import { SinkCard } from './sink-card';

const CADENCES = {
  nightly: 'Nightly',
  hourly: 'Hourly',
  manual: 'Manual',
};

const MILESTONES = [
  { title: 'Backfill orders partitions', pct: 72, icon: Table2, volume: '1,200,000 rows', cadence: 'nightly' },
  { title: 'Dual-write customers', pct: 45, icon: Database, volume: '860,000 rows', cadence: 'hourly' },
  { title: 'Cut over search index', pct: 12, icon: GitBranch, volume: '3,400,000 docs', cadence: 'manual' },
];

export function MigrationMilestonesCard() {
  return (
    <SinkCard
      title="Migration milestones"
      description="Active milestones for 2026"
      action={
        <Button variant="outline" size="sm">
          Add milestone
        </Button>
      }
      contentClassName="flex flex-col gap-5"
    >
      {MILESTONES.map((m) => (
        <div key={m.title} className="flex flex-col gap-2.5">
          <div className="flex items-baseline justify-between gap-4">
            <span className="truncate text-[13px] font-medium">{m.title}</span>
            <span className="text-xs text-muted-foreground tabular-nums">{m.pct}%</span>
          </div>
          <Progress value={m.pct} aria-label={`${m.title} progress`} className="h-1.5" />
          <div className="flex items-center gap-2">
            <InputGroup className="min-w-0 flex-1">
              <InputGroupAddon>
                <m.icon aria-hidden />
              </InputGroupAddon>
              <InputGroupInput defaultValue={m.volume} aria-label={`${m.title} volume`} />
            </InputGroup>
            <Select defaultValue={m.cadence} items={CADENCES}>
              <SelectTrigger aria-label={`${m.title} cadence`} className="w-[124px] shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CADENCES).map(([id, label]) => (
                  <SelectItem key={id} value={id}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ))}
    </SinkCard>
  );
}

import { Label } from '@constructive-io/ui/label';
import { Progress } from '@constructive-io/ui/progress';
import { Switch } from '@constructive-io/ui/switch';

import { SinkCard } from './sink-card';

const TOGGLES = [
  { id: 'sink-auto-backups', label: 'Auto backups', checked: true },
  { id: 'sink-pitr', label: 'Point-in-time recovery', checked: false },
];

export function DatabaseStatusCard() {
  return (
    <SinkCard title="Database status" contentClassName="flex flex-col gap-4">
      <div>
        <div className="mb-1.5 flex items-baseline justify-between text-[12px]">
          <span className="text-muted-foreground">Disk usage</span>
          <span className="font-medium tabular-nums">6.8 / 10 GB</span>
        </div>
        <Progress value={68} aria-label="Disk usage" />
      </div>
      {TOGGLES.map((toggle) => (
        <div key={toggle.id} className="flex items-center justify-between gap-3">
          <Label htmlFor={toggle.id} className="text-[13px]">
            {toggle.label}
          </Label>
          <Switch id={toggle.id} defaultChecked={toggle.checked} />
        </div>
      ))}
      <dl className="grid grid-cols-2 gap-2 border-t border-border/60 pt-3">
        <div>
          <dt className="text-[12px] text-muted-foreground">Connections</dt>
          <dd className="font-medium tabular-nums">42</dd>
        </div>
        <div>
          <dt className="text-[12px] text-muted-foreground">Replication</dt>
          <dd className="font-medium">Healthy</dd>
        </div>
      </dl>
    </SinkCard>
  );
}

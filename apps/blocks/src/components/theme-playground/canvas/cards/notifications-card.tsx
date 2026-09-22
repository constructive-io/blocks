import { Label } from '@constructive-io/ui/label';
import { Switch } from '@constructive-io/ui/switch';

import { SinkCard } from './sink-card';

const ROWS = [
  { id: 'sink-n-push', label: 'Push alerts', hint: 'Critical only', checked: true },
  { id: 'sink-n-email', label: 'Weekly digest', hint: 'Mondays', checked: true },
  { id: 'sink-n-comments', label: 'Comment replies', hint: 'Instant', checked: false },
  { id: 'sink-n-billing', label: 'Billing events', hint: 'Owners', checked: true },
];

export function NotificationsCard() {
  return (
    <SinkCard title="Notifications" contentClassName="flex flex-col divide-y divide-border/60 py-1">
      {ROWS.map((row) => (
        <div key={row.id} className="flex items-center justify-between gap-3 py-3">
          <div>
            <Label htmlFor={row.id} className="text-[13px]">
              {row.label}
            </Label>
            <p className="text-[12px] text-muted-foreground">{row.hint}</p>
          </div>
          <Switch id={row.id} defaultChecked={row.checked} />
        </div>
      ))}
    </SinkCard>
  );
}

import { CalendarDate } from '@internationalized/date';
import { RefreshCw, ServerCog } from 'lucide-react';

import { Badge } from '@constructive-io/ui/badge';
import { Calendar } from '@constructive-io/ui/calendar-rac';
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from '@constructive-io/ui/item';

import { SinkCard } from './sink-card';

const MAINTENANCE = [
  { icon: ServerCog, title: 'Postgres 17.3 minor', description: 'Rolling restart', badge: 'Jun 14 · 02:00 UTC' },
  { icon: RefreshCw, title: 'Certificate rotation', description: 'No downtime expected', badge: 'Jun 21' },
];

export function UpcomingMaintenanceCard() {
  return (
    <SinkCard title="Upcoming maintenance" contentClassName="flex flex-col items-center gap-3">
      <Calendar
        aria-label="Maintenance calendar"
        defaultValue={new CalendarDate(2026, 6, 14)}
        defaultFocusedValue={new CalendarDate(2026, 6, 14)}
      />
      <ItemGroup className="w-full">
        {MAINTENANCE.map((item, index) => (
          <Item key={item.title} variant="muted" size="sm">
            <ItemMedia variant="icon">
              <item.icon aria-hidden />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{item.title}</ItemTitle>
              <ItemDescription>{item.description}</ItemDescription>
            </ItemContent>
            <Badge variant={index === 0 ? 'default' : 'secondary'}>{item.badge}</Badge>
          </Item>
        ))}
      </ItemGroup>
    </SinkCard>
  );
}

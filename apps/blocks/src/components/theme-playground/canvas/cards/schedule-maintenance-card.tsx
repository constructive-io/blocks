import { Info } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@constructive-io/ui/alert';
import { Button } from '@constructive-io/ui/button';
import { Calendar } from '@constructive-io/ui/calendar-rac';
import { Field } from '@constructive-io/ui/field';
import { Popover, PopoverContent, PopoverTrigger } from '@constructive-io/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@constructive-io/ui/toggle-group';

import { SinkCard } from './sink-card';

const SLOTS = ['02:00', '03:00', '04:00', '05:00'];

export function ScheduleMaintenanceCard() {
  return (
    <SinkCard
      title="Schedule maintenance"
      description="Pick a window for the Postgres minor upgrade."
      contentClassName="flex flex-col gap-4"
      footer={
        <Button size="sm" className="ml-auto">
          Schedule
        </Button>
      }
    >
      <Field label="Date">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-start font-normal">
              Jun 14, 2026
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar aria-label="Maintenance date" />
          </PopoverContent>
        </Popover>
      </Field>
      <Field label="Start time (UTC)">
        <ToggleGroup defaultValue={['02:00']} variant="outline" aria-label="Start time" className="w-full">
          {SLOTS.map((slot) => (
            <ToggleGroupItem key={slot} value={slot} size="sm" className="flex-1">
              {slot}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </Field>
      <Alert variant="info">
        <Info aria-hidden />
        <AlertTitle>Heads up</AlertTitle>
        <AlertDescription>Writes pause for ~90 s during failover.</AlertDescription>
      </Alert>
    </SinkCard>
  );
}

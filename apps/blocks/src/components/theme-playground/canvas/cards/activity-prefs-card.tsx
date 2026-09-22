import { Button } from '@constructive-io/ui/button';
import { Checkbox } from '@constructive-io/ui/checkbox';
import { FieldLabel } from '@constructive-io/ui/field';
import { Separator } from '@constructive-io/ui/separator';

import { SinkCard } from './sink-card';

const PREFS = [
  { id: 'team-feed', label: 'Show my activity on the team feed', on: true },
  { id: 'migration-fail', label: 'Email me when a migration fails', on: true },
  { id: 'weekly-digest', label: 'Weekly digest', on: false },
];

export function ActivityPrefsCard() {
  return (
    <SinkCard
      title="Activity & notifications"
      contentClassName="flex flex-col gap-3"
      footer={
        <Button size="sm" className="ml-auto">
          Save
        </Button>
      }
    >
      {PREFS.map((pref) => (
        <div key={pref.id} className="flex items-center gap-2">
          <Checkbox id={`sink-pref-${pref.id}`} defaultChecked={pref.on} aria-label={pref.label} className="size-8" />
          <FieldLabel htmlFor={`sink-pref-${pref.id}`} className="text-[13px] font-normal">
            {pref.label}
          </FieldLabel>
        </div>
      ))}
      <Separator />
      <div className="flex items-center gap-2">
        <Checkbox id="sink-pref-staging" aria-label="Include staging projects" className="size-8" />
        <FieldLabel htmlFor="sink-pref-staging" className="text-[13px] font-normal">
          Include staging projects
        </FieldLabel>
      </div>
    </SinkCard>
  );
}

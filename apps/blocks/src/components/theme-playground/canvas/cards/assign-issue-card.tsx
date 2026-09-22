import { Avatar, AvatarFallback } from '@constructive-io/ui/avatar';
import { Button } from '@constructive-io/ui/button';
import {
  Combobox,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  ComboboxPopup,
} from '@constructive-io/ui/combobox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@constructive-io/ui/tooltip';

import { SinkCard } from './sink-card';

const PEOPLE = [
  { value: 'akim', label: 'Ana Kim', initials: 'AK' },
  { value: 'jmeyer', label: 'Jonas Meyer', initials: 'JM' },
  { value: 'rsingh', label: 'Riya Singh', initials: 'RS' },
  { value: 'lpark', label: 'Lee Park', initials: 'LP' },
];

const WATCHERS = PEOPLE.slice(0, 3);

export function AssignIssueCard() {
  return (
    <SinkCard
      title="Assign incident"
      description="INC-204 · elevated 5xx on api-eu"
      contentClassName="flex flex-col gap-4"
      footer={
        <>
          <Button size="sm">Assign</Button>
          <Button variant="ghost" size="sm" className="ml-auto">
            Snooze
          </Button>
        </>
      }
    >
      <Combobox items={PEOPLE} defaultValue={PEOPLE[0]}>
        <ComboboxInput aria-label="Assignee" placeholder="Assign to…" />
        <ComboboxPopup>
          <ComboboxEmpty>No people found.</ComboboxEmpty>
          <ComboboxList>
            {(person: (typeof PEOPLE)[number]) => (
              <ComboboxItem key={person.value} value={person}>
                <span className="flex items-center gap-2">
                  <Avatar className="size-5">
                    <AvatarFallback className="text-[9px]">{person.initials}</AvatarFallback>
                  </Avatar>
                  {person.label}
                </span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxPopup>
      </Combobox>
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-muted-foreground">Watchers</span>
        <div className="flex gap-1">
          <TooltipProvider>
            {WATCHERS.map((watcher) => (
              <Tooltip key={watcher.value}>
                <TooltipTrigger render={<Avatar className="size-7 ring-2 ring-card" />}>
                  <AvatarFallback className="text-[10px]">{watcher.initials}</AvatarFallback>
                </TooltipTrigger>
                <TooltipContent>{watcher.label}</TooltipContent>
              </Tooltip>
            ))}
          </TooltipProvider>
        </div>
      </div>
    </SinkCard>
  );
}

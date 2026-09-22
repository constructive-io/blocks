import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@constructive-io/ui/command';

import { SinkCard } from './sink-card';

const GROUPS = [
  {
    heading: 'Navigate',
    items: [
      { label: 'Go to dashboard', shortcut: '⌘D' },
      { label: 'Open settings', shortcut: '⌘,' },
    ],
  },
  {
    heading: 'Actions',
    items: [
      { label: 'Create branch', shortcut: '⌘B' },
      { label: 'Invite teammate', shortcut: '⌘I' },
    ],
  },
];

export function CommandPaletteCard() {
  return (
    <SinkCard title="Command palette" contentClassName="px-0 py-0">
      <Command className="rounded-none border-0 shadow-none">
        <CommandInput className="rounded-md" placeholder="Type a command…" />
        <CommandList className="max-h-52">
          <CommandEmpty>No results found.</CommandEmpty>
          {GROUPS.map((group) => (
            <CommandGroup key={group.heading} heading={group.heading}>
              {group.items.map((item) => (
                <CommandItem key={item.label}>
                  {item.label}
                  <CommandShortcut>{item.shortcut}</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>
    </SinkCard>
  );
}

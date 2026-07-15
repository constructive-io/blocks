'use client';

import {
  CalendarDays,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Settings,
  Users,
} from 'lucide-react';

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandGroupLabel,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@constructive-io/ui/command';

import { Demo } from '@/components/docs/showcase-kit';

export function BlockDemo() {
  return (
    <Demo>
      <Command className="w-full max-w-md rounded-lg border shadow-md">
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup>
            <CommandGroupLabel>Navigation</CommandGroupLabel>
            <CommandItem value="dashboard">
              <LayoutDashboard className="size-4" />
              <span>Go to dashboard</span>
            </CommandItem>
            <CommandItem value="members">
              <Users className="size-4" />
              <span>View members</span>
            </CommandItem>
            <CommandItem value="schedule">
              <CalendarDays className="size-4" />
              <span>Open schedule</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup>
            <CommandGroupLabel>Account</CommandGroupLabel>
            <CommandItem value="settings">
              <Settings className="size-4" />
              <span>Settings</span>
              <CommandShortcut>⌘,</CommandShortcut>
            </CommandItem>
            <CommandItem value="billing">
              <CreditCard className="size-4" />
              <span>Billing</span>
              <CommandShortcut>⌘B</CommandShortcut>
            </CommandItem>
            <CommandItem value="sign-out">
              <LogOut className="size-4" />
              <span>Sign out</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </Demo>
  );
}

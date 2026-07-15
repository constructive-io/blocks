'use client';

import { useState } from 'react';

import { Button } from '@constructive-io/ui/button';

import { ShellCommandPalette } from '@/blocks/shell/command-palette/command-palette';
import { Demo } from '@/components/docs/showcase-kit';

const DEMO_COMMANDS = [
  {
    id: 'nav:dashboard',
    label: 'Go to dashboard',
    description: 'Open the main dashboard overview',
    group: 'navigation',
    shortcut: '⌘D',
    onSelect: () => {},
  },
  {
    id: 'nav:settings',
    label: 'Go to account settings',
    description: 'Manage your profile and preferences',
    group: 'navigation',
    shortcut: '⌘,',
    onSelect: () => {},
  },
  {
    id: 'nav:members',
    label: 'View organization members',
    group: 'navigation',
    onSelect: () => {},
  },
  {
    id: 'account:sign-out',
    label: 'Sign out',
    description: 'End your current session',
    group: 'account',
    onSelect: () => {},
  },
  {
    id: 'context:org-acme',
    label: 'Switch to Acme Corp',
    group: 'context',
    onSelect: () => {},
  },
];

export function BlockDemo() {
  const [open, setOpen] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const commandsWithFeedback = DEMO_COMMANDS.map((cmd) => ({
    ...cmd,
    onSelect: () => {
      setLastAction(cmd.label);
      setOpen(false);
    },
  }));

  return (
    <Demo>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Open command palette
        <kbd className="ml-2 rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
          ⌘K
        </kbd>
      </Button>
      {lastAction ? (
        <p className="text-pretty mt-4 text-sm text-muted-foreground">
          Selected: <span className="font-medium text-foreground">{lastAction}</span>
        </p>
      ) : null}
      <ShellCommandPalette
        open={open}
        onOpenChange={setOpen}
        commands={commandsWithFeedback}
        onError={(err) => {
          setLastAction(`Error: ${err instanceof Error ? err.message : String(err)}`);
        }}
      />
    </Demo>
  );
}

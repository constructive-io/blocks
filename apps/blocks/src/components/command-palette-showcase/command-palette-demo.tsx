'use client';

import { useMemo, useState } from 'react';
import {
  createCommandRegistry,
  kbd,
  multiStepCommand,
  useBackgroundTasks,
  type StepViewProps
} from '@constructive-io/command-palette';
import {
  DatabaseIcon,
  DownloadIcon,
  SettingsIcon,
  SparklesIcon
} from 'lucide-react';

import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';

import { CommandPalette } from '@/blocks/command-palette/command-palette';

type DemoContext = { confirmed: boolean };

function ConfirmationStep({ onComplete }: StepViewProps<DemoContext>) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">Create a production database?</p>
        <p className="text-sm leading-6 text-muted-foreground">
          The host supplies this step and remains responsible for the mutation.
        </p>
      </div>
      <Button className="self-end" onClick={() => onComplete({ confirmed: true })} size="sm">
        Confirm
      </Button>
    </div>
  );
}

function waitForExport(signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(resolve, 1400);
    signal?.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timeout);
        reject(new DOMException('Export cancelled', 'AbortError'));
      },
      { once: true }
    );
  });
}

export function CommandPaletteDemo() {
  const [open, setOpen] = useState(false);
  const [lastAction, setLastAction] = useState('No command run yet');
  const backgroundTasks = useBackgroundTasks({
    successDismissMs: 5000,
    cancelledDismissMs: 2500,
    onTaskChange: (task) => {
      setLastAction(`${task.label}: ${task.status}`);
    }
  });
  const registry = useMemo(() => {
    const createDatabase = multiStepCommand<DemoContext>({
      id: 'create-database',
      label: 'Create database',
      description: 'Start a guided provisioning flow',
      icon: DatabaseIcon,
      group: 'actions',
      shortcut: kbd('n', 'mod')
    })
      .step({
        id: 'confirm',
        title: 'Confirm',
        Component: ConfirmationStep
      })
      .onComplete(() => setLastAction('Database flow completed'))
      .build();

    return createCommandRegistry({
      groups: [
        { id: 'navigation', label: 'Navigation', priority: 1 },
        { id: 'actions', label: 'Actions', priority: 2 }
      ],
      commands: [
        {
          id: 'settings',
          label: 'Open settings',
          description: 'Framework-neutral navigation adapter',
          icon: SettingsIcon,
          type: 'navigation',
          group: 'navigation',
          href: '/settings',
          shortcut: kbd(',', 'mod')
        },
        createDatabase,
        {
          id: 'export-data',
          label: 'Export application data',
          description: 'Runs as a cancellable background task',
          icon: DownloadIcon,
          type: 'action',
          group: 'actions',
          background: true,
          backgroundBehavior: 'persist',
          onSelect: waitForExport
        }
      ]
    });
  }, []);

  return (
    <div className="registry-block min-w-0" data-slot="command-palette-showcase-preview">
      <div className="registry-block-bar flex-wrap justify-between">
        <span>Live interactive preview</span>
        <Badge variant="secondary">Host-controlled</Badge>
      </div>
      <div className="registry-block-stage registry-block-stage-col bg-muted/20 !p-3 sm:!p-5">
        <section
          aria-labelledby="command-palette-demo-title"
          className="flex min-h-72 flex-col items-center justify-center gap-5 rounded-xl border border-border/60 bg-card p-6 text-center shadow-card"
        >
          <div className="flex flex-col items-center gap-2">
            <h2
              className="text-balance text-lg font-semibold tracking-tight"
              id="command-palette-demo-title"
            >
              Application command center
            </h2>
            <p className="max-w-md text-pretty text-sm leading-6 text-muted-foreground">
              Search commands, start a multi-step flow, or run a cancellable export. Press Command K or Control K anywhere on this page.
            </p>
          </div>
          <Button onClick={() => setOpen(true)}>
            <SparklesIcon data-icon="inline-start" />
            Open command palette
          </Button>
          <p aria-live="polite" className="text-xs text-muted-foreground">
            {lastAction}
          </p>
        </section>
      </div>
      <CommandPalette
        backgroundTasks={backgroundTasks}
        label="Constructive documentation commands"
        navigate={(href) => {
          setLastAction(`Navigate to ${href}`);
          setOpen(false);
        }}
        onOpenChange={setOpen}
        open={open}
        registry={registry}
      />
    </div>
  );
}

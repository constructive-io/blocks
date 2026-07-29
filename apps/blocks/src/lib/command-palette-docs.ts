export type CommandPaletteApiRow = {
  name: string;
  type: string;
  behavior: string;
};

export type CommandPaletteDoc = {
  name: 'command-palette';
  title: string;
  description: string;
  whenToUse: readonly string[];
  usage: {
    description: string;
    example: string;
  };
  state: {
    title: string;
    description: string;
    guidance: readonly string[];
  };
  composition: {
    description: string;
    pageCommandsExample: string;
    boundaries: readonly {
      title: string;
      body: string;
    }[];
  };
  previewDescription: string;
  accessibility: readonly string[];
  api: readonly CommandPaletteApiRow[];
};

const BASIC_USAGE_EXAMPLE = `'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createCommandRegistry,
  kbd,
  useBackgroundTasks
} from '@constructive-io/command-palette';

import { CommandPalette } from '@/blocks/command-palette/command-palette';

async function exportData(signal?: AbortSignal) {
  const response = await fetch('/api/exports', {
    method: 'POST',
    signal
  });

  if (!response.ok) throw new Error('Export failed');
}

export const appCommandRegistry = createCommandRegistry({
  groups: [
    { id: 'navigation', label: 'Navigation', priority: 1 },
    { id: 'actions', label: 'Actions', priority: 2 }
  ],
  commands: [
    {
      id: 'settings',
      label: 'Open settings',
      type: 'navigation',
      group: 'navigation',
      href: '/settings',
      shortcut: kbd(',', 'mod')
    },
    {
      id: 'export-data',
      label: 'Export application data',
      type: 'action',
      group: 'actions',
      background: true,
      backgroundBehavior: 'reset',
      onSelect: exportData
    }
  ]
});

export function ApplicationCommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const backgroundTasks = useBackgroundTasks({
    onTaskChange: (task) => {
      if (task.status === 'error') console.error(task.error);
    }
  });

  return (
    <CommandPalette
      backgroundTasks={backgroundTasks}
      label="Application commands"
      navigate={(href) => router.push(href)}
      onOpenChange={setOpen}
      open={open}
      registry={appCommandRegistry}
    />
  );
}`;

const PAGE_COMMANDS_EXAMPLE = `'use client';

import { useMemo } from 'react';
import {
  type CommandDefinition,
  usePageCommands
} from '@constructive-io/command-palette';

import { appCommandRegistry } from '@/components/application-command-palette';

type RecordsPageCommandsProps = {
  canCreate: boolean;
  openCreateRecord: () => void;
};

export function RecordsPageCommands({
  canCreate,
  openCreateRecord
}: RecordsPageCommandsProps) {
  const commands = useMemo<CommandDefinition[]>(
    () => [
      {
        id: 'create-record',
        label: 'Create record',
        type: 'action',
        group: 'actions',
        hidden: !canCreate,
        onSelect: openCreateRecord
      }
    ],
    [canCreate, openCreateRecord]
  );

  usePageCommands(appCommandRegistry, commands);
  return null;
}`;

export const COMMAND_PALETTE_DOC: CommandPaletteDoc = {
  name: 'command-palette',
  title: 'Command Palette',
  description:
    'An installable command center with page-scoped registration, structured shortcuts, multi-step flows, and cancellable background tasks.',
  whenToUse: [
    'Use it when application-wide navigation and actions need one searchable keyboard interface.',
    'Use page-scoped commands when each route contributes contextual actions that should disappear automatically when the route unmounts.',
    'Use multi-step commands for guided workflows and background commands for cancellable work that should continue after the palette closes.'
  ],
  usage: {
    description:
      'Create one registry for the application shell, adapt routing explicitly, and pass the same background-task controller to the installed palette. This complete example uses controlled open state and cooperative cancellation through AbortSignal.',
    example: BASIC_USAGE_EXAMPLE
  },
  state: {
    title: 'Controlled state and background tasks',
    description:
      'The host may control whether the dialog is open, while the headless package owns command registration, execution, multi-step progress, and background-task lifecycle.',
    guidance: [
      'Pass open and onOpenChange together when another shell control also opens the palette; omit both to use the block’s internal open state.',
      'Create one useBackgroundTasks controller and pass it to CommandPalette so background commands receive an AbortSignal and render progress, cancellation, success, and persistent errors.',
      'Cancellation is cooperative. Host handlers must pass the signal to fetch or check signal.aborted during longer work.',
      'Command visibility is an affordance, not authorization. Derive hidden or disabled from host permissions, then let the API, PostgreSQL privileges, and RLS make the authoritative decision.'
    ]
  },
  composition: {
    description:
      'Register contextual commands from a mounted route and keep each ownership boundary replaceable. Memoizing the command array gives registration and cleanup stable identities.',
    pageCommandsExample: PAGE_COMMANDS_EXAMPLE,
    boundaries: [
      {
        title: 'Headless engine',
        body: 'Registry snapshots, shortcuts, execution, multi-step state, and background-task lifecycle.'
      },
      {
        title: 'Installed block',
        body: 'Command dialog, search results, shortcut hints, step navigation, and task feedback.'
      },
      {
        title: 'Host application',
        body: 'Routes, authorization evidence, business actions, mutations, errors, and telemetry.'
      }
    ]
  },
  previewDescription:
    'Open the real installed block, search its seeded commands, start the guided database flow, or run and cancel the simulated export task.',
  accessibility: [
    'The dialog has an explicit accessible label, moves focus into command search, and restores focus when it closes.',
    'The default Mod+K shortcut maps to Command on Apple platforms and Control elsewhere; global shortcuts ignore editable controls.',
    'Arrow keys and Enter operate the command list. Inside a multi-step flow, Escape returns to search before a second Escape closes the dialog.',
    'Disabled commands remain discoverable but cannot run, while hidden commands are removed from both search results and shortcut execution.',
    'Keep task labels specific, retain the task label in Cancel and Dismiss accessible names, and announce host-level status changes with a polite live region when work continues outside the dialog.'
  ],
  api: [
    {
      name: 'registry',
      type: 'CommandRegistryManager',
      behavior:
        'Supplies application-wide and page-scoped command and group snapshots.'
    },
    {
      name: 'navigate',
      type: 'NavigateAdapter',
      behavior:
        'Adapts navigation commands to the host router; no routing library is imported by the block.'
    },
    {
      name: 'open / onOpenChange',
      type: 'boolean / callback',
      behavior:
        'Controls dialog visibility from the host; omit both properties to use internal open state.'
    },
    {
      name: 'shortcut',
      type: 'KeyBinding',
      behavior: 'Overrides the default Mod+K shortcut that opens the palette.'
    },
    {
      name: 'placeholder',
      type: 'string',
      behavior: 'Overrides the command-search placeholder.'
    },
    {
      name: 'label',
      type: 'string',
      behavior: 'Sets the accessible name announced for the command dialog.'
    },
    {
      name: 'backgroundTasks',
      type: 'UseBackgroundTasks',
      behavior:
        'Enables tracked background commands and supplies task cancellation and dismissal controls.'
    }
  ]
};

export const COMMAND_PALETTE_DOC_SECTIONS = [
  'installation',
  'when-to-use',
  'usage',
  'state',
  'composition',
  'examples',
  'accessibility',
  'api-reference'
] as const;

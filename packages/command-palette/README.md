# @constructive-io/command-palette

Headless command registration, structured shortcuts, execution, multi-step flows, and cancellable background-task state for React applications.

The visual palette is source-installed from the Constructive registry. This package deliberately has no dependency on `@constructive-io/ui`, `cmdk`, or `motion`.

```bash
pnpm add @constructive-io/command-palette
pnpm dlx shadcn@4.13.1 add @constructive/command-palette
```

```tsx
'use client';

import { useMemo } from 'react';
import {
  createCommandRegistry,
  kbd,
  usePageCommands
} from '@constructive-io/command-palette';
import { CommandPalette } from '@/blocks/command-palette/command-palette';

const registry = createCommandRegistry({
  groups: [{ id: 'navigation', label: 'Navigation', priority: 1 }],
  commands: [
    {
      id: 'settings',
      label: 'Open settings',
      type: 'navigation',
      group: 'navigation',
      href: '/settings',
      shortcut: kbd(',', 'mod')
    }
  ]
});

export function ApplicationCommands() {
  const pageCommands = useMemo(
    () => [
      {
        id: 'create-record',
        label: 'Create record',
        type: 'action' as const,
        group: 'navigation',
        onSelect: () => openCreateRecord()
      }
    ],
    []
  );

  usePageCommands(registry, pageCommands);

  return (
    <CommandPalette
      registry={registry}
      navigate={(href) => router.push(href)}
    />
  );
}
```

The package owns generic command behavior. The host owns routes, authorization, business actions, error reporting, and command visibility. See [docs/SPEC.md](./docs/SPEC.md) for the complete contract.

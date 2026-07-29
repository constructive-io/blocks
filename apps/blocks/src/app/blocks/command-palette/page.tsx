import type { Metadata } from 'next';

import { CommandPaletteDemo } from '@/components/command-palette-showcase/command-palette-demo';
import { CodeBlock } from '@/components/docs/code-block';
import { DocSection } from '@/components/docs/doc-section';
import { registryAdd } from '@/lib/install-mode';
import { OG_IMAGE, withBase } from '@/lib/site';

const TITLE = 'Command Palette';
const DESCRIPTION =
  'An installable command center with page-scoped registration, structured shortcuts, multi-step flows, and cancellable background tasks.';

const BASIC_EXAMPLE = `'use client';

import {
  createCommandRegistry,
  kbd
} from '@constructive-io/command-palette';
import { useRouter } from 'next/navigation';
import { CommandPalette } from '@/blocks/command-palette/command-palette';

const registry = createCommandRegistry({
  groups: [{ id: 'navigation', label: 'Navigation', priority: 1 }],
  commands: [{
    id: 'settings',
    label: 'Open settings',
    type: 'navigation',
    group: 'navigation',
    href: '/settings',
    shortcut: kbd(',', 'mod')
  }]
});

export function ApplicationCommands() {
  const router = useRouter();
  return (
    <CommandPalette
      registry={registry}
      navigate={(href) => router.push(href)}
    />
  );
}`;

const PAGE_COMMANDS_EXAMPLE = `const pageCommands = useMemo(() => [{
  id: 'create-record',
  label: 'Create record',
  type: 'action' as const,
  group: 'actions',
  onSelect: openCreateRecord
}], [openCreateRecord]);

usePageCommands(registry, pageCommands);`;

export default function CommandPalettePage() {
  return (
    <div className="registry-page">
      <header className="mb-8 max-w-3xl">
        <p className="registry-eyebrow">Application block</p>
        <h1 className="mt-2 text-balance text-[22px] font-semibold tracking-tight sm:text-[1.75rem]">
          {TITLE}
        </h1>
        <p className="mt-2 text-pretty text-sm leading-7 text-muted-foreground sm:text-[15px]">
          {DESCRIPTION}
        </p>
      </header>

      <CommandPaletteDemo />

      <DocSection
        description="The CLI installs editable presentation source and its local command, button, badge, separator, portal, and theme dependencies. The headless command engine is the only npm dependency; the npm UI package is never installed."
        id="install"
        title="Install"
      >
        <CodeBlock label="Terminal">{registryAdd('command-palette')}</CodeBlock>
      </DocSection>

      <DocSection
        description="Create one registry for the shell and adapt routing explicitly. Command visibility can follow application permissions, but backend privileges and RLS still decide whether an action succeeds."
        id="usage"
        title="Application setup"
      >
        <CodeBlock label="application-commands.tsx" language="tsx">
          {BASIC_EXAMPLE}
        </CodeBlock>
      </DocSection>

      <DocSection
        description="Register route-specific actions while a page is mounted. Memoizing the array gives registration and cleanup stable identities."
        id="page-commands"
        title="Page-scoped commands"
      >
        <CodeBlock label="records-page.tsx" language="tsx">
          {PAGE_COMMANDS_EXAMPLE}
        </CodeBlock>
      </DocSection>

      <DocSection
        description="The package owns command state and execution mechanics. Installed source owns the dialog and feedback. The host owns routing, authorization evidence, mutations, error reporting, and workflow-specific step components."
        id="boundary"
        title="Ownership boundary"
      >
        <div className="grid gap-3 md:grid-cols-3">
          {[
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
              body: 'Routes, policies, business actions, mutations, errors, and telemetry.'
            }
          ].map((item) => (
            <article className="rounded-xl border border-border/60 bg-card p-4 shadow-card" key={item.title}>
              <h3 className="text-sm font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.body}</p>
            </article>
          ))}
        </div>
      </DocSection>
    </div>
  );
}

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: withBase('/blocks/command-palette') },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: withBase('/blocks/command-palette'),
    images: [OG_IMAGE]
  }
};

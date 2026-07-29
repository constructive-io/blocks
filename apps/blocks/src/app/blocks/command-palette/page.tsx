import type { Metadata } from 'next';

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@constructive-io/ui/table';

import { CommandPaletteDemo } from '@/components/command-palette-showcase/command-palette-demo';
import { ComponentDocPagination } from '@/components/docs/component-doc-pagination';
import { CodeBlock } from '@/components/docs/code-block';
import { DocSection } from '@/components/docs/doc-section';
import { COMMAND_PALETTE_DOC } from '@/lib/command-palette-docs';
import { registryAdd } from '@/lib/install-mode';
import { OG_IMAGE, withBase } from '@/lib/site';

function GuidanceList({ items }: { items: readonly string[] }) {
  return (
    <ul className="flex max-w-3xl flex-col gap-2 text-pretty text-sm leading-7 text-muted-foreground sm:text-[15px]">
      {items.map((item) => (
        <li
          className="relative pl-5 before:absolute before:left-0 before:text-foreground before:content-['•']"
          key={item}
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function PublicContract() {
  const caption = `Public properties for ${COMMAND_PALETTE_DOC.title}.`;

  return (
    <Table containerProps={{ tabIndex: 0, 'aria-label': caption }}>
      <TableCaption className="sr-only">{caption}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Prop</TableHead>
          <TableHead scope="col">Type</TableHead>
          <TableHead scope="col">Behavior</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {COMMAND_PALETTE_DOC.api.map((row) => (
          <TableRow key={row.name}>
            <TableCell className="font-mono text-xs font-medium">
              {row.name}
            </TableCell>
            <TableCell className="whitespace-normal font-mono text-xs text-muted-foreground">
              {row.type}
            </TableCell>
            <TableCell className="min-w-64 whitespace-normal text-pretty text-muted-foreground">
              {row.behavior}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function CommandPalettePage() {
  const doc = COMMAND_PALETTE_DOC;

  return (
    <article aria-labelledby="command-palette-title" className="registry-page">
      <section
        aria-labelledby="command-palette-title"
        className="scroll-mt-20"
        id="overview"
      >
        <header className="mb-6 max-w-2xl">
          <p className="registry-eyebrow">Components</p>
          <h1
            className="mt-2 text-balance text-[22px] font-semibold tracking-tight sm:text-[1.75rem]"
            id="command-palette-title"
          >
            {doc.title}
          </h1>
          <p className="mt-2 text-pretty text-sm leading-7 text-muted-foreground sm:text-[15px]">
            {doc.description}
          </p>
        </header>

        <CommandPaletteDemo />
      </section>

      <DocSection
        description="Use the registry to copy the component, its complete local source graph, and the Constructive theme into your application. The headless command engine remains the only Constructive npm dependency; shadcn installs its presentation dependencies automatically."
        id="installation"
        title="Installation"
      >
        <CodeBlock label="Registry install">
          {registryAdd(doc.name)}
        </CodeBlock>
      </DocSection>

      <DocSection id="when-to-use" title="When to use">
        <GuidanceList items={doc.whenToUse} />
      </DocSection>

      <DocSection
        description={doc.usage.description}
        id="usage"
        title="Basic usage"
      >
        <CodeBlock label="application-command-palette.tsx" language="tsx">
          {doc.usage.example}
        </CodeBlock>
      </DocSection>

      <DocSection
        description={doc.state.description}
        id="state"
        title={doc.state.title}
      >
        <GuidanceList items={doc.state.guidance} />
      </DocSection>

      <DocSection
        description={doc.composition.description}
        id="composition"
        title="Composition"
      >
        <div className="flex flex-col gap-6">
          <CodeBlock label="records-page-commands.tsx" language="tsx">
            {doc.composition.pageCommandsExample}
          </CodeBlock>
          <div className="grid gap-3 md:grid-cols-3">
            {doc.composition.boundaries.map((item) => (
              <article
                className="rounded-xl border border-border/60 bg-card p-4 shadow-card"
                key={item.title}
              >
                <h3 className="text-balance text-sm font-semibold">
                  {item.title}
                </h3>
                <p className="mt-1 text-pretty text-sm leading-6 text-muted-foreground">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </DocSection>

      <DocSection
        description={doc.previewDescription}
        id="examples"
        title="Examples"
      >
        <GuidanceList
          items={[
            'Press Command K or Control K anywhere on this page, or use the Open command palette button in the preview.',
            'Run Create database to inspect the host-supplied multi-step confirmation flow and layered Escape behavior.',
            'Run Export application data to inspect task progress, cooperative cancellation, and completion feedback.'
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <GuidanceList items={doc.accessibility} />
      </DocSection>

      <DocSection
        description="These public properties define the host boundary. Installed leaf components expose their local TypeScript contracts beside the copied source."
        id="api-reference"
        title="API Reference"
      >
        <PublicContract />
      </DocSection>

      <ComponentDocPagination current="command-palette" />
    </article>
  );
}

export const metadata: Metadata = {
  title: COMMAND_PALETTE_DOC.title,
  description: COMMAND_PALETTE_DOC.description,
  alternates: { canonical: withBase('/blocks/command-palette') },
  openGraph: {
    title: COMMAND_PALETTE_DOC.title,
    description: COMMAND_PALETTE_DOC.description,
    url: withBase('/blocks/command-palette'),
    images: [OG_IMAGE]
  }
};

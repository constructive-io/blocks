import Link from 'next/link';

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@constructive-io/ui/table';

import { CodeBlock } from '@/components/docs/code-block';
import { DocSection } from '@/components/docs/doc-section';
import type { ApplicationBlockDoc } from '@/lib/application-blocks';
import { registryAdd } from '@/lib/install-mode';
import { withBase } from '@/lib/site';

import { ApplicationBlockShowcasePreview } from './application-block-showcase-preview';

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

function PublicContract({ block }: { block: ApplicationBlockDoc }) {
  const caption = `Public properties for ${block.title}.`;

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
        {block.api.map((row) => (
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

function NeighborLink({
  block,
  direction,
}: {
  block?: ApplicationBlockDoc;
  direction: 'Previous' | 'Next';
}) {
  if (!block) return <span />;

  return (
    <Link
      className="inline-flex min-h-10 flex-col justify-center rounded-md text-sm text-muted-foreground outline-none transition-colors duration-150 ease-out hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      href={`/blocks/${block.name}`}
    >
      <span className="block text-xs">{direction}</span>
      <span className="font-medium text-foreground">{block.title}</span>
    </Link>
  );
}

export function ApplicationBlockDocsPage({
  block,
  next,
  previous,
}: {
  block: ApplicationBlockDoc;
  next?: ApplicationBlockDoc;
  previous?: ApplicationBlockDoc;
}) {
  return (
    <article aria-labelledby="application-block-title" className="registry-page">
      <section
        aria-labelledby="application-block-title"
        className="scroll-mt-20"
        id="overview"
      >
        <header className="mb-6 max-w-2xl">
          <p className="registry-eyebrow">Application blocks</p>
          <h1
            className="mt-2 text-balance text-[22px] font-semibold tracking-tight sm:text-[1.75rem]"
            id="application-block-title"
          >
            {block.title}
          </h1>
          <p className="mt-2 text-pretty text-sm leading-7 text-muted-foreground sm:text-[15px]">
            {block.description}
          </p>
        </header>

        <ApplicationBlockShowcasePreview
          block={block}
          previewPath={withBase(`/blocks/${block.name}/preview/`)}
        />
      </section>

      <DocSection
        description="Use the registry to copy the block, its complete local source graph, and the Constructive theme into your application."
        id="installation"
        title="Installation"
      >
        <CodeBlock label="Registry install">{registryAdd(block.name)}</CodeBlock>
      </DocSection>

      <DocSection id="when-to-use" title="When to use">
        <GuidanceList items={block.whenToUse} />
      </DocSection>

      <DocSection
        description={block.usage.description}
        id="usage"
        title="Basic usage"
      >
        <CodeBlock label="Basic usage" language="tsx">
          {block.usage.example}
        </CodeBlock>
      </DocSection>

      <DocSection
        description={block.state.description}
        id="state"
        title={block.state.title}
      >
        <p className="max-w-2xl text-pretty text-sm leading-7 text-muted-foreground sm:text-[15px]">
          Installed source stays transport-neutral. Keep data access, RLS-aware
          errors, mutation confirmation, and route changes in the host.
        </p>
      </DocSection>

      <DocSection
        description="The registry item installs a complete composition while preserving focused, replaceable boundaries."
        id="composition"
        title="Composition"
      >
        <GuidanceList items={block.composition} />
      </DocSection>

      <DocSection
        description={block.previewDescription}
        id="examples"
        title="Live example"
      >
        <GuidanceList
          items={[
            'Use the breakpoint controls to inspect the same source at desktop, tablet, and mobile widths.',
            'Open the full-screen preview when you need to test menus, sheets, panning, or dense table interactions without documentation chrome.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <GuidanceList items={block.accessibility} />
      </DocSection>

      <DocSection
        description="These public properties define the host boundary. Installed leaf components expose their own local TypeScript contracts beside the source."
        id="api-reference"
        title="API Reference"
      >
        <PublicContract block={block} />
      </DocSection>

      <nav
        aria-label="Application block pagination"
        className="mt-12 grid grid-cols-2 gap-6 border-t border-border pt-6"
      >
        <NeighborLink block={previous} direction="Previous" />
        <div className="text-right">
          <NeighborLink block={next} direction="Next" />
        </div>
      </nav>
    </article>
  );
}

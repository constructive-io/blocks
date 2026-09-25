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
import { ApplicationDocPagination } from '@/components/docs/application-doc-pagination';
import { DocSectionNav } from '@/components/docs/doc-section-nav';
import { DOC_SECTIONS } from '@/lib/doc-sections';
import { applicationBlockHref, type ApplicationBlockDoc } from '@/lib/application-blocks';
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

function PublicContract({
  block,
  rows = block.api,
  caption = `Public properties for ${block.title}.`,
  columns = ['Prop', 'Type', 'Behavior'],
}: {
  block: ApplicationBlockDoc;
  rows?: ApplicationBlockDoc['api'];
  caption?: string;
  columns?: readonly [string, string, string];
}) {
  return (
    <Table containerProps={{ tabIndex: 0, 'aria-label': caption }}>
      <TableCaption className="sr-only">{caption}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">{columns[0]}</TableHead>
          <TableHead scope="col">{columns[1]}</TableHead>
          <TableHead scope="col">{columns[2]}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
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

export function ApplicationBlockDocsPage({
  block,
}: {
  block: ApplicationBlockDoc;
}) {
  return (
    <article aria-labelledby="application-block-title" className="registry-page">
      <section
        aria-labelledby="application-block-title"
        className="scroll-mt-20"
        id="overview"
      >
        <header className="mb-6 max-w-2xl">
          <p className="registry-eyebrow">{block.section ? DOC_SECTIONS[block.section].title : 'Application blocks'}</p>
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

        {block.section ? <DocSectionNav section={block.section} current={applicationBlockHref(block)} /> : null}

        <ApplicationBlockShowcasePreview
          block={block}
          previewPath={withBase(`${applicationBlockHref(block)}/preview/`)}
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

      {block.buildingBlocks?.length ? (
        <DocSection
          description="Each of these installs with billing-kit and works outside the template: pass data and callbacks, and wrap them in BillingFormatProvider for locale, time zone, and clock."
          id="building-blocks"
          title="Building blocks"
        >
          <PublicContract
            block={block}
            rows={block.buildingBlocks}
            caption={`Components ${block.title} is built from.`}
            columns={['Component', 'Group', 'What it shows']}
          />
        </DocSection>
      ) : null}

      <DocSection
        description={block.previewDescription}
        id="examples"
        title="Examples"
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

      <ApplicationDocPagination current={block.name} />
    </article>
  );
}

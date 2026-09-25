import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@constructive-io/ui/table';

import { ApplicationBlockShowcasePreview } from '@/components/application-block-showcase/application-block-showcase-preview';
import { ApplicationDocPagination } from '@/components/docs/application-doc-pagination';
import { CodeBlock } from '@/components/docs/code-block';
import { DocSection } from '@/components/docs/doc-section';
import { registryAdd } from '@/lib/install-mode';
import type { SourceBlockDoc } from '@/lib/source-blocks';
import { withBase } from '@/lib/site';

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

function PublicContract({ block }: { block: SourceBlockDoc }) {
  const caption = `Public host contract for ${block.title}.`;

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

export function SourceBlockDocsPage({ block }: { block: SourceBlockDoc }) {
  return (
    <article aria-labelledby="source-block-title" className="registry-page">
      <section
        aria-labelledby="source-block-title"
        className="scroll-mt-20"
        id="overview"
      >
        <header className="mb-6 max-w-2xl">
          <p className="registry-eyebrow">Application blocks</p>
          <h1
            className="mt-2 text-balance text-[22px] font-semibold tracking-tight sm:text-[1.75rem]"
            id="source-block-title"
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

      {block.features?.length ? (
        <DocSection
          description={`What ${block.title} can do, one area at a time. Each card says where to find it in the preview above.`}
          id="features"
          title="Feature tour"
        >
          <ol className="grid gap-3 md:grid-cols-2">
            {block.features.map((feature, index) => (
              <li
                className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-4"
                id={`feature-${feature.id}`}
                key={feature.id}
              >
                <div className="flex items-baseline gap-2.5">
                  <span className="font-mono text-xs text-muted-foreground tabular-nums">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-medium text-foreground">{feature.title}</h3>
                    <p className="mt-0.5 text-pretty text-[13px] leading-5 text-muted-foreground">{feature.summary}</p>
                  </div>
                </div>
                <ul className="flex flex-col gap-1.5 text-pretty text-[13px] leading-5 text-muted-foreground">
                  {feature.details.map((detail) => (
                    <li className="relative pl-4 before:absolute before:left-0 before:text-foreground/40 before:content-['–']" key={detail}>
                      {detail}
                    </li>
                  ))}
                </ul>
                <p className="mt-auto rounded-lg bg-muted/60 px-3 py-2 text-pretty text-xs leading-5 text-muted-foreground">
                  <span className="font-medium text-foreground">In the preview: </span>
                  {feature.tryIt}
                </p>
              </li>
            ))}
          </ol>
        </DocSection>
      ) : null}

      <DocSection
        description="The registry copies the complete editable, source-owned visual graph and the Constructive theme. It also installs declared headless runtime dependencies such as @constructive-io/data; your application owns their endpoint and session configuration."
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
        <div className="flex flex-col gap-5">
          <CodeBlock label={block.usage.label} language="tsx">
            {block.usage.example}
          </CodeBlock>
          {block.usage.supportingExamples?.map((example) => (
            <CodeBlock
              key={example.label}
              label={example.label}
              language="tsx"
            >
              {example.source}
            </CodeBlock>
          ))}
        </div>
      </DocSection>

      <DocSection
        description={block.state.description}
        id="state"
        title="State and security"
      >
        <p className="max-w-3xl text-pretty text-sm leading-7 text-muted-foreground sm:text-[15px]">
          {block.state.actionGuidance}
        </p>
      </DocSection>

      <DocSection
        description="The source install is complete, while responsibility remains explicit at each integration seam."
        id="composition"
        title="Composition and ownership"
      >
        <GuidanceList items={block.composition} />
      </DocSection>

      <DocSection
        description={block.previewDescription}
        id="examples"
        title="Examples"
      >
        <GuidanceList
          items={[
            'Use the breakpoint controls to inspect the same package-backed block at desktop, tablet, and mobile widths.',
            'Open the full-screen preview to test keyboard interaction, dense data, and host callbacks without documentation chrome.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <GuidanceList items={block.accessibility} />
      </DocSection>

      <DocSection
        description="These public properties define the host boundary. Generated clients, endpoint selection, credentials, and application workflows stay outside the installed block."
        id="api-reference"
        title="API Reference"
      >
        <PublicContract block={block} />
      </DocSection>

      <ApplicationDocPagination current={block.name} />
    </article>
  );
}

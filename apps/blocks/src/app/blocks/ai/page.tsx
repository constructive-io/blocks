import type { Metadata } from 'next';

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@constructive-io/ui/table';

import Link from 'next/link';

import { AiShowcaseDemo } from '@/components/ai-showcase/ai-showcase-demo';
import { CodeBlock } from '@/components/docs/code-block';
import { DocSection } from '@/components/docs/doc-section';
import { AI_COMPONENTS } from '@/lib/ai-components';
import { AI_DOC } from '@/lib/ai-docs';
import { REGISTRY_COMPONENTS_JSON, registryAdd } from '@/lib/install-mode';
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

function ApiTable() {
  const caption = `Primary exports for ${AI_DOC.title}.`;
  return (
    <Table containerProps={{ tabIndex: 0, 'aria-label': caption }}>
      <TableCaption className="sr-only">{caption}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Export</TableHead>
          <TableHead scope="col">Kind</TableHead>
          <TableHead scope="col">Behavior</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {AI_DOC.api.map((row) => (
          <TableRow key={row.name}>
            <TableCell className="font-mono text-xs font-medium">{row.name}</TableCell>
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

export default function AiPage() {
  const doc = AI_DOC;

  return (
    <article aria-labelledby="ai-title" className="registry-page">
      <section aria-labelledby="ai-title" className="scroll-mt-20" id="overview">
        <header className="mb-6 max-w-2xl">
          <p className="registry-eyebrow">AI</p>
          <h1
            className="mt-2 text-balance text-[22px] font-semibold tracking-tight sm:text-[1.75rem]"
            id="ai-title"
          >
            {doc.title}
          </h1>
          <p className="mt-2 text-pretty text-sm leading-7 text-muted-foreground sm:text-[15px]">
            {doc.description}
          </p>
        </header>

        <AiShowcaseDemo />
      </section>

      <DocSection
        description="Configure the Constructive registry once, then install the single aggregate @constructive/ai entry. Examples use the default @/components/ui alias; use your configured ui alias if it differs."
        id="installation"
        title="Installation"
      >
        <CodeBlock label="components.json">{REGISTRY_COMPONENTS_JSON}</CodeBlock>
        <div className="mt-3">
          <CodeBlock label="Install aggregate">{registryAdd(doc.name)}</CodeBlock>
        </div>
      </DocSection>

      <DocSection id="when-to-use" title="When to use">
        <GuidanceList items={doc.whenToUse} />
      </DocSection>

      <DocSection description={doc.usage.description} id="usage" title="Basic usage">
        <CodeBlock label="agent-pane.tsx" language="tsx">
          {doc.usage.example}
        </CodeBlock>
      </DocSection>

      <DocSection description={doc.state.description} id="state" title={doc.state.title}>
        <GuidanceList items={doc.state.guidance} />
      </DocSection>

      <DocSection description={doc.composition.description} id="composition" title="Composition">
        <div className="grid gap-3 md:grid-cols-3">
          {doc.composition.boundaries.map((item) => (
            <article
              className="rounded-xl border border-border/60 bg-card p-4 shadow-card"
              key={item.title}
            >
              <h3 className="text-balance text-sm font-semibold">{item.title}</h3>
              <p className="mt-1 text-pretty text-sm leading-6 text-muted-foreground">{item.body}</p>
            </article>
          ))}
        </div>
      </DocSection>

      <DocSection description={doc.previewDescription} id="examples" title="Examples">
        <GuidanceList
          items={[
            'Composer — plan band, prompt input, context ring, and light status chrome.',
            'Chat — stick-to-bottom transcript with feedback and follow-ups.',
            'Reasoning — Reasoning, ThinkingTrace, and Steps for intermediate work.',
            'Tools — tool rows, diff chips, and CodeBlock results.',
            'HITL — approval, recommendations, and DiffTable proposed edits.',
            'Workspace — tasks, RAG cards, and streamed answer chrome with citations.',
          ]}
        />
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <GuidanceList items={doc.accessibility} />
      </DocSection>

      <DocSection
        description="Primary public exports. The installed source types are the full contract."
        id="api-reference"
        title="API Reference"
      >
        <ApiTable />
      </DocSection>

      <DocSection
        description="Every surface in the aggregate AI block has its own page under this section."
        id="components"
        title="Components"
      >
        <ul className="grid gap-2 sm:grid-cols-2">
          {AI_COMPONENTS.map((component) => (
            <li key={component.name} className="min-w-0">
              <Link
                href={`/blocks/ai/${component.name}`}
                className="flex min-h-16 flex-col rounded-xl border border-border/60 bg-card p-3 shadow-card outline-none transition-colors duration-150 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="text-sm font-semibold text-foreground">{component.title}</span>
                <span className="mt-1 line-clamp-2 text-pretty text-xs leading-5 text-muted-foreground">
                  {component.description}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </DocSection>
    </article>
  );
}

export const metadata: Metadata = {
  title: AI_DOC.title,
  description: AI_DOC.description,
  alternates: { canonical: withBase('/blocks/ai') },
  openGraph: {
    title: AI_DOC.title,
    description: AI_DOC.description,
    url: withBase('/blocks/ai'),
    images: [OG_IMAGE],
  },
};

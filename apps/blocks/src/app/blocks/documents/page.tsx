import type { Metadata } from 'next';

import { CodeBlock } from '@/components/docs/code-block';
import { DocSection } from '@/components/docs/doc-section';
import { ApplicationBlockShowcasePreview } from '@/components/application-block-showcase/application-block-showcase-preview';
import { ApplicationDocPagination } from '@/components/docs/application-doc-pagination';
import { OG_IMAGE, withBase } from '@/lib/site';

const TITLE = 'JSON documents';
const DESCRIPTION =
  'Render a declarative JSON UI document with the default widget registry: JSON Schema, database metadata, or an agent tool produces the document, and no page hand-writes the form.';

const INSTALL = `pnpm add blocks-schema blocks-renderer json-schema-to-blocks @constructive-io/blocks-ui`;

const USAGE = `'use client';

import { DocumentRenderer } from 'blocks-renderer';
import { defaultBlockRegistry } from '@constructive-io/blocks-ui';
import { schemaToDocument } from 'json-schema-to-blocks';

const document = schemaToDocument({
  type: 'object',
  required: ['title'],
  properties: {
    title: { type: 'string', maxLength: 120 },
    status: { type: 'string', enum: ['draft', 'review', 'published'] },
    featured: { type: 'boolean' }
  }
});

export function PostForm() {
  return (
    <DocumentRenderer
      document={document}
      registry={defaultBlockRegistry}
      onSubmit={(values) => save(values)}
    />
  );
}`;

const OVERRIDE = `import { composeRegistry } from 'blocks-renderer';
import { defaultBlockRegistry } from '@constructive-io/blocks-ui';

// Layer over the default registry one node type at a time.
const registry = composeRegistry(defaultBlockRegistry, {
  Select: MyCombobox,
  DataTable: MyDataTable
});`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: withBase('/blocks/documents') },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: withBase('/blocks/documents'),
    images: [OG_IMAGE],
  },
};

const WHEN_TO_USE = [
  'Use JSON documents when the form comes from data rather than code: a JSON Schema, database metadata, or an agent tool call.',
  'Use them where the same form must render in more than one place, such as an admin screen, a human-in-the-loop task, and an agent-generated page.',
  'Hand-write the form instead when it is one-off, heavily custom, or needs interactions the widget registry does not cover.',
];

const COMPOSITION = [
  '`blocks-schema` defines the document: an envelope and a tree of typed nodes with props, constraints, and actions.',
  '`json-schema-to-blocks` lowers a JSON Schema to that tree; `x-ui` annotations pick widgets, labels, and options without leaving the schema.',
  '`blocks-renderer` walks the tree, owns form state and validation, and asks a registry which component renders each node type.',
  '`@constructive-io/blocks-ui` is the default registry, built on `@constructive-io/ui`. Your application owns submission, persistence, and data-bound nodes.',
];

function GuidanceList({ items }: { items: readonly string[] }) {
  return (
    <ul className="flex max-w-3xl flex-col gap-2 text-pretty text-sm leading-7 text-muted-foreground sm:text-[15px]">
      {items.map((item) => (
        <li className="relative pl-5 before:absolute before:left-0 before:text-foreground before:content-['•']" key={item}>
          {item.split(/(`[^`]+`)/).map((part, index) =>
            part.startsWith('`') ? (
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px] text-foreground" key={index}>
                {part.slice(1, -1)}
              </code>
            ) : (
              part
            ),
          )}
        </li>
      ))}
    </ul>
  );
}

export default function DocumentsPage() {
  return (
    <article aria-labelledby="documents-title" className="registry-page">
      <section aria-labelledby="documents-title" className="scroll-mt-20" id="overview">
        <header className="mb-6 max-w-2xl">
          <p className="registry-eyebrow">Application blocks</p>
          <h1 className="mt-2 text-balance text-[22px] font-semibold tracking-tight sm:text-[1.75rem]" id="documents-title">
            {TITLE}
          </h1>
          <p className="mt-2 text-pretty text-sm leading-7 text-muted-foreground sm:text-[15px]">{DESCRIPTION}</p>
        </header>

        <ApplicationBlockShowcasePreview
          block={{
            title: TITLE,
            previewHeight: 820,
            previewDescription: '',
          }}
          previewPath={withBase('/blocks/documents/preview/')}
        />
      </section>

      <DocSection
        description="Four packages, each replaceable: the document format, a JSON Schema converter, the renderer, and the default widget registry."
        id="installation"
        title="Installation"
      >
        <CodeBlock label="terminal">{INSTALL}</CodeBlock>
      </DocSection>

      <DocSection id="when-to-use" title="When to use">
        <GuidanceList items={WHEN_TO_USE} />
      </DocSection>

      <DocSection
        description="A document is data: an envelope plus a node tree. Convert a schema once, then render it with the default registry and handle submission in the host."
        id="usage"
        title="Basic usage"
      >
        <CodeBlock label="post-form.tsx" language="tsx">
          {USAGE}
        </CodeBlock>
      </DocSection>

      <DocSection
        description="Each layer is a separate package with one job, so any of them can be swapped without touching the others."
        id="composition"
        title="Composition and ownership"
      >
        <GuidanceList items={COMPOSITION} />
      </DocSection>

      <DocSection
        description="The registry is a plain map from node type to component, so replace any subset without forking it. Data-bound nodes such as DataTable and AgentChat are deliberately unregistered: they need a query runtime, so the host supplies them."
        id="replacing-components"
        title="Replacing components"
      >
        <CodeBlock label="registry.ts" language="tsx">
          {OVERRIDE}
        </CodeBlock>
      </DocSection>

      <ApplicationDocPagination current="documents" />
    </article>
  );
}

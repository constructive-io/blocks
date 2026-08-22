import type { Metadata } from 'next';

import { CodeBlock } from '@/components/docs/code-block';
import { DocSection } from '@/components/docs/doc-section';
import { DocumentFormDemo } from '@/components/documents-showcase/document-form-demo';
import { DocumentNavDemo } from '@/components/documents-showcase/document-nav-demo';
import { OG_IMAGE, withBase } from '@/lib/site';

const TITLE = 'JSON documents';
const DESCRIPTION =
  'Render a declarative JSON UI document with the default widget registry: JSON Schema, database metadata, or an agent tool produces the document, and no page hand-writes the form.';

const INSTALL = `pnpm add blocks-schema blocks-renderer json-schema-to-blocks meta-to-blocks @constructive-io/blocks-ui`;

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

const NAV = `import { DocumentRenderer } from 'blocks-renderer';
import { defaultBlockRegistry } from '@constructive-io/blocks-ui';
import { metaToNavDocument } from 'meta-to-blocks';

// One group per schema, one link per table, join tables dropped.
const nav = metaToNavDocument(meta.tables, {
  href: (table) => \`/admin/\${table.schemaName}/\${table.name}\`
});

export function ConsoleSidebar({ pathname }: { pathname: string }) {
  return (
    <DocumentRenderer
      document={nav}
      registry={defaultBlockRegistry}
      scope={{ pathname }}
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

export default function DocumentsPage() {
  return (
    <div className="registry-page">
      <header className="mb-8 max-w-2xl">
        <p className="registry-eyebrow">Documents</p>
        <h1 className="mt-2 text-[22px] font-semibold tracking-tight sm:text-[1.75rem]">
          {TITLE}
        </h1>
        <p className="mt-2 text-pretty text-sm leading-7 text-muted-foreground sm:text-[15px]">
          {DESCRIPTION}
        </p>
      </header>

      <DocSection id="installation" title="Installation">
        <CodeBlock label="terminal">
          {INSTALL}
        </CodeBlock>
      </DocSection>

      <DocSection
        description="A document is data: an envelope plus a node tree. The renderer walks the tree and asks a registry which component renders each node type, so the same document works in an admin screen, a human-in-the-loop task, or an agent-generated page."
        id="usage"
        title="Basic usage"
      >
        <CodeBlock label="post-form.tsx" language="tsx">
          {USAGE}
        </CodeBlock>
      </DocSection>

      <DocSection
        description="The form below is generated from the JSON Schema on the left of the source: labels, widget selection, constraints, and validation all come from the document."
        id="examples"
        title="Live example"
      >
        <DocumentFormDemo />
      </DocSection>

      <DocSection
        description="Navigation is a document too: metaToNavDocument lowers a _meta table list to Nav, NavGroup and NavLink nodes, so a console sidebar follows the database rather than a hand-maintained route list. It needs no query runtime, and the current link is whichever href matches scope.pathname."
        id="navigation"
        title="Navigation from database metadata"
      >
        <DocumentNavDemo />
        <CodeBlock label="console-sidebar.tsx" language="tsx">
          {NAV}
        </CodeBlock>
      </DocSection>

      <DocSection
        description="The registry is a plain node type to component map, so replace any subset without forking it. Data-bound nodes such as DataTable and AgentChat are deliberately unregistered: they need a query runtime, so the host supplies them."
        id="composition"
        title="Replacing components"
      >
        <CodeBlock label="registry.ts" language="tsx">
          {OVERRIDE}
        </CodeBlock>
      </DocSection>
    </div>
  );
}

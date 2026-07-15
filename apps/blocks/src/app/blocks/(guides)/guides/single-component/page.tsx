/**
 * How-to: Install one UI component (Diátaxis how-to — goal-oriented recipe).
 *
 * Add a single @constructive UI primitive without a data block or the full kit.
 * Grounded in the real registry mapping (components.json: the @constructive
 * registry URL + the `ui` alias → @/components/ui) and a real UI item
 * (ui/button → registryName @constructive/button, package import
 * @constructive-io/ui/button). Unlike data blocks, a UI primitive has no data
 * path, so it needs no @/generated SDK and no BlocksRuntime.
 *
 * Server component: DocPage (client) → DocSection (server) → CodeBlock (async).
 */

import type { Metadata } from 'next';

import { CodeBlock } from '@/components/docs/code-block';
import { DocPage } from '@/components/docs/doc-page';
import { DocSection } from '@/components/docs/doc-section';
import { InstallField } from '@/components/docs/install-field';
import { DocLink, InlineCode, proseCls, ResultCallout } from '@/components/docs/prose';
import { GUIDES } from '@/lib/docs/guides-meta';
import { getAdjacent } from '@/lib/docs/registry';
import { OG_IMAGE, withBase } from '@/lib/site';

const meta = GUIDES.find((g) => g.slug === 'single-component');
const HREF = meta?.href ?? '/blocks/guides/single-component';
const TITLE = meta?.title ?? 'Install one UI component';
const DESCRIPTION =
  meta?.description ?? 'Add a single @constructive UI primitive — like Button — without a data block or the full kit.';

export default function SingleComponentGuidePage() {
  const { prev, next } = getAdjacent(HREF);
  return (
    <DocPage title={TITLE} description={DESCRIPTION} prev={prev} next={next}>
      <p className={proseCls}>
        UI components are the foundation primitives blocks are built from. You can copy any one into your project on its
        own — no SDK, no runtime, no data wiring.
      </p>

      <DocSection
        title="1. Map the registry namespace"
        intro="Point the @constructive namespace at the registry once, in components.json. Every @constructive/<name> install resolves after this."
      >
        <CodeBlock
          lang="json"
          filename="components.json"
          code={`{
  "registries": {
    "@constructive": "https://constructive-io.github.io/blocks/r/{name}.json"
  }
}`}
        />
        <p className="text-pretty mt-3 text-caption text-muted-foreground">
          Already done the host setup? Then this is already in place — see{' '}
          <DocLink href="/blocks/getting-started">Getting started</DocLink>.
        </p>
      </DocSection>

      <DocSection
        title="2. Add the component"
        intro="Use the standard shadcn CLI. The source is copied into your project — into the ui alias from components.json (@/components/ui) — with imports rewritten and any primitives it builds on pulled in alongside it."
      >
        <InstallField url="@constructive/button" />
      </DocSection>

      <DocSection
        title="3. Use your local copy"
        intro="Import the component from your project, not the package. It is ordinary source now — restyle or fork it freely."
      >
        <CodeBlock
          lang="tsx"
          filename="app/page.tsx"
          code={`import { Button } from '@/components/ui/button';

export default function Page() {
  return <Button>Create database</Button>;
}`}
        />
        <p className="text-pretty mt-3 text-caption text-muted-foreground">
          Blocks keep importing the package form (<InlineCode>@constructive-io/ui/button</InlineCode>); the two ways to
          consume coexist.
        </p>
      </DocSection>

      <DocSection
        title="4. Skip the runtime"
        intro="A UI primitive has no data path, so it needs none of the data-block setup — no @/generated SDK and no BlocksRuntime. You only need Tailwind v4 and the foundation tokens in your stylesheet (the same @import from host setup)."
      >
        <p className={proseCls}>
          Browse every primitive — props, variants, and live preview — starting from{' '}
          <DocLink href="/blocks/ui/button">Button</DocLink>.
        </p>
      </DocSection>

      <ResultCallout>
        You added one primitive you fully own — restyle it, fork it, ship it — with zero data wiring.
      </ResultCallout>
    </DocPage>
  );
}

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: withBase(HREF) },
  openGraph: { title: TITLE, description: DESCRIPTION, url: withBase(HREF), images: [OG_IMAGE] },
};

import Link from 'next/link';

import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@constructive-io/ui/table';

import { CodeBlock } from '@/components/docs/code-block';
import { DocSection } from '@/components/docs/doc-section';
import { FEATURE_PACK_CATALOG, getFeaturePackManifest, type FeaturePackManifestV1 } from '@/feature-packs';
import { BILLING_BLOCKS } from '@/lib/billing-blocks';
import { type FeaturePackApiRow, type FeaturePackDoc } from '@/lib/feature-packs';
import { registryAdd } from '@/lib/install-mode';
import { withBase } from '@/lib/site';
import { cn } from '@/lib/utils';

import { FeaturePackShowcasePreview } from './feature-pack-showcase-preview';

function GuidanceList({ items }: { items: readonly string[] }) {
  return (
    <ul className="max-w-3xl space-y-2 text-pretty text-sm leading-7 text-muted-foreground sm:text-[15px]">
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

function PublicContract({ block }: { block: FeaturePackDoc }) {
  const caption = `Public properties for the ${block.title} feature pack.`;

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
        {(block.api as readonly FeaturePackApiRow[]).map((row) => (
          <TableRow key={row.name}>
            <TableCell className="font-mono text-xs font-medium">{row.name}</TableCell>
            <TableCell className="whitespace-normal font-mono text-xs text-muted-foreground">{row.type}</TableCell>
            <TableCell className="min-w-64 whitespace-normal text-pretty text-muted-foreground">
              {row.behavior}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function formatContractValues(values: readonly string[]) {
  return values.length > 0 ? values.join(', ') : 'None';
}

function FeaturePackContract({ manifest }: { manifest: FeaturePackManifestV1 }) {
  const caption = `${manifest.title} endpoint, capability, and metadata requirements.`;
  const rows = [
    {
      contract: 'Feature-pack dependencies',
      required: formatContractValues(manifest.dependencies),
      optional: 'None',
    },
    {
      contract: 'Endpoints',
      required: formatContractValues(manifest.endpoints.required),
      optional: formatContractValues(manifest.endpoints.optional),
    },
    {
      contract: 'Capabilities',
      required: formatContractValues(manifest.capabilities.required),
      optional: formatContractValues(manifest.capabilities.optional),
    },
    {
      contract: '_meta sections',
      required: formatContractValues(manifest.metadata.requiredMetaSections),
      optional: formatContractValues(manifest.metadata.optionalMetaSections),
    },
    {
      contract: 'GraphQL introspection',
      required: formatContractValues(manifest.metadata.requiredIntrospectionSections),
      optional: formatContractValues(manifest.metadata.optionalIntrospectionSections),
    },
  ];

  return (
    <Table containerProps={{ tabIndex: 0, 'aria-label': caption }}>
      <TableCaption className="sr-only">{caption}</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Contract</TableHead>
          <TableHead scope="col">Required</TableHead>
          <TableHead scope="col">Optional</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.contract}>
            <TableCell className="font-medium">{row.contract}</TableCell>
            <TableCell className="min-w-56 whitespace-normal font-mono text-xs text-muted-foreground">
              {row.required}
            </TableCell>
            <TableCell className="min-w-56 whitespace-normal font-mono text-xs text-muted-foreground">
              {row.optional}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function BillingBlockLinks() {
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {BILLING_BLOCKS.map((block) => (
        <li key={block.name}>
          <Link
            className={cn(
              'flex min-h-16 flex-col justify-center rounded-xl border border-border/60 bg-card px-4 py-3 outline-none',
              'transition-[background-color,border-color,box-shadow] duration-150 ease-out',
              'hover:border-border hover:bg-accent/40 hover:shadow-card',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
            )}
            href={`/blocks/billing/${block.name}`}
          >
            <span className="text-sm font-medium text-foreground">{block.title}</span>
            <span className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{block.description}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function NeighborLink({ block, direction }: { block?: FeaturePackDoc; direction: 'Previous' | 'Next' }) {
  if (!block) return <span />;

  return (
    <Link
      className="inline-flex min-h-10 flex-col justify-center rounded-md text-sm text-muted-foreground outline-none transition-colors duration-150 ease-out hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      href={`/blocks/features/${block.id}`}
    >
      <span className="block text-xs">{direction}</span>
      <span className="font-medium text-foreground">{block.title}</span>
    </Link>
  );
}

export function FeaturePackDocsPage({
  block,
  next,
  previous,
}: {
  block: FeaturePackDoc;
  next?: FeaturePackDoc;
  previous?: FeaturePackDoc;
}) {
  const manifest = getFeaturePackManifest(FEATURE_PACK_CATALOG, block.id)!;

  return (
    <article aria-labelledby="feature-pack-title" className="registry-page">
      <section aria-labelledby="feature-pack-title" className="scroll-mt-20" id="overview">
        <header className="mb-6 max-w-2xl">
          <p className="registry-eyebrow">Feature packs</p>
          <h1
            className="mt-2 text-balance text-[22px] font-semibold tracking-tight sm:text-[1.75rem]"
            id="feature-pack-title"
          >
            {block.title} feature pack
          </h1>
          <p className="mt-2 text-pretty text-sm leading-7 text-muted-foreground sm:text-[15px]">{block.description}</p>
        </header>

        <FeaturePackShowcasePreview pack={block.id} previewPath={withBase(`/blocks/features/${block.id}/preview/`)} />
      </section>

      <DocSection
        description="Use the registry to copy the feature root, its presentational dependencies, and its machine-readable manifest into your application. Declared feature-pack dependencies are installed transitively."
        id="installation"
        title="Installation"
      >
        <CodeBlock label="Registry install">{registryAdd(block.registryName)}</CodeBlock>
      </DocSection>

      <DocSection id="when-to-use" title="When to use">
        <GuidanceList items={block.whenToUse} />
      </DocSection>

      <DocSection description={block.usage.description} id="usage" title="Basic usage">
        <CodeBlock label="Basic usage" language="tsx">
          {block.usage.example}
        </CodeBlock>
      </DocSection>

      <DocSection description={block.state.description} id="state" title={block.state.title}>
        <p className="max-w-2xl text-pretty text-sm leading-7 text-muted-foreground sm:text-[15px]">
          {block.state.actionGuidance}
        </p>
      </DocSection>

      <DocSection
        description="The installed sidecar records compatibility requirements for harness and build tooling; Console Kit uses the equivalent compiled catalog at runtime. Neither contract grants access: PostgreSQL privileges and RLS remain authoritative for every request."
        id="feature-contract"
        title="Feature-pack contract"
      >
        <FeaturePackContract manifest={manifest} />
        <p className="mt-4 max-w-3xl text-pretty text-sm leading-7 text-muted-foreground sm:text-[15px]">
          Optional capability IDs describe compatible adapter evidence. They do not imply that this release renders a
          dedicated surface; the implemented UI is listed below.
        </p>
      </DocSection>

      <DocSection
        description="The live preview mounts the same exported feature root with deterministic resources and host-owned action callbacks."
        id="examples"
        title="Included surfaces"
      >
        <GuidanceList items={block.surfaces} />
      </DocSection>

      {block.id === 'billing' ? (
        <DocSection
          description="The Billing feature pack composes the mature customer billing blocks. Each leaf block remains independently installable and has its own state, accessibility, and API documentation."
          id="billing-blocks"
          title="Billing blocks"
        >
          <BillingBlockLinks />
        </DocSection>
      ) : null}

      <DocSection id="accessibility" title="Accessibility">
        <GuidanceList items={block.accessibility} />
      </DocSection>

      <DocSection
        description={`The ${block.exportName} public properties are listed here. Runtime connections are injected through these properties, while PostgreSQL privileges and RLS remain the authorization boundary.`}
        id="api-reference"
        title="API Reference"
      >
        <PublicContract block={block} />
      </DocSection>

      <nav aria-label="Feature pack pagination" className="mt-12 grid grid-cols-2 gap-6 border-t border-border pt-6">
        <NeighborLink block={previous} direction="Previous" />
        <div className="text-right">
          <NeighborLink block={next} direction="Next" />
        </div>
      </nav>
    </article>
  );
}

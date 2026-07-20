import Link from 'next/link';

import { InstallToggle } from '@/components/docs/install-toggle';
import { UI_DEMO_SOURCE } from '@/generated/ui-demo-source';
import type { BasePrimitive } from '@/lib/base-primitives';
import { packageImport } from '@/lib/base-primitives';
import { packageCommands, registryCommands } from '@/lib/install-mode';
import type { PrimitiveDocs } from '@/lib/primitive-docs';

import { ApiTable } from './api-table';
import { ComponentExample, DemoSourceBlock } from './component-example';
import { DocSection } from './doc-section';

type PrimitiveDocsPageProps = {
  docs: PrimitiveDocs;
  next?: BasePrimitive;
  previous?: BasePrimitive;
  primitive: BasePrimitive;
};

function sourceFor(primitive: BasePrimitive, demo: string) {
  const primitiveSources = UI_DEMO_SOURCE[primitive.name] as Record<
    string,
    { npm: string; registry: string }
  >;
  const source = primitiveSources?.[demo];
  if (!source) {
    throw new Error(`Missing generated source for ${primitive.name}:${demo}`);
  }
  return source;
}

function NeighborLink({ primitive, direction }: { primitive?: BasePrimitive; direction: 'Previous' | 'Next' }) {
  if (!primitive) return <span />;

  return (
    <Link
      href={`/blocks/ui/${primitive.name}`}
      className="inline-flex min-h-10 flex-col justify-center rounded-md text-sm text-muted-foreground outline-none transition-colors duration-150 ease-out hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span className="block text-xs">{direction}</span>
      <span className="font-medium text-foreground">{primitive.title}</span>
    </Link>
  );
}

function GuidanceList({ items }: { items: readonly string[] }) {
  return (
    <ul className="max-w-3xl space-y-2 text-pretty text-sm leading-7 text-muted-foreground sm:text-[15px]">
      {items.map((item) => (
        <li key={item} className="relative pl-5 before:absolute before:left-0 before:text-foreground before:content-['•']">
          {item}
        </li>
      ))}
    </ul>
  );
}

export function PrimitiveDocsPage({ docs, next, previous, primitive }: PrimitiveDocsPageProps) {
  const registryImport = `import { ${primitive.exportName} } from '@/components/ui/${primitive.name}';`;

  return (
    <article className="registry-page">
      <section id="overview" aria-labelledby="primitive-title" className="scroll-mt-20">
        <header className="mb-6 max-w-2xl">
          <p className="registry-eyebrow">Components</p>
          <h1 id="primitive-title" className="mt-2 text-balance text-[22px] font-semibold tracking-tight sm:text-[1.75rem]">
            {primitive.title}
          </h1>
          <p className="mt-2 text-pretty text-sm leading-7 text-muted-foreground sm:text-[15px]">
            {primitive.description}
          </p>
        </header>

        <ComponentExample
          name={primitive.name}
          demo="BlockDemo"
          title="Basic example"
          source={sourceFor(primitive, 'BlockDemo')}
        />
      </section>

      <DocSection
        id="installation"
        title="Installation"
        description="Choose the package when you want centralized updates, or copy the source through the registry when you want local ownership."
      >
        <InstallToggle
          npm={packageCommands({ globals: true, importLine: packageImport(primitive) })}
          registry={registryCommands({
            item: primitive.name,
            includeConfig: true,
            importLine: registryImport,
          })}
          descriptions={{
            npm: 'Install the package, import its global tokens once, then use this exact subpath.',
            registry:
              'Configure the registry, then let shadcn copy this component and its source dependencies. The npm package is not required.',
          }}
        />
      </DocSection>

      <DocSection id="when-to-use" title="When to use">
        <GuidanceList items={docs.whenToUse} />
      </DocSection>

      <DocSection id="usage" title="Basic usage" description={docs.usage.description}>
        <DemoSourceBlock source={sourceFor(primitive, docs.usage.demo)} />
      </DocSection>

      {docs.state ? (
        <DocSection id="state" title={docs.state.title} description={docs.state.description}>
          {docs.state.demo ? (
            <ComponentExample
              name={primitive.name}
              demo={docs.state.demo}
              title={docs.state.title}
              source={sourceFor(primitive, docs.state.demo)}
            />
          ) : null}
        </DocSection>
      ) : null}

      <DocSection id="examples" title="Examples">
        <div className="space-y-5">
          {docs.examples.map((example) => (
            <ComponentExample
              key={example.demo}
              name={primitive.name}
              demo={example.demo}
              title={example.title}
              description={example.description}
              source={sourceFor(primitive, example.demo)}
            />
          ))}
        </div>
      </DocSection>

      <DocSection id="accessibility" title="Accessibility">
        <GuidanceList items={docs.accessibility} />
      </DocSection>

      <DocSection
        id="api-reference"
        title="API Reference"
        description="Constructive-specific behavior is listed here. Each part links to its inherited platform or primitive contract."
      >
        <ApiTable parts={docs.api} />
      </DocSection>

      <nav aria-label="Primitive pagination" className="mt-12 grid grid-cols-2 gap-6 border-t border-border pt-6">
        <NeighborLink primitive={previous} direction="Previous" />
        <div className="text-right">
          <NeighborLink primitive={next} direction="Next" />
        </div>
      </nav>
    </article>
  );
}

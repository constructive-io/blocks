import type { Metadata } from 'next';
import Link from 'next/link';

import { InstallToggle } from '@/components/docs/install-toggle';
import { APPLICATION_BLOCKS } from '@/lib/application-blocks';
import { COMPONENT_DOC_SEQUENCE } from '@/lib/component-doc-navigation';
import { packageCommands, registryCommands } from '@/lib/install-mode';
import { OG_IMAGE, withBase } from '@/lib/site';
import { SOURCE_BLOCKS } from '@/lib/source-blocks';

const TITLE = 'Setup';
const DESCRIPTION = 'Choose npm package distribution or source installation through the shadcn CLI.';

const APPLICATION_CATALOG = [
  {
    href: '/blocks/features',
    title: 'Feature packs',
    description:
      'Data, authentication, users, organizations, storage, billing, and notifications.',
  },
  ...APPLICATION_BLOCKS.map((block) => ({
    href: `/blocks/${block.name}`,
    title: block.title,
    description: block.description,
  })),
  ...SOURCE_BLOCKS.map((block) => ({
    href: `/blocks/${block.name}`,
    title: block.title,
    description: block.description,
  })),
  {
    href: '/blocks/console-kit',
    title: 'Console Kit for Next.js',
    description:
      'A full-page console driven by injected endpoints, session state, adapters, and versioned _meta.',
  },
  {
    href: '/blocks/ai',
    title: 'AI',
    description:
      'Chat, agent traces, tools, HITL approval, and plan chrome for AI-native apps.',
  },
] as const;

export default function SetupPage() {
  return (
    <div className="registry-page">
      <header className="mb-8 max-w-2xl">
        <p className="registry-eyebrow">Foundations</p>
        <h1 className="mt-2 text-[22px] font-semibold tracking-tight sm:text-[1.75rem]">
          Install the foundation your way
        </h1>
        <p className="mt-2 text-pretty text-sm leading-7 text-muted-foreground sm:text-[15px]">
          {DESCRIPTION}
        </p>
      </header>

      <InstallToggle
        npm={packageCommands({
          globals: true,
          importLine: `import { Button } from '@constructive-io/ui/button';`,
        })}
        registry={registryCommands({ item: 'button', includeConfig: true })}
        descriptions={{
          npm: 'Stable package exports — updates follow your package manager.',
          registry:
            'Copy source into your project. Theme and dependencies install with the component through shadcn@latest.',
        }}
      />

      <section className="mt-12" aria-labelledby="application-blocks">
        <div className="mb-4">
          <h2 id="application-blocks" className="text-lg font-semibold tracking-tight">
            Application blocks
          </h2>
          <p className="mt-1 max-w-2xl text-pretty text-sm leading-7 text-muted-foreground">
            Start with a capability-aligned feature pack, add a composed
            workflow block, or install the full Next.js console with its
            route-neutral app shell and dynamic data explorer.
          </p>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2">
          {APPLICATION_CATALOG.map((item) => (
            <li key={item.href} className="min-w-0">
              <Link
                href={item.href}
                className="flex h-full min-h-24 flex-col rounded-xl border border-border/60 bg-card px-4 py-3.5 outline-none transition-[background-color,border-color,box-shadow] duration-150 ease-out hover:border-border hover:bg-accent/40 hover:shadow-card focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="text-sm font-medium text-foreground">
                  {item.title}
                </span>
                <span className="mt-1 text-pretty text-xs leading-5 text-muted-foreground">
                  {item.description}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12" aria-labelledby="component-catalog">
        <div className="mb-4">
          <h2 id="component-catalog" className="text-lg font-semibold tracking-tight">
            Components
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {COMPONENT_DOC_SEQUENCE.length} components · each page shows its supported install path and source contract.
          </p>
        </div>
        <div className="registry-block min-w-0">
          <div className="registry-block-bar">
            <span>Index</span>
            <span className="min-w-0 flex-1" />
            <span className="shrink-0 font-mono text-xs font-normal text-muted-foreground">
              {COMPONENT_DOC_SEQUENCE.length}
            </span>
          </div>
          <div className="registry-block-stage registry-block-stage-col !p-3">
            <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {COMPONENT_DOC_SEQUENCE.map((component) => (
                <li key={component.id} className="min-w-0">
                  <Link
                    href={component.href}
                    className="flex min-h-14 flex-col rounded-lg border border-border bg-card px-3 py-2.5 outline-none transition-[background-color,border-color] duration-150 ease-out hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="text-sm font-medium">{component.title}</span>
                    <span className="mt-0.5 line-clamp-2 text-pretty text-xs leading-5 text-muted-foreground">
                      {component.description}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: withBase('/blocks') },
  openGraph: { title: TITLE, description: DESCRIPTION, url: withBase('/blocks'), images: [OG_IMAGE] },
};

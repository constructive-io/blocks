import type { Metadata } from 'next';
import Link from 'next/link';

import { CodeBlock } from '@/components/docs/code-block';
import { PageHeader } from '@/components/docs/page-header';
import { Button } from '@constructive-io/ui/button';
import { BASE_PRIMITIVES } from '@/lib/base-primitives';
import { OG_IMAGE, withBase } from '@/lib/site';

const TITLE = 'Setup';
const DESCRIPTION = 'Choose npm package distribution or source installation through the shadcn CLI.';

export default function SetupPage() {
  return (
    <div className="site-container pb-16 sm:pb-24">
      <PageHeader title="Install the foundation your way" description={DESCRIPTION}>
        <Button asChild size="sm" variant="outline">
          <Link href="/">Browse components</Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-2 lg:gap-5">
        <section className="flex flex-col gap-4 rounded-xl border border-border/50 bg-card p-5 shadow-card sm:p-6">
          <div>
            <h2 className="text-base font-semibold">npm package</h2>
            <p className="mt-1.5 text-pretty text-sm leading-6 text-muted-foreground">
              Use stable package exports when updates should follow your package manager.
            </p>
          </div>
          <CodeBlock label="Install">pnpm add @constructive-io/ui</CodeBlock>
          <CodeBlock label="globals.css">{`/* app/globals.css */\n@import '@constructive-io/ui/globals.css';`}</CodeBlock>
          <CodeBlock label="Import">{`import { Button } from '@constructive-io/ui/button';`}</CodeBlock>
        </section>

        <section className="flex flex-col gap-4 rounded-xl border border-border/50 bg-card p-5 shadow-card sm:p-6">
          <div>
            <h2 className="text-base font-semibold">shadcn registry</h2>
            <p className="mt-1.5 text-pretty text-sm leading-6 text-muted-foreground">
              Copy source into your project. The component graph and Constructive theme install automatically — the npm
              package is not a prerequisite.
            </p>
          </div>
          <CodeBlock label="components.json">{`// components.json\n{\n  "registries": {\n    "@constructive": "https://constructive-io.github.io/blocks/r/{name}.json"\n  }\n}`}</CodeBlock>
          <CodeBlock label="Add component">pnpm dlx shadcn@4.13.1 add @constructive/button</CodeBlock>
          <p className="text-xs leading-5 text-muted-foreground">Requires shadcn CLI 4.13.1 or newer.</p>
        </section>
      </div>

      <section className="mt-14" aria-labelledby="primitive-catalog">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <h2 id="primitive-catalog" className="text-lg font-semibold tracking-tight">
              Base primitives
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {BASE_PRIMITIVES.length} components · each page shows npm and registry install paths.
            </p>
          </div>
        </div>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {BASE_PRIMITIVES.map((primitive) => (
            <li key={primitive.name}>
              <Link
                href={`/blocks/ui/${primitive.name}`}
                className="flex h-full min-h-16 flex-col rounded-lg border border-border/50 bg-card px-4 py-3 shadow-card outline-none transition-[background-color,border-color,box-shadow] duration-150 ease-out hover:border-border/80 hover:bg-muted/40 hover:shadow-card-lg focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="text-sm font-medium text-foreground">{primitive.title}</span>
                <span className="mt-0.5 line-clamp-2 text-pretty text-sm leading-5 text-muted-foreground">
                  {primitive.description}
                </span>
              </Link>
            </li>
          ))}
        </ul>
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

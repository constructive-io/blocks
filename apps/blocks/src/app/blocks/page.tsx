import type { Metadata } from 'next';
import Link from 'next/link';

import { BASE_PRIMITIVES } from '@/lib/base-primitives';
import { OG_IMAGE, withBase } from '@/lib/site';

const TITLE = 'Setup';
const DESCRIPTION = 'Choose npm package distribution or source installation through the shadcn CLI.';

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border bg-muted p-4 text-sm leading-6">
      <code>{children}</code>
    </pre>
  );
}

export default function SetupPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-16 sm:px-8 sm:py-24">
      <header className="max-w-2xl">
        <h1 className="text-balance text-3xl font-semibold sm:text-4xl">Install the foundation your way</h1>
        <p className="mt-4 text-pretty leading-7 text-muted-foreground">{DESCRIPTION}</p>
      </header>

      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <section className="flex flex-col gap-5 rounded-xl border bg-card p-6">
          <div>
            <h2 className="text-balance text-xl font-semibold">npm package</h2>
            <p className="mt-2 text-pretty text-sm leading-6 text-muted-foreground">
              Use stable package exports when updates should follow your package manager.
            </p>
          </div>
          <Code>pnpm add @constructive-io/ui</Code>
          <Code>{`/* app/globals.css */\n@import '@constructive-io/ui/globals.css';`}</Code>
          <Code>{`import { Button } from '@constructive-io/ui/button';`}</Code>
        </section>

        <section className="flex flex-col gap-5 rounded-xl border bg-card p-6">
          <div>
            <h2 className="text-balance text-xl font-semibold">shadcn registry</h2>
            <p className="mt-2 text-pretty text-sm leading-6 text-muted-foreground">
              Copy source into your project. The component graph and Constructive theme install automatically, so the npm
              package is not a prerequisite.
            </p>
          </div>
          <Code>{`// components.json\n{\n  "registries": {\n    "@constructive": "https://constructive-io.github.io/blocks/r/{name}.json"\n  }\n}`}</Code>
          <Code>pnpm dlx shadcn@4.13.1 add @constructive/button</Code>
          <p className="text-pretty text-xs leading-5 text-muted-foreground">Requires shadcn CLI 4.13.1 or newer.</p>
        </section>
      </div>

      <section className="mt-16" aria-labelledby="primitive-catalog">
        <h2 id="primitive-catalog" className="text-balance text-2xl font-semibold">
          Base primitives
        </h2>
        <p className="mt-3 text-pretty text-sm text-muted-foreground">
          Each preview imports the package subpath that consumers use in npm mode.
        </p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BASE_PRIMITIVES.map((primitive) => (
            <li key={primitive.name}>
              <Link
                href={`/blocks/ui/${primitive.name}`}
                className="block h-full rounded-lg border bg-card p-4 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="font-medium">{primitive.title}</span>
                <span className="mt-1 block text-pretty text-sm leading-6 text-muted-foreground">
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

import type { Metadata } from 'next';
import Link from 'next/link';

import { InstallToggle } from '@/components/docs/install-toggle';
import { BASE_PRIMITIVES } from '@/lib/base-primitives';
import { packageCommands, registryCommands } from '@/lib/install-mode';
import { OG_IMAGE, withBase } from '@/lib/site';

const TITLE = 'Setup';
const DESCRIPTION = 'Choose npm package distribution or source installation through the shadcn CLI.';

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
            'Copy source into your project. Theme and dependencies install with the component. Requires shadcn CLI 4.13.1 or newer.',
        }}
      />

      <section className="mt-12" aria-labelledby="primitive-catalog">
        <div className="mb-4">
          <h2 id="primitive-catalog" className="text-lg font-semibold tracking-tight">
            Base primitives
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {BASE_PRIMITIVES.length} components · each page shows npm and registry install paths.
          </p>
        </div>
        <div className="registry-block min-w-0">
          <div className="registry-block-bar">
            <span>Index</span>
            <span className="min-w-0 flex-1" />
            <span className="shrink-0 font-mono text-xs font-normal text-muted-foreground">
              {BASE_PRIMITIVES.length}
            </span>
          </div>
          <div className="registry-block-stage registry-block-stage-col !p-3">
            <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {BASE_PRIMITIVES.map((primitive) => (
                <li key={primitive.name} className="min-w-0">
                  <Link
                    href={`/blocks/ui/${primitive.name}`}
                    className="flex min-h-14 flex-col rounded-lg border border-border bg-card px-3 py-2.5 outline-none transition-[background-color,border-color] duration-150 ease-out hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="text-sm font-medium">{primitive.title}</span>
                    <span className="mt-0.5 line-clamp-2 text-pretty text-xs leading-5 text-muted-foreground">
                      {primitive.description}
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

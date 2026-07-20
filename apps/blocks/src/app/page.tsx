import Link from 'next/link';

import { RegistryHero } from '@/components/landing/registry-hero';
import { BASE_PRIMITIVES } from '@/lib/base-primitives';

export default function HomePage() {
  return (
    <>
      <RegistryHero />

      <div className="registry-page">
        <section aria-labelledby="component-catalog">
          <div className="mb-5">
            <p className="registry-eyebrow">Components</p>
            <h2 id="component-catalog" className="mt-2 text-[22px] font-semibold tracking-tight">
              Base primitives
            </h2>
            <p className="mt-1.5 max-w-[60ch] text-sm text-muted-foreground">
              {BASE_PRIMITIVES.length} package-backed primitives. Open a page for the live preview and install
              commands.
            </p>
          </div>

          <div className="registry-block">
            <div className="registry-block-bar">
              <span>Catalog</span>
              <span className="min-w-0 flex-1" />
              <span className="shrink-0 font-mono text-xs font-normal text-muted-foreground">@constructive/*</span>
            </div>
            <div className="registry-block-stage registry-block-stage-col !items-stretch !p-3 sm:!p-4">
              <ul className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {BASE_PRIMITIVES.map((primitive) => (
                  <li key={primitive.name} className="min-w-0">
                    <Link
                      href={`/blocks/ui/${primitive.name}`}
                      className="flex h-full min-h-14 flex-col rounded-lg border border-border bg-card px-3 py-2.5 outline-none transition-[background-color,border-color] duration-150 ease-out hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="text-sm font-medium text-foreground">{primitive.title}</span>
                      <span className="mt-0.5 line-clamp-2 text-pretty text-xs leading-5 text-muted-foreground">
                        {primitive.description}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-sm text-muted-foreground">
                Prefer the install guide?{' '}
                <Link href="/blocks" className="font-medium text-foreground underline-offset-4 hover:underline">
                  Open setup
                </Link>
                .
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

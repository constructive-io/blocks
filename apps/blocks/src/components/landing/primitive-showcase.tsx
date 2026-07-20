'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

import {
  HOME_SHOWCASE_DEMOS,
  HOME_SHOWCASE_PRIMITIVES,
} from '@/components/landing/primitive-showcase-config';
import { BASE_PRIMITIVES } from '@/lib/base-primitives';
import { cn } from '@/lib/utils';

export function PrimitiveShowcase() {
  return (
    <section className="registry-page" aria-labelledby="component-showcase">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="registry-eyebrow">Components</p>
          <h2 id="component-showcase" className="mt-2 text-balance text-2xl font-semibold">
            Base primitives
          </h2>
          <p className="mt-1.5 max-w-[60ch] text-pretty text-sm text-muted-foreground">
            Try every package-backed primitive in place, or open its complete reference.
          </p>
        </div>
        <p className="font-mono text-xs text-muted-foreground tabular-nums">
          {BASE_PRIMITIVES.length} live previews
        </p>
      </div>

      <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,20rem),1fr))] gap-px bg-border p-px">
        {HOME_SHOWCASE_PRIMITIVES.map((primitive) => {
          const Preview = HOME_SHOWCASE_DEMOS[primitive.name];
          const labelId = `showcase-${primitive.name}`;

          return (
            <li
              key={primitive.name}
              className={cn(
                'grid min-h-80 min-w-0 grid-rows-[auto_minmax(0,1fr)] bg-background [contain-intrinsic-size:auto_20rem] [content-visibility:auto]',
                primitive.name === 'textarea' && 'sm:max-[860px]:col-span-2 lg:col-span-2',
              )}
              data-primitive={primitive.name}
              aria-labelledby={labelId}
            >
              <div className="min-w-0 px-3 pt-1.5">
                <Link
                  id={labelId}
                  href={`/blocks/ui/${primitive.name}`}
                  className="group inline-flex min-h-11 items-center gap-1.5 rounded-md px-2 text-sm font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {primitive.title}
                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-3.5 text-muted-foreground group-hover:text-foreground"
                  />
                  <span className="sr-only"> documentation</span>
                </Link>
              </div>
              <div className="flex min-h-60 min-w-0 items-center justify-center p-6">
                <Preview />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

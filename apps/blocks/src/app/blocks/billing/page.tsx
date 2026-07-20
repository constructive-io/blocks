import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRightIcon } from 'lucide-react';

import { BILLING_BLOCKS } from '@/lib/billing-blocks';
import { OG_IMAGE, withBase } from '@/lib/site';
import { cn } from '@/lib/utils';

const TITLE = 'Billing blocks';
const DESCRIPTION =
  'Polished customer billing surfaces for plans, subscriptions, entitlements, usage, credits, and account activity.';

export default function BillingBlocksPage() {
  return (
    <article className="registry-page">
      <header className="mb-8 max-w-2xl">
        <p className="registry-eyebrow">Blocks</p>
        <h1 className="mt-2 text-balance text-[22px] font-semibold tracking-tight sm:text-[1.75rem]">
          Billing
        </h1>
        <p className="mt-2 text-pretty text-sm leading-7 text-muted-foreground sm:text-[15px]">
          {DESCRIPTION} Start with a focused block or compose them into a
          settings destination.
        </p>
        <p className="mt-3 font-mono text-xs text-muted-foreground tabular-nums">
          {BILLING_BLOCKS.length} blocks
        </p>
      </header>

      <section aria-labelledby="billing-catalog-heading">
        <h2 className="sr-only" id="billing-catalog-heading">
          Billing blocks
        </h2>

        <ul className="grid gap-2 sm:grid-cols-2">
          {BILLING_BLOCKS.map((block) => (
            <li key={block.name} className="min-w-0">
              <Link
                href={`/blocks/billing/${block.name}`}
                className={cn(
                  'group flex h-full min-h-20 flex-col rounded-xl border border-border/60 bg-card px-4 py-3.5',
                  'outline-none transition-[background-color,border-color,box-shadow] duration-150 ease-out',
                  'hover:border-border hover:bg-accent/40 hover:shadow-card',
                  'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                )}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0 text-sm font-medium text-foreground">
                    {block.title}
                  </span>
                  <ArrowUpRightIcon
                    aria-hidden="true"
                    className="mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
                  />
                </span>
                <span className="mt-1 line-clamp-2 text-pretty text-xs leading-5 text-muted-foreground">
                  {block.description}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: withBase('/blocks/billing') },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: withBase('/blocks/billing'),
    images: [OG_IMAGE]
  }
};

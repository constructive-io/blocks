import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRightIcon } from 'lucide-react';

import { ACCOUNT_BLOCKS } from '@/lib/account-blocks';
import { OG_IMAGE, withBase } from '@/lib/site';
import { cn } from '@/lib/utils';

const TITLE = 'Account blocks';
const DESCRIPTION =
  'Settings surfaces for the signed-in account, with host-owned adapters for every request.';

export default function AccountBlocksPage() {
  return (
    <article className="registry-page">
      <header className="mb-8 max-w-2xl">
        <p className="registry-eyebrow">Blocks</p>
        <h1 className="mt-2 text-balance text-[22px] font-semibold tracking-tight sm:text-[1.75rem]">Account</h1>
        <p className="mt-2 text-pretty text-sm leading-7 text-muted-foreground sm:text-[15px]">{DESCRIPTION}</p>
        <p className="mt-3 font-mono text-xs text-muted-foreground tabular-nums">
          {ACCOUNT_BLOCKS.length} {ACCOUNT_BLOCKS.length === 1 ? 'block' : 'blocks'}
        </p>
      </header>

      <section aria-labelledby="account-catalog-heading">
        <h2 className="sr-only" id="account-catalog-heading">
          Account blocks
        </h2>

        <ul className="grid gap-2 sm:grid-cols-2">
          {ACCOUNT_BLOCKS.map((block) => (
            <li key={block.name} className="min-w-0">
              <Link
                href={`/blocks/account/${block.name}`}
                className={cn(
                  'group flex h-full min-h-20 flex-col rounded-xl border border-border bg-card px-4 py-3.5',
                  'outline-none transition-[box-shadow] duration-(--duration-moderate) ease-out',
                  'hover:bg-accent/40',
                  'focus-visible:ring-[3px] focus-visible:ring-ring/50',
                )}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0 text-sm font-medium text-foreground">{block.title}</span>
                  <ArrowUpRightIcon
                    aria-hidden="true"
                    className="mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity duration-(--duration-moderate) group-hover:opacity-100 group-focus-visible:opacity-100"
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
  alternates: { canonical: withBase('/blocks/account') },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: withBase('/blocks/account'),
    images: [OG_IMAGE],
  },
};

import { ArrowRight, LayoutGrid } from 'lucide-react';

import { proseCls } from '@/components/docs/prose';
import { SiteButton } from '@/components/docs/site-button';
import { cn } from '@/lib/utils';

/**
 * 404 — rendered inside the global Shell (root layout wraps every route), so the
 * sidebar brand and right panel are already present. This is just the centered
 * content message on the redesign primitives (DESIGN.md §4.4 / §8): no eyebrow,
 * no topbar/backdrop, 22-28px title + 14px prose, SiteButton actions.
 */
export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-[760px] flex-col items-center justify-center gap-6 px-6 py-20 text-center">
      <div className="flex flex-col items-center gap-3">
        <h1 className="text-h1 text-balance text-foreground max-sm:text-[1.375rem]">Block not found</h1>
        <p className={cn(proseCls, 'max-w-[46ch]')}>
          That block isn&apos;t in the catalog. It may have been renamed, removed, or the URL is incorrect.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <SiteButton href="/blocks" variant="primary" size="md">
          <LayoutGrid />
          Browse the catalog
        </SiteButton>
        <SiteButton href="/" variant="tertiary" size="md">
          Home
          <ArrowRight />
        </SiteButton>
      </div>

      <p className="font-mono text-[12px] text-muted-foreground">
        HTTP 404 <span aria-hidden>·</span> Not Found
      </p>
    </div>
  );
}

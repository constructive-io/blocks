'use client';

/**
 * Landing (`/`) — the showcase (DESIGN.md §4.2). You land on the product: an intro
 * block, then the GridMotion wall — a rotated, pointer-driven field of LIVE demos
 * — then one quiet footer line. No hero theater, no marketing sections. Renders
 * inside the global shell (sidebar visible, "Showcase" active) — page 0 of the
 * nav chain.
 */

import dynamic from 'next/dynamic';
import { ArrowRight } from 'lucide-react';

import { SiteButton } from '@/components/docs/site-button';
import { publishedBlockCount, uiCount } from '@/lib/blocks';

// Client-only live wall — it carries the whole demo registry, and the demos
// render non-deterministically between the server and first client paint
// (TanStack Query + mock adapter + `useId`), so it is gated out of BOTH the
// SSR and hydration passes. The skeleton holds the section's size meanwhile.
const GridMotionWall = dynamic(() => import('@/components/landing/grid-motion').then((m) => m.GridMotionWall), {
  ssr: false,
  loading: () => <div aria-hidden className="h-full w-full bg-surface-2" />,
});

export default function HomePage() {
  return (
    <div>
      {/* Intro block. The shell's mobile header owns its top inset. */}
      <div className="mx-auto w-full max-w-[680px] px-6 pb-10 pt-20 sm:pt-28">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-h1 text-balance text-foreground max-sm:text-[1.375rem]">Constructive Blocks</h1>
            <p className="text-pretty text-[14px] text-muted-foreground">
              Full-stack auth, org and admin blocks for the Constructive platform — install with shadcn.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <SiteButton href="/blocks/getting-started" variant="primary" size="sm">
                Get started
              </SiteButton>
              <SiteButton href="/blocks" variant="tertiary" size="sm">
                Browse docs
              </SiteButton>
            </div>
          </div>

          {/* Pager — the landing is page 0: prev disabled, next → Introduction. */}
          <div className="flex shrink-0 items-center gap-1">
            <SiteButton variant="ghost" size="icon" disabled aria-label="No previous page">
              <ArrowRight className="rotate-180" />
            </SiteButton>
            <SiteButton href="/blocks" variant="ghost" size="icon" aria-label="Next: Introduction">
              <ArrowRight />
            </SiteButton>
          </div>
        </div>
      </div>

      {/* The showcase wall — a rotated, pointer-driven field of live demos
          (GridMotion), presented as an ELEVATED SLAB: its own surface +
          hairline + ladder shadow, so the clipped edges read as a card
          boundary instead of a raw cut. Decorative (inert). */}
      <div className="mx-4 sm:mx-6">
        <div className="relative mx-auto h-[72vh] min-h-[480px] max-w-[1600px] overflow-hidden rounded-xl border border-border/60 bg-surface-2 shadow-surface-4">
          <GridMotionWall />
        </div>
      </div>

      {/* Quiet footer — one line. */}
      <footer className="mx-auto w-full max-w-[1200px] px-6 pb-10 pt-6">
        <p className="text-pretty text-[12px] tabular-nums text-muted-foreground">
          v0.1.0 <span aria-hidden>·</span> {publishedBlockCount} blocks <span aria-hidden>·</span> {uiCount} ui
          components <span aria-hidden>·</span>{' '}
          <a
            href="https://github.com/constructive-io"
            target="_blank"
            rel="noreferrer"
            className="underline-offset-2 transition-colors hover:text-foreground hover:underline"
          >
            GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}

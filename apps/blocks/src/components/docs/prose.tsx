/**
 * Shared docs prose primitives — the single source of truth for hand-authored
 * guide and explanation copy under `/blocks/(guides)`. Every Tutorial, How-to,
 * and Concept page composes these so the calm reading surface is identical
 * everywhere instead of ~25 near-duplicate local copies.
 *
 * Canonical sizes (one decision, applied site-wide, DESIGN.md §4.4):
 *   - body prose       → text-[14px] leading-relaxed text-foreground/90  (proseCls / Prose)
 *   - inline code      → font-mono text-[12px]                           (InlineCode)
 *   - in-sentence link → calm underline, body-color (not accent)         (linkCls / DocLink)
 *
 * Standalone nav / TOC / breadcrumb links are intentionally NOT underlined and
 * must NOT use `linkCls`/`DocLink` — only in-sentence prose links do.
 *
 * Docs harness only — never imported by block source.
 */

import { Check } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** Canonical body-copy classes for guide / explanation prose (FF body: 90% foreground, not muted). */
export const proseCls = 'text-[14px] leading-relaxed text-pretty text-foreground/90';

/** Canonical in-sentence prose link — calm body-color underline that strengthens on hover (not accent-colored). */
export const linkCls =
  'underline decoration-foreground/50 underline-offset-2 transition-colors duration-[var(--dur-fast)] hover:decoration-foreground';

/** Essay reading column — capped measure + vertical rhythm at the canonical body size. */
export function Prose({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('max-w-[68ch] space-y-4', proseCls, className)}>{children}</div>;
}

/** Inline mono token — calm muted fill, foreground ink, fixed 12px (DESIGN.md §4.4). */
export function InlineCode({ children }: { children: ReactNode }) {
  return <code className="rounded bg-muted px-1 py-0.5 font-mono text-[12px] text-foreground">{children}</code>;
}

/** In-sentence link to another doc page. Standalone nav/TOC/breadcrumb links are exempt — see header. */
export function DocLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={linkCls}>
      {children}
    </Link>
  );
}

/** Calm end-state callout for how-to pages — mirrors the status-callout chrome used elsewhere. */
export function ResultCallout({ children }: { children: ReactNode }) {
  return (
    <div className="not-prose flex items-start gap-2.5 rounded-lg border border-border/60 bg-surface-2/40 px-3 py-2.5">
      <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-primary" />
      <p className="text-pretty text-[13px] text-muted-foreground">
        <span className="font-medium text-foreground">Result. </span>
        {children}
      </p>
    </div>
  );
}

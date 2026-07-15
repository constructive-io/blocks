/**
 * BlockStatusHeader
 *
 * Server Component. Renders a structured metadata strip at the top of every
 * leaner (non-showcased) block page body — the reference route mounts it just
 * under the DocPage header.
 *
 * Visual anatomy (top-to-bottom, DESIGN.md §4.3):
 *   1. Status row — dot StatusBadge (color from status) + a one-line blurb.
 *      Non-ready statuses add a plain `bg-muted` callout explaining what a
 *      consumer can do today (no warning-tinted borders).
 *   2. Meta row — mono chips on `bg-muted`: category label, block type (if any),
 *      slug.
 *   3. Install row — shown only when published; the pm-aware InstallField, so
 *      lean pages match showcased ones. Not shown when unpublished / no registry
 *      name.
 *
 * Returns null (renders nothing) when slug is not found in manifest.
 * Never throws. Server Component — no 'use client'.
 *
 * Docs harness only — never imported by block source.
 */

import { InstallField } from '@/components/docs/install-field';
import { StatusBadge } from '@/components/docs/status-badge';
import { CATEGORY_LABEL, STATUS_META, getBlock, type BlockStatus } from '@/lib/blocks';

// Public-facing copy: say what the consumer can do today, not the internal
// reason. Schema/view/roadmap details never ship on the docs site.
const CALLOUT_TEXT: Record<Exclude<BlockStatus, 'ready'>, string> = {
  'backend-pending':
    'The UI is complete and installable today. Its backend operations are not yet available — wire the onSubmit-style override props to your own endpoint, or wait for backend availability.',
  'api-config-pending':
    'This list surface has no generated query hook yet, so it cannot self-fetch. Pass the data in via props; the actions it renders work normally.',
  planned:
    'Design preview. The interface is still being finalized — props and behavior may change before this block is wired to a backend.',
};

// Mono metadata chip — bg-muted, no border (DESIGN.md §4.3 item 2).
const chipClass = 'rounded-lg bg-muted px-1.5 py-0.5 font-mono text-[12px] text-muted-foreground';

export function BlockStatusHeader({ slug }: { slug: string }): React.ReactElement | null {
  const block = getBlock(slug);
  if (!block) return null;

  const meta = STATUS_META[block.status];

  return (
    <div className="not-prose flex flex-col gap-3">
      {/* ── 1. Status row ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2.5">
        <StatusBadge status={block.status} />
        <span className="text-[13px] text-pretty text-muted-foreground">{meta.blurb}</span>
      </div>

      {/* Non-ready callout — plain bg-muted panel, no tinted border */}
      {block.status !== 'ready' ? (
        <div className="rounded-xl border border-border/60 bg-muted p-3 text-[13px] leading-relaxed text-foreground">
          {CALLOUT_TEXT[block.status as Exclude<BlockStatus, 'ready'>]}
        </div>
      ) : null}

      {/* ── 2. Meta row ───────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={chipClass}>{CATEGORY_LABEL[block.category]}</span>
        {block.type ? <span className={chipClass}>{block.type}</span> : null}
        <span className={chipClass}>{block.slug}</span>
      </div>

      {/* ── 3. Install row — only when published; pm-aware InstallField ── */}
      {block.published && block.registryName ? <InstallField url={block.registryName} /> : null}
    </div>
  );
}

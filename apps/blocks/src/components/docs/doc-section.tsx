/**
 * DocSection — one titled block of a doc page (DESIGN.md §4.3 / §7.2).
 *
 *   `flex flex-col gap-3`: an <h2> (16px semibold, leading-none, anchored) +
 *   an optional 13px muted intro + children.
 *
 * The <h2> carries a stable slugified `id` so deep links resolve; `scroll-mt-8`
 * gives the anchor a little breathing room from the top of the viewport. Server
 * component (no interactivity).
 *
 * Docs harness only — never imported by block source.
 */

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/** Lowercase, hyphenated, anchor-safe id from a heading string. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export interface DocSectionProps {
  title: string;
  /** Override the derived anchor id (defaults to `slugify(title)`). */
  id?: string;
  /** 13px muted lead under the heading. */
  intro?: string;
  children?: ReactNode;
  className?: string;
}

export function DocSection({ title, id, intro, children, className }: DocSectionProps) {
  const anchor = id ?? slugify(title);
  return (
    <section className={cn('flex flex-col gap-3', className)}>
      <h2 id={anchor} className="text-h2 scroll-mt-8 text-balance text-foreground">
        {title}
      </h2>
      {intro ? <p className="text-[13px] text-pretty text-muted-foreground">{intro}</p> : null}
      {children}
    </section>
  );
}

export default DocSection;

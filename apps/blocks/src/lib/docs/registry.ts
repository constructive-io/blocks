// registry — the read API over the generated `registry-data` module.
//
//   getPage(slug)     → the DocPageData for an exact route slug (or undefined)
//   getAllSlugs()     → every reference slug, for `generateStaticParams()`
//   getAdjacent(href) → prev/next over the FULL sidebar order (guides + reference)
//
// `getAllSlugs()` returns reference (block/ui/flow) slugs ONLY — the hand-authored
// guides under `(guides)/` own their own static routes, so the catch-all must not
// also enumerate them. `getAdjacent()`, by contrast, walks the merged sidebar
// chain (`NAV_GROUPS`, which already includes the guides) so prev/next links flow
// seamlessly across guides and reference pages.

import registry, { type DocPageData } from './registry-data';
import { NAV_GROUPS } from './nav';

const pages = registry.pages;
const PAGE_BY_SLUG = new Map<string, DocPageData>(pages.map((p) => [p.slug, p]));

/** The DocPageData for an exact route slug (the path after `/blocks/`). */
export function getPage(slug: string): DocPageData | undefined {
  return PAGE_BY_SLUG.get(slug);
}

/** Every reference slug — feeds `generateStaticParams()` for the `[...slug]` route. */
export function getAllSlugs(): string[] {
  return pages.map((p) => p.slug);
}

export interface AdjacentLink {
  title: string;
  href: string;
}

export interface Adjacent {
  prev?: AdjacentLink;
  next?: AdjacentLink;
}

// Flattened sidebar reading order — descends into domain sub-groups so nested
// items (auth, org) stay in the chain. The "Showcase" item points at the
// marketing landing (`/`), which is not part of the doc prev/next chain — drop
// it so the chain starts at "Introduction".
const ORDER: AdjacentLink[] = NAV_GROUPS.flatMap((g) => [
  ...g.items,
  ...(g.subgroups ?? []).flatMap((sg) => sg.items),
])
  .filter((i) => i.href !== '/')
  .map((i) => ({ title: i.title, href: i.href }));

/**
 * Prev/next neighbours for a page, keyed on its href (`/blocks/...`). Works for
 * both reference pages (catch-all) and hand-authored guides, since both live in
 * the same `NAV_GROUPS` order. Returns `{}` for hrefs not in the sidebar.
 */
export function getAdjacent(href: string): Adjacent {
  const i = ORDER.findIndex((x) => x.href === href);
  if (i === -1) return {};
  return {
    prev: i > 0 ? ORDER[i - 1] : undefined,
    next: i < ORDER.length - 1 ? ORDER[i + 1] : undefined,
  };
}

export type { DocPageData };

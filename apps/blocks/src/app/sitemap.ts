import type { MetadataRoute } from 'next';

import { SITE_ORIGIN, withBase } from '@/lib/site';
import { GUIDES } from '@/lib/docs/guides-meta';
import { getAllSlugs } from '@/lib/docs/registry';

export const dynamic = 'force-static';

const abs = (path: string) => `${SITE_ORIGIN}${withBase(path)}`;

/**
 * Static sitemap: the landing page, the docs Introduction (`/blocks`), every
 * hand-authored Diátaxis guide (the getting-started tutorial plus the how-to and
 * concept pages), and every generated reference page (`/blocks/<slug>` from the
 * data registry). Keyed by absolute URL so duplicates collapse.
 *
 * No `lastModified`: no stable per-page date is available, so we omit it to keep
 * the output deterministic across builds.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const byUrl = new Map<string, MetadataRoute.Sitemap[number]>();

  byUrl.set(abs('/'), { url: abs('/'), priority: 1 });
  byUrl.set(abs('/blocks'), { url: abs('/blocks'), priority: 0.9 });
  byUrl.set(abs('/blocks/getting-started'), { url: abs('/blocks/getting-started'), priority: 0.7 });

  // Hand-authored guides (tutorial / how-to / explanation). Every href starts
  // with `/blocks`; the getting-started overlap collapses via the Map.
  for (const { href } of GUIDES) {
    if (!href.startsWith('/blocks')) continue;
    byUrl.set(abs(href), { url: abs(href), priority: 0.7 });
  }

  // Generated reference pages (blocks / ui / flows).
  for (const slug of getAllSlugs()) {
    const url = abs(`/blocks/${slug}`);
    byUrl.set(url, { url, priority: 0.5 });
  }

  return [...byUrl.values()];
}

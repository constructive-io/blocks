import type { MetadataRoute } from 'next';

import { BASE_PRIMITIVES } from '@/lib/base-primitives';
import { BILLING_BLOCKS } from '@/lib/billing-blocks';
import { FEATURE_PACK_DOCS } from '@/lib/feature-packs';
import { BASE_PATH, SITE_ORIGIN, withBase } from '@/lib/site';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    '/',
    '/blocks',
    '/blocks/styling',
    '/blocks/features',
    ...FEATURE_PACK_DOCS.map(({ id }) => `/blocks/features/${id}`),
    '/blocks/console-kit',
    ...BASE_PRIMITIVES.map(({ name }) => `/blocks/ui/${name}`),
    '/blocks/billing',
    ...BILLING_BLOCKS.map(({ name }) => `/blocks/billing/${name}`),
  ];
  const trailingSlash = BASE_PATH ? '/' : '';

  return paths.map((path) => ({
    url: `${SITE_ORIGIN}${withBase(path)}${trailingSlash}`,
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority:
      path === '/'
        ? 1
        : path === '/blocks' ||
            path === '/blocks/styling' ||
            path === '/blocks/features' ||
            path === '/blocks/console-kit' ||
            path === '/blocks/billing'
          ? 0.9
          : 0.7,
  }));
}

import type { MetadataRoute } from 'next';

import { BASE_PRIMITIVES } from '@/lib/base-primitives';
import { BASE_PATH, SITE_ORIGIN, withBase } from '@/lib/site';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    '/',
    '/blocks',
    '/blocks/styling',
    ...BASE_PRIMITIVES.map(({ name }) => `/blocks/ui/${name}`),
  ];
  const trailingSlash = BASE_PATH ? '/' : '';

  return paths.map((path) => ({
    url: `${SITE_ORIGIN}${withBase(path)}${trailingSlash}`,
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : path === '/blocks' || path === '/blocks/styling' ? 0.9 : 0.7,
  }));
}

import { DOC_SECTION_LIST } from '@/lib/doc-sections';
import type { MetadataRoute } from 'next';

import { ACCOUNT_BLOCKS } from '@/lib/account-blocks';
import { AI_COMPONENTS } from '@/lib/ai-components';
import { APPLICATION_BLOCKS, applicationBlockHref } from '@/lib/application-blocks';
import { BASE_PRIMITIVES } from '@/lib/base-primitives';
import { FEATURE_PACK_DOCS } from '@/lib/feature-packs';
import { BASE_PATH, SITE_ORIGIN, withBase } from '@/lib/site';
import { SOURCE_BLOCKS } from '@/lib/source-blocks';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    '/',
    '/blocks',
    '/blocks/styling',
    '/blocks/create',
    '/blocks/features',
    ...FEATURE_PACK_DOCS.map(({ id }) => `/blocks/features/${id}`),
    '/blocks/command-palette',
    '/blocks/ai',
    ...AI_COMPONENTS.map(({ name }) => `/blocks/ai/${name}`),
    ...SOURCE_BLOCKS.map(({ name }) => `/blocks/${name}`),
    ...APPLICATION_BLOCKS.map(applicationBlockHref),
    ...DOC_SECTION_LIST.map(({ hub }) => hub),
    '/blocks/console-kit',
    '/blocks/documents',
    ...BASE_PRIMITIVES.map(({ name }) => `/blocks/ui/${name}`),
    '/blocks/account',
    ...ACCOUNT_BLOCKS.map(({ name }) => `/blocks/account/${name}`),
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
            path === '/blocks/create' ||
            path === '/blocks/features' ||
            path === '/blocks/command-palette' ||
            path === '/blocks/ai' ||
            SOURCE_BLOCKS.some(({ name }) => path === `/blocks/${name}`) ||
            path === '/blocks/console-kit' ||
            path === '/blocks/documents' ||
            path === '/blocks/account' ||
            DOC_SECTION_LIST.some(({ hub }) => path === hub)
          ? 0.9
          : 0.7,
  }));
}

import type { MetadataRoute } from 'next';

import { SITE_ORIGIN, withBase } from '@/lib/site';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${SITE_ORIGIN}${withBase('/sitemap.xml')}`,
  };
}

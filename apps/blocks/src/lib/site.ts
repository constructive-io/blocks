const isPages = process.env.BLOCKS_PAGES === '1';

export const SITE_NAME = 'Constructive UI';
export const SITE_ORIGIN = isPages ? 'https://constructive-io.github.io' : 'http://localhost:3005';
export const BASE_PATH = isPages ? '/blocks' : '';

/**
 * Site-absolute path including the deploy basePath (for canonical/og/sitemap
 * URLs).
 *
 * Next's `metadataBase` only carries the origin (a basePath segment in it does
 * NOT join reliably — `new URL('/blocks', 'https://host/blocks')` drops
 * `/blocks`), so every canonical/og/sitemap URL must carry the basePath
 * explicitly. This is the single place that does it.
 *
 * Examples (Pages):  withBase('/') -> '/blocks'   withBase('/blocks') -> '/blocks/blocks'
 * Examples (local):  withBase('/') -> '/'            withBase('/blocks') -> '/blocks'
 */
export function withBase(path: string): string {
  if (path === '/') return BASE_PATH || '/';
  return `${BASE_PATH}${path}`;
}

/**
 * The social card, declared explicitly against the `/opengraph-image.png`
 * route (NOT the `opengraph-image.tsx` file convention: its auto-injected URL
 * omits the basePath — the exact footgun documented above — and 404s on
 * GitHub Pages). Next merges metadata shallowly, so any page that defines its
 * own `openGraph` replaces the root's wholesale and must include this in
 * `images` itself.
 */
export const OG_IMAGE = {
  url: withBase('/opengraph-image.png'),
  width: 1200,
  height: 630,
  type: 'image/png',
  alt: 'Constructive UI — base React primitives for npm and shadcn.',
};

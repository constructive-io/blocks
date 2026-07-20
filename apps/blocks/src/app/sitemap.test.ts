import { describe, expect, it } from 'vitest';

import { BASE_PRIMITIVES } from '@/lib/base-primitives';

import sitemap from './sitemap';

describe('sitemap', () => {
  it('contains landing, setup, styling, and base primitive pages', () => {
    const entries = sitemap();
    expect(entries).toHaveLength(BASE_PRIMITIVES.length + 3);
    expect(entries.map(({ url }) => url)).toEqual([
      'http://localhost:3005/',
      'http://localhost:3005/blocks',
      'http://localhost:3005/blocks/styling',
      ...BASE_PRIMITIVES.map(({ name }) => `http://localhost:3005/blocks/ui/${name}`),
    ]);
  });
});

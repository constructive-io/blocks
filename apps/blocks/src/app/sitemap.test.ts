import { describe, expect, it } from 'vitest';

import { BASE_PRIMITIVES } from '@/lib/base-primitives';

import sitemap from './sitemap';

describe('sitemap', () => {
  it('contains only the landing, setup, and base primitive pages', () => {
    const entries = sitemap();
    expect(entries).toHaveLength(BASE_PRIMITIVES.length + 2);
    expect(entries.map(({ url }) => url)).toEqual([
      'http://localhost:3005/',
      'http://localhost:3005/blocks',
      ...BASE_PRIMITIVES.map(({ name }) => `http://localhost:3005/blocks/ui/${name}`),
    ]);
  });
});

import { describe, expect, it } from 'vitest';

import { BASE_PRIMITIVES } from '@/lib/base-primitives';
import { BILLING_BLOCKS } from '@/lib/billing-blocks';

import sitemap from './sitemap';

describe('sitemap', () => {
  it('contains foundations, application docs, 29 primitives, and the complete billing catalog', () => {
    const entries = sitemap();
    expect(BASE_PRIMITIVES).toHaveLength(29);
    expect(entries).toHaveLength(
      BASE_PRIMITIVES.length + BILLING_BLOCKS.length + 6
    );
    expect(entries.map(({ url }) => url)).toEqual([
      'http://localhost:3005/',
      'http://localhost:3005/blocks',
      'http://localhost:3005/blocks/styling',
      'http://localhost:3005/blocks/features',
      'http://localhost:3005/blocks/console-kit',
      ...BASE_PRIMITIVES.map(({ name }) => `http://localhost:3005/blocks/ui/${name}`),
      'http://localhost:3005/blocks/billing',
      ...BILLING_BLOCKS.map(
        ({ name }) => `http://localhost:3005/blocks/billing/${name}`
      ),
    ]);
  });
});

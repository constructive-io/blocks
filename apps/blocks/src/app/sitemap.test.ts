import { describe, expect, it } from 'vitest';

import { AI_COMPONENTS } from '@/lib/ai-components';
import { APPLICATION_BLOCKS } from '@/lib/application-blocks';
import { BASE_PRIMITIVES } from '@/lib/base-primitives';
import { BILLING_BLOCKS } from '@/lib/billing-blocks';
import { FEATURE_PACK_DOCS } from '@/lib/feature-packs';
import { SOURCE_BLOCKS } from '@/lib/source-blocks';

import sitemap from './sitemap';

describe('sitemap', () => {
  it('contains foundations, application blocks, seven feature packs, 30 primitives, AI catalog, and the complete billing catalog', () => {
    const entries = sitemap();
    expect(BASE_PRIMITIVES).toHaveLength(30);
    expect(entries).toHaveLength(
      BASE_PRIMITIVES.length +
        FEATURE_PACK_DOCS.length +
        BILLING_BLOCKS.length +
        APPLICATION_BLOCKS.length +
        SOURCE_BLOCKS.length +
        AI_COMPONENTS.length +
        8,
    );
    expect(entries.map(({ url }) => url)).toEqual([
      'http://localhost:3005/',
      'http://localhost:3005/blocks',
      'http://localhost:3005/blocks/styling',
      'http://localhost:3005/blocks/features',
      ...FEATURE_PACK_DOCS.map(({ id }) => `http://localhost:3005/blocks/features/${id}`),
      'http://localhost:3005/blocks/command-palette',
      'http://localhost:3005/blocks/ai',
      ...AI_COMPONENTS.map(({ name }) => `http://localhost:3005/blocks/ai/${name}`),
      ...SOURCE_BLOCKS.map(({ name }) => `http://localhost:3005/blocks/${name}`),
      ...APPLICATION_BLOCKS.map(({ name }) => `http://localhost:3005/blocks/${name}`),
      'http://localhost:3005/blocks/console-kit',
      ...BASE_PRIMITIVES.map(({ name }) => `http://localhost:3005/blocks/ui/${name}`),
      'http://localhost:3005/blocks/billing',
      ...BILLING_BLOCKS.map(({ name }) => `http://localhost:3005/blocks/billing/${name}`),
    ]);
  });
});

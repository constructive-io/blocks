/**
 * ui-parity — the completeness gate for the ui docs category.
 *
 * The ui category is DERIVED: packages/ui/registry.json is the item list,
 * scripts/ui-content/ the prose/tier SOT, showcase-ui.tsx the demo registry,
 * and the manifest the runtime view. This test pins all four together so a
 * new packages/ui component (or a stray demo/content key) fails CI instead of
 * silently shipping an undocumented registry item.
 */

import { describe, expect, it } from 'vitest';

import { blocks, uiFamilies, uiItems } from '@/lib/blocks';
import { UI_DEMOS } from '@/components/docs/showcase-ui';

// Outside src/ on purpose: the generators own these inputs.
import uiRegistry from '../../../../../../packages/ui/registry.json';
import { UI_CONTENT, UI_FAMILY_LABEL, UI_FAMILY_ORDER } from '../../../../scripts/ui-content/index.mjs';

const registryNames = (uiRegistry.items ?? []).map((item: { name: string }) => item.name).sort();
const manifestNames = uiItems.map((i) => i.name).sort();
const contentNames = Object.keys(UI_CONTENT as Record<string, unknown>).sort();
const showcaseSlugs = uiItems.filter((i) => i.tier === 'showcase').map((i) => i.slug);

describe('ui docs parity', () => {
  it('documents every packages/ui registry item exactly once', () => {
    expect(manifestNames).toEqual(registryNames);
    expect(contentNames).toEqual(registryNames);
  });

  it('has authored prose for every item (no null stubs ship)', () => {
    const content = UI_CONTENT as Record<string, { intro: unknown; usage: unknown }>;
    const unauthored = registryNames.filter(
      (n) => typeof content[n].intro !== 'string' || typeof content[n].usage !== 'string',
    );
    expect(unauthored).toEqual([]);
  });

  it('registers a live demo for every showcase-tier item, and nothing else', () => {
    expect(Object.keys(UI_DEMOS).sort()).toEqual([...showcaseSlugs].sort());
  });

  it('uses valid tiers and families', () => {
    const familyKeys = uiFamilies.map((f) => f.key);
    for (const item of uiItems) {
      expect(['showcase', 'lean']).toContain(item.tier);
      expect(familyKeys).toContain(item.family);
    }
  });

  it('mirrors the family order/labels from ui-content into the manifest', () => {
    expect(uiFamilies.map((f) => f.key)).toEqual(UI_FAMILY_ORDER);
    for (const f of uiFamilies) {
      expect(f.label).toBe((UI_FAMILY_LABEL as Record<string, string>)[f.key]);
    }
  });

  it('cross-links only to blocks that exist', () => {
    const blockSlugs = new Set(blocks.map((b) => b.slug));
    for (const item of uiItems) {
      for (const slug of item.usedBy) {
        expect(blockSlugs.has(slug), `${item.name} usedBy '${slug}'`).toBe(true);
      }
    }
  });

  it('every ui item resolves to an @constructive registry name', () => {
    for (const item of uiItems) {
      expect(item.registryName).toBe(`@constructive/${item.name}`);
      expect(item.published).toBe(true);
    }
  });
});

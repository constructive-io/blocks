import { describe, expect, it } from 'vitest';

import { FEATURE_PACK_CATALOG, FEATURE_PACK_IDS, getFeaturePackManifest } from '@/feature-packs';

import { FEATURE_PACK_DOCS, getFeaturePackDoc, isFeaturePackDocId } from './feature-packs';

function endpointLabel(required: readonly string[], optional: readonly string[]) {
  return [...required, ...optional.map((endpoint) => `optional ${endpoint}`)].join(', ');
}

describe('feature-pack documentation catalog', () => {
  it('contains the seven unique feature packs in canonical dependency order', () => {
    expect(FEATURE_PACK_DOCS.map(({ id }) => id)).toEqual(FEATURE_PACK_IDS);
    expect(new Set(FEATURE_PACK_DOCS.map(({ id }) => id)).size).toBe(7);
  });

  it('keeps manifest summaries and registry names aligned', () => {
    for (const block of FEATURE_PACK_DOCS) {
      const manifest = getFeaturePackManifest(FEATURE_PACK_CATALOG, block.id)!;
      expect(block.registryName).toBe(`feature-pack-${block.id}`);
      expect(block.dependencies).toEqual(manifest.dependencies);
      expect(block.endpoints).toBe(endpointLabel(manifest.endpoints.required, manifest.endpoints.optional));
    }
  });

  it('provides complete billing-style editorial coverage for every root', () => {
    for (const block of FEATURE_PACK_DOCS) {
      expect(block.description.length).toBeGreaterThan(0);
      expect(block.resource.length).toBeGreaterThan(0);
      expect(block.whenToUse.length).toBeGreaterThanOrEqual(2);
      expect(block.usage.description.length).toBeGreaterThan(0);
      expect(block.usage.example).toContain(block.exportName);
      expect(block.usage.example).toContain(`@/blocks/feature-packs/${block.id}/${block.id}-feature-pack`);
      expect(block.state.description.length).toBeGreaterThan(0);
      expect(block.surfaces.length).toBeGreaterThan(0);
      expect(block.accessibility.length).toBeGreaterThan(0);
      expect(block.api.length).toBeGreaterThan(0);
    }
  });

  it('resolves only documented feature-pack ids', () => {
    expect(isFeaturePackDocId('organizations')).toBe(true);
    expect(getFeaturePackDoc('organizations')?.title).toBe('Organizations');
    expect(isFeaturePackDocId('analytics')).toBe(false);
    expect(getFeaturePackDoc('analytics')).toBeUndefined();
  });
});

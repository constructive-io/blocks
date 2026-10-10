import { describe, expect, it } from 'vitest';

import {
  FEATURE_PACK_MANIFESTS,
  PRESET_PROFILES,
  generateFeaturePackCatalog,
  validateFeaturePackCatalog,
  type FeaturePackManifestV1
} from './index';

describe('feature pack catalog validation', () => {
  it('rejects capabilities assigned to the wrong pack', () => {
    const data = structuredClone(
      FEATURE_PACK_MANIFESTS[0]
    ) as FeaturePackManifestV1;
    data.capabilities.required = ['auth.sessions'];
    const validation = validateFeaturePackCatalog({
      schemaVersion: 1,
      featurePacks: [data, ...FEATURE_PACK_MANIFESTS.slice(1)],
      presets: PRESET_PROFILES
    });

    expect(validation.valid).toBe(false);
    if (!validation.valid) {
      expect(validation.issues.some((issue) => issue.code === 'capability-owner-mismatch')).toBe(true);
    }
  });

  it('rejects profiles that omit a selected pack dependency', () => {
    const manifests = structuredClone(
      FEATURE_PACK_MANIFESTS
    ) as unknown as FeaturePackManifestV1[];
    const users = manifests.find((manifest) => manifest.id === 'users');
    if (!users) throw new Error('The App access feature pack is missing.');
    users.dependencies = ['auth'];
    const profiles = structuredClone(PRESET_PROFILES);
    profiles[0].featurePacks = ['users'];
    const validation = validateFeaturePackCatalog({
      schemaVersion: 1,
      featurePacks: manifests,
      presets: profiles
    });

    expect(validation.valid).toBe(false);
    if (!validation.valid) {
      expect(validation.issues.some((issue) => issue.code === 'preset-missing-dependency')).toBe(true);
    }
  });

  it('throws when generation receives an invalid catalog', () => {
    const duplicate = [
      FEATURE_PACK_MANIFESTS[0],
      FEATURE_PACK_MANIFESTS[0],
      ...FEATURE_PACK_MANIFESTS.slice(1)
    ];
    expect(() =>
      generateFeaturePackCatalog(duplicate, PRESET_PROFILES)
    ).toThrow(/declared more than once/);
  });
});

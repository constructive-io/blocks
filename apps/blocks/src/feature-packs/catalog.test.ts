import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  ATOMIC_CAPABILITY_IDS,
  FEATURE_PACK_CATALOG,
  FEATURE_PACK_IDS,
  FEATURE_PACK_MANIFESTS,
  PRESET_PROFILES,
  generateFeaturePackCatalog,
  getPresetFeaturePacks,
  validateFeaturePackCatalog,
  type FeaturePackManifestV1
} from './index';

function readSidecar(relativePath: string): unknown {
  return JSON.parse(
    readFileSync(new URL(relativePath, import.meta.url), 'utf8')
  );
}

describe('first-release feature pack catalog', () => {
  it('contains exactly the approved first-release pack IDs', () => {
    expect(FEATURE_PACK_CATALOG.featurePacks.map((pack) => pack.id)).toEqual(
      FEATURE_PACK_IDS
    );
    expect(new Set(ATOMIC_CAPABILITY_IDS).size).toBe(
      ATOMIC_CAPABILITY_IDS.length
    );
  });

  it('maps backend presets to the approved pack profiles', () => {
    expect(
      Object.fromEntries(
        PRESET_PROFILES.map((profile) => [
          profile.presetSlug,
          profile.featurePacks
        ])
      )
    ).toEqual({
      'auth:hardened': ['data', 'auth', 'users'],
      'b2b:storage': [
        'data',
        'auth',
        'users',
        'organizations',
        'storage'
      ],
      full: [
        'data',
        'auth',
        'users',
        'organizations',
        'storage',
        'billing',
        'notifications'
      ]
    });
    expect(PRESET_PROFILES.every((profile) => profile.stability === 'stable')).toBe(true);
  });

  it('keeps search, i18n, and realtime optional', () => {
    const data = FEATURE_PACK_MANIFESTS.find((pack) => pack.id === 'data');
    expect(data?.capabilities.optional).toEqual([
      'data.search',
      'data.i18n',
      'data.realtime'
    ]);
  });

  it('generates dependency-ordered manifests for each preset', () => {
    expect(
      getPresetFeaturePacks(FEATURE_PACK_CATALOG, 'b2b-storage').map(
        (pack) => pack.id
      )
    ).toEqual(['data', 'auth', 'users', 'organizations', 'storage']);
  });

  it('keeps installable JSON sidecars identical to the typed catalog', () => {
    for (const manifest of FEATURE_PACK_MANIFESTS) {
      expect(
        readSidecar(
          `../blocks/feature-packs/${manifest.id}/feature-pack.json`
        )
      ).toEqual(manifest);
    }

    for (const profile of PRESET_PROFILES) {
      expect(
        readSidecar(`../blocks/presets/${profile.id}.json`)
      ).toEqual(profile);
    }
  });
});

describe('feature pack catalog validation', () => {
  it('accepts the first-release catalog', () => {
    expect(
      validateFeaturePackCatalog({
        schemaVersion: 1,
        featurePacks: FEATURE_PACK_MANIFESTS,
        presets: PRESET_PROFILES
      }).valid
    ).toBe(true);
  });

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
    if (!users) throw new Error('The Users feature pack is missing.');
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

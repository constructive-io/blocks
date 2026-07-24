import { z } from 'zod';

import { CONSOLE_ENDPOINT_KINDS } from '../blocks/console-runtime/endpoints';

import { ATOMIC_CAPABILITY_IDS } from './capabilities';

export const FEATURE_PACK_MANIFEST_SCHEMA_VERSION = 1 as const;

export const FEATURE_PACK_IDS = [
  'data',
  'auth',
  'users',
  'organizations',
  'storage',
  'billing',
  'notifications'
] as const;

export type FeaturePackId = (typeof FEATURE_PACK_IDS)[number];

/** Declarative metadata vocabulary used by install-time feature-pack contracts. */
export const FEATURE_PACK_META_SECTIONS = [
  'tables',
  'fields',
  'constraints',
  'relations',
  'inflection',
  'query',
  'scope',
  'storage',
  'search',
  'i18n',
  'realtime',
  'encoding'
] as const;

export type FeaturePackMetaSection =
  (typeof FEATURE_PACK_META_SECTIONS)[number];

export const FEATURE_PACK_INTROSPECTION_SECTIONS = [
  'root-operations',
  'types',
  'input-objects',
  'enums',
  'directives'
] as const;

export type FeaturePackIntrospectionSection =
  (typeof FEATURE_PACK_INTROSPECTION_SECTIONS)[number];

export const PRESET_PROFILE_IDS = [
  'auth-hardened',
  'b2b-storage',
  'full'
] as const;

export type PresetProfileId = (typeof PRESET_PROFILE_IDS)[number];

export const featurePackManifestV1Schema = z
  .object({
    schemaVersion: z.literal(FEATURE_PACK_MANIFEST_SCHEMA_VERSION),
    id: z.enum(FEATURE_PACK_IDS),
    title: z.string().min(1),
    description: z.string().min(1),
    dependencies: z.array(z.enum(FEATURE_PACK_IDS)),
    endpoints: z
      .object({
        required: z.array(z.enum(CONSOLE_ENDPOINT_KINDS)),
        optional: z.array(z.enum(CONSOLE_ENDPOINT_KINDS)).default([])
      })
      .strict(),
    capabilities: z
      .object({
        required: z.array(z.enum(ATOMIC_CAPABILITY_IDS)),
        optional: z.array(z.enum(ATOMIC_CAPABILITY_IDS)).default([])
      })
      .strict(),
    metadata: z
      .object({
        requiredMetaSections: z.array(z.enum(FEATURE_PACK_META_SECTIONS)),
        optionalMetaSections: z.array(z.enum(FEATURE_PACK_META_SECTIONS)).default([]),
        requiredIntrospectionSections: z.array(
          z.enum(FEATURE_PACK_INTROSPECTION_SECTIONS)
        ),
        optionalIntrospectionSections: z
          .array(z.enum(FEATURE_PACK_INTROSPECTION_SECTIONS))
          .default([])
      })
      .strict()
  })
  .strict();

export type FeaturePackManifestV1 = z.infer<
  typeof featurePackManifestV1Schema
>;

export const presetProfileV1Schema = z
  .object({
    schemaVersion: z.literal(FEATURE_PACK_MANIFEST_SCHEMA_VERSION),
    id: z.enum(PRESET_PROFILE_IDS),
    presetSlug: z.enum(['auth:hardened', 'b2b:storage', 'full']),
    title: z.string().min(1),
    description: z.string().min(1),
    stability: z.literal('stable'),
    featurePacks: z.array(z.enum(FEATURE_PACK_IDS))
  })
  .strict();

export type PresetProfileV1 = z.infer<typeof presetProfileV1Schema>;

export const featurePackCatalogV1Schema = z
  .object({
    schemaVersion: z.literal(FEATURE_PACK_MANIFEST_SCHEMA_VERSION),
    featurePacks: z.array(featurePackManifestV1Schema),
    presets: z.array(presetProfileV1Schema)
  })
  .strict();

export type FeaturePackCatalogV1 = z.infer<typeof featurePackCatalogV1Schema>;

export function parseFeaturePackManifestV1(
  input: unknown
): FeaturePackManifestV1 {
  return featurePackManifestV1Schema.parse(input);
}

export function parsePresetProfileV1(input: unknown): PresetProfileV1 {
  return presetProfileV1Schema.parse(input);
}

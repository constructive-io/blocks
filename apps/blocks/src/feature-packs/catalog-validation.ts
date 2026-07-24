import {
  FEATURE_PACK_IDS,
  FEATURE_PACK_MANIFEST_SCHEMA_VERSION,
  PRESET_PROFILE_IDS,
  featurePackCatalogV1Schema,
  type FeaturePackCatalogV1,
  type FeaturePackId,
  type FeaturePackManifestV1,
  type PresetProfileId,
  type PresetProfileV1
} from './manifest';

export type FeaturePackCatalogIssue = {
  code:
    | 'invalid-schema'
    | 'duplicate-feature-pack'
    | 'duplicate-preset'
    | 'duplicate-list-entry'
    | 'self-dependency'
    | 'unknown-dependency'
    | 'dependency-cycle'
    | 'capability-owner-mismatch'
    | 'required-optional-overlap'
    | 'unknown-preset-feature-pack'
    | 'preset-missing-dependency';
  path: string;
  message: string;
};

export type FeaturePackCatalogValidation =
  | {
      valid: true;
      catalog: FeaturePackCatalogV1;
      issues: readonly [];
    }
  | {
      valid: false;
      issues: readonly FeaturePackCatalogIssue[];
    };

export class FeaturePackCatalogError extends Error {
  readonly issues: readonly FeaturePackCatalogIssue[];

  constructor(issues: readonly FeaturePackCatalogIssue[]) {
    super(issues.map((issue) => issue.message).join(' '));
    this.name = 'FeaturePackCatalogError';
    this.issues = issues;
  }
}

function duplicateValues<T>(values: readonly T[]): T[] {
  const seen = new Set<T>();
  const duplicates = new Set<T>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

function validateNoOverlap<T extends string>(
  required: readonly T[],
  optional: readonly T[],
  path: string,
  issues: FeaturePackCatalogIssue[]
) {
  const requiredValues = new Set(required);
  for (const value of optional) {
    if (!requiredValues.has(value)) continue;
    issues.push({
      code: 'required-optional-overlap',
      path,
      message: `${path} declares ${value} as both required and optional.`
    });
  }
}

function validateNoDuplicates<T extends string>(
  values: readonly T[],
  path: string,
  issues: FeaturePackCatalogIssue[]
) {
  for (const value of duplicateValues(values)) {
    issues.push({
      code: 'duplicate-list-entry',
      path,
      message: `${path} contains duplicate entry ${value}.`
    });
  }
}

function dependencyCycles(
  featurePacks: readonly FeaturePackManifestV1[]
): FeaturePackId[][] {
  const manifests = new Map(featurePacks.map((pack) => [pack.id, pack]));
  const visited = new Set<FeaturePackId>();
  const active = new Set<FeaturePackId>();
  const stack: FeaturePackId[] = [];
  const cycles: FeaturePackId[][] = [];

  function visit(id: FeaturePackId) {
    if (active.has(id)) {
      const start = stack.indexOf(id);
      cycles.push([...stack.slice(start), id]);
      return;
    }
    if (visited.has(id)) return;

    visited.add(id);
    active.add(id);
    stack.push(id);
    for (const dependency of manifests.get(id)?.dependencies ?? []) {
      if (manifests.has(dependency)) visit(dependency);
    }
    stack.pop();
    active.delete(id);
  }

  for (const pack of featurePacks) visit(pack.id);
  return cycles;
}

function semanticIssues(
  catalog: FeaturePackCatalogV1
): FeaturePackCatalogIssue[] {
  const issues: FeaturePackCatalogIssue[] = [];
  const featurePackIds = catalog.featurePacks.map((pack) => pack.id);
  const presetIds = catalog.presets.map((preset) => preset.id);
  const featurePackSet = new Set(featurePackIds);

  for (const id of duplicateValues(featurePackIds)) {
    issues.push({
      code: 'duplicate-feature-pack',
      path: 'featurePacks',
      message: `Feature pack ${id} is declared more than once.`
    });
  }
  for (const id of duplicateValues(presetIds)) {
    issues.push({
      code: 'duplicate-preset',
      path: 'presets',
      message: `Preset profile ${id} is declared more than once.`
    });
  }

  for (const [index, pack] of catalog.featurePacks.entries()) {
    const path = `featurePacks.${index}`;
    validateNoDuplicates(pack.dependencies, `${path}.dependencies`, issues);
    validateNoDuplicates(
      pack.endpoints.required,
      `${path}.endpoints.required`,
      issues
    );
    validateNoDuplicates(
      pack.endpoints.optional,
      `${path}.endpoints.optional`,
      issues
    );
    validateNoDuplicates(
      pack.capabilities.required,
      `${path}.capabilities.required`,
      issues
    );
    validateNoDuplicates(
      pack.capabilities.optional,
      `${path}.capabilities.optional`,
      issues
    );
    validateNoDuplicates(
      pack.metadata.requiredMetaSections,
      `${path}.metadata.requiredMetaSections`,
      issues
    );
    validateNoDuplicates(
      pack.metadata.optionalMetaSections,
      `${path}.metadata.optionalMetaSections`,
      issues
    );
    validateNoDuplicates(
      pack.metadata.requiredIntrospectionSections,
      `${path}.metadata.requiredIntrospectionSections`,
      issues
    );
    validateNoDuplicates(
      pack.metadata.optionalIntrospectionSections,
      `${path}.metadata.optionalIntrospectionSections`,
      issues
    );

    validateNoOverlap(
      pack.endpoints.required,
      pack.endpoints.optional,
      `${path}.endpoints`,
      issues
    );
    validateNoOverlap(
      pack.capabilities.required,
      pack.capabilities.optional,
      `${path}.capabilities`,
      issues
    );
    validateNoOverlap(
      pack.metadata.requiredMetaSections,
      pack.metadata.optionalMetaSections,
      `${path}.metadata.metaSections`,
      issues
    );
    validateNoOverlap(
      pack.metadata.requiredIntrospectionSections,
      pack.metadata.optionalIntrospectionSections,
      `${path}.metadata.introspectionSections`,
      issues
    );

    if (pack.dependencies.includes(pack.id)) {
      issues.push({
        code: 'self-dependency',
        path: `${path}.dependencies`,
        message: `Feature pack ${pack.id} cannot depend on itself.`
      });
    }
    for (const dependency of pack.dependencies) {
      if (featurePackSet.has(dependency)) continue;
      issues.push({
        code: 'unknown-dependency',
        path: `${path}.dependencies`,
        message: `Feature pack ${pack.id} depends on missing pack ${dependency}.`
      });
    }
    for (const capability of [
      ...pack.capabilities.required,
      ...pack.capabilities.optional
    ]) {
      if (capability.startsWith(`${pack.id}.`)) continue;
      issues.push({
        code: 'capability-owner-mismatch',
        path: `${path}.capabilities`,
        message: `Capability ${capability} is not owned by feature pack ${pack.id}.`
      });
    }
  }

  for (const cycle of dependencyCycles(catalog.featurePacks)) {
    issues.push({
      code: 'dependency-cycle',
      path: 'featurePacks',
      message: `Feature pack dependency cycle: ${cycle.join(' -> ')}.`
    });
  }

  const manifests = new Map(
    catalog.featurePacks.map((featurePack) => [featurePack.id, featurePack])
  );
  for (const [index, preset] of catalog.presets.entries()) {
    const path = `presets.${index}.featurePacks`;
    validateNoDuplicates(preset.featurePacks, path, issues);
    const selected = new Set(preset.featurePacks);
    for (const featurePackId of preset.featurePacks) {
      const manifest = manifests.get(featurePackId);
      if (!manifest) {
        issues.push({
          code: 'unknown-preset-feature-pack',
          path,
          message: `Preset ${preset.id} includes missing feature pack ${featurePackId}.`
        });
        continue;
      }
      for (const dependency of manifest.dependencies) {
        if (selected.has(dependency)) continue;
        issues.push({
          code: 'preset-missing-dependency',
          path,
          message: `Preset ${preset.id} includes ${featurePackId} without dependency ${dependency}.`
        });
      }
    }
  }

  return issues;
}

export function validateFeaturePackCatalog(
  input: unknown
): FeaturePackCatalogValidation {
  const parsed = featurePackCatalogV1Schema.safeParse(input);
  if (!parsed.success) {
    return {
      valid: false,
      issues: parsed.error.issues.map((issue) => ({
        code: 'invalid-schema',
        path: issue.path.map(String).join('.'),
        message: issue.message
      }))
    };
  }

  const issues = semanticIssues(parsed.data);
  if (issues.length > 0) return { valid: false, issues };
  return { valid: true, catalog: parsed.data, issues: [] };
}

function orderFeaturePacks(
  featurePacks: readonly FeaturePackManifestV1[]
): FeaturePackManifestV1[] {
  const manifests = new Map(featurePacks.map((pack) => [pack.id, pack]));
  const ordered: FeaturePackManifestV1[] = [];
  const visited = new Set<FeaturePackId>();

  function visit(id: FeaturePackId) {
    if (visited.has(id)) return;
    const manifest = manifests.get(id);
    if (!manifest) return;
    visited.add(id);
    for (const dependency of manifest.dependencies) visit(dependency);
    ordered.push(manifest);
  }

  for (const id of FEATURE_PACK_IDS) visit(id);
  return ordered;
}

export function generateFeaturePackCatalog(
  featurePacks: readonly FeaturePackManifestV1[],
  presets: readonly PresetProfileV1[]
): FeaturePackCatalogV1 {
  const candidate = {
    schemaVersion: FEATURE_PACK_MANIFEST_SCHEMA_VERSION,
    featurePacks: [...featurePacks],
    presets: [...presets]
  };
  const validation = validateFeaturePackCatalog(candidate);
  if (!validation.valid) throw new FeaturePackCatalogError(validation.issues);

  const presetOrder = new Map(
    PRESET_PROFILE_IDS.map((id, index) => [id, index])
  );
  return {
    schemaVersion: FEATURE_PACK_MANIFEST_SCHEMA_VERSION,
    featurePacks: orderFeaturePacks(validation.catalog.featurePacks),
    presets: [...validation.catalog.presets].sort(
      (left, right) =>
        (presetOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
        (presetOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER)
    )
  };
}

export function getFeaturePackManifest(
  catalog: FeaturePackCatalogV1,
  id: FeaturePackId
): FeaturePackManifestV1 | undefined {
  return catalog.featurePacks.find((featurePack) => featurePack.id === id);
}

export function getPresetProfile(
  catalog: FeaturePackCatalogV1,
  id: PresetProfileId
): PresetProfileV1 | undefined {
  return catalog.presets.find((preset) => preset.id === id);
}

export function getPresetFeaturePacks(
  catalog: FeaturePackCatalogV1,
  id: PresetProfileId
): FeaturePackManifestV1[] {
  const preset = getPresetProfile(catalog, id);
  if (!preset) return [];
  const selected = new Set(preset.featurePacks);
  return catalog.featurePacks.filter((featurePack) => selected.has(featurePack.id));
}

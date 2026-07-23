import {
  assessConsolePackCapability,
  createCheckingConsolePackCapability,
  createConsoleIdentityKey,
  getConsoleSessionIdentity,
  getConstructiveApiName,
  type ConsoleCapabilityEvidence,
  type ConsoleEndpointKind
} from '../../console-runtime';
import type {
  AtomicCapabilityId,
  FeaturePackIntrospectionSection,
  FeaturePackMetaSection,
  FeaturePackManifestV1
} from '../../../feature-packs';
import type {
  ConsoleKitAdapterContext,
  ConsoleKitMetadataState
} from '../console-kit-contracts';
import type { ConsoleKitStoreApi } from '../store';
import {
  hasSchemaFields,
  inspectConstructiveSchema,
  namedTypeName,
  type ConstructiveSchemaSnapshot
} from './constructive-graphql';

export type ConstructiveSchemaMap = Readonly<
  Partial<Record<ConsoleEndpointKind, ConstructiveSchemaSnapshot>>
>;

export type ConstructiveCapabilityDiscovery = Readonly<{
  ensure(runtime: ConsoleKitAdapterContext): Promise<ConstructiveSchemaMap>;
  getSchemas(): ConstructiveSchemaMap;
  subscribe(listener: () => void): () => void;
  invalidate(): void;
}>;

export type ConstructiveCapabilityRule = Readonly<{
  capability: AtomicCapabilityId;
  endpoint: ConsoleEndpointKind;
  operation: 'query' | 'mutation';
  fields: readonly string[];
}>;

export type ConstructiveCapabilityAssessmentContext = Readonly<{
  runtime: ConsoleKitAdapterContext;
  schemas: ConstructiveSchemaMap;
  metadataByEndpoint: ReadonlyMap<ConsoleEndpointKind, ConsoleKitMetadataState>;
}>;

export type ConstructiveCapabilityAssessment = Readonly<{
  endpoint: ConsoleEndpointKind;
  supportedCapabilities: readonly AtomicCapabilityId[];
  evidence: readonly ConsoleCapabilityEvidence[];
}>;

export type ConstructiveCapabilityContribution = Readonly<{
  rules?: readonly ConstructiveCapabilityRule[];
  assess?: (
    context: ConstructiveCapabilityAssessmentContext
  ) => ConstructiveCapabilityAssessment | null;
  unavailableReason?: string | ((
    context: ConstructiveCapabilityAssessmentContext
  ) => string);
}>;

export type ConstructiveCapabilityFeature = Readonly<{
  manifest: FeaturePackManifestV1;
  capabilityDiscovery?: ConstructiveCapabilityContribution;
}>;

const CURRENT_META_SECTIONS = new Set<FeaturePackMetaSection>([
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
]);

const CURRENT_INTROSPECTION_SECTIONS = new Set<
  FeaturePackIntrospectionSection
>([
  'root-operations',
  'types',
  'input-objects',
  'enums',
  'directives'
]);

export type ConstructiveMutationObjectInput = Readonly<{
  field: string;
  requiredFields: readonly string[];
}>;

/**
 * Confirms the generated mutation input accepts every field an adapter sends.
 * A mutation root alone is not enough: different presets can expose the root
 * while omitting optional modules and their nested input fields.
 */
export function supportsConstructiveMutationInput(
  schema: ConstructiveSchemaSnapshot | undefined,
  mutation: string,
  requiredInputFields: readonly string[],
  objectInput?: ConstructiveMutationObjectInput
): boolean {
  const mutationField = schema?.mutationFields[mutation];
  const inputArgument = mutationField?.args.find((argument) => argument.name === 'input');
  const inputTypeName = namedTypeName(inputArgument?.type);
  const inputType = inputTypeName ? schema?.types[inputTypeName] : undefined;
  if (!inputType) return false;

  const inputFields = new Map(inputType.inputFields.map((field) => [field.name, field]));
  if (!requiredInputFields.every((field) => inputFields.has(field))) return false;
  if (!objectInput) return true;

  const objectField = inputFields.get(objectInput.field);
  const objectTypeName = namedTypeName(objectField?.type);
  const objectType = objectTypeName ? schema?.types[objectTypeName] : undefined;
  if (!objectType) return false;
  const objectFields = new Set(objectType.inputFields.map((field) => field.name));
  return objectInput.requiredFields.every((field) => objectFields.has(field));
}

function discoveryKey(runtime: ConsoleKitAdapterContext): string {
  const identity = getConsoleSessionIdentity(runtime.session);
  return JSON.stringify([
    runtime.databaseId,
    Object.entries(runtime.endpoints)
      .map(([kind, endpoint]) => [
        kind,
        endpoint?.id ?? null,
        endpoint?.url ?? null
      ])
      .sort(([left], [right]) => String(left).localeCompare(String(right))),
    runtime.session.status,
    identity ? createConsoleIdentityKey(identity) : null,
    Object.entries(runtime.metadataByEndpoint ?? { data: runtime.metadata })
      .map(([kind, metadata]) => [kind, metadata?.status ?? null])
      .sort(([left], [right]) => String(left).localeCompare(String(right)))
  ]);
}

export function createConstructiveEndpointEvidence(
  kind: ConsoleEndpointKind,
  schema: ConstructiveSchemaSnapshot
): ConsoleCapabilityEvidence {
  return {
    source: 'endpoint',
    endpointKind: kind,
    endpointId: schema.endpointId,
    apiName: getConstructiveApiName(kind)
  };
}

function operationEvidence(
  rule: ConstructiveCapabilityRule
): ConsoleCapabilityEvidence[] {
  return rule.fields.map((field) => ({
    source: 'graphql-operation' as const,
    endpointKind: rule.endpoint,
    coordinate: `${rule.operation === 'query' ? 'Query' : 'Mutation'}.${field}`
  }));
}

function supportsRule(
  schemas: ConstructiveSchemaMap,
  rule: ConstructiveCapabilityRule
): boolean {
  return hasSchemaFields(schemas[rule.endpoint], rule.operation, rule.fields);
}

function metadataEntries(
  runtime: ConsoleKitAdapterContext
): ReadonlyMap<ConsoleEndpointKind, ConsoleKitMetadataState> {
  const discovered = Object.entries(runtime.metadataByEndpoint ?? {}) as Array<
    [ConsoleEndpointKind, ConsoleKitMetadataState]
  >;
  return new Map(
    discovered.length > 0
      ? discovered
      : [['data', runtime.metadata] as const]
  );
}

/**
 * A compatible runtime state has already passed the current `_meta` signature
 * and the standard-introspection cross-check. The manifest vocabulary check
 * keeps future pack requirements from being accepted by an older core merely
 * because that endpoint happened to expose a similarly named root field.
 */
export function supportsConstructiveManifestMetadata(
  metadata: ConsoleKitMetadataState | undefined,
  manifest: FeaturePackManifestV1
): boolean {
  const requiresMeta = manifest.metadata.requiredMetaSections.length > 0;
  return (!requiresMeta || metadata?.status === 'compatible') &&
    manifest.metadata.requiredMetaSections.every((section) =>
      CURRENT_META_SECTIONS.has(section)
    ) &&
    manifest.metadata.requiredIntrospectionSections.every((section) =>
      CURRENT_INTROSPECTION_SECTIONS.has(section)
    );
}

function assessPacks(
  runtime: ConsoleKitAdapterContext,
  store: ConsoleKitStoreApi,
  features: readonly ConstructiveCapabilityFeature[],
  schemas: ConstructiveSchemaMap,
  diagnostics: readonly ConsoleCapabilityEvidence[]
) {
  const metadataByEndpoint = metadataEntries(runtime);
  const assessmentContext = { runtime, schemas, metadataByEndpoint };
  for (const { manifest, capabilityDiscovery } of features) {
    const supported: AtomicCapabilityId[] = [];
    const evidence: ConsoleCapabilityEvidence[] = [];
    const manifestCapabilities = new Set<AtomicCapabilityId>([
      ...(manifest.capabilities.required as readonly AtomicCapabilityId[]),
      ...(manifest.capabilities.optional as readonly AtomicCapabilityId[])
    ]);

    for (const rule of capabilityDiscovery?.rules ?? []) {
      if (!manifestCapabilities.has(rule.capability)) continue;
      if (!supportsConstructiveManifestMetadata(
        metadataByEndpoint.get(rule.endpoint),
        manifest
      )) continue;
      if (!supportsRule(schemas, rule)) continue;
      if (!supported.includes(rule.capability)) supported.push(rule.capability);
      evidence.push(...operationEvidence(rule));
      const endpoint = schemas[rule.endpoint];
      if (endpoint && !evidence.some((item) =>
        item.source === 'endpoint' && item.endpointKind === rule.endpoint
      )) {
        evidence.push(createConstructiveEndpointEvidence(rule.endpoint, endpoint));
      }
    }

    const customAssessment = capabilityDiscovery?.assess?.(assessmentContext);
    if (
      customAssessment &&
      supportsConstructiveManifestMetadata(
        metadataByEndpoint.get(customAssessment.endpoint),
        manifest
      )
    ) {
      for (const capability of customAssessment.supportedCapabilities) {
        if (
          manifestCapabilities.has(capability) &&
          !supported.includes(capability)
        ) {
          supported.push(capability);
        }
      }
      evidence.push(...customAssessment.evidence);
      const endpoint = schemas[customAssessment.endpoint];
      if (endpoint && !evidence.some((item) =>
        item.source === 'endpoint' &&
        item.endpointKind === customAssessment.endpoint
      )) {
        evidence.push(createConstructiveEndpointEvidence(
          customAssessment.endpoint,
          endpoint
        ));
      }
    }

    const missingEndpoint = manifest.endpoints.required.find(
      (kind) => !runtime.endpoints[kind]
    );
    const contributionReason = typeof capabilityDiscovery?.unavailableReason ===
      'function'
      ? capabilityDiscovery.unavailableReason(assessmentContext)
      : capabilityDiscovery?.unavailableReason;
    store.getState().setPackCapability(manifest.id, assessConsolePackCapability({
      packId: manifest.id,
      requiredCapabilities: manifest.capabilities.required as readonly AtomicCapabilityId[],
      supportedCapabilities: supported,
      evidence: [...evidence, ...diagnostics],
      unavailableReason: missingEndpoint
        ? `The ${missingEndpoint} endpoint is not routed for this database.`
        : contributionReason ??
          'The configured endpoints do not expose this feature pack contract with compatible metadata.'
    }));
  }
}

export function createConstructiveCapabilityDiscovery(
  store: ConsoleKitStoreApi,
  features: readonly ConstructiveCapabilityFeature[]
): ConstructiveCapabilityDiscovery {
  const listeners = new Set<() => void>();
  let currentKey: string | null = null;
  let currentSchemas: ConstructiveSchemaMap = {};
  let currentPromise: Promise<ConstructiveSchemaMap> | null = null;
  let currentController: AbortController | null = null;
  let currentGeneration = 0;

  const emit = () => {
    for (const listener of listeners) listener();
  };

  return {
    getSchemas: () => currentSchemas,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    invalidate() {
      currentGeneration += 1;
      currentController?.abort();
      currentController = null;
      currentKey = null;
      currentSchemas = {};
      currentPromise = null;
      store.getState().clearPackCapabilities();
      emit();
    },
    ensure(runtime) {
      const key = discoveryKey(runtime);
      if (currentKey === key && currentPromise) return currentPromise;
      if (currentKey === key && Object.keys(currentSchemas).length > 0) {
        return Promise.resolve(currentSchemas);
      }

      currentController?.abort();
      const controller = new AbortController();
      const generation = ++currentGeneration;
      currentController = controller;
      currentKey = key;
      currentSchemas = {};
      for (const { manifest } of features) {
        store.getState().setPackCapability(
          manifest.id,
          createCheckingConsolePackCapability(manifest.id)
        );
      }

      const endpointKinds = Object.keys(runtime.endpoints) as ConsoleEndpointKind[];
      currentPromise = Promise.allSettled(
        endpointKinds.map(async (kind) => [
          kind,
          await inspectConstructiveSchema(runtime, kind, controller.signal)
        ] as const)
      ).then((results) => {
        const schemas: Partial<Record<ConsoleEndpointKind, ConstructiveSchemaSnapshot>> = {};
        const diagnostics: ConsoleCapabilityEvidence[] = [];
        for (const [index, result] of results.entries()) {
          const kind = endpointKinds[index]!;
          if (result.status === 'fulfilled') {
            schemas[result.value[0]] = result.value[1];
            continue;
          }
          diagnostics.push({
            source: 'diagnostic',
            code: 'SCHEMA_INTROSPECTION_FAILED',
            message: `${kind}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`
          });
        }

        if (
          controller.signal.aborted ||
          currentGeneration !== generation ||
          currentKey !== key
        ) {
          return currentSchemas;
        }

        currentSchemas = schemas;
        assessPacks(runtime, store, features, currentSchemas, diagnostics);
        currentPromise = null;
        currentController = null;
        emit();
        return currentSchemas;
      });
      return currentPromise;
    }
  };
}

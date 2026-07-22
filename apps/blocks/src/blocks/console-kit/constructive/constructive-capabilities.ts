import {
  assessConsolePackCapability,
  createCheckingConsolePackCapability,
  createConsoleIdentityKey,
  getConsoleSessionIdentity,
  getConstructiveApiName,
  type ConsoleCapabilityEvidence,
  type ConsoleEndpointKind
} from '../../console-runtime';
import {
  FEATURE_PACK_MANIFESTS,
  type AtomicCapabilityId,
  type FeaturePackId
} from '../../../feature-packs';
import type { ConsoleKitAdapterContext } from '../console-kit-contracts';
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

type CapabilityRule = Readonly<{
  capability: AtomicCapabilityId;
  endpoint: ConsoleEndpointKind;
  operation: 'query' | 'mutation';
  fields: readonly string[];
}>;

const RULES: readonly CapabilityRule[] = [
  { capability: 'auth.credentials', endpoint: 'auth', operation: 'mutation', fields: ['signIn', 'signUp'] },
  { capability: 'auth.sessions', endpoint: 'auth', operation: 'mutation', fields: ['signOut'] },
  { capability: 'auth.password', endpoint: 'auth', operation: 'mutation', fields: ['forgotPassword', 'resetPassword'] },
  { capability: 'auth.email', endpoint: 'auth', operation: 'query', fields: ['emails'] },
  { capability: 'auth.connected-accounts', endpoint: 'auth', operation: 'query', fields: ['userConnectedAccounts'] },
  { capability: 'auth.identity-providers', endpoint: 'auth', operation: 'query', fields: ['identityProviders'] },
  { capability: 'auth.passkeys', endpoint: 'auth', operation: 'query', fields: ['webauthnCredentials'] },
  { capability: 'auth.phone', endpoint: 'auth', operation: 'query', fields: ['phoneNumbers'] },
  { capability: 'auth.devices', endpoint: 'auth', operation: 'mutation', fields: ['revokeSession'] },
  { capability: 'users.directory', endpoint: 'auth', operation: 'query', fields: ['users'] },
  { capability: 'users.memberships', endpoint: 'admin', operation: 'query', fields: ['appMemberships'] },
  { capability: 'users.permissions', endpoint: 'admin', operation: 'query', fields: ['appPermissions'] },
  { capability: 'users.limits', endpoint: 'billing', operation: 'query', fields: ['appLimits'] },
  { capability: 'users.profiles', endpoint: 'admin', operation: 'query', fields: ['appProfiles'] },
  { capability: 'users.invites', endpoint: 'admin', operation: 'query', fields: ['appInvites'] },
  { capability: 'organizations.memberships', endpoint: 'admin', operation: 'query', fields: ['orgMemberships'] },
  { capability: 'organizations.permissions', endpoint: 'admin', operation: 'query', fields: ['orgPermissions'] },
  { capability: 'organizations.limits', endpoint: 'billing', operation: 'query', fields: ['orgLimits'] },
  { capability: 'organizations.profiles', endpoint: 'admin', operation: 'query', fields: ['orgProfiles'] },
  { capability: 'organizations.hierarchy', endpoint: 'admin', operation: 'query', fields: ['orgHierarchies'] },
  { capability: 'organizations.invites', endpoint: 'admin', operation: 'query', fields: ['orgInvites'] },
  { capability: 'storage.buckets', endpoint: 'storage', operation: 'query', fields: ['buckets'] },
  { capability: 'storage.buckets', endpoint: 'storage', operation: 'query', fields: ['appBuckets'] },
  { capability: 'storage.files', endpoint: 'storage', operation: 'query', fields: ['files'] },
  { capability: 'storage.files', endpoint: 'storage', operation: 'query', fields: ['appFiles'] },
  { capability: 'billing.plans', endpoint: 'billing', operation: 'query', fields: ['plans'] },
  { capability: 'billing.subscriptions', endpoint: 'billing', operation: 'query', fields: ['planSubscriptions'] },
  { capability: 'billing.meters', endpoint: 'billing', operation: 'query', fields: ['meters'] },
  { capability: 'notifications.settings', endpoint: 'notifications', operation: 'query', fields: ['notificationPreferences'] },
  { capability: 'notifications.inbox', endpoint: 'notifications', operation: 'query', fields: ['notifications'] },
  // Realtime is deliberately absent here. A query root does not prove a
  // subscription contract; custom tenants must expose _meta realtime metadata
  // and a subscription root before this capability can be enabled.
];

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
    runtime.metadata.status
  ]);
}

function endpointEvidence(
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

function operationEvidence(rule: CapabilityRule): ConsoleCapabilityEvidence[] {
  return rule.fields.map((field) => ({
    source: 'graphql-operation' as const,
    endpointKind: rule.endpoint,
    coordinate: `${rule.operation === 'query' ? 'Query' : 'Mutation'}.${field}`
  }));
}

function supportsRule(
  schemas: ConstructiveSchemaMap,
  rule: CapabilityRule
): boolean {
  return hasSchemaFields(schemas[rule.endpoint], rule.operation, rule.fields);
}

function assessPacks(
  runtime: ConsoleKitAdapterContext,
  store: ConsoleKitStoreApi,
  schemas: ConstructiveSchemaMap,
  diagnostics: readonly ConsoleCapabilityEvidence[]
) {
  for (const manifest of FEATURE_PACK_MANIFESTS) {
    const supported: AtomicCapabilityId[] = [];
    const evidence: ConsoleCapabilityEvidence[] = [];
    const manifestCapabilities = new Set<AtomicCapabilityId>([
      ...(manifest.capabilities.required as readonly AtomicCapabilityId[]),
      ...(manifest.capabilities.optional as readonly AtomicCapabilityId[])
    ]);

    if (manifest.id === 'data' && runtime.metadata.status === 'compatible') {
      supported.push('data.meta', 'data.introspection');
      const endpoint = schemas.data;
      if (endpoint) evidence.push(endpointEvidence('data', endpoint));
      evidence.push({
        source: 'graphql-operation',
        endpointKind: 'data',
        coordinate: 'Query._meta'
      });
    }

    for (const rule of RULES) {
      if (!manifestCapabilities.has(rule.capability)) continue;
      if (!supportsRule(schemas, rule)) continue;
      supported.push(rule.capability);
      evidence.push(...operationEvidence(rule));
      const endpoint = schemas[rule.endpoint];
      if (endpoint && !evidence.some((item) =>
        item.source === 'endpoint' && item.endpointKind === rule.endpoint
      )) {
        evidence.push(endpointEvidence(rule.endpoint, endpoint));
      }
    }

    const missingEndpoint = manifest.endpoints.required.find(
      (kind) => !runtime.endpoints[kind]
    );
    store.getState().setPackCapability(manifest.id, assessConsolePackCapability({
      packId: manifest.id,
      requiredCapabilities: manifest.capabilities.required as readonly AtomicCapabilityId[],
      supportedCapabilities: supported,
      evidence: [...evidence, ...diagnostics],
      unavailableReason: missingEndpoint
        ? `The ${missingEndpoint} endpoint is not routed for this database.`
        : 'The configured endpoints do not expose this feature pack contract.'
    }));
  }
}

export function createConstructiveCapabilityDiscovery(
  store: ConsoleKitStoreApi
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
      for (const manifest of FEATURE_PACK_MANIFESTS) {
        store.getState().setPackCapability(
          manifest.id as FeaturePackId,
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
        assessPacks(runtime, store, currentSchemas, diagnostics);
        currentPromise = null;
        currentController = null;
        emit();
        return currentSchemas;
      });
      return currentPromise;
    }
  };
}

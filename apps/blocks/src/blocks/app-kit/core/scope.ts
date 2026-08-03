import type { AppScope } from './contracts';

export const APP_QUERY_KEY_NAMESPACE = 'constructive-app-kit' as const;
export const APP_QUERY_KEY_VERSION = '2026-08' as const;

export type AppScopeQueryKey = readonly [
  typeof APP_QUERY_KEY_NAMESPACE,
  typeof APP_QUERY_KEY_VERSION,
  endpointId: string,
  databaseId: string,
  sessionPartition: string,
  organizationId: string,
  tenantId: string,
  schemaRevision: string,
  securityRevision: string
];

function assertScopePart(name: string, value: string): void {
  if (value.trim().length === 0) {
    throw new Error(`AppScope.${name} must be a non-empty stable identifier.`);
  }
}

export function createAppScopeQueryKey(scope: AppScope): AppScopeQueryKey {
  assertScopePart('endpointId', scope.endpointId);
  assertScopePart('databaseId', scope.databaseId);
  assertScopePart('sessionPartition', scope.sessionPartition);
  assertScopePart('schemaRevision', scope.schemaRevision);
  assertScopePart('securityRevision', scope.securityRevision);

  return [
    APP_QUERY_KEY_NAMESPACE,
    APP_QUERY_KEY_VERSION,
    scope.endpointId,
    scope.databaseId,
    scope.sessionPartition,
    scope.organizationId ?? '',
    scope.tenantId ?? '',
    scope.schemaRevision,
    scope.securityRevision
  ] as const;
}

/** Collision-safe fingerprint for memoization and local transient state only. */
export function createAppScopeFingerprint(scope: AppScope): string {
  return JSON.stringify(createAppScopeQueryKey(scope));
}

export function createAppQueryRootKey(
  scope: AppScope,
  queryId: string
): readonly [...AppScopeQueryKey, 'query', string] {
  return [...createAppScopeQueryKey(scope), 'query', queryId] as const;
}

export function createAppQueryKey<TInput>(
  scope: AppScope,
  queryId: string,
  input: TInput
): readonly [...AppScopeQueryKey, 'query', string, TInput] {
  return [...createAppQueryRootKey(scope, queryId), input] as const;
}

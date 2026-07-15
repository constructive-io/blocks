'use client';

import { useSchemaBuilder } from '../core/context';
import type { SchemaBuilderVariables } from '../types';
import type { GeneratedQueryResult } from './generated-types';

export function fetchAppPermissionsQuery(): Promise<GeneratedQueryResult> {
  return Promise.reject(new Error('Direct generated fetch functions are available only in the shadcn registry build'));
}

export function fetchOrgPermissionsQuery(): Promise<GeneratedQueryResult> {
  return Promise.reject(new Error('Direct generated fetch functions are available only in the shadcn registry build'));
}

export function useAdminSdkClient() {
  const { adapter, scope } = useSchemaBuilder();
  return {
    fetchAppPermissionsQuery: (variables: SchemaBuilderVariables, signal?: AbortSignal) =>
      adapter.policies.appPermissions(variables, { scope, signal }) as Promise<GeneratedQueryResult>,
    fetchOrgPermissionsQuery: (variables: SchemaBuilderVariables, signal?: AbortSignal) =>
      adapter.policies.orgPermissions(variables, { scope, signal }) as Promise<GeneratedQueryResult>
  };
}

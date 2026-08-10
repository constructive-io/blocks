'use client';

import { useSchemaBuilder } from '../core/context';
import type { SchemaBuilderVariables } from '../types';
import type { GeneratedQueryResult } from './generated-types';

export function fetchAppCapabilitiesQuery(): Promise<GeneratedQueryResult> {
  return Promise.reject(new Error('Direct generated fetch functions are available only in the shadcn registry build'));
}

export function fetchOrgCapabilitiesQuery(): Promise<GeneratedQueryResult> {
  return Promise.reject(new Error('Direct generated fetch functions are available only in the shadcn registry build'));
}

export function useAdminSdkClient() {
  const { adapter, scope } = useSchemaBuilder();
  return {
    fetchAppCapabilitiesQuery: (variables: SchemaBuilderVariables, signal?: AbortSignal) =>
      adapter.policies.appCapabilities(variables, { scope, signal }) as Promise<GeneratedQueryResult>,
    fetchOrgCapabilitiesQuery: (variables: SchemaBuilderVariables, signal?: AbortSignal) =>
      adapter.policies.orgCapabilities(variables, { scope, signal }) as Promise<GeneratedQueryResult>
  };
}

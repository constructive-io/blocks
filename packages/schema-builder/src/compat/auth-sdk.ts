'use client';

import { useSchemaBuilder } from '../core/context';
import type { SchemaBuilderVariables } from '../types';
import type { GeneratedQueryResult } from './generated-types';

export function fetchUsersQuery(): Promise<GeneratedQueryResult> {
  return Promise.reject(new Error('Direct generated fetch functions are available only in the shadcn registry build'));
}

export function useAuthSdkClient() {
  const { adapter, scope } = useSchemaBuilder();
  return {
    fetchUsersQuery: (variables: SchemaBuilderVariables, signal?: AbortSignal) =>
      adapter.core.users(variables, { scope, signal }) as Promise<GeneratedQueryResult>
  };
}

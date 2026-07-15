'use client';

import { useQuery } from '@tanstack/react-query';

import { useSchemaBuilder } from '../core/context';
import type { SchemaBuilderVariables } from '../types';
import type { GeneratedQueryResult } from './generated-types';

export function useRelationProvisionsQuery(
  variables: SchemaBuilderVariables & { enabled?: boolean; [key: string]: unknown }
) {
  const { adapter, scope } = useSchemaBuilder();
  const { enabled = true, ...operationVariables } = variables;
  return useQuery({
    queryKey: ['schema-builder', scope, 'relationProvisions', operationVariables],
    queryFn: ({ signal }) =>
      adapter.relationships.relationProvisions(operationVariables, { scope, signal }) as Promise<GeneratedQueryResult>,
    enabled
  });
}

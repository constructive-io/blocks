'use client';

import {
  useQuery,
  type UseQueryOptions,
  type UseQueryResult
} from '@tanstack/react-query';

import { useSchemaBuilder } from './context';
import type {
  SchemaBuilderAdapter,
  SchemaBuilderFeature,
  SchemaBuilderOperation,
  SchemaBuilderVariables
} from '../types';

type FeatureOperation<TFeature extends SchemaBuilderFeature> = Extract<
  keyof SchemaBuilderAdapter[TFeature],
  string
>;

export function schemaBuilderQueryKey(
  scope: { orgId: string; databaseId: string; userId?: string | null },
  feature: SchemaBuilderFeature,
  operation: string,
  variables: SchemaBuilderVariables = {}
) {
  return [
    '@constructive-io/schema-builder',
    scope.orgId,
    scope.databaseId,
    scope.userId ?? null,
    feature,
    operation,
    variables
  ] as const;
}

export function useSchemaBuilderQuery<
  TData = unknown,
  TFeature extends SchemaBuilderFeature = SchemaBuilderFeature
>(
  feature: TFeature,
  operation: FeatureOperation<TFeature>,
  variables: SchemaBuilderVariables = {},
  options: Omit<
    UseQueryOptions<TData, Error, TData, ReturnType<typeof schemaBuilderQueryKey>>,
    'queryKey' | 'queryFn'
  > = {}
): UseQueryResult<TData, Error> {
  const { adapter, scope } = useSchemaBuilder();
  const capability = adapter[feature] as unknown as Record<string, SchemaBuilderOperation>;
  const operationFn = capability[operation];

  if (typeof operationFn !== 'function') {
    throw new Error(`SchemaBuilder adapter is missing ${feature}.${operation}`);
  }

  return useQuery({
    ...options,
    queryKey: schemaBuilderQueryKey(scope, feature, operation, variables),
    queryFn: ({ signal }) => operationFn(variables, { scope, signal }) as Promise<TData>
  });
}

'use client';

import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
  type UseMutationResult
} from '@tanstack/react-query';

import { useSchemaBuilder } from './context';
import { schemaBuilderQueryKey } from './query';
import type {
  SchemaBuilderAdapter,
  SchemaBuilderFeature,
  SchemaBuilderOperation,
  SchemaBuilderOperationContext,
  SchemaBuilderVariables
} from '../types';

type FeatureOperation<TFeature extends SchemaBuilderFeature> = Extract<
  keyof SchemaBuilderAdapter[TFeature],
  string
>;

export type SchemaBuilderMutationOptions<TData, TVariables, TContext = unknown> =
  UseMutationOptions<TData, Error, TVariables, TContext> & {
    /** Result fields required by generated GraphQL adapters for this mutation. */
    selection?: SchemaBuilderOperationContext['selection'];
  };

export function useSchemaBuilderMutation<
  TData = unknown,
  TVariables extends SchemaBuilderVariables = SchemaBuilderVariables,
  TFeature extends SchemaBuilderFeature = SchemaBuilderFeature
>(
  feature: TFeature,
  operation: FeatureOperation<TFeature>,
  options: SchemaBuilderMutationOptions<TData, TVariables> = {}
): UseMutationResult<TData, Error, TVariables> {
  const { adapter, scope, onInvalidate } = useSchemaBuilder();
  const queryClient = useQueryClient();
  const capability = adapter[feature] as unknown as Record<string, SchemaBuilderOperation>;
  const operationFn = capability[operation];

  if (typeof operationFn !== 'function') {
    throw new Error(`SchemaBuilder adapter is missing ${feature}.${operation}`);
  }

  const { selection, ...mutationOptions } = options;
  const hostOnSuccess = mutationOptions.onSuccess;

  return useMutation({
    ...mutationOptions,
    mutationFn: (variables) =>
      operationFn(variables, { scope, selection }) as Promise<TData>,
    onSuccess: async (data, variables, onMutateResult, context) => {
      await queryClient.invalidateQueries({
        queryKey: schemaBuilderQueryKey(scope, 'core', '').slice(0, 4)
      });
      onInvalidate?.({ scope, feature, operation });
      await hostOnSuccess?.(data, variables, onMutateResult, context);
    }
  });
}

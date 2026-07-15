'use client';

import { useMutation } from '@tanstack/react-query';

import { useSchemaBuilder } from '../core/context';
import type { SchemaBuilderOperation, SchemaBuilderVariables } from '../types';
import type { GeneratedMutationResult } from './generated-types';

function useModuleMutation(
  operation: 'createRelationProvision' | 'createSecureTableProvision',
  options?: unknown
) {
  const { adapter, scope, onInvalidate } = useSchemaBuilder();
  const feature = operation === 'createRelationProvision' ? 'relationships' : 'policies';
  const operationFn = (adapter[feature] as unknown as Record<string, SchemaBuilderOperation>)[operation];
  const selection = (options as { selection?: { fields?: Readonly<Record<string, unknown>> } } | undefined)
    ?.selection?.fields;
  return useMutation<GeneratedMutationResult, Error, SchemaBuilderVariables>({
    mutationFn: (variables) => operationFn(variables, { scope, selection }) as Promise<GeneratedMutationResult>,
    onSuccess: () => onInvalidate?.({ scope, feature, operation })
  });
}

export const useCreateRelationProvisionMutation = (options?: unknown) =>
  useModuleMutation('createRelationProvision', options);
export const useCreateSecureTableProvisionMutation = (options?: unknown) =>
  useModuleMutation('createSecureTableProvision', options);
export const blueprintTemplateKeys = { all: ['schema-builder', 'blueprint-templates'] as const };

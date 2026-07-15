'use client';

import { useMutation, type UseMutationResult } from '@tanstack/react-query';

import { useSchemaBuilder } from '../core/context';
import type {
  SchemaBuilderAdapter,
  SchemaBuilderFeature,
  SchemaBuilderOperation,
  SchemaBuilderVariables
} from '../types';
import type {
  CreateTableInput,
  Field,
  GeneratedMutationResult,
  GeneratedQueryResult,
  Table
} from './generated-types';

function registryOnlyFetch(): Promise<GeneratedQueryResult> {
  return Promise.reject(new Error('Direct generated fetch functions are available only in the shadcn registry build'));
}

// Type-checking facades for the shared registry runtime. The npm build aliases
// that runtime to useSchemaBuilderSdkClient, so these functions are never called.
export const fetchApiSchemasQuery = registryOnlyFetch;
export const fetchApisQuery = registryOnlyFetch;
export const fetchDatabasesQuery = registryOnlyFetch;
export const fetchFieldsQuery = registryOnlyFetch;
export const fetchForeignKeyConstraintsQuery = registryOnlyFetch;
export const fetchIndicesQuery = registryOnlyFetch;
export const fetchPoliciesQuery = registryOnlyFetch;
export const fetchPrimaryKeyConstraintsQuery = registryOnlyFetch;
export const fetchSchemasQuery = registryOnlyFetch;
export const fetchTableQuery = registryOnlyFetch;
export const fetchTablesQuery = registryOnlyFetch;
export const fetchUniqueConstraintsQuery = registryOnlyFetch;

export type { CreateTableInput, Field, Table } from './generated-types';

const featureByMutation = {
  createField: 'fields',
  createForeignKeyConstraint: 'relationships',
  createIndex: 'indexes',
  createPrimaryKeyConstraint: 'fields',
  createTableGrant: 'policies',
  createTable: 'policies',
  createUniqueConstraint: 'fields',
  deleteField: 'fields',
  deleteForeignKeyConstraint: 'relationships',
  deleteIndex: 'indexes',
  deletePolicy: 'policies',
  deletePrimaryKeyConstraint: 'fields',
  deleteTable: 'tables',
  deleteUniqueConstraint: 'fields',
  updateField: 'fields',
  updateForeignKeyConstraint: 'relationships',
  updateIndex: 'indexes',
  updatePolicy: 'policies',
  updatePrimaryKeyConstraint: 'fields',
  updateTable: 'tables'
} satisfies Record<string, SchemaBuilderFeature>;

type MutationName = keyof typeof featureByMutation;

function useGeneratedMutation(
  operation: MutationName,
  options?: unknown
): UseMutationResult<GeneratedMutationResult, Error, SchemaBuilderVariables> {
  const { adapter, scope, onInvalidate } = useSchemaBuilder();
  const feature = featureByMutation[operation];
  const operationFn = (adapter[feature] as unknown as Record<string, SchemaBuilderOperation>)[operation];

  const selection = (options as { selection?: { fields?: Readonly<Record<string, unknown>> } } | undefined)
    ?.selection?.fields;

  return useMutation({
    mutationFn: (variables) =>
      operationFn(variables, { scope, selection }) as Promise<GeneratedMutationResult>,
    onSuccess: () => onInvalidate?.({ scope, feature, operation })
  });
}

export function useSchemaBuilderSdkClient(): Record<
  | 'fetchApiSchemasQuery'
  | 'fetchApisQuery'
  | 'fetchDatabasesQuery'
  | 'fetchFieldsQuery'
  | 'fetchForeignKeyConstraintsQuery'
  | 'fetchIndicesQuery'
  | 'fetchPoliciesQuery'
  | 'fetchPrimaryKeyConstraintsQuery'
  | 'fetchSchemasQuery'
  | 'fetchTableQuery'
  | 'fetchTablesQuery'
  | 'fetchUniqueConstraintsQuery',
  (variables: SchemaBuilderVariables, signal?: AbortSignal) => Promise<GeneratedQueryResult>
> {
  const { adapter, scope } = useSchemaBuilder();
  const bind = (operation: keyof SchemaBuilderAdapter['core']) =>
    (variables: SchemaBuilderVariables, signal?: AbortSignal) =>
      adapter.core[operation](variables, { scope, signal }) as Promise<GeneratedQueryResult>;

  return {
    fetchApiSchemasQuery: bind('apiSchemas'),
    fetchApisQuery: bind('apis'),
    fetchDatabasesQuery: bind('databases'),
    fetchFieldsQuery: bind('fields'),
    fetchForeignKeyConstraintsQuery: bind('foreignKeyConstraints'),
    fetchIndicesQuery: bind('indices'),
    fetchPoliciesQuery: bind('policies'),
    fetchPrimaryKeyConstraintsQuery: bind('primaryKeyConstraints'),
    fetchSchemasQuery: bind('schemas'),
    fetchTableQuery: bind('table'),
    fetchTablesQuery: bind('tables'),
    fetchUniqueConstraintsQuery: bind('uniqueConstraints')
  };
}

export const apiKeys = { all: ['schema-builder', 'apis'] as const };
export const domainKeys = {
  all: ['schema-builder', 'domains'] as const,
  lists: () => ['schema-builder', 'domains', 'list'] as const
};
export const schemaKeys = { all: ['schema-builder', 'schemas'] as const };
export const siteKeys = { all: ['schema-builder', 'sites'] as const };

export const useCreateFieldMutation = (options?: unknown) => useGeneratedMutation('createField', options);
export const useCreateForeignKeyConstraintMutation = (options?: unknown) =>
  useGeneratedMutation('createForeignKeyConstraint', options);
export const useCreateIndexMutation = (options?: unknown) => useGeneratedMutation('createIndex', options);
export const useCreatePrimaryKeyConstraintMutation = (options?: unknown) =>
  useGeneratedMutation('createPrimaryKeyConstraint', options);
export const useCreateTableGrantMutation = (options?: unknown) =>
  useGeneratedMutation('createTableGrant', options);
export const useCreateTableMutation = (options?: unknown) => useGeneratedMutation('createTable', options);
export const useCreateUniqueConstraintMutation = (options?: unknown) =>
  useGeneratedMutation('createUniqueConstraint', options);
export const useDeleteFieldMutation = (options?: unknown) => useGeneratedMutation('deleteField', options);
export const useDeleteForeignKeyConstraintMutation = (options?: unknown) =>
  useGeneratedMutation('deleteForeignKeyConstraint', options);
export const useDeleteIndexMutation = (options?: unknown) => useGeneratedMutation('deleteIndex', options);
export const useDeletePolicyMutation = (options?: unknown) => useGeneratedMutation('deletePolicy', options);
export const useDeletePrimaryKeyConstraintMutation = (options?: unknown) =>
  useGeneratedMutation('deletePrimaryKeyConstraint', options);
export const useDeleteTableMutation = (options?: unknown) => useGeneratedMutation('deleteTable', options);
export const useDeleteUniqueConstraintMutation = (options?: unknown) =>
  useGeneratedMutation('deleteUniqueConstraint', options);
export const useUpdateFieldMutation = (options?: unknown) => useGeneratedMutation('updateField', options);
export const useUpdateForeignKeyConstraintMutation = (options?: unknown) =>
  useGeneratedMutation('updateForeignKeyConstraint', options);
export const useUpdateIndexMutation = (options?: unknown) => useGeneratedMutation('updateIndex', options);
export const useUpdatePolicyMutation = (options?: unknown) => useGeneratedMutation('updatePolicy', options);
export const useUpdatePrimaryKeyConstraintMutation = (options?: unknown) =>
  useGeneratedMutation('updatePrimaryKeyConstraint', options);
export const useUpdateTableMutation = (options?: unknown) => useGeneratedMutation('updateTable', options);

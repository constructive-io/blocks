import type { SchemaBuilderAdapter, SchemaBuilderOperation } from './types';

/** Minimal hermetic adapter for documentation, visual tests, and empty states. */
export function createNoopSchemaBuilderAdapter(
  operation: SchemaBuilderOperation = async () => []
): SchemaBuilderAdapter {
  return {
    core: {
      apiSchemas: operation,
      apis: operation,
      databases: operation,
      fields: operation,
      foreignKeyConstraints: operation,
      indices: operation,
      policies: operation,
      primaryKeyConstraints: operation,
      schemas: operation,
      table: async () => null,
      tables: operation,
      uniqueConstraints: operation,
      users: operation
    },
    fields: {
      createField: operation,
      createPrimaryKeyConstraint: operation,
      createUniqueConstraint: operation,
      deleteField: operation,
      deletePrimaryKeyConstraint: operation,
      deleteUniqueConstraint: operation,
      updateField: operation,
      updatePrimaryKeyConstraint: operation
    },
    relationships: {
      createField: operation,
      createForeignKeyConstraint: operation,
      createPrimaryKeyConstraint: operation,
      createRelationProvision: operation,
      createTable: operation,
      createUniqueConstraint: operation,
      deleteForeignKeyConstraint: operation,
      relationProvisions: operation,
      updateForeignKeyConstraint: operation
    },
    indexes: {
      createIndex: operation,
      deleteIndex: operation,
      updateIndex: operation
    },
    policies: {
      appPermissions: operation,
      createField: operation,
      createSecureTableProvision: operation,
      createTable: operation,
      createTableGrant: operation,
      deletePolicy: operation,
      fields: operation,
      orgPermissions: operation,
      tables: operation,
      updatePolicy: operation
    },
    tables: {
      deleteTable: operation,
      updateTable: operation
    }
  } as unknown as SchemaBuilderAdapter;
}

'use client';

import { useState } from 'react';
import { useTheme } from 'next-themes';

import {
  DEFAULT_SCHEMA_BUILDER_PREFERENCES,
  SchemaBuilder,
  type SchemaBuilderAdapter,
  type SchemaBuilderPreferences,
} from '@constructive-io/schema-builder';

const empty = async () => [];

const adapter: SchemaBuilderAdapter = {
  core: {
    apiSchemas: empty,
    apis: empty,
    databases: empty,
    fields: empty,
    foreignKeyConstraints: empty,
    indices: empty,
    policies: empty,
    primaryKeyConstraints: empty,
    schemas: empty,
    table: async () => null,
    tables: empty,
    uniqueConstraints: empty,
    users: empty,
  },
  fields: {
    createField: empty,
    createPrimaryKeyConstraint: empty,
    createUniqueConstraint: empty,
    deleteField: empty,
    deletePrimaryKeyConstraint: empty,
    deleteUniqueConstraint: empty,
    updateField: empty,
    updatePrimaryKeyConstraint: empty,
  },
  relationships: {
    createField: empty,
    createForeignKeyConstraint: empty,
    createPrimaryKeyConstraint: empty,
    createRelationProvision: empty,
    createTable: empty,
    createUniqueConstraint: empty,
    deleteForeignKeyConstraint: empty,
    relationProvisions: empty,
    updateForeignKeyConstraint: empty,
  },
  indexes: { createIndex: empty, deleteIndex: empty, updateIndex: empty },
  policies: {
    appPermissions: empty,
    createField: empty,
    createSecureTableProvision: empty,
    createTable: empty,
    createTableGrant: empty,
    deletePolicy: empty,
    fields: empty,
    orgPermissions: empty,
    tables: empty,
    updatePolicy: empty,
  },
  tables: { deleteTable: empty, updateTable: empty },
};

export function BlockDemo() {
  const { resolvedTheme } = useTheme();
  const [preferences, setPreferences] = useState<SchemaBuilderPreferences>({
    ...DEFAULT_SCHEMA_BUILDER_PREFERENCES,
    sidebarSectionsExpanded: { ...DEFAULT_SCHEMA_BUILDER_PREFERENCES.sidebarSectionsExpanded },
  });
  const [activeTab, setActiveTab] = useState('editor');

  return (
    <div className="h-[36rem] w-full overflow-hidden rounded-lg border bg-background">
      <SchemaBuilder
        adapter={adapter}
        scope={{ orgId: 'org_demo', databaseId: 'db_demo', userId: 'user_demo' }}
        colorMode={resolvedTheme === 'light' ? 'light' : 'dark'}
        preferences={preferences}
        onPreferencesChange={setPreferences}
        activeTab={activeTab}
        onActiveTabChange={setActiveTab}
      />
    </div>
  );
}

import type { ReactNode } from 'react';

export interface SchemaBuilderScope {
  orgId: string;
  databaseId: string;
  userId?: string | null;
}

export type SchemaBuilderColorMode = 'light' | 'dark';

export interface SchemaBuilderSidebarSections {
  app: boolean;
  system: boolean;
}

export interface SchemaBuilderPreferences {
  sidebarSectionsExpanded: SchemaBuilderSidebarSections;
  showSystemTablesInSidebar: boolean;
  showSystemTablesInVisualizer: boolean;
  sidebarPinned: boolean;
  typesLibraryExpanded: boolean;
}

export const DEFAULT_SCHEMA_BUILDER_PREFERENCES: Readonly<SchemaBuilderPreferences> = {
  sidebarSectionsExpanded: {
    app: true,
    system: false
  },
  showSystemTablesInSidebar: false,
  showSystemTablesInVisualizer: false,
  sidebarPinned: false,
  typesLibraryExpanded: true
};

export interface SchemaBuilderField {
  id: string;
  name: string;
  type?: string | null;
  description?: string | null;
  isNullable?: boolean | null;
  isPrimaryKey?: boolean | null;
  isUnique?: boolean | null;
  [key: string]: unknown;
}

export interface SchemaBuilderTable {
  id: string;
  name: string;
  label?: string | null;
  description?: string | null;
  category?: string | null;
  schemaId?: string | null;
  fields?: readonly SchemaBuilderField[];
  [key: string]: unknown;
}

export interface SchemaBuilderSchema {
  id: string;
  name: string;
  label?: string | null;
  tables?: readonly SchemaBuilderTable[];
  [key: string]: unknown;
}

export interface SchemaBuilderIndex {
  id: string;
  name: string;
  tableId?: string | null;
  fieldIds?: readonly string[];
  isUnique?: boolean | null;
  [key: string]: unknown;
}

export interface SchemaBuilderPolicy {
  id: string;
  name: string;
  tableId?: string | null;
  command?: string | null;
  [key: string]: unknown;
}

export interface SchemaBuilderRelationship {
  id: string;
  sourceTableId?: string | null;
  targetTableId?: string | null;
  [key: string]: unknown;
}

export interface SchemaBuilderOperationContext {
  scope: SchemaBuilderScope;
  signal?: AbortSignal;
  /** Generated-SDK registry adapters forward requested result fields here. */
  selection?: Readonly<Record<string, unknown>>;
}

export type SchemaBuilderVariables = object;

export type SchemaBuilderOperation<
  TVariables extends SchemaBuilderVariables = SchemaBuilderVariables,
  TResult = unknown
> = (variables: TVariables, context: SchemaBuilderOperationContext) => Promise<TResult>;

export type SchemaBuilderCollection<T> =
  | readonly T[]
  | {
      nodes?: readonly T[] | null;
      totalCount?: number | null;
    };

export interface SchemaBuilderCoreCapabilities {
  apiSchemas: SchemaBuilderOperation;
  apis: SchemaBuilderOperation;
  databases: SchemaBuilderOperation;
  fields: SchemaBuilderOperation;
  foreignKeyConstraints: SchemaBuilderOperation;
  indices: SchemaBuilderOperation;
  policies: SchemaBuilderOperation;
  primaryKeyConstraints: SchemaBuilderOperation;
  schemas: SchemaBuilderOperation;
  table: SchemaBuilderOperation;
  tables: SchemaBuilderOperation;
  uniqueConstraints: SchemaBuilderOperation;
  users: SchemaBuilderOperation;
}

export interface SchemaBuilderFieldsCapabilities {
  createField: SchemaBuilderOperation;
  createPrimaryKeyConstraint: SchemaBuilderOperation;
  createUniqueConstraint: SchemaBuilderOperation;
  deleteField: SchemaBuilderOperation;
  deletePrimaryKeyConstraint: SchemaBuilderOperation;
  deleteUniqueConstraint: SchemaBuilderOperation;
  updateField: SchemaBuilderOperation;
  updatePrimaryKeyConstraint: SchemaBuilderOperation;
}

export interface SchemaBuilderRelationshipsCapabilities {
  createField: SchemaBuilderOperation;
  createForeignKeyConstraint: SchemaBuilderOperation;
  createPrimaryKeyConstraint: SchemaBuilderOperation;
  createRelationProvision: SchemaBuilderOperation;
  createTable: SchemaBuilderOperation;
  createUniqueConstraint: SchemaBuilderOperation;
  deleteForeignKeyConstraint: SchemaBuilderOperation;
  relationProvisions: SchemaBuilderOperation;
  updateForeignKeyConstraint: SchemaBuilderOperation;
}

export interface SchemaBuilderIndexesCapabilities {
  createIndex: SchemaBuilderOperation;
  deleteIndex: SchemaBuilderOperation;
  updateIndex: SchemaBuilderOperation;
}

export interface SchemaBuilderPoliciesCapabilities {
  appPermissions: SchemaBuilderOperation;
  createField: SchemaBuilderOperation;
  createSecureTableProvision: SchemaBuilderOperation;
  createTable: SchemaBuilderOperation;
  createTableGrant: SchemaBuilderOperation;
  deletePolicy: SchemaBuilderOperation;
  fields: SchemaBuilderOperation;
  orgPermissions: SchemaBuilderOperation;
  tables: SchemaBuilderOperation;
  updatePolicy: SchemaBuilderOperation;
}

export interface SchemaBuilderTablesCapabilities {
  deleteTable: SchemaBuilderOperation;
  updateTable: SchemaBuilderOperation;
}

/**
 * Imperative data boundary owned by the host. Each feature is isolated so a
 * partial registry install can provide only the capabilities it consumes.
 */
export interface SchemaBuilderAdapter {
  core: SchemaBuilderCoreCapabilities;
  fields: SchemaBuilderFieldsCapabilities;
  relationships: SchemaBuilderRelationshipsCapabilities;
  indexes: SchemaBuilderIndexesCapabilities;
  policies: SchemaBuilderPoliciesCapabilities;
  tables: SchemaBuilderTablesCapabilities;
}

export type SchemaBuilderFeature = keyof SchemaBuilderAdapter;

export type SchemaBuilderCoreTabId = 'editor' | 'relationships' | 'indexes' | 'security';

export interface SchemaBuilderNavigationTarget {
  href: string;
  replace?: boolean;
}

export interface SchemaBuilderTableSelection {
  tableId: string | null;
  tableName: string | null;
}

export interface SchemaBuilderTabRenderContext {
  scope: SchemaBuilderScope;
  colorMode: SchemaBuilderColorMode;
  selectedTableId: string | null;
}

export interface SchemaBuilderTab {
  id: string;
  label: ReactNode;
  render: (context: SchemaBuilderTabRenderContext) => ReactNode;
  preload?: () => void | Promise<void>;
  /** Keeps the tab addressable without showing it in the package-owned tab list. */
  hidden?: boolean;
}

export interface SchemaBuilderInvalidationEvent {
  scope: SchemaBuilderScope;
  feature: SchemaBuilderFeature;
  operation: string;
}

export interface SchemaBuilderHostOptions {
  adapter: SchemaBuilderAdapter;
  scope: SchemaBuilderScope;
  colorMode: SchemaBuilderColorMode;
  preferences: SchemaBuilderPreferences;
  onPreferencesChange: (preferences: SchemaBuilderPreferences) => void;
  activeTab: string;
  onActiveTabChange: (tabId: string) => void;
  /** Optional host-controlled table selection, such as a URL-backed table id. */
  selectedTableId?: string | null;
  onSelectedTableChange?: (selection: SchemaBuilderTableSelection) => void;
  onNavigate?: (target: SchemaBuilderNavigationTarget) => void;
  onInvalidate?: (event: SchemaBuilderInvalidationEvent) => void;
  tabs?: readonly SchemaBuilderTab[];
}

export interface SchemaBuilderProps extends SchemaBuilderHostOptions {
  className?: string;
  emptyState?: ReactNode;
}

export function defineSchemaBuilderAdapter<TAdapter extends SchemaBuilderAdapter>(adapter: TAdapter): TAdapter {
  return adapter;
}

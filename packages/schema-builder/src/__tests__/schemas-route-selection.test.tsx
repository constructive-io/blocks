import type { ReactNode } from 'react';
import { cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  DbLightSchema,
  TableDefinition
} from '../schema/schema-builder-core/lib/schema';
import type { UseSchemaBuilderSelectorsResult } from '../schema/schema-builder-core/lib/gql/hooks/schema-builder/use-schema-builder-selectors';

const routeMocks = vi.hoisted(() => ({
  selectTable: vi.fn(),
  refetch: vi.fn(async () => undefined),
  selectors: {} as UseSchemaBuilderSelectorsResult
}));

vi.mock('@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder', () => ({
  useSchemaBuilderSelectors: () => routeMocks.selectors
}));

vi.mock('@/blocks/schema/schema-builder-core/context/block-config', () => ({
  useSchemaBuilderRuntime: () => ({
    colorMode: 'light',
    scope: { orgId: 'org-1', databaseId: 'db-1', userId: 'user-1' },
    tabs: [],
    setActiveTab: vi.fn(),
    setPreferences: vi.fn()
  }),
  useSchemaBuilderRuntimeStore: (selector: (state: unknown) => unknown) =>
    selector({
      activeTab: 'editor',
      preferences: { showSystemTablesInSidebar: false }
    })
}));

vi.mock('@constructive-io/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: ReactNode }) => children
}));

vi.mock('@/blocks/schema/schema-builder-core/components/databases', () => ({
  NoDatabasesEmptyState: () => null
}));

vi.mock('@/blocks/schema/schema-builder-core/components/skeletons', () => ({
  ContentFadeIn: ({ children }: { children: ReactNode }) => children,
  SchemaBuilderSkeleton: () => null
}));

vi.mock('@/blocks/schema/schema-builder-fields/components/table-editor/table-editor', () => ({
  TableEditor: () => null
}));

vi.mock('@/blocks/schema/schema-builder-relationships/components/table-editor/relationships', () => ({
  RelationshipsView: () => null
}));

vi.mock('@/blocks/schema/schema-builder-indexes/components/table-editor/indexes', () => ({
  IndexesView: () => null
}));

vi.mock('@/blocks/schema/schema-builder-policies/components/table-editor/policies', () => ({
  PoliciesView: () => null
}));

vi.mock('../schema/schema-builder/components/schema-builder-header', () => ({
  SchemaBuilderHeader: () => null
}));

vi.mock('../schema/schema-builder/components/client-only', () => ({
  ClientOnly: ({ children }: { children: ReactNode }) => children
}));

vi.mock('@/blocks/schema/schema-builder-tables/components/schemas/schema-builder-sidebar', () => ({
  SchemaBuilderSidebar: () => null
}));

vi.mock('@/blocks/schema/schema-builder-core/components/schemas/schema-state-display', () => ({
  SchemaStateDisplay: () => null
}));

import { SchemasRoute } from '../schema/schema-builder/components/schemas/schemas-route';

const appTable: TableDefinition = {
  id: 'app-table',
  name: 'posts',
  category: 'APP',
  fields: []
};

const systemTable: TableDefinition = {
  id: 'system-table',
  name: 'internal_jobs',
  category: 'CORE',
  fields: []
};

function schemaWith(tables: TableDefinition[]): DbLightSchema {
  return {
    id: 'schema-1',
    name: 'public',
    version: '1',
    tables,
    relationships: []
  };
}

function selectors(
  overrides: Partial<UseSchemaBuilderSelectorsResult> = {}
): UseSchemaBuilderSelectorsResult {
  return {
    selectedOrgId: 'org-1',
    selectedSchemaKey: 'database-db-1',
    selectedTableId: null,
    selectedFieldId: null,
    activeTab: 'schemas',
    selectOrg: vi.fn(),
    selectSchema: vi.fn(),
    selectTable: routeMocks.selectTable,
    selectField: vi.fn(),
    clearAllSelections: vi.fn(),
    setActiveTab: vi.fn(),
    availableSchemas: [],
    currentSchema: null,
    currentTable: null,
    currentField: null,
    currentDatabase: null,
    currentDatabaseApi: null,
    setCurrentDatabaseApi: vi.fn(),
    isCustomSchema: vi.fn(() => false),
    getSchemaByKey: vi.fn(() => null),
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: routeMocks.refetch,
    customSchemas: [],
    ...overrides
  };
}

beforeEach(() => {
  routeMocks.selectTable.mockReset();
  routeMocks.refetch.mockClear();
  routeMocks.selectors = selectors();
});

afterEach(cleanup);

describe('SchemasRoute initial table selection', () => {
  it('selects the first APP table once when a schema arrives after commit', async () => {
    const view = render(<SchemasRoute />);
    expect(routeMocks.selectTable).not.toHaveBeenCalled();

    const currentSchema = schemaWith([systemTable, appTable]);
    routeMocks.selectors = selectors({ currentSchema });
    view.rerender(<SchemasRoute />);

    await waitFor(() => {
      expect(routeMocks.selectTable).toHaveBeenCalledWith('app-table', 'posts');
    });
    expect(routeMocks.selectTable).toHaveBeenCalledTimes(1);

    view.rerender(<SchemasRoute emptyState={<p>Unrelated host update</p>} />);
    expect(routeMocks.selectTable).toHaveBeenCalledTimes(1);
  });

  it('does not select a system table when no APP table exists', () => {
    routeMocks.selectors = selectors({ currentSchema: schemaWith([systemTable]) });
    render(<SchemasRoute />);

    expect(routeMocks.selectTable).not.toHaveBeenCalled();
  });

  it('does not replace an existing table selection', () => {
    routeMocks.selectors = selectors({
      currentSchema: schemaWith([appTable]),
      currentTable: appTable,
      selectedTableId: appTable.id
    });
    render(<SchemasRoute />);

    expect(routeMocks.selectTable).not.toHaveBeenCalled();
  });
});

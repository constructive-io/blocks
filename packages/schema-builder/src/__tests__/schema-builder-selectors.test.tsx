import type { ReactNode } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const dataMocks = vi.hoisted(() => ({
  accessibleDatabaseCalls: 0,
  refetchDatabases: vi.fn(async () => undefined),
  transformedSchemas: [] as unknown[],
  databases: [] as unknown[],
  primaryKeyConstraints: [] as unknown[],
  uniqueConstraints: [] as unknown[],
  foreignKeyConstraints: [] as unknown[],
  indexes: [] as unknown[]
}));

vi.mock(
  '../schema/schema-builder-core/lib/gql/hooks/schema-builder/use-accessible-databases',
  () => ({
    useAccessibleDatabases: () => {
      dataMocks.accessibleDatabaseCalls += 1;
      return {
        databases: dataMocks.databases,
        hasResolved: true,
        isLoading: false,
        isFetching: false,
        error: null,
        refetch: dataMocks.refetchDatabases
      };
    }
  })
);

vi.mock(
  '../schema/schema-builder-core/lib/gql/hooks/schema-builder/use-database-constraints',
  () => ({
    useDatabaseConstraints: () => ({
      primaryKeyConstraints: dataMocks.primaryKeyConstraints,
      uniqueConstraints: dataMocks.uniqueConstraints,
      foreignKeyConstraints: dataMocks.foreignKeyConstraints,
      indexes: dataMocks.indexes,
      isLoading: false,
      isFetching: false,
      error: null
    })
  })
);

vi.mock(
  '../schema/schema-builder-core/lib/gql/hooks/schema-builder/transformers/transformers',
  () => ({
    transformUserDatabases: () => dataMocks.transformedSchemas
  })
);

import { SchemaBuilderProvider } from '../core/context';
import { createNoopSchemaBuilderAdapter } from '../testing';
import { DEFAULT_SCHEMA_BUILDER_PREFERENCES } from '../types';
import {
  SchemaBuilderDataProvider,
  type SchemaBuilderDataState,
  type UseSchemaBuilderSelectorsResult,
  useSchemaBuilderDataSelector,
  useSchemaBuilderSelectors
} from '../schema/schema-builder-core/lib/gql/hooks/schema-builder/use-schema-builder-selectors';

const adapter = createNoopSchemaBuilderAdapter();
const scope = { orgId: 'org-1', databaseId: 'db-1', userId: 'user-1' };
const preferences = { ...DEFAULT_SCHEMA_BUILDER_PREFERENCES };
const tabs = [] as const;
const onPreferencesChange = vi.fn();
const onActiveTabChange = vi.fn();

let latestSelectors: UseSchemaBuilderSelectorsResult | null = null;

function SelectorProbe() {
  const selectors = useSchemaBuilderSelectors();
  latestSelectors = selectors;

  return (
    <>
      <output data-testid='selected-table'>{selectors.selectedTableId ?? ''}</output>
      <output data-testid='selected-field'>{selectors.selectedFieldId ?? ''}</output>
    </>
  );
}

function TestTree({
  onSelectedTableChange,
  children
}: {
  onSelectedTableChange: (selection: { tableId: string | null; tableName: string | null }) => void;
  children?: ReactNode;
}) {
  return (
    <SchemaBuilderProvider
      adapter={adapter}
      scope={scope}
      colorMode='light'
      preferences={preferences}
      onPreferencesChange={onPreferencesChange}
      activeTab='editor'
      onActiveTabChange={onActiveTabChange}
      onSelectedTableChange={onSelectedTableChange}
      tabs={tabs}
    >
      <SchemaBuilderDataProvider>
        <SelectorProbe />
        {children}
      </SchemaBuilderDataProvider>
    </SchemaBuilderProvider>
  );
}

function currentSelectors() {
  if (!latestSelectors) throw new Error('Selector probe has not rendered');
  return latestSelectors;
}

beforeEach(() => {
  latestSelectors = null;
  dataMocks.accessibleDatabaseCalls = 0;
  dataMocks.refetchDatabases.mockClear();
  onPreferencesChange.mockClear();
  onActiveTabChange.mockClear();
});

afterEach(cleanup);

describe('schema builder selector identities', () => {
  it('reuses host data state without mounting block-owned queries', () => {
    const hostState: SchemaBuilderDataState = {
      availableSchemas: [],
      routeOrgId: 'org-host',
      routeDatabaseId: 'db-host',
      selectedSchemaKey: 'db-db-host',
      currentSchemaInfo: null,
      currentSchema: null,
      currentTable: null,
      selectedTableId: 'table-host',
      hasResolvedDatabaseLookup: true,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(async () => undefined),
      selectTable: vi.fn()
    };

    function HostStateProbe() {
      const databaseId = useSchemaBuilderDataSelector((state) => state.routeDatabaseId);
      const tableId = useSchemaBuilderDataSelector((state) => state.selectedTableId);
      return <output>{databaseId}:{tableId}</output>;
    }

    render(
      <SchemaBuilderDataProvider value={hostState}>
        <HostStateProbe />
      </SchemaBuilderDataProvider>
    );

    expect(screen.getByText('db-host:table-host')).toBeTruthy();
    expect(dataMocks.accessibleDatabaseCalls).toBe(0);
  });

  it('preserves field clearing for table selection and clearing all selections', () => {
    const onSelectedTableChange = vi.fn();
    render(<TestTree onSelectedTableChange={onSelectedTableChange} />);

    act(() => currentSelectors().selectField('field-1'));
    expect(screen.getByTestId('selected-field').textContent).toBe('field-1');

    act(() => currentSelectors().selectTable('table-1', 'Posts'));
    expect(screen.getByTestId('selected-table').textContent).toBe('table-1');
    expect(screen.getByTestId('selected-field').textContent).toBe('');
    expect(onSelectedTableChange).toHaveBeenLastCalledWith({
      tableId: 'table-1',
      tableName: 'Posts'
    });

    act(() => currentSelectors().selectField('field-2'));
    act(() => currentSelectors().clearAllSelections());
    expect(screen.getByTestId('selected-table').textContent).toBe('');
    expect(screen.getByTestId('selected-field').textContent).toBe('');
    expect(onSelectedTableChange).toHaveBeenLastCalledWith({
      tableId: null,
      tableName: null
    });
  });
});

import { memo, type ReactNode } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const dataMocks = vi.hoisted(() => ({
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
    useAccessibleDatabases: () => ({
      databases: dataMocks.databases,
      hasResolved: true,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: dataMocks.refetchDatabases
    })
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
let dataConsumerRenderCount = 0;

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

const StableDataConsumer = memo(function StableDataConsumer() {
  dataConsumerRenderCount += 1;
  const availableSchemas = useSchemaBuilderDataSelector((state) => state.availableSchemas);
  return <output data-testid='schema-count'>{availableSchemas.length}</output>;
});

function TestTree({
  unrelatedValue,
  onSelectedTableChange,
  children
}: {
  unrelatedValue: number;
  onSelectedTableChange: (selection: { tableId: string | null; tableName: string | null }) => void;
  children?: ReactNode;
}) {
  return (
    <div data-unrelated-value={unrelatedValue}>
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
          <StableDataConsumer />
          {children}
        </SchemaBuilderDataProvider>
      </SchemaBuilderProvider>
    </div>
  );
}

function currentSelectors() {
  if (!latestSelectors) throw new Error('Selector probe has not rendered');
  return latestSelectors;
}

beforeEach(() => {
  latestSelectors = null;
  dataConsumerRenderCount = 0;
  dataMocks.refetchDatabases.mockClear();
  onPreferencesChange.mockClear();
  onActiveTabChange.mockClear();
});

afterEach(cleanup);

describe('schema builder selector identities', () => {
  it('keeps actions stable across unrelated rerenders and changes only real dependents', () => {
    const firstSelectionHandler = vi.fn();
    const view = render(
      <TestTree unrelatedValue={0} onSelectedTableChange={firstSelectionHandler} />
    );
    const first = currentSelectors();

    view.rerender(
      <TestTree unrelatedValue={1} onSelectedTableChange={firstSelectionHandler} />
    );
    const afterUnrelatedRender = currentSelectors();

    expect(afterUnrelatedRender.selectOrg).toBe(first.selectOrg);
    expect(afterUnrelatedRender.selectSchema).toBe(first.selectSchema);
    expect(afterUnrelatedRender.selectTable).toBe(first.selectTable);
    expect(afterUnrelatedRender.selectField).toBe(first.selectField);
    expect(afterUnrelatedRender.clearAllSelections).toBe(first.clearAllSelections);
    expect(afterUnrelatedRender.setActiveTab).toBe(first.setActiveTab);
    expect(afterUnrelatedRender.setCurrentDatabaseApi).toBe(first.setCurrentDatabaseApi);
    expect(afterUnrelatedRender.isCustomSchema).toBe(first.isCustomSchema);
    expect(afterUnrelatedRender.getSchemaByKey).toBe(first.getSchemaByKey);
    expect(afterUnrelatedRender.customSchemas).toBe(first.customSchemas);
    expect(dataConsumerRenderCount).toBe(1);

    const nextSelectionHandler = vi.fn();
    view.rerender(
      <TestTree unrelatedValue={1} onSelectedTableChange={nextSelectionHandler} />
    );
    const afterDependencyChange = currentSelectors();

    expect(afterDependencyChange.selectTable).not.toBe(first.selectTable);
    expect(afterDependencyChange.clearAllSelections).not.toBe(first.clearAllSelections);
    expect(afterDependencyChange.selectField).toBe(first.selectField);
    expect(afterDependencyChange.setCurrentDatabaseApi).toBe(first.setCurrentDatabaseApi);
    expect(afterDependencyChange.selectOrg).toBe(first.selectOrg);
    expect(afterDependencyChange.selectSchema).toBe(first.selectSchema);
    expect(afterDependencyChange.setActiveTab).toBe(first.setActiveTab);
    expect(dataConsumerRenderCount).toBe(1);
  });

  it('preserves field clearing for table selection and clearing all selections', () => {
    const onSelectedTableChange = vi.fn();
    render(<TestTree unrelatedValue={0} onSelectedTableChange={onSelectedTableChange} />);

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
    expect(dataConsumerRenderCount).toBe(1);
  });
});

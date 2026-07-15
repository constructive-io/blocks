import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StrictMode, Suspense, useEffect, type PropsWithChildren } from 'react';

import { SchemaBuilderProvider, useSchemaBuilder, useSchemaBuilderStore } from '../core/context';
import { useSchemaBuilderMutation } from '../core/mutation';
import { schemaBuilderQueryKey } from '../core/query';
import { createSchemaBuilderStore } from '../core/store';
import { createNoopSchemaBuilderAdapter } from '../testing';
import { useCreateIndexMutation } from '../compat/schema-builder-sdk';
import {
  DEFAULT_SCHEMA_BUILDER_PREFERENCES,
  type SchemaBuilderHostOptions,
  type SchemaBuilderPreferences
} from '../types';

afterEach(cleanup);

const scope = { orgId: 'org-1', databaseId: 'db-1', userId: 'user-1' };

function createHost(overrides: Partial<SchemaBuilderHostOptions> = {}): SchemaBuilderHostOptions {
  return {
    adapter: createNoopSchemaBuilderAdapter(),
    scope,
    colorMode: 'light',
    preferences: { ...DEFAULT_SCHEMA_BUILDER_PREFERENCES },
    onPreferencesChange: vi.fn(),
    activeTab: 'editor',
    onActiveTabChange: vi.fn(),
    ...overrides
  };
}

describe('SchemaBuilderProvider', () => {
  it('keeps selection state isolated per provider instance', () => {
    function Selection({ name }: { name: string }) {
      const selected = useSchemaBuilderStore((state) => state.selectedTableId);
      const { selectTable } = useSchemaBuilder();
      return <button onClick={() => selectTable(name)}>{selected ?? `select-${name}`}</button>;
    }

    render(
      <>
        <SchemaBuilderProvider {...createHost()}><Selection name='alpha' /></SchemaBuilderProvider>
        <SchemaBuilderProvider {...createHost()}><Selection name='beta' /></SchemaBuilderProvider>
      </>
    );

    fireEvent.click(screen.getByText('select-alpha'));
    expect(screen.getByText('alpha')).toBeTruthy();
    expect(screen.getByText('select-beta')).toBeTruthy();
  });

  it('resets transient selection when scope changes', () => {
    const store = createSchemaBuilderStore(scope, { ...DEFAULT_SCHEMA_BUILDER_PREFERENCES }, 'editor');
    store.getState().setSelectedTableId('table-1');
    store.getState().setSelectedFieldId('field-1');
    store.getState().replaceScope({ ...scope, databaseId: 'db-2' });
    expect(store.getState().selectedTableId).toBeNull();
    expect(store.getState().selectedFieldId).toBeNull();
  });

  it('initializes controlled table selection and emits the selected id and name', () => {
    const onSelectedTableChange = vi.fn();

    function TableSelection() {
      const selectedTableId = useSchemaBuilderStore((state) => state.selectedTableId);
      const { selectTable } = useSchemaBuilder();
      return (
        <button onClick={() => selectTable('table-2', 'Accounts')}>
          {selectedTableId ?? 'none'}
        </button>
      );
    }

    const { rerender } = render(
      <SchemaBuilderProvider
        {...createHost({ selectedTableId: 'table-1', onSelectedTableChange })}
      >
        <TableSelection />
      </SchemaBuilderProvider>
    );

    expect(screen.getByText('table-1')).toBeTruthy();
    fireEvent.click(screen.getByText('table-1'));
    expect(screen.getByText('table-2')).toBeTruthy();
    expect(onSelectedTableChange).toHaveBeenCalledWith({
      tableId: 'table-2',
      tableName: 'Accounts'
    });

    rerender(
      <SchemaBuilderProvider
        {...createHost({ selectedTableId: 'table-3', onSelectedTableChange })}
      >
        <TableSelection />
      </SchemaBuilderProvider>
    );
    expect(screen.getByText('table-3')).toBeTruthy();
  });

  it('keeps tabs and preferences controlled and reflects host color mode', () => {
    const onActiveTabChange = vi.fn();
    const onPreferencesChange = vi.fn();

    function Controls() {
      const { setActiveTab, setPreferences, colorMode } = useSchemaBuilder();
      return (
        <>
          <span>{colorMode}</span>
          <button onClick={() => setActiveTab('indexes')}>indexes</button>
          <button onClick={() => setPreferences((value) => ({ ...value, sidebarPinned: true }))}>pin</button>
        </>
      );
    }

    const { rerender } = render(
      <SchemaBuilderProvider {...createHost({ onActiveTabChange, onPreferencesChange })}>
        <Controls />
      </SchemaBuilderProvider>
    );
    fireEvent.click(screen.getByText('indexes'));
    fireEvent.click(screen.getByText('pin'));
    expect(onActiveTabChange).toHaveBeenCalledWith('indexes');
    expect(onPreferencesChange).toHaveBeenCalledWith(
      expect.objectContaining({ sidebarPinned: true }) as SchemaBuilderPreferences
    );

    rerender(
      <SchemaBuilderProvider {...createHost({ colorMode: 'dark', onActiveTabChange, onPreferencesChange })}>
        <Controls />
      </SchemaBuilderProvider>
    );
    expect(screen.getByText('dark')).toBeTruthy();
  });

  it('preloads extension tabs and rejects duplicate or unknown ids', () => {
    const preload = vi.fn();
    function ExtensionControl() {
      const { setActiveTab } = useSchemaBuilder();
      return <button onClick={() => setActiveTab('diagram')}>diagram</button>;
    }
    render(
      <SchemaBuilderProvider
        {...createHost({ tabs: [{ id: 'diagram', label: 'Diagram', render: () => null, preload }] })}
      >
        <ExtensionControl />
      </SchemaBuilderProvider>
    );
    fireEvent.click(screen.getByText('diagram'));
    expect(preload).toHaveBeenCalledTimes(1);
    cleanup();

    expect(() => render(
      <SchemaBuilderProvider
        {...createHost({ tabs: [{ id: 'editor', label: 'Duplicate', render: () => null }] })}
      >
        <span>child</span>
      </SchemaBuilderProvider>
    )).toThrow(/Duplicate SchemaBuilder tab id/);
    cleanup();

    function UnknownWrapper({ children }: PropsWithChildren) {
      return <SchemaBuilderProvider {...createHost()}>{children}</SchemaBuilderProvider>;
    }
    const { result } = renderHook(() => useSchemaBuilder(), { wrapper: UnknownWrapper });
    expect(() => result.current.setActiveTab('missing')).toThrow(/Unknown SchemaBuilder tab id/);
  });

  it('keeps one committed store and stable default tabs while synchronizing host props', async () => {
    const stores = new Set<object>();
    const tabs = new Set<readonly unknown[]>();
    const initialPreferences = { ...DEFAULT_SCHEMA_BUILDER_PREFERENCES, sidebarPinned: false };
    const nextPreferences = { ...DEFAULT_SCHEMA_BUILDER_PREFERENCES, sidebarPinned: true };
    const baseHost = createHost({
      preferences: initialPreferences,
      selectedTableId: 'table-1'
    });

    function LifecycleProbe() {
      const runtime = useSchemaBuilder();
      const scopeKey = useSchemaBuilderStore((state) => state.scopeKey);
      const activeTab = useSchemaBuilderStore((state) => state.activeTab);
      const selectedTableId = useSchemaBuilderStore((state) => state.selectedTableId);
      const sidebarPinned = useSchemaBuilderStore((state) => state.preferences.sidebarPinned);

      useEffect(() => {
        stores.add(runtime.store);
        tabs.add(runtime.tabs ?? []);
      }, [runtime.store, runtime.tabs]);

      return (
        <output data-testid='core-lifecycle'>
          {scopeKey}|{activeTab}|{selectedTableId}|{String(sidebarPinned)}
        </output>
      );
    }

    const view = render(
      <SchemaBuilderProvider {...baseHost}>
        <LifecycleProbe />
      </SchemaBuilderProvider>
    );
    expect(screen.getByTestId('core-lifecycle').textContent).toBe(
      'org-1:db-1:user-1|editor|table-1|false'
    );

    view.rerender(
      <SchemaBuilderProvider
        {...baseHost}
        scope={{ ...scope, databaseId: 'db-2' }}
        preferences={nextPreferences}
        activeTab='security'
        selectedTableId='table-2'
      >
        <LifecycleProbe />
      </SchemaBuilderProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('core-lifecycle').textContent).toBe(
        'org-1:db-2:user-1|security|table-2|true'
      );
    });
    expect(stores.size).toBe(1);
    expect(tabs.size).toBe(1);
  });

  it('keeps one committed store through Strict Mode and isolates provider remounts', async () => {
    const firstStores = new Set<object>();
    const secondStores = new Set<object>();

    function StoreCapture({ stores }: { stores: Set<object> }) {
      const { store } = useSchemaBuilder();
      useEffect(() => {
        stores.add(store);
      }, [store, stores]);
      return null;
    }

    const first = render(
      <StrictMode>
        <SchemaBuilderProvider {...createHost()}>
          <StoreCapture stores={firstStores} />
        </SchemaBuilderProvider>
      </StrictMode>
    );
    await waitFor(() => expect(firstStores.size).toBe(1));
    first.rerender(
      <StrictMode>
        <SchemaBuilderProvider {...createHost({ colorMode: 'dark' })}>
          <StoreCapture stores={firstStores} />
        </SchemaBuilderProvider>
      </StrictMode>
    );
    expect(firstStores.size).toBe(1);
    first.unmount();

    render(
      <StrictMode>
        <SchemaBuilderProvider {...createHost()}>
          <StoreCapture stores={secondStores} />
        </SchemaBuilderProvider>
      </StrictMode>
    );
    await waitFor(() => expect(secondStores.size).toBe(1));
    expect([...secondStores][0]).not.toBe([...firstStores][0]);
  });

  it('does not leak a store from abandoned Suspense work into a committed provider', async () => {
    const suspended = new Promise<never>(() => undefined);
    const abandonedStores = new Set<object>();
    const committedStores = new Set<object>();

    function AbandonedProbe(): never {
      abandonedStores.add(useSchemaBuilder().store);
      throw suspended;
    }

    function CommittedProbe() {
      const { store } = useSchemaBuilder();
      const scopeKey = useSchemaBuilderStore((state) => state.scopeKey);
      useEffect(() => {
        committedStores.add(store);
      }, [store]);
      return <output data-testid='committed-core-scope'>{scopeKey}</output>;
    }

    const view = render(
      <Suspense fallback={<span>loading abandoned provider</span>}>
        <SchemaBuilderProvider key='abandoned' {...createHost()}>
          <AbandonedProbe />
        </SchemaBuilderProvider>
      </Suspense>
    );
    expect(screen.getByText('loading abandoned provider')).toBeTruthy();
    expect(abandonedStores.size).toBeGreaterThan(0);

    view.rerender(
      <Suspense fallback={<span>loading committed provider</span>}>
        <SchemaBuilderProvider
          key='committed'
          {...createHost({ scope: { ...scope, databaseId: 'db-committed' } })}
        >
          <CommittedProbe />
        </SchemaBuilderProvider>
      </Suspense>
    );

    await waitFor(() => expect(committedStores.size).toBe(1));
    expect(screen.getByTestId('committed-core-scope').textContent).toBe(
      'org-1:db-committed:user-1'
    );
    expect(abandonedStores.has([...committedStores][0])).toBe(false);
  });
});

describe('adapter and query boundaries', () => {
  it('builds cache keys from the complete scope', () => {
    expect(schemaBuilderQueryKey(scope, 'core', 'tables', { first: 20 })).toEqual([
      '@constructive-io/schema-builder',
      'org-1',
      'db-1',
      'user-1',
      'core',
      'tables',
      { first: 20 }
    ]);
  });

  it('calls adapter mutations and reports invalidation events', async () => {
    const createIndex = vi.fn().mockResolvedValue({ id: 'index-1' });
    const onInvalidate = vi.fn();
    const adapter = createNoopSchemaBuilderAdapter();
    adapter.indexes.createIndex = createIndex;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    function Wrapper({ children }: PropsWithChildren) {
      return (
        <QueryClientProvider client={queryClient}>
          <SchemaBuilderProvider {...createHost({ adapter, onInvalidate })}>{children}</SchemaBuilderProvider>
        </QueryClientProvider>
      );
    }

    const selection = { id: true, name: true };
    const { result } = renderHook(
      () => useSchemaBuilderMutation('indexes', 'createIndex', { selection }),
      { wrapper: Wrapper }
    );
    await act(() => result.current.mutateAsync({ name: 'by_name' }));
    await waitFor(() => expect(onInvalidate).toHaveBeenCalledTimes(1));
    expect(createIndex).toHaveBeenCalledWith({ name: 'by_name' }, { scope, selection });
    expect(onInvalidate).toHaveBeenCalledWith({ scope, feature: 'indexes', operation: 'createIndex' });
  });

  it('forwards generated mutation selections through the adapter context', async () => {
    const createIndex = vi.fn().mockResolvedValue({ createIndex: { index: { id: 'index-1' } } });
    const adapter = createNoopSchemaBuilderAdapter();
    adapter.indexes.createIndex = createIndex;
    const queryClient = new QueryClient();

    function Wrapper({ children }: PropsWithChildren) {
      return (
        <QueryClientProvider client={queryClient}>
          <SchemaBuilderProvider {...createHost({ adapter })}>{children}</SchemaBuilderProvider>
        </QueryClientProvider>
      );
    }

    const selection = { id: true, name: true };
    const { result } = renderHook(() => useCreateIndexMutation({ selection: { fields: selection } }), {
      wrapper: Wrapper
    });
    await act(() => result.current.mutateAsync({ name: 'by_name' }));
    expect(createIndex).toHaveBeenCalledWith(
      { name: 'by_name' },
      { scope, selection }
    );
  });
});

'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react';
import { useStore } from 'zustand';
import type { StoreApi } from 'zustand/vanilla';

import { createSchemaBuilderStore, type SchemaBuilderStoreState } from './store';
import type {
  SchemaBuilderHostOptions,
  SchemaBuilderPreferences,
  SchemaBuilderTab
} from '../types';

const CORE_TAB_IDS = new Set(['editor', 'relationships', 'indexes', 'security']);
const EMPTY_TABS: readonly SchemaBuilderTab[] = [];

export interface SchemaBuilderContextValue extends SchemaBuilderHostOptions {
  store: StoreApi<SchemaBuilderStoreState>;
  setActiveTab: (tabId: string) => void;
  setPreferences: (
    preferences:
      | SchemaBuilderPreferences
      | ((current: SchemaBuilderPreferences) => SchemaBuilderPreferences)
  ) => void;
  selectTable: (tableId: string | null, tableName?: string | null) => void;
  selectField: (fieldId: string | null) => void;
}

const SchemaBuilderContext = createContext<SchemaBuilderContextValue | null>(null);

function validateExtensionTabs(tabs: readonly SchemaBuilderTab[]): void {
  const seen = new Set(CORE_TAB_IDS);

  for (const tab of tabs) {
    if (!tab.id.trim()) throw new Error('SchemaBuilder extension tab ids cannot be empty');
    if (seen.has(tab.id)) {
      throw new Error(`Duplicate SchemaBuilder tab id: ${tab.id}`);
    }
    seen.add(tab.id);
  }
}

export interface SchemaBuilderProviderProps extends SchemaBuilderHostOptions {
  children: ReactNode;
}

export function SchemaBuilderProvider({
  children,
  tabs = EMPTY_TABS,
  ...host
}: SchemaBuilderProviderProps) {
  const [store] = useState(() =>
    createSchemaBuilderStore(
      host.scope,
      host.preferences,
      host.activeTab,
      host.selectedTableId ?? null
    )
  );

  const validatedTabs = useMemo(() => {
    validateExtensionTabs(tabs);
    return tabs;
  }, [tabs]);

  useEffect(() => {
    store.getState().replaceScope(host.scope);
  }, [host.scope, store]);

  useEffect(() => {
    store.getState().replacePreferences(host.preferences);
  }, [host.preferences, store]);

  useEffect(() => {
    store.getState().replaceActiveTab(host.activeTab);
  }, [host.activeTab, store]);

  useEffect(() => {
    if (host.selectedTableId !== undefined) {
      store.getState().setSelectedTableId(host.selectedTableId);
    }
  }, [host.scope, host.selectedTableId, store]);

  const setActiveTab = useCallback(
    (tabId: string) => {
      const extension = validatedTabs.find((tab) => tab.id === tabId);
      if (!CORE_TAB_IDS.has(tabId) && !extension) {
        throw new Error(`Unknown SchemaBuilder tab id: ${tabId}`);
      }
      void extension?.preload?.();
      store.getState().replaceActiveTab(tabId);
      host.onActiveTabChange(tabId);
    },
    [host.onActiveTabChange, store, validatedTabs]
  );

  const setPreferences = useCallback(
    (
      update:
        | SchemaBuilderPreferences
        | ((current: SchemaBuilderPreferences) => SchemaBuilderPreferences)
    ) => {
      const current = store.getState().preferences;
      const next = typeof update === 'function' ? update(current) : update;
      store.getState().replacePreferences(next);
      host.onPreferencesChange(next);
    },
    [host.onPreferencesChange, store]
  );

  const selectTable = useCallback(
    (tableId: string | null, tableName?: string | null) => {
      store.getState().setSelectedTableId(tableId);
      host.onSelectedTableChange?.({ tableId, tableName: tableName ?? null });
    },
    [host.onSelectedTableChange, store]
  );
  const selectField = useCallback(
    (fieldId: string | null) => store.getState().setSelectedFieldId(fieldId),
    [store]
  );

  const value = useMemo<SchemaBuilderContextValue>(
    () => ({
      ...host,
      tabs: validatedTabs,
      store,
      setActiveTab,
      setPreferences,
      selectTable,
      selectField
    }),
    [host, selectField, selectTable, setActiveTab, setPreferences, store, validatedTabs]
  );

  return <SchemaBuilderContext.Provider value={value}>{children}</SchemaBuilderContext.Provider>;
}

export function useSchemaBuilder(): SchemaBuilderContextValue {
  const value = useContext(SchemaBuilderContext);
  if (!value) throw new Error('SchemaBuilderProvider is missing');
  return value;
}

export function useSchemaBuilderStore<T>(selector: (state: SchemaBuilderStoreState) => T): T {
  const { store } = useSchemaBuilder();
  return useStore(store, selector);
}

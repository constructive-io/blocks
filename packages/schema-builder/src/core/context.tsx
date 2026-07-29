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

export function SchemaBuilderProvider(props: SchemaBuilderProviderProps) {
  const { children, tabs = EMPTY_TABS } = props;
  const [store] = useState(() =>
    createSchemaBuilderStore(
      props.scope,
      props.preferences,
      props.activeTab,
      props.selectedTableId ?? null
    )
  );

  const validatedTabs = useMemo(() => {
    validateExtensionTabs(tabs);
    return tabs;
  }, [tabs]);

  useEffect(() => {
    store.getState().replaceScope(props.scope);
  }, [props.scope, store]);

  useEffect(() => {
    store.getState().replacePreferences(props.preferences);
  }, [props.preferences, store]);

  useEffect(() => {
    store.getState().replaceActiveTab(props.activeTab);
  }, [props.activeTab, store]);

  useEffect(() => {
    if (props.selectedTableId !== undefined) {
      store.getState().setSelectedTableId(props.selectedTableId);
    }
  }, [props.scope, props.selectedTableId, store]);

  const setActiveTab = useCallback(
    (tabId: string) => {
      const extension = validatedTabs.find((tab) => tab.id === tabId);
      if (!CORE_TAB_IDS.has(tabId) && !extension) {
        throw new Error(`Unknown SchemaBuilder tab id: ${tabId}`);
      }
      void extension?.preload?.();
      store.getState().replaceActiveTab(tabId);
      props.onActiveTabChange(tabId);
    },
    [props.onActiveTabChange, store, validatedTabs]
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
      props.onPreferencesChange(next);
    },
    [props.onPreferencesChange, store]
  );

  const selectTable = useCallback(
    (tableId: string | null, tableName?: string | null) => {
      store.getState().setSelectedTableId(tableId);
      props.onSelectedTableChange?.({ tableId, tableName: tableName ?? null });
    },
    [props.onSelectedTableChange, store]
  );
  const selectField = useCallback(
    (fieldId: string | null) => store.getState().setSelectedFieldId(fieldId),
    [store]
  );

  const value = useMemo<SchemaBuilderContextValue>(
    () => ({
      adapter: props.adapter,
      scope: props.scope,
      colorMode: props.colorMode,
      preferences: props.preferences,
      onPreferencesChange: props.onPreferencesChange,
      activeTab: props.activeTab,
      onActiveTabChange: props.onActiveTabChange,
      selectedTableId: props.selectedTableId,
      onSelectedTableChange: props.onSelectedTableChange,
      onNavigate: props.onNavigate,
      onInvalidate: props.onInvalidate,
      tabs: validatedTabs,
      store,
      setActiveTab,
      setPreferences,
      selectTable,
      selectField
    }),
    [
      props.activeTab,
      props.adapter,
      props.colorMode,
      props.onActiveTabChange,
      props.onInvalidate,
      props.onNavigate,
      props.onPreferencesChange,
      props.onSelectedTableChange,
      props.preferences,
      props.scope,
      props.selectedTableId,
      selectField,
      selectTable,
      setActiveTab,
      setPreferences,
      store,
      validatedTabs
    ]
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

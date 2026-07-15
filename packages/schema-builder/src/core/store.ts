import { createStore, type StoreApi } from 'zustand/vanilla';

import type { SchemaBuilderPreferences, SchemaBuilderScope } from '../types';

export interface SchemaBuilderStoreState {
  scopeKey: string;
  selectedTableId: string | null;
  selectedFieldId: string | null;
  currentDatabaseApi: unknown | null;
  preferences: SchemaBuilderPreferences;
  activeTab: string;
  setSelectedTableId: (tableId: string | null) => void;
  setSelectedFieldId: (fieldId: string | null) => void;
  setCurrentDatabaseApi: (api: unknown | null) => void;
  replacePreferences: (preferences: SchemaBuilderPreferences) => void;
  replaceActiveTab: (tabId: string) => void;
  replaceScope: (scope: SchemaBuilderScope) => void;
}

export function getSchemaBuilderScopeKey(scope: SchemaBuilderScope): string {
  return [scope.orgId, scope.databaseId, scope.userId ?? 'anonymous'].join(':');
}

export function createSchemaBuilderStore(
  scope: SchemaBuilderScope,
  preferences: SchemaBuilderPreferences,
  activeTab: string,
  selectedTableId: string | null = null
): StoreApi<SchemaBuilderStoreState> {
  return createStore<SchemaBuilderStoreState>((set, get) => ({
    scopeKey: getSchemaBuilderScopeKey(scope),
    selectedTableId,
    selectedFieldId: null,
    currentDatabaseApi: null,
    preferences,
    activeTab,
    setSelectedTableId: (selectedTableId) =>
      set({
        selectedTableId,
        selectedFieldId: selectedTableId === get().selectedTableId ? get().selectedFieldId : null
      }),
    setSelectedFieldId: (selectedFieldId) => set({ selectedFieldId }),
    setCurrentDatabaseApi: (currentDatabaseApi) => set({ currentDatabaseApi }),
    replacePreferences: (nextPreferences) => set({ preferences: nextPreferences }),
    replaceActiveTab: (nextActiveTab) => set({ activeTab: nextActiveTab }),
    replaceScope: (nextScope) => {
      const nextScopeKey = getSchemaBuilderScopeKey(nextScope);
      if (nextScopeKey === get().scopeKey) return;

      set({
        scopeKey: nextScopeKey,
        selectedTableId: null,
        selectedFieldId: null,
        currentDatabaseApi: null
      });
    }
  }));
}

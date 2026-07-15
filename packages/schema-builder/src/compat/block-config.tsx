'use client';

import type { ReactNode } from 'react';

import { useSchemaBuilder, useSchemaBuilderStore } from '../core/context';
import { schemaBuilderQueryKey } from '../core/query';
import { useAdminSdkClient } from './admin-sdk';
import { useAuthSdkClient } from './auth-sdk';
import { useSchemaBuilderSdkClient } from './schema-builder-sdk';
import type {
  SchemaBuilderColorMode,
  SchemaBuilderNavigationTarget,
  SchemaBuilderPreferences,
  SchemaBuilderScope,
  SchemaBuilderTab,
  SchemaBuilderTableSelection
} from '../types';

export type {
  SchemaBuilderColorMode,
  SchemaBuilderNavigationTarget,
  SchemaBuilderPreferences,
  SchemaBuilderScope,
  SchemaBuilderTab,
  SchemaBuilderTableSelection
} from '../types';

export interface SchemaBuilderConfig extends SchemaBuilderScope {
  colorMode?: SchemaBuilderColorMode;
  preferences?: SchemaBuilderPreferences;
  onPreferencesChange?: (preferences: SchemaBuilderPreferences) => void;
  activeTab?: string;
  onActiveTabChange?: (tabId: string) => void;
  selectedTableId?: string | null;
  onSelectedTableChange?: (selection: SchemaBuilderTableSelection) => void;
  onNavigate?: (target: SchemaBuilderNavigationTarget) => void;
  tabs?: readonly SchemaBuilderTab[];
}

export function SchemaBuilderConfigProvider({ children }: { config: SchemaBuilderConfig; children: ReactNode }) {
  return children;
}

export function useSchemaBuilderConfig(): SchemaBuilderScope {
  return useSchemaBuilder().scope;
}

export function useSchemaBuilderRuntime() {
  const runtime = useSchemaBuilder();
  return {
    ...runtime,
    setCurrentDatabaseApi: (api: unknown) => runtime.store.getState().setCurrentDatabaseApi(api)
  };
}

export function useSchemaBuilderRuntimeStore<T>(
  selector: Parameters<typeof useSchemaBuilderStore<T>>[0]
): T {
  return useSchemaBuilderStore(selector);
}

export { schemaBuilderQueryKey, useAdminSdkClient, useAuthSdkClient, useSchemaBuilderSdkClient };

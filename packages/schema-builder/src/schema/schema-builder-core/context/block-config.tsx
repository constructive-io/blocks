'use client';

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
	type ReactNode,
} from 'react';
import { useStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';
import {
	fetchApiSchemasQuery,
	fetchApisQuery,
	fetchDatabasesQuery,
	fetchFieldsQuery,
	fetchForeignKeyConstraintsQuery,
	fetchIndicesQuery,
	fetchPoliciesQuery,
	fetchPrimaryKeyConstraintsQuery,
	fetchSchemasQuery,
	fetchTableQuery,
	fetchTablesQuery,
	fetchUniqueConstraintsQuery,
} from '@/generated/schema-builder';
import { fetchUsersQuery } from '@/generated/auth/hooks';
import { fetchAppPermissionsQuery, fetchOrgPermissionsQuery } from '@/generated/admin/hooks';

export interface SchemaBuilderScope {
	orgId: string;
	databaseId: string;
	userId?: string | null;
}

export type SchemaBuilderColorMode = 'light' | 'dark';

export interface SchemaBuilderPreferences {
	sidebarSectionsExpanded: { app: boolean; system: boolean };
	showSystemTablesInSidebar: boolean;
	showSystemTablesInVisualizer: boolean;
	sidebarPinned: boolean;
	typesLibraryExpanded: boolean;
}

export interface SchemaBuilderNavigationTarget {
	href: string;
	replace?: boolean;
}

export interface SchemaBuilderTableSelection {
	tableId: string | null;
	tableName: string | null;
}

export interface SchemaBuilderTab {
	id: string;
	label: ReactNode;
	render: (context: {
		scope: SchemaBuilderScope;
		colorMode: SchemaBuilderColorMode;
		selectedTableId: string | null;
	}) => ReactNode;
	preload?: () => void | Promise<void>;
	hidden?: boolean;
}

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

const DEFAULT_PREFERENCES: SchemaBuilderPreferences = {
	sidebarSectionsExpanded: { app: true, system: false },
	showSystemTablesInSidebar: false,
	showSystemTablesInVisualizer: false,
	sidebarPinned: false,
	typesLibraryExpanded: true,
};

const CORE_TAB_IDS = new Set(['editor', 'relationships', 'indexes', 'security']);

interface SchemaBuilderRuntimeStoreState {
	scopeKey: string;
	preferences: SchemaBuilderPreferences;
	activeTab: string;
	selectedTableId: string | null;
	selectedFieldId: string | null;
	currentDatabaseApi: unknown;
	replaceScope: (scope: SchemaBuilderScope) => void;
	replacePreferences: (preferences: SchemaBuilderPreferences) => void;
	replaceActiveTab: (activeTab: string) => void;
	setSelectedTableId: (tableId: string | null) => void;
	setSelectedFieldId: (fieldId: string | null) => void;
	setCurrentDatabaseApi: (api: unknown) => void;
}

function getScopeKey(scope: SchemaBuilderScope) {
	return `${scope.orgId}:${scope.databaseId}:${scope.userId ?? ''}`;
}

function clonePreferences(preferences: SchemaBuilderPreferences): SchemaBuilderPreferences {
	return {
		...preferences,
		sidebarSectionsExpanded: { ...preferences.sidebarSectionsExpanded },
	};
}

function createRuntimeStore(config: SchemaBuilderConfig): StoreApi<SchemaBuilderRuntimeStoreState> {
	return createStore<SchemaBuilderRuntimeStoreState>((set, get) => ({
		scopeKey: getScopeKey(config),
		preferences: clonePreferences(config.preferences ?? DEFAULT_PREFERENCES),
		activeTab: config.activeTab ?? 'editor',
		selectedTableId: config.selectedTableId ?? null,
		selectedFieldId: null,
		currentDatabaseApi: null,
		replaceScope: (scope) => {
			const scopeKey = getScopeKey(scope);
			if (scopeKey === get().scopeKey) return;
			set({
				scopeKey,
				selectedTableId: null,
				selectedFieldId: null,
				currentDatabaseApi: null,
			});
		},
		replacePreferences: (preferences) => set({ preferences: clonePreferences(preferences) }),
		replaceActiveTab: (activeTab) => set({ activeTab }),
		setSelectedTableId: (selectedTableId) => set({ selectedTableId }),
		setSelectedFieldId: (selectedFieldId) => set({ selectedFieldId }),
		setCurrentDatabaseApi: (currentDatabaseApi) => set({ currentDatabaseApi }),
	}));
}

export interface SchemaBuilderRuntime {
	scope: SchemaBuilderScope;
	colorMode: SchemaBuilderColorMode;
	tabs: readonly SchemaBuilderTab[];
	onNavigate?: (target: SchemaBuilderNavigationTarget) => void;
	setActiveTab: (tabId: string) => void;
	setPreferences: (
		update: SchemaBuilderPreferences | ((current: SchemaBuilderPreferences) => SchemaBuilderPreferences),
	) => void;
	selectTable: (tableId: string | null, tableName?: string | null) => void;
	selectField: (fieldId: string | null) => void;
	setCurrentDatabaseApi: (api: unknown) => void;
	store: StoreApi<SchemaBuilderRuntimeStoreState>;
}

const SchemaBuilderRuntimeContext = createContext<SchemaBuilderRuntime | null>(null);

function validateTabs(tabs: readonly SchemaBuilderTab[]) {
	const seen = new Set(CORE_TAB_IDS);
	for (const tab of tabs) {
		if (!tab.id.trim()) throw new Error('SchemaBuilder extension tab ids cannot be empty');
		if (seen.has(tab.id)) throw new Error(`Duplicate SchemaBuilder tab id: ${tab.id}`);
		seen.add(tab.id);
	}
}

export function SchemaBuilderConfigProvider({
	config,
	children,
}: {
	config: SchemaBuilderConfig;
	children: ReactNode;
}) {
	const [store] = useState(() => createRuntimeStore(config));
	const scope = useMemo(
		() => ({ orgId: config.orgId, databaseId: config.databaseId, userId: config.userId }),
		[config.databaseId, config.orgId, config.userId],
	);
	const tabs = useMemo(() => {
		const value = config.tabs ?? [];
		validateTabs(value);
		return value;
	}, [config.tabs]);

	useEffect(() => store.getState().replaceScope(scope), [scope, store]);
	useEffect(() => {
		if (config.preferences) store.getState().replacePreferences(config.preferences);
	}, [config.preferences, store]);
	useEffect(() => {
		if (config.activeTab) store.getState().replaceActiveTab(config.activeTab);
	}, [config.activeTab, store]);
	useEffect(() => {
		if (config.selectedTableId !== undefined) store.getState().setSelectedTableId(config.selectedTableId);
	}, [config.selectedTableId, scope, store]);

	const setActiveTab = useCallback(
		(tabId: string) => {
			const extension = tabs.find((tab) => tab.id === tabId);
			if (!CORE_TAB_IDS.has(tabId) && !extension) throw new Error(`Unknown SchemaBuilder tab id: ${tabId}`);
			void extension?.preload?.();
			store.getState().replaceActiveTab(tabId);
			config.onActiveTabChange?.(tabId);
		},
		[config.onActiveTabChange, store, tabs],
	);
	const setPreferences = useCallback(
		(update: SchemaBuilderPreferences | ((current: SchemaBuilderPreferences) => SchemaBuilderPreferences)) => {
			const current = store.getState().preferences;
			const next = typeof update === 'function' ? update(current) : update;
			store.getState().replacePreferences(next);
			config.onPreferencesChange?.(next);
		},
		[config.onPreferencesChange, store],
	);

	const value = useMemo<SchemaBuilderRuntime>(
		() => ({
			scope,
			colorMode: config.colorMode ?? 'light',
			tabs,
			onNavigate: config.onNavigate,
			setActiveTab,
			setPreferences,
			selectTable: (tableId, tableName) => {
				store.getState().setSelectedTableId(tableId);
				config.onSelectedTableChange?.({ tableId, tableName: tableName ?? null });
			},
			selectField: (fieldId) => store.getState().setSelectedFieldId(fieldId),
			setCurrentDatabaseApi: (api) => store.getState().setCurrentDatabaseApi(api),
			store,
		}),
		[
			config.colorMode,
			config.onNavigate,
			config.onSelectedTableChange,
			scope,
			setActiveTab,
			setPreferences,
			store,
			tabs,
		],
	);

	return <SchemaBuilderRuntimeContext.Provider value={value}>{children}</SchemaBuilderRuntimeContext.Provider>;
}

export function useSchemaBuilderRuntime(): SchemaBuilderRuntime {
	const value = useContext(SchemaBuilderRuntimeContext);
	if (!value) throw new Error('SchemaBuilderConfigProvider is missing');
	return value;
}

export function useSchemaBuilderRuntimeStore<T>(selector: (state: SchemaBuilderRuntimeStoreState) => T): T {
	return useStore(useSchemaBuilderRuntime().store, selector);
}

export function useSchemaBuilderConfig(): SchemaBuilderScope {
	return useSchemaBuilderRuntime().scope;
}

export function schemaBuilderQueryKey(
	scope: SchemaBuilderScope,
	feature: string,
	operation: string,
	variables: object = {},
) {
	return [
		'@constructive-io/schema-builder',
		scope.orgId,
		scope.databaseId,
		scope.userId ?? null,
		feature,
		operation,
		variables,
	] as const;
}

export function useSchemaBuilderSdkClient() {
	return {
		fetchApiSchemasQuery,
		fetchApisQuery,
		fetchDatabasesQuery,
		fetchFieldsQuery,
		fetchForeignKeyConstraintsQuery,
		fetchIndicesQuery,
		fetchPoliciesQuery,
		fetchPrimaryKeyConstraintsQuery,
		fetchSchemasQuery,
		fetchTableQuery,
		fetchTablesQuery,
		fetchUniqueConstraintsQuery,
	};
}

export function useAuthSdkClient() {
	return { fetchUsersQuery };
}

export function useAdminSdkClient() {
	return { fetchAppPermissionsQuery, fetchOrgPermissionsQuery };
}

/**
 * Schema Builder Selectors Hook
 *
 * This hook provides derived state by combining:
 * 1. React Query data from SchemaBuilderDataProvider
 * 2. Zustand selection state (selectedSchemaKey, selectedTableId, etc.)
 *
 * All derived values are computed via useMemo - nothing is stored redundantly.
 * This eliminates the sync layer that caused race conditions.
 */
import { createElement, useCallback, useMemo, type ReactNode } from 'react';
import * as FluentContextSelector from '@fluentui/react-context-selector';

const fluentContextSelector = (
	FluentContextSelector as typeof FluentContextSelector & { default?: typeof FluentContextSelector }
).default ?? FluentContextSelector;
const { createContext, useContextSelector } = fluentContextSelector;

import type { DbLightSchema, FieldDefinition, SchemaData, TableDefinition } from '../../../schema';
import { dbLightToSchemaData } from '../../../schema';
import type { CurrentDatabaseApi, SchemaInfo as StoreSchemaInfo } from '../../../../store/schema-slice';
import {
	useSchemaBuilderConfig,
	useSchemaBuilderRuntime,
	useSchemaBuilderRuntimeStore,
} from '@/blocks/schema/schema-builder-core/context/block-config';

import { transformUserDatabases } from './transformers/transformers';
import { useAccessibleDatabases } from './use-accessible-databases';
import { useDatabaseConstraints } from './use-database-constraints';

// Re-export types for convenience
export type { CurrentDatabaseApi, StoreSchemaInfo };

export interface SchemaInfo {
	key: string;
	name: string;
	description: string;
	category: string;
	nodeCount: number;
	edgeCount: number;
	source: 'custom' | 'database';
	schema: SchemaData;
	dbSchema?: DbLightSchema;
	checksum?: string;
	databaseInfo?: {
		id: string;
		name: string;
		label?: string | null;
		schemaId?: string | null;
		ownerName?: string;
		ownerId?: string;
		tableCount: number;
		fieldCount: number;
	};
}

export interface CurrentDatabaseInfo {
	schemaKey: string;
	databaseId: string;
	name: string;
	label: string | null;
	schemaId: string | null;
}

const EMPTY_STORE_SCHEMAS: StoreSchemaInfo[] = [];
const EMPTY_SCHEMAS: SchemaInfo[] = EMPTY_STORE_SCHEMAS;
const NOOP_SELECT_ORG = (_orgId: string | null): void => undefined;
const NOOP_SELECT_SCHEMA = (_schemaKey: string): void => undefined;
const NOOP_SET_ACTIVE_TAB = (_tab: 'diagram' | 'schemas'): void => undefined;
const IS_CUSTOM_SCHEMA = (schemaKey: string) => schemaKey.startsWith('custom-');

export interface SchemaBuilderDataState {
	availableSchemas: SchemaInfo[];
	routeOrgId: string | null;
	routeDatabaseId: string | null;
	selectedSchemaKey: string;
	currentSchemaInfo: SchemaInfo | null;
	currentSchema: DbLightSchema | null;
	currentTable: TableDefinition | null;
	selectedTableId: string | null;
	hasResolvedDatabaseLookup: boolean;
	isLoading: boolean;
	isFetching: boolean;
	error: Error | null;
	refetch: () => Promise<unknown>;
	selectTable: (tableId: string | null, tableName?: string | null) => void;
}

const SchemaBuilderDataContext = createContext<SchemaBuilderDataState | null>(null);

export function SchemaBuilderDataProvider({ children }: { children: ReactNode }) {
	const { databaseId, orgId } = useSchemaBuilderConfig();
	const shouldLoadFullSchemaData = Boolean(databaseId);

	const {
		databases,
		hasResolved: hasResolvedAccessibleDatabases,
		isLoading: dbLoading,
		isFetching: dbFetching,
		error: dbError,
		refetch: refetchDatabases,
	} = useAccessibleDatabases({ enabled: shouldLoadFullSchemaData });

	const {
		primaryKeyConstraints,
		uniqueConstraints,
		foreignKeyConstraints,
		indexes,
		isLoading: constraintsLoading,
		isFetching: constraintsFetching,
		error: constraintsError,
	} = useDatabaseConstraints({ enabled: shouldLoadFullSchemaData });

	const remoteSchemas = useMemo<SchemaInfo[]>(() => {
		if (!shouldLoadFullSchemaData) return EMPTY_SCHEMAS;
		const transformed = transformUserDatabases(
			databases,
			primaryKeyConstraints,
			uniqueConstraints,
			foreignKeyConstraints,
			indexes,
		);

		return transformed.map((entry) => ({
			key: entry.key,
			name: entry.dbSchema.name,
			description: entry.description ?? entry.dbSchema.description ?? '',
			category: entry.category ?? 'Database',
			nodeCount: entry.dbSchema.tables.length,
			edgeCount: entry.dbSchema.relationships?.length ?? 0,
			source: 'database' as const,
			schema: dbLightToSchemaData(entry.dbSchema),
			dbSchema: entry.dbSchema,
			checksum: entry.checksum,
			databaseInfo: entry.databaseInfo,
		}));
	}, [
		databases,
		foreignKeyConstraints,
		indexes,
		primaryKeyConstraints,
		shouldLoadFullSchemaData,
		uniqueConstraints,
	]);

	const storeSelectedTableId = useSchemaBuilderRuntimeStore((state) => state.selectedTableId);
	const { selectTable: storeSelectTable } = useSchemaBuilderRuntime();

	const resolvedAvailableSchemas = shouldLoadFullSchemaData ? remoteSchemas : EMPTY_SCHEMAS;
	const hasResolvedDatabaseLookup = !databaseId ? true : hasResolvedAccessibleDatabases;
	const isLoading = shouldLoadFullSchemaData
		? !hasResolvedAccessibleDatabases || dbLoading || constraintsLoading
		: false;
	const isFetching = shouldLoadFullSchemaData ? dbFetching || constraintsFetching : false;
	const error = shouldLoadFullSchemaData ? dbError || constraintsError : null;

	const selectedSchemaKey = useMemo(() => {
		if (!databaseId) return '';
		return resolvedAvailableSchemas.find((schema) => schema.databaseInfo?.id === databaseId)?.key ?? '';
	}, [resolvedAvailableSchemas, databaseId]);

	const currentSchemaInfo = useMemo(
		() => resolvedAvailableSchemas.find((schema) => schema.key === selectedSchemaKey) ?? null,
		[resolvedAvailableSchemas, selectedSchemaKey],
	);

	const currentSchema = currentSchemaInfo?.dbSchema ?? null;

	const selectedTableId = storeSelectedTableId;

	const currentTable = useMemo(
		() => currentSchema?.tables.find((table) => table.id === selectedTableId) ?? null,
		[currentSchema, selectedTableId],
	);

	const selectTable = useCallback(
		(tableId: string | null, tableName?: string | null) => {
			storeSelectTable(tableId, tableName);
		},
		[storeSelectTable],
	);

	const refetch = useCallback(async () => {
		if (shouldLoadFullSchemaData) await refetchDatabases();
	}, [refetchDatabases, shouldLoadFullSchemaData]);

	const value = useMemo(
		() => ({
			availableSchemas: resolvedAvailableSchemas,
			routeOrgId: orgId,
			routeDatabaseId: databaseId,
			selectedSchemaKey,
			currentSchemaInfo,
			currentSchema,
			currentTable,
			selectedTableId,
			hasResolvedDatabaseLookup,
			isLoading,
			isFetching,
			error,
			refetch,
			selectTable,
		}),
		[
			resolvedAvailableSchemas,
			orgId,
			databaseId,
			selectedSchemaKey,
			currentSchemaInfo,
			currentSchema,
			currentTable,
			selectedTableId,
			hasResolvedDatabaseLookup,
			isLoading,
			isFetching,
			error,
			refetch,
			selectTable,
		],
	);

	return createElement(SchemaBuilderDataContext.Provider, { value }, children);
}

export function useSchemaBuilderDataSelector<T>(selector: (state: SchemaBuilderDataState) => T): T {
	return useContextSelector(SchemaBuilderDataContext, (state) => {
		if (!state) {
			throw new Error('SchemaBuilderDataProvider is missing');
		}
		return selector(state);
	});
}

export interface UseSchemaBuilderSelectorsResult {
	// === Entity Selection State (from Zustand) ===
	selectedOrgId: string | null;
	selectedSchemaKey: string; // database key
	selectedTableId: string | null;
	selectedFieldId: string | null;
	activeTab: 'diagram' | 'schemas';

	// === Entity Selection Actions (from Zustand, with cascade clearing) ===
	selectOrg: (orgId: string | null) => void;
	selectSchema: (schemaKey: string) => void;
	selectTable: (tableId: string | null, tableName?: string | null) => void;
	selectField: (fieldId: string | null) => void;
	clearAllSelections: () => void;
	setActiveTab: (tab: 'diagram' | 'schemas') => void;

	// === Derived Data (computed, not stored) ===
	availableSchemas: SchemaInfo[];
	currentSchema: DbLightSchema | null;
	currentTable: TableDefinition | null;
	currentField: FieldDefinition | null;
	currentDatabase: CurrentDatabaseInfo | null;

	// === API State (from Zustand, fetched separately) ===
	currentDatabaseApi: CurrentDatabaseApi | null;
	setCurrentDatabaseApi: (api: CurrentDatabaseApi | null) => void;

	// === Computed Helpers ===
	isCustomSchema: (schemaKey: string) => boolean;
	getSchemaByKey: (key: string) => SchemaInfo | null;

	// === Loading/Error State ===
	/** True only on initial load (no cached data yet). Use for blocking UI. */
	isLoading: boolean;
	/** True during any fetch (including background refetch). Use for syncing indicators. */
	isFetching: boolean;
	error: Error | null;
	refetch: () => Promise<unknown>;

	// === Custom Schemas (localStorage-backed, kept in Zustand) ===
	customSchemas: SchemaInfo[];
}

export function useSchemaBuilderSelectors(): UseSchemaBuilderSelectorsResult {
	// 1. Instance-scoped state. Entity scope itself remains host controlled.
	const {
		scope,
		store,
		selectField: selectFieldFromContext,
		selectTable: selectTableFromContext,
	} = useSchemaBuilderRuntime();
	const selectedFieldId = useSchemaBuilderRuntimeStore((state) => state.selectedFieldId);
	const currentDatabaseApi = useSchemaBuilderRuntimeStore((state) => state.currentDatabaseApi) as CurrentDatabaseApi | null;
	const selectedOrgId = scope.orgId;
	const activeTab = 'schemas' as const;
	const customSchemas = EMPTY_SCHEMAS;
	const selectOrg = NOOP_SELECT_ORG;
	const selectSchema = NOOP_SELECT_SCHEMA;
	const selectField = useCallback(
		(fieldId: string | null) => selectFieldFromContext(fieldId),
		[selectFieldFromContext],
	);
	const clearAllSelections = useCallback(() => {
		selectTableFromContext(null);
		selectFieldFromContext(null);
	}, [selectTableFromContext, selectFieldFromContext]);
	const setActiveTab = NOOP_SET_ACTIVE_TAB;
	const setCurrentDatabaseApi = useCallback(
		(api: CurrentDatabaseApi | null) => store.getState().setCurrentDatabaseApi(api),
		[store],
	);

	// 2. Get server + selection data from provider (computed once per tree)
	const availableSchemas = useSchemaBuilderDataSelector((state) => state.availableSchemas);
	const selectedSchemaKey = useSchemaBuilderDataSelector((state) => state.selectedSchemaKey);
	const currentSchemaInfo = useSchemaBuilderDataSelector((state) => state.currentSchemaInfo);
	const currentSchema = useSchemaBuilderDataSelector((state) => state.currentSchema);
	const currentTable = useSchemaBuilderDataSelector((state) => state.currentTable);
	const selectedTableId = useSchemaBuilderDataSelector((state) => state.selectedTableId);
	const isLoading = useSchemaBuilderDataSelector((state) => state.isLoading);
	const isFetching = useSchemaBuilderDataSelector((state) => state.isFetching);
	const error = useSchemaBuilderDataSelector((state) => state.error);
	const refetch = useSchemaBuilderDataSelector((state) => state.refetch);
	const selectTableFromProvider = useSchemaBuilderDataSelector((state) => state.selectTable);

	// 3. Derive current field (computed, not stored)
	const currentField = useMemo(
		() => currentTable?.fields.find((f) => f.id === selectedFieldId) ?? null,
		[currentTable, selectedFieldId],
	);

	// 8. Derive current database info (computed, not stored)
	const currentDatabase = useMemo<CurrentDatabaseInfo | null>(() => {
		if (!currentSchemaInfo?.databaseInfo) return null;
		return {
			schemaKey: selectedSchemaKey,
			databaseId: currentSchemaInfo.databaseInfo.id,
			name: currentSchemaInfo.databaseInfo.name,
			label: currentSchemaInfo.databaseInfo.label ?? null,
			schemaId: currentSchemaInfo.databaseInfo.schemaId ?? null,
		};
	}, [currentSchemaInfo, selectedSchemaKey]);

	// 9. Helper functions
	const isCustomSchema = IS_CUSTOM_SCHEMA;

	const getSchemaByKey = useCallback(
		(key: string) => availableSchemas.find((schema) => schema.key === key) ?? null,
		[availableSchemas],
	);

	// 10. Wrapped selection actions that clear dependent selections
	const selectTable = useCallback(
		(tableId: string | null, tableName?: string | null) => {
			selectTableFromProvider(tableId, tableName);
			// Always clear field selection when selecting a table
			selectField(null);
		},
		[selectTableFromProvider, selectField],
	);

	return {
		// Entity selection state
		selectedOrgId,
		selectedSchemaKey,
		selectedTableId,
		selectedFieldId,
		activeTab,

		// Entity selection actions (with cascade clearing)
		selectOrg,
		selectSchema,
		selectTable,
		selectField,
		clearAllSelections,
		setActiveTab,

		// Derived data
		availableSchemas,
		currentSchema,
		currentTable,
		currentField,
		currentDatabase,

		// API state (from Zustand)
		currentDatabaseApi,
		setCurrentDatabaseApi,

		// Helpers
		isCustomSchema,
		getSchemaByKey,

		// Loading/error
		isLoading,
		isFetching,
		error,
		refetch,

		// Custom schemas
		customSchemas,
	};
}

export interface UseVisualizerSchemaOptions {
	/** Show CORE/MODULE tables in addition to APP tables. Default: false */
	showSystemTables?: boolean;
}

/**
 * Hook to get visualizer schema data.
 * Computed from currentSchema - call this only where needed (visualizer components).
 *
 * @param options.showSystemTables - If true, include CORE/MODULE tables. Default: false (only APP tables)
 */
export function useVisualizerSchema(options?: UseVisualizerSchemaOptions): SchemaData | null {
	const { currentSchema } = useSchemaBuilderSelectors();
	const { showSystemTables = false } = options ?? {};

	return useMemo(() => {
		if (!currentSchema) return null;

		// Determine which categories to include
		const includeCategories: ('APP' | 'MODULE' | 'CORE')[] = showSystemTables ? ['APP', 'MODULE', 'CORE'] : ['APP'];

		return dbLightToSchemaData(currentSchema, { includeCategories });
	}, [currentSchema, showSystemTables]);
}

/**
 * Hook to get constraint information for a table.
 * Useful for field-level operations.
 */
export function useTableConstraints(tableId: string | null) {
	const { currentSchema } = useSchemaBuilderSelectors();

	return useMemo(() => {
		if (!tableId || !currentSchema) {
			return {
				primaryKey: null,
				uniqueConstraints: [],
				foreignKeyConstraints: [],
				indexes: [],
			};
		}

		const table = currentSchema.tables.find((t) => t.id === tableId);
		if (!table) {
			return {
				primaryKey: null,
				uniqueConstraints: [],
				foreignKeyConstraints: [],
				indexes: [],
			};
		}

		const constraints = table.constraints ?? [];
		let primaryKey = null;
		const uniqueConstraints = [];
		const foreignKeyConstraints = [];

		for (const c of constraints) {
			if (c.type === 'primary_key') primaryKey = c;
			else if (c.type === 'unique') uniqueConstraints.push(c);
			else if (c.type === 'foreign_key') foreignKeyConstraints.push(c);
		}

		return {
			primaryKey,
			uniqueConstraints,
			foreignKeyConstraints,
			indexes: table.indexes ?? [],
		};
	}, [tableId, currentSchema]);
}

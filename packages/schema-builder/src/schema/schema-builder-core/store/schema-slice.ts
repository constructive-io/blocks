/**
 * Schema Slice - Entity Selection & UI State
 *
 * NOTE: URL is the SOURCE OF TRUTH for entity selection.
 * Entity IDs (org, database) are read from URL path params via useEntityParams hook.
 * This Zustand slice provides:
 * 1. A sync target for layouts to write URL state to (for legacy components)
 * 2. Actions for entity selection that can be called during transition
 * 3. Non-URL state like selectedTable, activeTab, searchParams
 *
 * Entity Hierarchy (selection cascade):
 * - App (root) → Org → Database → Table → Field
 * - Selecting a parent clears all child selections
 *
 * URL Path Params (source of truth):
 * - orgId: from /orgs/[orgId]/*
 * - databaseId: from /orgs/[orgId]/databases/[databaseId]/*
 *
 * Zustand State (synced from URL or UI-only):
 * - selectedOrgId, selectedSchemaKey: synced from URL by layouts
 * - selectedTable, selectedField: UI state (will migrate to URL query params)
 * - activeTab, searchParams: UI state (will migrate to URL query params)
 * - customSchemas: localStorage-backed user schemas
 * - currentDatabaseApi: runtime state (fetched separately)
 *
 * What's NOT stored here (derived via selectors):
 * - availableSchemas, currentSchema, currentTable, currentField, currentDatabase
 */
import { StateCreator } from 'zustand';

import type { DbLightSchema, SchemaData } from '../lib/schema';
import { dbLightToSchemaData } from '../lib/schema';

// Custom schema storage key
const CUSTOM_SCHEMAS_STORAGE_KEY = 'constructive-custom-schemas';

// Schema source types
type SchemaSource = 'custom' | 'database';

const logger = {
	warn: (...args: unknown[]) => console.warn('[schema-slice]', ...args),
	error: (...args: unknown[]) => console.error('[schema-slice]', ...args),
};

export interface SchemaInfo {
	key: string;
	name: string;
	description: string;
	category: string;
	nodeCount: number;
	edgeCount: number;
	source: SchemaSource;
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

export interface CurrentDatabaseApi {
	id: string;
	name: string;
	url: string | null;
	domain?: string | null;
	subdomain?: string | null;
	isPublic?: boolean | null;
}

export interface SchemaSlice {
	// === Entity Selection State (hierarchy: org → database) ===
	selectedOrgId: string | null;
	selectedSchemaKey: string; // database key

	// === Schema Selection State (within database: table → field) ===
	selectedTable: string | null;
	selectedField: string | null;
	activeTab: 'diagram' | 'schemas';

	// === Search Params State ===
	searchParams: {
		search: string | null;
		sort: string;
		order: 'asc' | 'desc';
		page: number;
		limit: number;
		selected: string[] | null;
	};

	// === Custom Schemas (localStorage-backed) ===
	customSchemas: SchemaInfo[];

	// === API State (fetched separately, not derivable from schema) ===
	currentDatabaseApi: CurrentDatabaseApi | null;

	// === Entity Selection Actions (with cascade clearing) ===
	selectOrg: (orgId: string | null) => void;
	selectSchema: (schemaKey: string) => void;
	selectTable: (tableId: string | null) => void;
	selectField: (fieldId: string | null) => void;
	clearAllSelections: () => void;
	setActiveTab: (tab: 'diagram' | 'schemas') => void;

	// === Search Params Actions ===
	setSearch: (search: string | null) => void;
	setSorting: (sort: string, order?: 'asc' | 'desc') => void;
	setPage: (page: number) => void;
	setLimit: (limit: number) => void;
	setSelected: (selected: string[] | null) => void;
	clearFilters: () => void;

	// === Custom Schema Actions ===
	createCustomSchema: (name: string) => void;
	deleteCustomSchema: (schemaKey: string) => void;

	// === API State Actions ===
	setCurrentDatabaseApi: (api: CurrentDatabaseApi | null) => void;

	// === Computed Properties ===
	isCustomSchema: (schemaKey: string) => boolean;
	hasActiveFilters: boolean;
	selectedCount: number;

	// === Internal Helpers ===
	_loadCustomSchemas: () => SchemaInfo[];
	_saveCustomSchema: (key: string, dbSchema: DbLightSchema) => void;
	_deleteCustomSchemaFromStorage: (key: string) => void;
	_refreshCustomSchemas: () => void;
}

// Helper function to load custom schemas from localStorage
const loadCustomSchemasFromStorage = (): SchemaInfo[] => {
	if (typeof window === 'undefined') return [];

	try {
		const stored = localStorage.getItem(CUSTOM_SCHEMAS_STORAGE_KEY);
		if (!stored) return [];

		const parsed = JSON.parse(stored) as Record<string, DbLightSchema>;
		return Object.entries(parsed).map(([key, dbSchema]) => {
			const schemaData = dbLightToSchemaData(dbSchema);
			return {
				key,
				name: dbSchema.name,
				description: dbSchema.description || '',
				category: dbSchema.metadata?.tags?.[0] || 'Custom',
				nodeCount: dbSchema.tables.length,
				edgeCount: dbSchema.relationships?.length || 0,
				source: 'custom' as const,
				schema: schemaData,
				dbSchema,
			};
		});
	} catch (error) {
		logger.warn('Failed to load custom schemas', { error });
		return [];
	}
};

export const createSchemaSlice: StateCreator<SchemaSlice, [], [], SchemaSlice> = (set, get) => {
	// Initialize custom schemas from localStorage
	const customSchemas = loadCustomSchemasFromStorage();

	return {
		// === Initial Entity Selection State ===
		selectedOrgId: null,
		selectedSchemaKey: '',

		// === Initial Schema Selection State ===
		selectedTable: null,
		selectedField: null,
		activeTab: 'diagram',

		// === Initial Search Params State ===
		searchParams: {
			search: null,
			sort: 'name',
			order: 'asc',
			page: 1,
			limit: 20,
			selected: null,
		},
		customSchemas,
		currentDatabaseApi: null,

		// === Computed Properties ===
		isCustomSchema: (schemaKey: string) => {
			return schemaKey.startsWith('custom-');
		},

		hasActiveFilters: false,
		selectedCount: 0,

		// === Internal Helpers ===
		_loadCustomSchemas: () => {
			return loadCustomSchemasFromStorage();
		},

		_saveCustomSchema: (key: string, dbSchema: DbLightSchema) => {
			if (typeof window === 'undefined') return;

			try {
				const existing = localStorage.getItem(CUSTOM_SCHEMAS_STORAGE_KEY);
				const customSchemas = existing ? JSON.parse(existing) : {};

				customSchemas[key] = dbSchema;
				localStorage.setItem(CUSTOM_SCHEMAS_STORAGE_KEY, JSON.stringify(customSchemas));

				// Refresh custom schemas list
				get()._refreshCustomSchemas();
			} catch (error) {
				logger.error('Failed to save custom schema', { error });
			}
		},

		_deleteCustomSchemaFromStorage: (key: string) => {
			if (typeof window === 'undefined') return;

			try {
				const existing = localStorage.getItem(CUSTOM_SCHEMAS_STORAGE_KEY);
				if (!existing) return;

				const customSchemas = JSON.parse(existing);
				delete customSchemas[key];

				localStorage.setItem(CUSTOM_SCHEMAS_STORAGE_KEY, JSON.stringify(customSchemas));

				// Refresh custom schemas list
				get()._refreshCustomSchemas();
			} catch (error) {
				logger.error('Failed to delete custom schema', { error });
			}
		},

		_refreshCustomSchemas: () => {
			const customSchemas = loadCustomSchemasFromStorage();
			set({ customSchemas });
		},

		// === Entity Selection Actions (with cascade clearing) ===
		// Selecting a parent entity clears all child selections

		selectOrg: (orgId: string | null) => {
			set({
				selectedOrgId: orgId,
				// Clear all child selections when changing org
				selectedSchemaKey: '',
				selectedTable: null,
				selectedField: null,
			});
		},

		selectSchema: (schemaKey: string) => {
			// Guard: Skip if value hasn't changed
			if (get().selectedSchemaKey === schemaKey) return;
			set({
				selectedSchemaKey: schemaKey,
				// Clear table/field selection when switching schemas
				selectedTable: null,
				selectedField: null,
			});
		},

		selectTable: (tableId: string | null) => {
			// Guard: Skip if value hasn't changed
			if (get().selectedTable === tableId) return;
			set({
				selectedTable: tableId,
				// Clear field selection when switching tables
				selectedField: null,
			});
		},

		selectField: (fieldId: string | null) => {
			// Guard: Skip if value hasn't changed
			if (get().selectedField === fieldId) return;
			set({ selectedField: fieldId });
		},

		clearAllSelections: () => {
			set({
				selectedOrgId: null,
				selectedSchemaKey: '',
				selectedTable: null,
				selectedField: null,
			});
		},

		setActiveTab: (tab: 'diagram' | 'schemas') => {
			set({ activeTab: tab });
		},

		// === Search Params Actions ===
		setSearch: (search: string | null) => {
			const state = get();
			const newSearchParams = {
				...state.searchParams,
				search,
				page: 1, // Reset page when searching
			};
			const hasActiveFilters = !!(
				newSearchParams.search ||
				newSearchParams.sort !== 'name' ||
				newSearchParams.order !== 'asc' ||
				(newSearchParams.selected && newSearchParams.selected.length > 0)
			);
			set({
				searchParams: newSearchParams,
				hasActiveFilters,
			});
		},

		setSorting: (sort: string, order: 'asc' | 'desc' = 'asc') => {
			const state = get();
			const newSearchParams = {
				...state.searchParams,
				sort,
				order,
				page: 1, // Reset page when sorting
			};
			const hasActiveFilters = !!(
				newSearchParams.search ||
				newSearchParams.sort !== 'name' ||
				newSearchParams.order !== 'asc' ||
				(newSearchParams.selected && newSearchParams.selected.length > 0)
			);
			set({
				searchParams: newSearchParams,
				hasActiveFilters,
			});
		},

		setPage: (page: number) => {
			set({
				searchParams: {
					...get().searchParams,
					page,
				},
			});
		},

		setLimit: (limit: number) => {
			set({
				searchParams: {
					...get().searchParams,
					limit,
					page: 1, // Reset page when changing limit
				},
			});
		},

		setSelected: (selected: string[] | null) => {
			const state = get();
			const newSearchParams = {
				...state.searchParams,
				selected,
			};
			const hasActiveFilters = !!(
				newSearchParams.search ||
				newSearchParams.sort !== 'name' ||
				newSearchParams.order !== 'asc' ||
				(newSearchParams.selected && newSearchParams.selected.length > 0)
			);
			set({
				searchParams: newSearchParams,
				hasActiveFilters,
				selectedCount: selected?.length || 0,
			});
		},

		clearFilters: () => {
			const state = get();
			set({
				searchParams: {
					search: null,
					sort: 'name',
					order: 'asc',
					page: 1,
					selected: null,
					limit: state.searchParams.limit, // Keep limit
				},
				hasActiveFilters: false,
				selectedCount: 0,
			});
		},

		// === Custom Schema Actions ===
		createCustomSchema: (name: string) => {
			const key = `custom-${Date.now()}`;
			const dbSchema: DbLightSchema = {
				id: key,
				name,
				description: `Custom schema: ${name}`,
				version: '1.0.0',
				tables: [],
				relationships: [],
				metadata: {
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					author: 'Schema Builder',
					tags: ['Custom'],
				},
			};

			get()._saveCustomSchema(key, dbSchema);
			get().selectSchema(key);
		},

		deleteCustomSchema: (schemaKey: string) => {
			const state = get();

			get()._deleteCustomSchemaFromStorage(schemaKey);

			// If we're deleting the currently selected schema, clear selection
			if (state.selectedSchemaKey === schemaKey) {
				set({
					selectedSchemaKey: '',
					selectedTable: null,
					selectedField: null,
				});
			}
		},

		// === API State Actions ===
		setCurrentDatabaseApi: (api: CurrentDatabaseApi | null) => {
			set({ currentDatabaseApi: api });
		},
	};
};

/* ==== Serialization and deserialization ==== */
/**
 * What gets persisted to localStorage:
 *
 * NOT persisted (URL is source of truth):
 * - selectedOrgId - URL path params
 * - selectedSchemaKey - URL path param (databaseId)
 *
 * PERSISTED (non-URL state):
 * - selectedTable - will migrate to URL query param via nuqs
 * - activeTab - will migrate to URL query param via nuqs
 * - searchParams - will migrate to URL query params via nuqs
 * - currentDatabaseApi - runtime state, not derivable from URL
 * - customSchemas - stored separately in localStorage
 */
export const serializeSchemaSlice = (state: SchemaSlice) => ({
	// Only persist state that isn't in URL
	// Entity IDs (org, database) come from URL now
	selectedTable: state.selectedTable,
	// UI state - will eventually move to URL via nuqs
	activeTab: state.activeTab,
	searchParams: state.searchParams,
	currentDatabaseApi: state.currentDatabaseApi,
	// customSchemas are stored in localStorage separately
});

export const deserializeSchemaSlice = (state: SchemaSlice): Partial<SchemaSlice> => ({
	// Entity IDs start as null - URL will set them via layouts
	selectedOrgId: null,
	selectedSchemaKey: '',
	selectedTable: state.selectedTable,
	// UI state
	activeTab: state.activeTab || 'diagram',
	searchParams: state.searchParams || {
		search: null,
		sort: 'name',
		order: 'asc' as const,
		page: 1,
		limit: 20,
		selected: null,
	},
	currentDatabaseApi: state.currentDatabaseApi ?? null,
});

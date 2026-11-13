/**
 * Where saved views are kept.
 *
 * A host passes its own `SheetsViewStorage` as `SheetsConfig.views` (server
 * storage, for example); otherwise the grid keeps views in this browser's
 * local storage, keyed by endpoint, database, identity and table. A stored
 * state is never trusted: the grid validates it against the current table model
 * when it loads (see `validateSheetsViewState`).
 */

/** Which table's views, for whom. */
export interface SheetsViewStorageScope {
	endpoint: string;
	databaseId: string | null;
	/** The signed-in identity the host reports, or null. */
	identityKey: string | null;
	/** `TableModel.key` of the table. */
	tableKey: string;
}

/** One saved view as stored. */
export interface SheetsStoredView {
	id: string;
	name: string;
	/** A `SheetsViewState` when it was saved; validated against the model on load. */
	state: unknown;
	/** ISO timestamp of the last save. */
	updatedAt: string;
}

export interface SheetsViewStorage {
	/** Every saved view of one table. */
	list(scope: SheetsViewStorageScope): Promise<readonly SheetsStoredView[]>;
	/** Create or replace a view by id. */
	save(scope: SheetsViewStorageScope, view: SheetsStoredView): Promise<void>;
	/** Delete a view by id. */
	remove(scope: SheetsViewStorageScope, viewId: string): Promise<void>;
	/** The view last selected for this table, or null. Optional: without it no view is restored on load. */
	getActiveViewId?(scope: SheetsViewStorageScope): Promise<string | null>;
	setActiveViewId?(scope: SheetsViewStorageScope, viewId: string | null): Promise<void>;
}

/** Text that identifies a scope, for storage keys and cache keys. */
export function viewScopeKey(scope: SheetsViewStorageScope): string {
	return JSON.stringify([scope.endpoint, scope.databaseId, scope.identityKey, scope.tableKey]);
}

interface StoredTable {
	views: SheetsStoredView[];
	activeViewId: string | null;
}

/** The part of `Storage` this module uses (local storage, or a test double). */
export interface KeyValueStore {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
}

const KEY_PREFIX = 'constructive-sheets:views:';

function isStoredView(value: unknown): value is SheetsStoredView {
	if (!value || typeof value !== 'object') return false;
	const view = value as Record<string, unknown>;
	return typeof view.id === 'string' && typeof view.name === 'string' && typeof view.updatedAt === 'string';
}

/**
 * Views in a key-value store, one entry per table scope. Entries that cannot be
 * read are skipped, so one bad entry never loses the others.
 */
export function createKeyValueViewStorage(store: KeyValueStore): SheetsViewStorage {
	const read = (scope: SheetsViewStorageScope): StoredTable => {
		const raw = store.getItem(KEY_PREFIX + viewScopeKey(scope));
		if (!raw) return { views: [], activeViewId: null };
		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch {
			return { views: [], activeViewId: null };
		}
		const table = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
		return {
			views: Array.isArray(table.views) ? table.views.filter(isStoredView) : [],
			activeViewId: typeof table.activeViewId === 'string' ? table.activeViewId : null,
		};
	};
	const write = (scope: SheetsViewStorageScope, table: StoredTable) => {
		store.setItem(KEY_PREFIX + viewScopeKey(scope), JSON.stringify(table));
	};
	return {
		async list(scope) {
			return read(scope).views;
		},
		async save(scope, view) {
			const table = read(scope);
			const at = table.views.findIndex((candidate) => candidate.id === view.id);
			const views = at === -1 ? [...table.views, view] : table.views.map((candidate) => (candidate.id === view.id ? view : candidate));
			write(scope, { ...table, views });
		},
		async remove(scope, viewId) {
			const table = read(scope);
			write(scope, {
				views: table.views.filter((candidate) => candidate.id !== viewId),
				activeViewId: table.activeViewId === viewId ? null : table.activeViewId,
			});
		},
		async getActiveViewId(scope) {
			return read(scope).activeViewId;
		},
		async setActiveViewId(scope, viewId) {
			write(scope, { ...read(scope), activeViewId: viewId });
		},
	};
}

/** Views kept in memory for this page only (no browser storage, or tests). */
export function createMemoryViewStorage(): SheetsViewStorage {
	const entries = new Map<string, string>();
	return createKeyValueViewStorage({
		getItem: (key) => entries.get(key) ?? null,
		setItem: (key, value) => void entries.set(key, value),
	});
}

let browserStorage: SheetsViewStorage | null = null;

/**
 * The default storage: this browser's local storage. Where local storage is
 * missing or refuses access, views are kept for this page only.
 */
export function defaultViewStorage(): SheetsViewStorage {
	if (browserStorage) return browserStorage;
	let local: Storage | null = null;
	try {
		local = typeof window !== 'undefined' ? window.localStorage : null;
	} catch {
		local = null;
	}
	browserStorage = local ? createKeyValueViewStorage(local) : createMemoryViewStorage();
	return browserStorage;
}

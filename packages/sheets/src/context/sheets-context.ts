import { createContext, useContext } from 'react';
import type { QueryClient } from '@tanstack/react-query';

import type { DisplayFieldOverrides } from '@constructive-io/data';

import type { SheetsExecuteFn, SheetsUploadFn } from './sheets-execute';
import type { SheetsLogger } from '../utils/sheets-logger';
import type { CellTypePlugin } from '../cell-types/define-cell-type';
import type { SheetsBackendAdapter } from '../adapter/sheets-adapter';
import type { SheetsUploadConfig } from '../uploads/upload-config';
import type { SheetsViewStorage } from '../grid/views/view-storage';
import type { SheetsMapConfig } from '../utils/map-settings';

export interface SheetsAuthEmbedded {
	mode: 'embedded';
	getToken: () => string | null;
	/**
	 * Stable, non-secret identity used to isolate cached data between users.
	 * Hosts should return the authenticated user/session id, never the token.
	 * When omitted, the provider uses an opaque key that changes with the token.
	 */
	getIdentityKey?: () => string | null;
}

export interface SheetsAuthStandalone {
	mode: 'standalone';
}

export interface SheetsStorageTransport {
	endpoint: string;
	execute: SheetsExecuteFn;
}

export interface SheetsConfig {
	/** Data endpoint (app-public GraphQL) */
	endpoint: string;
	/** Auth endpoint (auth GraphQL) — required for standalone mode */
	authEndpoint?: string;
	/** Database ID for multi-tenant scoping */
	databaseId?: string;
	/** Auth mode */
	auth: SheetsAuthEmbedded | SheetsAuthStandalone;
	/** Field type overrides (replaces schema-builder smart tags) */
	fieldTypeOverrides?: Record<string, string>;
	/**
	 * Fields that label a record of a table (relation chips, pickers, record
	 * titles), keyed by `TableModel.key` or table name, in priority order.
	 * Tables without an entry use the built-in display rule.
	 */
	displayFields?: DisplayFieldOverrides;
	/** Optional: BCP-47 locale for locale-aware date/number formatting (default 'en-US'). */
	locale?: string;
	/**
	 * The geometry editor's map: tile URL and attribution, and the place search endpoint.
	 * Default: OpenStreetMap tiles and Nominatim search. `tiles: 'off'` edits shapes as
	 * GeoJSON text; `placeSearch: 'off'` removes the search box. With a
	 * Content-Security-Policy, allow the tile host in `img-src` and the search endpoint in
	 * `connect-src`.
	 */
	map?: SheetsMapConfig;
	/** Optional: inject custom execute function */
	execute?: SheetsExecuteFn;
	/** Optional: inject custom upload function */
	executeUpload?: SheetsUploadFn;
	/** Storage endpoint for media uploads and download URL lookups. */
	storage?: { endpoint: string; execute?: SheetsExecuteFn };
	/** Upload choices (bucket, owner, files table, per-column overrides); every field is optional. */
	upload?: SheetsUploadConfig;
	/**
	 * Where saved views are kept. Default: this browser's local storage, keyed by endpoint,
	 * database, identity and table. A host can supply server storage.
	 */
	views?: SheetsViewStorage;
	/** Optional: inject existing QueryClient */
	queryClient?: QueryClient;
	/** Optional: inject a custom backend adapter. Defaults to the PostGraphile adapter. */
	adapter?: SheetsBackendAdapter;
	/** Optional: provider-level cell-type plugins (consumer override layer). */
	plugins?: CellTypePlugin[];
	/** Called on 401/UNAUTHENTICATED before the error is thrown. Host app handles token cleanup. */
	onAuthError?: () => void;
	/** Optional: inject a custom logger. Installed into the module logger singleton by the provider. */
	logger?: SheetsLogger;
	/** Optional: called when a grid/editor/mutation/upload error surfaces. Host app handles reporting. */
	onError?: (
		error: unknown,
		ctx?: { source?: 'grid' | 'editor' | 'mutation' | 'upload'; tableName?: string },
	) => void;
}

export interface SheetsContextValue {
	config: SheetsConfig;
	execute: SheetsExecuteFn;
	executeUpload: SheetsUploadFn;
	storage?: SheetsStorageTransport;
	canUpload: boolean;
	scopeKey: SheetsScopeKey;
}

export interface SheetsScopeKey {
	databaseId: string | null;
	endpoint: string;
	identityKey: string | null;
}

export const SheetsContext = createContext<SheetsContextValue | null>(null);

export function useSheetsContext(): SheetsContextValue {
	const ctx = useContext(SheetsContext);
	if (!ctx) {
		throw new Error('useSheetsContext must be used within a <SheetsProvider>');
	}
	return ctx;
}

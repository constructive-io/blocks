import { createContext, useContext } from 'react';
import type { QueryClient } from '@tanstack/react-query';

import type { SheetsExecuteFn, SheetsUploadFn } from './sheets-execute';
import type { SheetsLogger } from '../utils/sheets-logger';
import type { CellTypePlugin } from '../cell-types/define-cell-type';
import type { SheetsBackendAdapter } from '../adapter/sheets-adapter';

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
	/** Optional: BCP-47 locale for locale-aware date/number formatting (default 'en-US'). */
	locale?: string;
	/** Optional: inject custom execute function */
	execute?: SheetsExecuteFn;
	/** Optional: inject custom upload function */
	executeUpload?: SheetsUploadFn;
	/** Optional upload settings. `bucketKey` defaults to "public". */
	upload?: { bucketKey?: string };
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

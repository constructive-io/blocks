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

/** What a host transport's `fetch` is asked to send: one GraphQL POST. */
export interface SheetsFetchInit {
	method: 'POST';
	headers: Record<string, string>;
	body: string;
	signal?: AbortSignal;
}

/**
 * Sends one GraphQL request and answers like the global `fetch`: any HTTP status
 * resolves; no answer (a network failure, or an abort) rejects.
 */
export type SheetsFetchFn = (url: string, init: SheetsFetchInit) => Promise<Response>;

/** Bytes of an upload that left so far. */
export interface UploadProgressEvent {
	loaded: number;
	total: number;
	percentage: number;
}

export interface SheetsPutOptions {
	/** Exactly the headers the upload payload names. The URL is signed over them. */
	headers: Record<string, string>;
	onProgress?: (progress: UploadProgressEvent) => void;
	signal?: AbortSignal;
}

/** The answer to a PUT, whatever its status. */
export interface SheetsPutResponse {
	status: number;
	statusText?: string;
	body: string;
}

/**
 * Sends a file's bytes to its presigned URL. Resolves with the answer, whatever
 * its status. Rejects only when no answer came: a network failure, or an abort
 * (with an error named `AbortError`).
 */
export type SheetsPutFn = (url: string, body: Blob, options: SheetsPutOptions) => Promise<SheetsPutResponse>;

/**
 * Carries the grid's network traffic for a host that must not send it from the
 * page, for example a desktop app whose page origin no API lists for CORS.
 * Sheets keeps its own handling of each answer: errors, a lost session, an
 * expired upload URL, progress.
 */
export interface SheetsTransport {
	/** Every GraphQL request: data, storage, and auth in standalone mode. Default: the global `fetch`. */
	fetch?: SheetsFetchFn;
	/**
	 * Every upload's bytes, in the grid and through `createSheetsUpload`. Default: the
	 * page's own PUT (`XMLHttpRequest` when progress is shown, else the global `fetch`).
	 */
	put?: SheetsPutFn;
}

export interface SheetsStorageTransport {
	endpoint: string;
	execute: SheetsExecuteFn;
	/** The host's PUT for upload bytes (`SheetsConfig.transport.put`). Absent: the page's own. */
	put?: SheetsPutFn;
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
	/**
	 * Optional: how requests leave the page. A host gives its own `fetch` and `put`
	 * to send them from elsewhere (see {@link SheetsTransport}). An injected
	 * `execute` or `executeUpload` replaces the transport for what it covers.
	 */
	transport?: SheetsTransport;
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

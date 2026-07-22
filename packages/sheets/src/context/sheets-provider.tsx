import { useEffect, useId, useMemo, useRef } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useStore as useZustandStore, type StoreApi } from 'zustand';

import { SheetsContext, type SheetsConfig, type SheetsContextValue, type SheetsScopeKey } from './sheets-context';
import { createSheetsExecute, createSheetsUpload, type SheetsExecuteFn, type SheetsUploadFn } from './sheets-execute';
import { createSheetsStore, SheetsStoreContext, type SheetsStoreState } from '../store/sheets-store';
import { getStoredToken } from '../auth/utils/token-store';
import { setSheetsLogger } from '../utils/sheets-logger';
import { setSheetsLocale } from '../utils/sheets-i18n';
import { sheetsQueryKeys } from '../hooks/query-keys';

interface SheetsProviderProps {
	config: SheetsConfig;
	children: React.ReactNode;
}

export function SheetsProvider({ config, children }: SheetsProviderProps) {
	const providerInstanceId = useId();
	// Create store once
	const storeRef = useRef<StoreApi<SheetsStoreState> | null>(null);
	if (!storeRef.current) {
		storeRef.current = createSheetsStore();
	}
	const store = storeRef.current;
	const standaloneIdentityKey = useZustandStore(store, (state) => state.identityKey);
	const standaloneAccessToken = useZustandStore(store, (state) => state.accessToken);

	// Install the host logger + locale synchronously so they apply before first paint.
	setSheetsLogger(config.logger);
	setSheetsLocale(config.locale);

	// Keep the module singletons in sync if the host swaps them across renders.
	useEffect(() => {
		setSheetsLogger(config.logger);
		setSheetsLocale(config.locale);
	}, [config.logger, config.locale]);

	// Restore persisted token for standalone mode
	useEffect(() => {
		const store = storeRef.current?.getState();
		if (!store) return;

		if (config.auth.mode !== 'standalone') {
			// Prevent leaking stale standalone tokens when switching auth modes.
			store.setUnauthenticated();
			return;
		}
		const databaseId = config.databaseId || 'default';
		const stored = getStoredToken(databaseId);
		if (!stored) {
			store.setUnauthenticated();
			return;
		}

		// Only restore if not expired
		const expiresAt = new Date(stored.expiresAt);
		if (expiresAt > new Date()) {
			store.setAuthenticated(stored.accessToken, stored.expiresAt, stored.identityKey ?? null);
			return;
		}

		store.setUnauthenticated();
	}, [config.auth.mode, config.databaseId]);

	// Always provide a QueryClient context. If consumer injects one, reuse it.
	const internalQueryClient = useMemo(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						staleTime: 5 * 60 * 1000,
						gcTime: 30 * 60 * 1000,
						retry: 1,
					},
				},
			}),
		[],
	);
	const queryClient = config.queryClient ?? internalQueryClient;

	// Token getter: embedded mode uses config.auth.getToken, standalone uses store
	const getToken = useMemo(() => {
		if (config.auth.mode === 'embedded') {
			return config.auth.getToken;
		}
		// Standalone: read from store
		return () => store.getState().accessToken ?? null;
	}, [config.auth, store]);

	// Create execute function
	const execute: SheetsExecuteFn = useMemo(() => {
		if (config.execute) return config.execute;
		return createSheetsExecute(config, getToken);
	}, [config, getToken]);

	// Create upload function
	const executeUpload: SheetsUploadFn = useMemo(() => {
		if (config.executeUpload) return config.executeUpload;
		return createSheetsUpload(config, getToken);
	}, [config, getToken]);

	const configuredIdentityKey =
		config.auth.mode === 'embedded'
			? (config.auth.getIdentityKey?.() ?? null)
			: standaloneIdentityKey;
	const activeToken = config.auth.mode === 'embedded' ? config.auth.getToken() : standaloneAccessToken;
	const authGenerationRef = useRef({ mode: config.auth.mode, token: activeToken, generation: 0 });
	if (
		authGenerationRef.current.mode !== config.auth.mode ||
		authGenerationRef.current.token !== activeToken
	) {
		authGenerationRef.current = {
			mode: config.auth.mode,
			token: activeToken,
			generation: authGenerationRef.current.generation + 1,
		};
	}
	// If an older host has not supplied a user id, isolate each observed auth
	// token generation behind an opaque provider-local key. Tokens never enter
	// TanStack Query keys or devtools.
	const identityKey =
		configuredIdentityKey ??
		`anonymous:${providerInstanceId}:${authGenerationRef.current.generation}`;

	// Scope metadata, rows, and mutations by endpoint and non-secret identity.
	const scopeKey: SheetsScopeKey = useMemo(
		() => ({
			databaseId: config.databaseId ?? null,
			endpoint: config.endpoint,
			identityKey,
		}),
		[config.databaseId, config.endpoint, identityKey],
	);

	// Changing database, endpoint, or user invalidates in-flight work from the
	// previous scope. Its cached data remains isolated under its old key.
	useEffect(() => {
		return () => {
			void queryClient.cancelQueries({ queryKey: sheetsQueryKeys.scope(scopeKey) });
		};
	}, [queryClient, scopeKey]);

	const contextValue: SheetsContextValue = useMemo(
		() => ({ config, execute, executeUpload, scopeKey }),
		[config, execute, executeUpload, scopeKey],
	);

	return (
		<QueryClientProvider client={queryClient}>
			<SheetsStoreContext.Provider value={store}>
				<SheetsContext.Provider value={contextValue}>{children}</SheetsContext.Provider>
			</SheetsStoreContext.Provider>
		</QueryClientProvider>
	);
}

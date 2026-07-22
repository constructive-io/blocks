/* @vitest-environment jsdom */

import { act, useEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, useQueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SheetsConfig } from './sheets-context';
import { useSheetsContext, type SheetsScopeKey } from './sheets-context';
import { SheetsProvider } from './sheets-provider';
import { useSheetsStoreApi } from '../store/sheets-store';
import { getStoredToken } from '../auth/utils/token-store';

vi.mock('../auth/utils/token-store', () => ({
	getStoredToken: vi.fn(),
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type MockedStoredToken = ReturnType<typeof getStoredToken>;

interface AuthSnapshot {
	isAuthenticated: boolean;
	accessToken: string | null;
	expiresAt: string | null;
}

function requireSnapshot(snapshot: AuthSnapshot | null): AuthSnapshot {
	expect(snapshot).not.toBeNull();
	return snapshot as AuthSnapshot;
}

function requireScope(scope: SheetsScopeKey | null): SheetsScopeKey {
	expect(scope).not.toBeNull();
	return scope as SheetsScopeKey;
}

function Probe({
	onSnapshot,
	onQueryClient,
	onScope,
}: {
	onSnapshot: (snapshot: AuthSnapshot) => void;
	onQueryClient?: (queryClient: QueryClient) => void;
	onScope?: (scope: SheetsScopeKey) => void;
}) {
	const storeApi = useSheetsStoreApi();
	const queryClient = useQueryClient();
	const { scopeKey } = useSheetsContext();

	useEffect(() => {
		onQueryClient?.(queryClient);
	}, [onQueryClient, queryClient]);

	useEffect(() => {
		onScope?.(scopeKey);
	}, [onScope, scopeKey]);

	useEffect(() => {
		const emitSnapshot = () => {
			const state = storeApi.getState();
			onSnapshot({
				isAuthenticated: state.isAuthenticated,
				accessToken: state.accessToken,
				expiresAt: state.expiresAt,
			});
		};

		emitSnapshot();
		return storeApi.subscribe(() => emitSnapshot());
	}, [storeApi, onSnapshot]);

	return null;
}

function createStandaloneConfig(databaseId: string, queryClient?: QueryClient): SheetsConfig {
	return {
		endpoint: 'https://example.com/graphql',
		databaseId,
		auth: { mode: 'standalone' },
		queryClient,
	};
}

function createEmbeddedConfig(queryClient?: QueryClient, identityKey: string | null = null): SheetsConfig {
	return {
		endpoint: 'https://example.com/graphql',
		databaseId: 'db-embedded',
		auth: { mode: 'embedded', getToken: () => null, getIdentityKey: () => identityKey },
		queryClient,
	};
}

const mockGetStoredToken = vi.mocked(getStoredToken);

describe('SheetsProvider lifecycle', () => {
	let root: Root;
	let container: HTMLDivElement;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
	});

	afterEach(async () => {
		await act(async () => {
			root.unmount();
		});
		container.remove();
		vi.clearAllMocks();
	});

	it('restores standalone auth token for the active database', async () => {
		const expiresAt = new Date(Date.now() + 60_000).toISOString();
		mockGetStoredToken.mockReturnValue({ accessToken: 'db-token', expiresAt });

		let latestSnapshot: AuthSnapshot | null = null;

		await act(async () => {
			root.render(
				<SheetsProvider config={createStandaloneConfig('db-1')}>
					<Probe onSnapshot={(snapshot) => (latestSnapshot = snapshot)} />
				</SheetsProvider>,
			);
		});

		expect(mockGetStoredToken).toHaveBeenCalledWith('db-1');
		expect(latestSnapshot).toEqual({
			isAuthenticated: true,
			accessToken: 'db-token',
			expiresAt,
		});
	});

	it('clears auth state when stored token is expired', async () => {
		const expiresAt = new Date(Date.now() - 60_000).toISOString();
		mockGetStoredToken.mockReturnValue({ accessToken: 'expired-token', expiresAt });

		let latestSnapshot: AuthSnapshot | null = null;

		await act(async () => {
			root.render(
				<SheetsProvider config={createStandaloneConfig('db-1')}>
					<Probe onSnapshot={(snapshot) => (latestSnapshot = snapshot)} />
				</SheetsProvider>,
			);
		});

		expect(latestSnapshot).toEqual({
			isAuthenticated: false,
			accessToken: null,
			expiresAt: null,
		});
	});

	it('re-evaluates auth state when database changes', async () => {
		const tokenByDatabase = new Map<string, MockedStoredToken>([
			[
				'db-1',
				{
					accessToken: 'token-db-1',
					expiresAt: new Date(Date.now() + 60_000).toISOString(),
				},
			],
			['db-2', null],
		]);

		mockGetStoredToken.mockImplementation((databaseId) => tokenByDatabase.get(databaseId) ?? null);

		let latestSnapshot: AuthSnapshot | null = null;

		await act(async () => {
			root.render(
				<SheetsProvider config={createStandaloneConfig('db-1')}>
					<Probe onSnapshot={(snapshot) => (latestSnapshot = snapshot)} />
				</SheetsProvider>,
			);
		});

		const firstSnapshot = requireSnapshot(latestSnapshot);
		expect(firstSnapshot.isAuthenticated).toBe(true);
		expect(firstSnapshot.accessToken).toBe('token-db-1');

		await act(async () => {
			root.render(
				<SheetsProvider config={createStandaloneConfig('db-2')}>
					<Probe onSnapshot={(snapshot) => (latestSnapshot = snapshot)} />
				</SheetsProvider>,
			);
		});

		expect(mockGetStoredToken).toHaveBeenCalledWith('db-1');
		expect(mockGetStoredToken).toHaveBeenCalledWith('db-2');
		expect(latestSnapshot).toEqual({
			isAuthenticated: false,
			accessToken: null,
			expiresAt: null,
		});
	});

	it('clears standalone auth state when switching to embedded mode', async () => {
		// Standalone mode restores a valid token; switching to embedded must purge it
		// so a stale standalone token never leaks into embedded auth.
		const expiresAt = new Date(Date.now() + 60_000).toISOString();
		mockGetStoredToken.mockReturnValue({ accessToken: 'db-token', expiresAt });

		let latestSnapshot: AuthSnapshot | null = null;

		await act(async () => {
			root.render(
				<SheetsProvider config={createStandaloneConfig('db-1')}>
					<Probe onSnapshot={(snapshot) => (latestSnapshot = snapshot)} />
				</SheetsProvider>,
			);
		});

		const firstSnapshot = requireSnapshot(latestSnapshot);
		expect(firstSnapshot.isAuthenticated).toBe(true);
		expect(firstSnapshot.accessToken).toBe('db-token');

		await act(async () => {
			root.render(
				<SheetsProvider config={createEmbeddedConfig()}>
					<Probe onSnapshot={(snapshot) => (latestSnapshot = snapshot)} />
				</SheetsProvider>,
			);
		});

		expect(latestSnapshot).toEqual({
			isAuthenticated: false,
			accessToken: null,
			expiresAt: null,
		});
	});

	it('uses injected QueryClient and provides one when not injected', async () => {
		const injectedQueryClient = new QueryClient();
		let observedQueryClient: QueryClient | null = null;

		await act(async () => {
			root.render(
				<SheetsProvider config={createEmbeddedConfig(injectedQueryClient)}>
					<Probe
						onSnapshot={() => {}}
						onQueryClient={(queryClient) => {
							observedQueryClient = queryClient;
						}}
					/>
				</SheetsProvider>,
			);
		});

		expect(observedQueryClient).toBe(injectedQueryClient);

		observedQueryClient = null;

		await act(async () => {
			root.render(
				<SheetsProvider config={createEmbeddedConfig()}>
					<Probe
						onSnapshot={() => {}}
						onQueryClient={(queryClient) => {
							observedQueryClient = queryClient;
						}}
					/>
				</SheetsProvider>,
			);
		});

		expect(observedQueryClient).toBeInstanceOf(QueryClient);
		expect(observedQueryClient).not.toBe(injectedQueryClient);
	});

	it('includes database, endpoint, and non-secret identity in the cache scope', async () => {
		let latestScope: SheetsScopeKey | null = null;
		const onScope = (scope: SheetsScopeKey) => {
			latestScope = scope;
		};

		await act(async () => {
			root.render(
				<SheetsProvider config={createEmbeddedConfig(undefined, 'user-1')}>
					<Probe onSnapshot={() => {}} onScope={onScope} />
				</SheetsProvider>,
			);
		});

		expect(latestScope).toEqual({
			databaseId: 'db-embedded',
			endpoint: 'https://example.com/graphql',
			identityKey: 'user-1',
		});

		await act(async () => {
			root.render(
				<SheetsProvider config={createEmbeddedConfig(undefined, 'user-2')}>
					<Probe onSnapshot={() => {}} onScope={onScope} />
				</SheetsProvider>,
			);
		});

		expect(latestScope).toMatchObject({ identityKey: 'user-2' });
	});

	it('uses an opaque cache identity when an embedded host omits getIdentityKey', async () => {
		let token = 'secret-token-1';
		const config: SheetsConfig = {
			endpoint: 'https://example.com/graphql',
			databaseId: 'db-embedded',
			auth: { mode: 'embedded', getToken: () => token },
		};
		let latestScope: SheetsScopeKey | null = null;
		const onScope = (scope: SheetsScopeKey) => {
			latestScope = scope;
		};

		await act(async () => {
			root.render(
				<SheetsProvider config={config}>
					<Probe onSnapshot={() => {}} onScope={onScope} />
				</SheetsProvider>,
			);
		});
		const firstIdentity = requireScope(latestScope).identityKey;
		expect(firstIdentity).toMatch(/^anonymous:/);
		expect(firstIdentity).not.toContain(token);

		token = 'secret-token-2';
		await act(async () => {
			root.render(
				<SheetsProvider config={config}>
					<Probe onSnapshot={() => {}} onScope={onScope} />
				</SheetsProvider>,
			);
		});

		expect(requireScope(latestScope).identityKey).not.toBe(firstIdentity);
		expect(requireScope(latestScope).identityKey).not.toContain(token);
	});
});

import { describe, expect, it, vi } from 'vitest';

import {
  createDatabaseScopedStandaloneSession,
  createFetchConsoleTransport,
  type ConsoleSessionStorage
} from './index';

function memoryStorage(): ConsoleSessionStorage & { values: Map<string, string> } {
  const values = new Map<string, string>();
  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => void values.set(key, value),
    removeItem: (key) => void values.delete(key)
  };
}

function response(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: vi.fn().mockResolvedValue(payload)
  } as unknown as Response;
}

const authEndpoint = {
  id: 'tenant-auth',
  kind: 'auth',
  url: 'https://auth-tenant.example/graphql'
} as const;

function authPayload(overrides: Record<string, unknown> = {}) {
  return response({
    data: {
      signIn: {
        result: {
          id: 'session-1',
          userId: 'user-1',
          accessToken: 'secret-token',
          accessTokenExpiresAt: '2030-01-01T00:00:00.000Z',
          ...overrides
        }
      }
    }
  });
}

describe('database-scoped standalone session', () => {
  it('uses session storage by default and keeps tokens out of snapshots', async () => {
    const sessionStore = memoryStorage();
    const localStore = memoryStorage();
    const session = createDatabaseScopedStandaloneSession({
      databaseId: 'database-1',
      authEndpoint,
      fetch: vi.fn<typeof fetch>().mockResolvedValue(authPayload()),
      storage: { session: sessionStore, local: localStore },
      now: () => Date.parse('2029-01-01T00:00:00.000Z')
    });

    const outcome = await session.signIn({
      email: 'person@example.com',
      password: 'password'
    });

    expect(outcome).toMatchObject({
      status: 'authenticated',
      identity: { subjectId: 'user-1', tenantId: 'database-1' }
    });
    expect(sessionStore.values.size).toBe(1);
    expect(localStore.values.size).toBe(0);
    expect(JSON.stringify(session.getSnapshot())).not.toContain('secret-token');
    expect(session.getAccessToken({ endpoint: authEndpoint }))
      .toBe('secret-token');
  });

  it('uses database-scoped local storage only when remember me is selected', async () => {
    const sessionStore = memoryStorage();
    const localStore = memoryStorage();
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(authPayload());
    const first = createDatabaseScopedStandaloneSession({
      databaseId: 'database-1',
      authEndpoint,
      fetch: fetchImpl,
      storage: { session: sessionStore, local: localStore },
      now: () => Date.parse('2029-01-01T00:00:00.000Z')
    });
    await first.signIn({
      email: 'person@example.com',
      password: 'password',
      rememberMe: true
    });

    const restored = createDatabaseScopedStandaloneSession({
      databaseId: 'database-1',
      authEndpoint,
      fetch: fetchImpl,
      storage: { session: sessionStore, local: localStore },
      now: () => Date.parse('2029-01-01T00:00:00.000Z')
    });
    const otherDatabase = createDatabaseScopedStandaloneSession({
      databaseId: 'database-2',
      authEndpoint,
      fetch: fetchImpl,
      storage: { session: sessionStore, local: localStore },
      now: () => Date.parse('2029-01-01T00:00:00.000Z')
    });

    expect(sessionStore.values.size).toBe(0);
    expect(localStore.values.size).toBe(1);
    expect(restored.getSnapshot().status).toBe('authenticated');
    expect(otherDatabase.getSnapshot().status).toBe('anonymous');
  });

  it('defers persisted credentials until hydration and restores them once', async () => {
    const sessionStore = memoryStorage();
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(authPayload());
    const first = createDatabaseScopedStandaloneSession({
      databaseId: 'database-1',
      authEndpoint,
      fetch: fetchImpl,
      storage: { session: sessionStore },
      now: () => Date.parse('2029-01-01T00:00:00.000Z')
    });
    await first.signIn({ email: 'person@example.com', password: 'password' });

    const restored = createDatabaseScopedStandaloneSession({
      databaseId: 'database-1',
      authEndpoint,
      fetch: fetchImpl,
      storage: { session: sessionStore },
      now: () => Date.parse('2029-01-01T00:00:00.000Z'),
      deferRestore: true
    });
    const listener = vi.fn();
    restored.subscribe(listener);

    expect(restored.getSnapshot().status).toBe('loading');
    expect(restored.getServerSnapshot?.()).toEqual({ status: 'loading' });
    restored.restorePersistedSession();
    expect(restored.getSnapshot().status).toBe('authenticated');
    expect(listener).toHaveBeenCalledTimes(1);

    restored.restorePersistedSession();
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('cannot revive an old credential while a deferred sign-in is in flight', async () => {
    const sessionStore = memoryStorage();
    const seed = createDatabaseScopedStandaloneSession({
      databaseId: 'database-1',
      authEndpoint,
      fetch: vi.fn<typeof fetch>().mockResolvedValue(authPayload()),
      storage: { session: sessionStore }
    });
    await seed.signIn({ email: 'old@example.com', password: 'password' });

    let resolveResponse!: (response: Response) => void;
    const responsePromise = new Promise<Response>((resolve) => {
      resolveResponse = resolve;
    });
    const session = createDatabaseScopedStandaloneSession({
      databaseId: 'database-1',
      authEndpoint,
      fetch: vi.fn<typeof fetch>().mockReturnValue(responsePromise),
      storage: { session: sessionStore },
      deferRestore: true
    });

    const pendingSignIn = session.signIn({
      email: 'new@example.com',
      password: 'password'
    });
    session.restorePersistedSession();
    expect(session.getSnapshot().status).toBe('loading');
    expect(session.getAccessToken({ endpoint: authEndpoint })).toBeNull();

    resolveResponse(authPayload({ userId: 'user-2', accessToken: 'new-token' }));
    await expect(pendingSignIn).resolves.toMatchObject({
      status: 'authenticated',
      identity: { subjectId: 'user-2' }
    });
    expect(session.getAccessToken({ endpoint: authEndpoint })).toBe('new-token');
  });

  it('clears the credential when an HTTP-200 GraphQL auth error is observed', async () => {
    const sessionStore = memoryStorage();
    const session = createDatabaseScopedStandaloneSession({
      databaseId: 'database-1',
      authEndpoint,
      fetch: vi.fn<typeof fetch>().mockResolvedValue(authPayload()),
      storage: { session: sessionStore },
      now: () => Date.parse('2029-01-01T00:00:00.000Z')
    });
    await session.signIn({
      email: 'person@example.com',
      password: 'password'
    });
    const identity = session.getSnapshot();
    if (identity.status !== 'authenticated') throw new Error('Expected auth.');
    const transport = createFetchConsoleTransport(
      vi.fn<typeof fetch>().mockResolvedValue(response({
        errors: [{
          message: 'The credential has been revoked.',
          extensions: { code: 'UNAUTHENTICATED' }
        }]
      })),
      {
        onAuthenticationError: ({ error }) => session.handleAuthenticationFailure({
          message: error.message,
          code: String(error.extensions?.code)
        })
      }
    );

    await transport.execute(
      {
        endpoint: { ...authEndpoint, kind: 'data' },
        identity: identity.identity,
        getAccessToken: session.getAccessToken
      },
      { document: 'query Viewer { viewer { id } }' }
    );

    expect(session.getSnapshot()).toMatchObject({
      status: 'error',
      error: { code: 'UNAUTHENTICATED' },
      identity: { subjectId: 'user-1' }
    });
    expect(sessionStore.values.size).toBe(0);
    expect(session.getAccessToken({ endpoint: authEndpoint })).toBeNull();
  });

  it('surfaces an MFA challenge without treating it as an authenticated session', async () => {
    const session = createDatabaseScopedStandaloneSession({
      databaseId: 'database-1',
      authEndpoint,
      fetch: vi.fn<typeof fetch>().mockResolvedValue(authPayload({
        accessToken: null,
        mfaRequired: true,
        mfaChallengeToken: 'challenge-token'
      })),
      storage: { session: memoryStorage(), local: memoryStorage() }
    });

    await expect(session.signIn({
      email: 'person@example.com',
      password: 'password'
    })).resolves.toEqual({
      status: 'mfa-required',
      challengeToken: 'challenge-token'
    });
    expect(session.getSnapshot().status).toBe('anonymous');
    expect(JSON.stringify(session.getSnapshot())).not.toContain('challenge-token');
  });

  it('returns to anonymous after failed credentials so sign in can be retried', async () => {
    const session = createDatabaseScopedStandaloneSession({
      databaseId: 'database-1',
      authEndpoint,
      fetch: vi.fn<typeof fetch>().mockResolvedValue(response({
        errors: [{
          message: 'Email or password is invalid.',
          extensions: { code: 'INVALID_CREDENTIALS' }
        }]
      })),
      storage: { session: memoryStorage(), local: memoryStorage() }
    });

    await expect(session.signIn({
      email: 'person@example.com',
      password: 'wrong-password'
    })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(session.getSnapshot().status).toBe('anonymous');
  });

  it('uses the backend sign-out payload shape and clears local state', async () => {
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(authPayload())
      .mockResolvedValueOnce(response({
        data: { signOut: { clientMutationId: null } }
      }));
    const sessionStore = memoryStorage();
    const session = createDatabaseScopedStandaloneSession({
      databaseId: 'database-1',
      authEndpoint,
      fetch: fetchImpl,
      storage: { session: sessionStore }
    });
    await session.signIn({
      email: 'person@example.com',
      password: 'password'
    });

    await session.signOut();

    const signOutBody = JSON.parse(String(fetchImpl.mock.calls[1]?.[1]?.body));
    expect(signOutBody.query).toContain('clientMutationId');
    expect(signOutBody.query).not.toContain('result');
    expect(session.getSnapshot().status).toBe('anonymous');
    expect(sessionStore.values.size).toBe(0);
  });

  it('ignores auth failures when there is no credential to invalidate', () => {
    const session = createDatabaseScopedStandaloneSession({
      databaseId: 'database-1',
      authEndpoint,
      fetch: vi.fn<typeof fetch>(),
      storage: { session: memoryStorage(), local: memoryStorage() }
    });

    session.handleAuthenticationFailure({
      message: 'Authentication is required.',
      code: 'UNAUTHENTICATED'
    });

    expect(session.getSnapshot().status).toBe('anonymous');
  });
});

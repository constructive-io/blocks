import { describe, expect, it, vi } from 'vitest';

import {
  createDatabaseScopedStandaloneSession,
  createFetchConsoleTransport,
  type ConsoleCsrfTokenProvider,
  type ConsoleEndpoint,
  type DatabaseScopedStandaloneConsoleSession,
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

function deferredResponse() {
  let resolve!: (response: Response) => void;
  const promise = new Promise<Response>((accept) => {
    resolve = accept;
  });
  return { promise, resolve };
}

function accessRequest(
  session: DatabaseScopedStandaloneConsoleSession,
  endpoint: ConsoleEndpoint = authEndpoint
) {
  const snapshot = session.getSnapshot();
  const identity = snapshot.status === 'authenticated' || snapshot.status === 'anonymous'
    ? snapshot.identity
    : snapshot.status === 'error' && snapshot.identity
      ? snapshot.identity
      : {
          kind: 'anonymous' as const,
          tenantId: session.databaseId,
          cachePartition: 'test-request'
        };
  return { endpoint, identity };
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
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(authPayload());
    const session = createDatabaseScopedStandaloneSession({
      databaseId: 'database-1',
      authEndpoint,
      fetch: fetchImpl,
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
    expect(session.getAccessToken(accessRequest(session)))
      .toBe('secret-token');
    const request = fetchImpl.mock.calls[0]?.[1];
    expect(request?.credentials).toBe('omit');
    expect(JSON.parse(String(request?.body))).toMatchObject({
      variables: { input: { credentialKind: 'bearer' } }
    });
  });

  it('injects a fresh host-provided anonymous-session CSRF token into sign-in', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(authPayload());
    const csrfTokenProvider = vi.fn().mockResolvedValue('  one-time-csrf-token  ');
    const session = createDatabaseScopedStandaloneSession({
      databaseId: 'database-1',
      authEndpoint,
      fetch: fetchImpl,
      csrfTokenProvider,
      storage: { session: memoryStorage(), local: memoryStorage() }
    });

    await session.signIn({ email: ' person@example.com ', password: 'password' });

    expect(csrfTokenProvider).toHaveBeenCalledWith({
      databaseId: 'database-1',
      authEndpoint,
      operation: 'signIn'
    });
    expect(JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body))).toMatchObject({
      variables: {
        input: {
          email: 'person@example.com',
          credentialKind: 'bearer',
          csrfToken: 'one-time-csrf-token'
        }
      }
    });
  });

  it('requests a distinct CSRF bootstrap for sign-up', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(response({
      data: {
        signUp: {
          result: {
            id: 'session-1',
            userId: 'user-1',
            accessToken: 'secret-token',
            accessTokenExpiresAt: '2030-01-01T00:00:00.000Z'
          }
        }
      }
    }));
    const csrfTokenProvider = vi.fn().mockResolvedValue('signup-csrf-token');
    const session = createDatabaseScopedStandaloneSession({
      databaseId: 'database-1',
      authEndpoint,
      fetch: fetchImpl,
      csrfTokenProvider,
      storage: { session: memoryStorage(), local: memoryStorage() }
    });

    await session.signUp({ email: 'person@example.com', password: 'password' });

    expect(csrfTokenProvider).toHaveBeenCalledWith(expect.objectContaining({
      operation: 'signUp'
    }));
    expect(JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body))).toMatchObject({
      variables: { input: { csrfToken: 'signup-csrf-token' } }
    });
  });

  it('fails before sending credentials when the CSRF bootstrap is unavailable', async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const session = createDatabaseScopedStandaloneSession({
      databaseId: 'database-1',
      authEndpoint,
      fetch: fetchImpl,
      csrfTokenProvider: vi.fn().mockResolvedValue('   '),
      storage: { session: memoryStorage(), local: memoryStorage() }
    });

    await expect(session.signIn({
      email: 'person@example.com',
      password: 'password'
    })).rejects.toMatchObject({
      code: 'CSRF_TOKEN_UNAVAILABLE',
      retryable: true
    });
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(session.getSnapshot().status).toBe('anonymous');
  });

  it('does not send credentials after a CSRF bootstrap is superseded', async () => {
    let resolveFirst!: (token: string) => void;
    let resolveSecond!: (token: string) => void;
    const firstToken = new Promise<string>((resolve) => {
      resolveFirst = resolve;
    });
    const secondToken = new Promise<string>((resolve) => {
      resolveSecond = resolve;
    });
    const csrfTokenProvider = vi.fn()
      .mockReturnValueOnce(firstToken)
      .mockReturnValueOnce(secondToken);
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(authPayload({
      id: 'session-2',
      userId: 'user-2',
      accessToken: 'second-token'
    }));
    const session = createDatabaseScopedStandaloneSession({
      databaseId: 'database-1',
      authEndpoint,
      fetch: fetchImpl,
      csrfTokenProvider,
      storage: { session: memoryStorage(), local: memoryStorage() }
    });

    const firstSignIn = session.signIn({
      email: 'first@example.com',
      password: 'password'
    });
    const secondSignIn = session.signIn({
      email: 'second@example.com',
      password: 'password'
    });
    resolveSecond('second-csrf-token');
    await expect(secondSignIn).resolves.toMatchObject({
      status: 'authenticated',
      identity: { subjectId: 'user-2' }
    });
    resolveFirst('first-csrf-token');
    await expect(firstSignIn).rejects.toMatchObject({
      code: 'AUTH_OPERATION_SUPERSEDED'
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body))).toMatchObject({
      variables: { input: { email: 'second@example.com', csrfToken: 'second-csrf-token' } }
    });
  });

  it('rejects a late auth response after the host replaces its CSRF provider', async () => {
    const pendingResponse = deferredResponse();
    const firstProvider = vi.fn().mockResolvedValue('first-csrf-token');
    const secondProvider = vi.fn().mockResolvedValue('second-csrf-token');
    let activeProvider: ConsoleCsrfTokenProvider | undefined = firstProvider;
    const fetchImpl = vi.fn<typeof fetch>().mockReturnValue(pendingResponse.promise);
    const sessionStore = memoryStorage();
    const session = createDatabaseScopedStandaloneSession({
      databaseId: 'database-1',
      authEndpoint,
      fetch: fetchImpl,
      resolveCsrfTokenProvider: () => activeProvider,
      storage: { session: sessionStore, local: memoryStorage() }
    });

    const firstSignIn = session.signIn({
      email: 'first@example.com',
      password: 'password'
    });
    await vi.waitFor(() => expect(fetchImpl).toHaveBeenCalledTimes(1));
    activeProvider = secondProvider;
    pendingResponse.resolve(authPayload({
      id: 'session-old',
      userId: 'user-old',
      accessToken: 'old-token'
    }));

    await expect(firstSignIn).rejects.toMatchObject({
      code: 'AUTH_OPERATION_SUPERSEDED'
    });
    expect(session.getSnapshot().status).toBe('anonymous');
    expect(sessionStore.values.size).toBe(0);
    expect(secondProvider).not.toHaveBeenCalled();
  });

  it('uses the static CSRF provider when a dynamic resolver has no override', async () => {
    const csrfTokenProvider = vi.fn().mockResolvedValue('fallback-csrf-token');
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(authPayload());
    const session = createDatabaseScopedStandaloneSession({
      databaseId: 'database-1',
      authEndpoint,
      fetch: fetchImpl,
      csrfTokenProvider,
      resolveCsrfTokenProvider: () => undefined,
      storage: { session: memoryStorage(), local: memoryStorage() }
    });

    await expect(session.signIn({
      email: 'person@example.com',
      password: 'password'
    })).resolves.toMatchObject({ status: 'authenticated' });
    expect(csrfTokenProvider).toHaveBeenCalledTimes(1);
  });

  it('explains how to satisfy a tenant CSRF requirement when no provider is configured', async () => {
    const session = createDatabaseScopedStandaloneSession({
      databaseId: 'database-1',
      authEndpoint,
      fetch: vi.fn<typeof fetch>().mockResolvedValue(response({
        errors: [{
          message: 'CSRF_TOKEN_REQUIRED',
          extensions: { code: 'P0001' }
        }]
      })),
      storage: { session: memoryStorage(), local: memoryStorage() }
    });

    await expect(session.signIn({
      email: 'person@example.com',
      password: 'password'
    })).rejects.toMatchObject({
      code: 'CSRF_TOKEN_REQUIRED',
      message: expect.stringContaining('csrfTokenProvider')
    });
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

  it('never restores a bearer into a replacement auth endpoint for the same database', async () => {
    const sessionStore = memoryStorage();
    const firstEndpoint = {
      id: 'auth-a',
      kind: 'auth',
      url: 'https://auth-a.example/graphql'
    } as const;
    const secondEndpoint = {
      id: 'auth-b',
      kind: 'auth',
      url: 'https://auth-b.example/graphql'
    } as const;
    const first = createDatabaseScopedStandaloneSession({
      databaseId: 'database-1',
      authEndpoint: firstEndpoint,
      fetch: vi.fn<typeof fetch>().mockResolvedValue(authPayload()),
      storage: { session: sessionStore, local: memoryStorage() }
    });
    await first.signIn({ email: 'person@example.com', password: 'password' });

    const replacement = createDatabaseScopedStandaloneSession({
      databaseId: 'database-1',
      authEndpoint: secondEndpoint,
      fetch: vi.fn<typeof fetch>(),
      storage: { session: sessionStore, local: memoryStorage() }
    });

    expect(replacement.getSnapshot().status).toBe('anonymous');
    expect(replacement.getAccessToken(accessRequest(replacement, secondEndpoint))).toBeNull();
    expect(sessionStore.values.size).toBe(0);

    const rollback = createDatabaseScopedStandaloneSession({
      databaseId: 'database-1',
      authEndpoint: firstEndpoint,
      fetch: vi.fn<typeof fetch>(),
      storage: { session: sessionStore, local: memoryStorage() }
    });
    expect(rollback.getSnapshot().status).toBe('anonymous');
  });

  it('rejects path-relative auth endpoints before any credential can be sent', () => {
    expect(() => createDatabaseScopedStandaloneSession({
      databaseId: 'database-1',
      authEndpoint: { id: 'relative-auth', kind: 'auth', url: 'graphql' },
      fetch: vi.fn<typeof fetch>(),
      storage: { session: memoryStorage(), local: memoryStorage() }
    })).toThrow('absolute auth endpoint URL');
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
    expect(session.getAccessToken(accessRequest(session))).toBeNull();

    resolveResponse(authPayload({ userId: 'user-2', accessToken: 'new-token' }));
    await expect(pendingSignIn).resolves.toMatchObject({
      status: 'authenticated',
      identity: { subjectId: 'user-2' }
    });
    expect(session.getAccessToken(accessRequest(session))).toBe('new-token');
  });

  it('lets only the latest overlapping sign-in establish the session', async () => {
    const firstResponse = deferredResponse();
    const secondResponse = deferredResponse();
    const fetchImpl = vi.fn<typeof fetch>()
      .mockReturnValueOnce(firstResponse.promise)
      .mockReturnValueOnce(secondResponse.promise);
    const session = createDatabaseScopedStandaloneSession({
      databaseId: 'database-1',
      authEndpoint,
      fetch: fetchImpl,
      storage: { session: memoryStorage(), local: memoryStorage() }
    });

    const firstSignIn = session.signIn({
      email: 'first@example.com',
      password: 'password'
    });
    const secondSignIn = session.signIn({
      email: 'second@example.com',
      password: 'password'
    });

    secondResponse.resolve(authPayload({
      id: 'session-2',
      userId: 'user-2',
      accessToken: 'second-token'
    }));
    await expect(secondSignIn).resolves.toMatchObject({
      status: 'authenticated',
      identity: { subjectId: 'user-2', sessionId: 'session-2' }
    });

    firstResponse.resolve(authPayload({
      id: 'session-1',
      userId: 'user-1',
      accessToken: 'first-token'
    }));
    await expect(firstSignIn).rejects.toMatchObject({
      code: 'AUTH_OPERATION_SUPERSEDED'
    });
    expect(session.getSnapshot()).toMatchObject({
      status: 'authenticated',
      identity: { subjectId: 'user-2', sessionId: 'session-2' }
    });
    expect(session.getAccessToken(accessRequest(session))).toBe('second-token');
  });

  it('does not let a pending sign-in revive the session after sign-out', async () => {
    const pendingResponse = deferredResponse();
    const session = createDatabaseScopedStandaloneSession({
      databaseId: 'database-1',
      authEndpoint,
      fetch: vi.fn<typeof fetch>().mockReturnValue(pendingResponse.promise),
      storage: { session: memoryStorage(), local: memoryStorage() }
    });

    const pendingSignIn = session.signIn({
      email: 'person@example.com',
      password: 'password'
    });
    await session.signOut();
    expect(session.getSnapshot().status).toBe('anonymous');

    pendingResponse.resolve(authPayload());
    await expect(pendingSignIn).rejects.toMatchObject({
      code: 'AUTH_OPERATION_SUPERSEDED'
    });
    expect(session.getSnapshot().status).toBe('anonymous');
    expect(session.getAccessToken(accessRequest(session))).toBeNull();
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
        onAuthenticationError: ({ error, identity: requestIdentity }) => session.handleAuthenticationFailure({
          message: error.message,
          code: String(error.extensions?.code),
          identity: requestIdentity
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
    expect(() => session.getAccessToken(accessRequest(session))).toThrow(
      expect.objectContaining({ code: 'AUTH_IDENTITY_SUPERSEDED' })
    );
  });

  it('ignores a late auth failure from a superseded authenticated identity', async () => {
    const session = createDatabaseScopedStandaloneSession({
      databaseId: 'database-1',
      authEndpoint,
      fetch: vi.fn<typeof fetch>()
        .mockResolvedValueOnce(authPayload())
        .mockResolvedValueOnce(authPayload({
          id: 'session-2',
          userId: 'user-2',
          accessToken: 'second-token'
        })),
      storage: { session: memoryStorage(), local: memoryStorage() }
    });
    await session.signIn({ email: 'first@example.com', password: 'password' });
    const firstSnapshot = session.getSnapshot();
    if (firstSnapshot.status !== 'authenticated') throw new Error('Expected auth.');

    const pendingResponse = deferredResponse();
    const transport = createFetchConsoleTransport(
      vi.fn<typeof fetch>().mockReturnValue(pendingResponse.promise),
      {
        onAuthenticationError: ({ error, identity: requestIdentity }) => {
          session.handleAuthenticationFailure({
            message: error.message,
            code: String(error.extensions?.code),
            identity: requestIdentity
          });
        }
      }
    );
    const pendingRequest = transport.execute(
      {
        endpoint: { ...authEndpoint, kind: 'data' },
        identity: firstSnapshot.identity,
        getAccessToken: session.getAccessToken
      },
      { document: 'query Viewer { viewer { id } }' }
    );

    await session.signIn({ email: 'second@example.com', password: 'password' });
    pendingResponse.resolve(response({
      errors: [{
        message: 'The old credential has been revoked.',
        extensions: { code: 'UNAUTHENTICATED' }
      }]
    }));
    await pendingRequest;

    expect(session.getSnapshot()).toMatchObject({
      status: 'authenticated',
      identity: { subjectId: 'user-2', sessionId: 'session-2' }
    });
    expect(session.getAccessToken(accessRequest(session))).toBe('second-token');
  });

  it('never lends a replacement identity token to an old scoped transport', async () => {
    const authFetch = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(authPayload())
      .mockResolvedValueOnce(authPayload({
        id: 'session-2',
        userId: 'user-2',
        accessToken: 'second-token'
      }));
    const session = createDatabaseScopedStandaloneSession({
      databaseId: 'database-1',
      authEndpoint,
      fetch: authFetch,
      storage: { session: memoryStorage(), local: memoryStorage() }
    });
    await session.signIn({ email: 'first@example.com', password: 'password' });
    const firstSnapshot = session.getSnapshot();
    if (firstSnapshot.status !== 'authenticated') throw new Error('Expected auth.');

    const dataFetch = vi.fn<typeof fetch>().mockResolvedValue(response({
      data: { viewer: null }
    }));
    const transport = createFetchConsoleTransport(dataFetch);
    const oldScope = {
      endpoint: { ...authEndpoint, id: 'tenant-data', kind: 'data' as const },
      identity: firstSnapshot.identity,
      getAccessToken: session.getAccessToken
    };

    await session.signIn({ email: 'second@example.com', password: 'password' });
    const result = await transport.execute(oldScope, {
      document: 'query Viewer { viewer { id } }'
    });

    expect(result).toMatchObject({
      ok: false,
      errors: [{ extensions: { code: 'TOKEN_ERROR' } }]
    });
    expect(dataFetch).not.toHaveBeenCalled();
    expect(session.getAccessToken(accessRequest(session))).toBe('second-token');
  });

  it('does not downgrade an expired authenticated transport to anonymous', async () => {
    let now = Date.parse('2029-01-01T00:00:00.000Z');
    const session = createDatabaseScopedStandaloneSession({
      databaseId: 'database-1',
      authEndpoint,
      fetch: vi.fn<typeof fetch>().mockResolvedValue(authPayload()),
      storage: { session: memoryStorage(), local: memoryStorage() },
      now: () => now
    });
    await session.signIn({ email: 'person@example.com', password: 'password' });
    const snapshot = session.getSnapshot();
    if (snapshot.status !== 'authenticated') throw new Error('Expected auth.');
    const dataFetch = vi.fn<typeof fetch>();
    const transport = createFetchConsoleTransport(dataFetch);
    now = Date.parse('2031-01-01T00:00:00.000Z');

    const result = await transport.execute({
      endpoint: { ...authEndpoint, id: 'tenant-data', kind: 'data' },
      identity: snapshot.identity,
      getAccessToken: session.getAccessToken
    }, { document: 'query Viewer { viewer { id } }' });

    expect(result).toMatchObject({
      ok: false,
      errors: [{ extensions: { code: 'TOKEN_ERROR' } }]
    });
    expect(dataFetch).not.toHaveBeenCalled();
    expect(session.getSnapshot()).toMatchObject({
      status: 'error',
      error: { code: 'UNAUTHENTICATED' }
    });
  });

  it('does not downgrade a disposed authenticated transport to anonymous', async () => {
    const session = createDatabaseScopedStandaloneSession({
      databaseId: 'database-1',
      authEndpoint,
      fetch: vi.fn<typeof fetch>().mockResolvedValue(authPayload()),
      storage: { session: memoryStorage(), local: memoryStorage() }
    });
    await session.signIn({ email: 'person@example.com', password: 'password' });
    const snapshot = session.getSnapshot();
    if (snapshot.status !== 'authenticated') throw new Error('Expected auth.');
    const dataFetch = vi.fn<typeof fetch>();
    const transport = createFetchConsoleTransport(dataFetch);
    session.dispose?.();

    const result = await transport.execute({
      endpoint: { ...authEndpoint, id: 'tenant-data', kind: 'data' },
      identity: snapshot.identity,
      getAccessToken: session.getAccessToken
    }, { document: 'query Viewer { viewer { id } }' });

    expect(result).toMatchObject({
      ok: false,
      errors: [{ extensions: { code: 'TOKEN_ERROR' } }]
    });
    expect(dataFetch).not.toHaveBeenCalled();
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
    await expect(session.beginSignIn({
      credentials: {
        email: 'person@example.com',
        password: 'password'
      }
    })).rejects.toMatchObject({
      code: 'MFA_REQUIRED',
      retryable: false
    });
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

  it('retains a failed remote revocation only for a later sign-out retry', async () => {
    const fetchImpl = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(authPayload())
      .mockResolvedValueOnce(response({}, 503))
      .mockResolvedValueOnce(response({
        data: { signOut: { clientMutationId: null } }
      }));
    const session = createDatabaseScopedStandaloneSession({
      databaseId: 'database-1',
      authEndpoint,
      fetch: fetchImpl,
      storage: { session: memoryStorage(), local: memoryStorage() }
    });
    await session.signIn({ email: 'person@example.com', password: 'password' });

    await expect(session.signOut()).rejects.toMatchObject({
      code: 'HTTP_ERROR',
      retryable: true
    });
    expect(session.getSnapshot().status).toBe('anonymous');
    expect(session.getAccessToken(accessRequest(session))).toBeNull();

    await expect(session.signOut()).resolves.toBeUndefined();
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(fetchImpl.mock.calls[2]?.[1]?.headers).toMatchObject({
      Authorization: 'Bearer secret-token'
    });
  });

  it('cannot persist a late authentication response after disposal', async () => {
    const pendingResponse = deferredResponse();
    const sessionStore = memoryStorage();
    const session = createDatabaseScopedStandaloneSession({
      databaseId: 'database-1',
      authEndpoint,
      fetch: vi.fn<typeof fetch>().mockReturnValue(pendingResponse.promise),
      storage: { session: sessionStore, local: memoryStorage() }
    });
    const pendingSignIn = session.signIn({
      email: 'person@example.com',
      password: 'password'
    });
    session.dispose?.();
    pendingResponse.resolve(authPayload());

    await expect(pendingSignIn).rejects.toMatchObject({
      code: 'AUTH_OPERATION_SUPERSEDED'
    });
    expect(sessionStore.values.size).toBe(0);
    expect(session.getAccessToken(accessRequest(session))).toBeNull();
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
      code: 'UNAUTHENTICATED',
      identity: {
        kind: 'anonymous',
        tenantId: 'database-1',
        cachePartition: 'anonymous-request'
      }
    });

    expect(session.getSnapshot().status).toBe('anonymous');
  });
});

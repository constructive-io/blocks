import { describe, expect, it, vi } from 'vitest';

import {
  createConsoleCacheKey,
  createConsoleIdentityKey,
  createFetchConsoleTransport,
  createIdentityScopedTransport,
  getConsoleSessionIdentity,
  resolveConsoleEndpoint,
  type ConsoleTransport,
  type ConsoleTransportScope
} from './index';

describe('console endpoint resolution', () => {
  it('does not cross authorization boundaries without an explicit fallback', () => {
    expect(
      resolveConsoleEndpoint({ data: '/graphql' }, 'admin')
    ).toEqual({
      status: 'missing',
      requestedKind: 'admin',
      attemptedKinds: ['admin'],
      invalidKinds: []
    });
  });

  it('resolves an explicitly allowed fallback and preserves its actual kind', () => {
    expect(
      resolveConsoleEndpoint({ data: '/graphql' }, 'auth', {
        fallbackOrder: { auth: ['data'] }
      })
    ).toEqual({
      status: 'resolved',
      requestedKind: 'auth',
      resolvedKind: 'data',
      endpoint: {
        id: 'data:/graphql',
        kind: 'data',
        url: '/graphql'
      },
      usedFallback: true,
      attemptedKinds: ['auth', 'data']
    });
  });

  it('reports configured but blank endpoints as invalid', () => {
    const resolution = resolveConsoleEndpoint({ auth: '  ' }, 'auth');
    expect(resolution.status).toBe('missing');
    if (resolution.status === 'missing') {
      expect(resolution.invalidKinds).toEqual(['auth']);
    }
  });
});

describe('identity-scoped transport and cache keys', () => {
  const endpoint = {
    id: 'tenant-data',
    kind: 'data',
    url: 'https://tenant.example/graphql'
  } as const;

  const scope: ConsoleTransportScope = {
    endpoint,
    identity: {
      kind: 'authenticated',
      subjectId: 'user-1',
      tenantId: 'tenant-1',
      organizationId: 'org-1',
      cachePartition: 'login-4'
    },
    getAccessToken: vi.fn().mockResolvedValue('secret-token')
  };

  it('passes the immutable endpoint and identity scope to every operation', async () => {
    const execute = vi.fn().mockResolvedValue({ ok: true, data: { ok: true } });
    const transport: ConsoleTransport = { execute };
    const scoped = createIdentityScopedTransport(transport, scope);

    await scoped.execute({ document: 'query Health { health }' });

    expect(execute).toHaveBeenCalledWith(scope, {
      document: 'query Health { health }'
    });
  });

  it('partitions cache keys without storing access tokens', () => {
    const first = createConsoleCacheKey(scope, 'tables', { page: 1 });
    const second = createConsoleCacheKey(
      {
        ...scope,
        identity: {
          ...scope.identity,
          kind: 'authenticated',
          subjectId: 'user-2'
        }
      },
      'tables',
      { page: 1 }
    );

    expect(first).not.toEqual(second);
    expect(JSON.stringify(first)).not.toContain('secret-token');
  });

  it('partitions nested client caches across user, session, tenant, and organization switches', () => {
    const base = scope.identity;
    if (base.kind !== 'authenticated') throw new Error('Expected authenticated test identity.');
    const keys = [
      createConsoleIdentityKey(base),
      createConsoleIdentityKey({ ...base, subjectId: 'user-2' }),
      createConsoleIdentityKey({ ...base, sessionId: 'session-2' }),
      createConsoleIdentityKey({ ...base, tenantId: 'tenant-2' }),
      createConsoleIdentityKey({ ...base, organizationId: 'org-2' })
    ];

    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.join(' ')).not.toContain('secret-token');
  });

  it('never authorizes requests with a diagnostic identity from an error snapshot', () => {
    expect(getConsoleSessionIdentity({
      status: 'error',
      error: { message: 'The session expired.', code: 'UNAUTHENTICATED' },
      identity: scope.identity
    })).toBeNull();
  });
});

describe('fetch console transport', () => {
  const endpoint = {
    id: 'tenant-data',
    kind: 'data',
    url: 'https://tenant.example/graphql'
  } as const;
  const identity = {
    kind: 'authenticated',
    subjectId: 'user-1',
    cachePartition: 'login-1'
  } as const;

  function response(
    payload: unknown,
    options: { ok?: boolean; status?: number; statusText?: string } = {}
  ): Response {
    return {
      ok: options.ok ?? true,
      status: options.status ?? 200,
      statusText: options.statusText ?? 'OK',
      json: vi.fn().mockResolvedValue(payload)
    } as unknown as Response;
  }

  it('reads a fresh token and posts GraphQL JSON for every request', async () => {
    const getAccessToken = vi
      .fn()
      .mockResolvedValueOnce('token-1')
      .mockResolvedValueOnce('token-2');
    const fetchImpl = vi
      .fn<typeof fetch>()
      .mockResolvedValue(response({ data: { viewer: { id: 'user-1' } } }));
    const transport = createFetchConsoleTransport(fetchImpl);
    const scope = { endpoint, identity, getAccessToken };

    await transport.execute(scope, {
      document: 'query Viewer($active: Boolean!) { viewer { id } }',
      variables: { active: true },
      operationName: 'Viewer'
    });
    await transport.execute(scope, { document: 'query Health { health }' });

    expect(getAccessToken).toHaveBeenCalledTimes(2);
    expect(getAccessToken).toHaveBeenNthCalledWith(1, {
      endpoint,
      signal: undefined
    });
    const firstInit = fetchImpl.mock.calls[0]?.[1];
    const secondInit = fetchImpl.mock.calls[1]?.[1];
    expect(firstInit?.headers).toMatchObject({
      Authorization: 'Bearer token-1',
      'Content-Type': 'application/json'
    });
    expect(secondInit?.headers).toMatchObject({
      Authorization: 'Bearer token-2'
    });
    expect(JSON.parse(String(firstInit?.body))).toEqual({
      query: 'query Viewer($active: Boolean!) { viewer { id } }',
      variables: { active: true },
      operationName: 'Viewer'
    });
  });

  it('preserves partial data while normalizing GraphQL errors', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      response({
        data: { users: [] },
        errors: [
          {
            message: 'Not authorized',
            path: ['users', 0],
            extensions: { code: 'FORBIDDEN' }
          }
        ]
      })
    );
    const transport = createFetchConsoleTransport(fetchImpl);

    const result = await transport.execute(
      {
        endpoint,
        identity,
        getAccessToken: vi.fn().mockResolvedValue(null)
      },
      { document: 'query Users { users { id } }' }
    );

    expect(result).toEqual({
      ok: false,
      data: { users: [] },
      errors: [
        {
          message: 'Not authorized',
          path: ['users', 0],
          extensions: { code: 'FORBIDDEN' }
        }
      ]
    });
  });

  it('normalizes HTTP failures without exposing the token', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(
      response(
        { errors: [{ message: 'Unauthorized' }] },
        { ok: false, status: 401, statusText: 'Unauthorized' }
      )
    );
    const transport = createFetchConsoleTransport(fetchImpl);

    const result = await transport.execute(
      {
        endpoint,
        identity,
        getAccessToken: vi.fn().mockResolvedValue('do-not-expose')
      },
      { document: 'query Viewer { viewer { id } }' }
    );

    expect(result).toEqual({
      ok: false,
      data: null,
      errors: [
        {
          message: 'HTTP 401: Unauthorized',
          extensions: { code: 'HTTP_ERROR', status: 401 }
        },
        { message: 'Unauthorized', path: undefined, extensions: undefined }
      ]
    });
    expect(JSON.stringify(result)).not.toContain('do-not-expose');
  });
});

import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  ConsoleIdentity,
  ConsoleSession,
  ConsoleTransport,
  DatabaseScopedStandaloneConsoleSession
} from '../../console-runtime';
import { createConsoleKitStore } from '../store';

const consoleKitCaptures = vi.hoisted(() => ({ props: [] as unknown[] }));

vi.mock('../console-kit', () => ({
  ConsoleKit: (props: unknown) => {
    consoleKitCaptures.props.push(props);
    return 'Console Kit mounted';
  }
}));

import { ConstructiveConsoleKit } from '../../presets/full-console-kit';
import { authConsoleModule } from '../../feature-packs/auth/auth-console-module';
import { dataConsoleModule } from '../../feature-packs/data/data-console-module';
import { ConstructiveConsoleKitCore } from '../console-kit-core';

afterEach(() => {
  vi.unstubAllGlobals();
  window.localStorage.clear();
  window.sessionStorage.clear();
});

function session(id: string): DatabaseScopedStandaloneConsoleSession {
  const identity: ConsoleIdentity = {
    kind: 'anonymous',
    cachePartition: `anonymous:${id}`,
    tenantId: 'database-1'
  };
  return {
    mode: 'standalone',
    databaseId: 'database-1',
    beginSignIn: vi.fn(),
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    restorePersistedSession: vi.fn(),
    handleAuthenticationFailure: vi.fn(),
    dispose: vi.fn(),
    resume: vi.fn(),
    getSnapshot: () => ({ status: 'anonymous', identity }),
    getServerSnapshot: () => ({ status: 'loading' }),
    subscribe: () => () => undefined,
    getAccessToken: () => null
  };
}

function embeddedSession(databaseId: string): ConsoleSession & { databaseId: string } {
  const identity: ConsoleIdentity = {
    kind: 'anonymous',
    cachePartition: `anonymous:${databaseId}`,
    tenantId: databaseId
  };
  return {
    mode: 'embedded',
    databaseId,
    getSnapshot: () => ({ status: 'anonymous', identity }),
    getServerSnapshot: () => ({ status: 'loading' }),
    subscribe: () => () => undefined,
    getAccessToken: () => null
  };
}

function transport(id: string): ConsoleTransport {
  const execute: ConsoleTransport['execute'] = async <TData,>() => ({
    ok: false,
    data: null as TData | null,
    errors: [{ message: id }]
  });
  return {
    execute
  };
}

describe('ConstructiveConsoleKit external ownership', () => {
  it('supports a first-party selected-pack composition from the core barrel', () => {
    const hostSession = embeddedSession('database-1');
    const hostTransport = transport('selected-packs');

    render(
      <ConstructiveConsoleKitCore
        database={{
          id: 'database-1',
          endpoints: {
            data: { id: 'data-1', url: 'https://tenant.example/data/graphql' },
            auth: { id: 'auth-1', url: 'https://tenant.example/auth/graphql' }
          }
        }}
        featureModules={[dataConsoleModule, authConsoleModule]}
        session={hostSession}
        transport={hostTransport}
      />
    );

    const props = consoleKitCaptures.props.at(-1) as Readonly<{
      featureModules: readonly Readonly<{ id: string }>[];
    }>;
    expect(props.featureModules.map((module) => module.id)).toEqual([
      'data',
      'auth'
    ]);
  });

  it('renders a configuration error for a relative internal auth endpoint', () => {
    render(
      <ConstructiveConsoleKit
        database={{
          id: 'database-1',
          endpoints: { auth: { id: 'auth-1', url: 'graphql' } }
        }}
      />
    );

    expect(screen.getByText(/absolute auth endpoint URL/u)).toBeInTheDocument();
  });

  it('adopts replacement store, session, transport, and adapter secrets', async () => {
    const firstStore = createConsoleKitStore('auth');
    const secondStore = createConsoleKitStore('data');
    const firstSession = session('first');
    const secondSession = session('second');
    const firstTransport = transport('first');
    const secondTransport = transport('second');
    const database = {
      id: 'database-1',
      endpoints: { auth: { id: 'auth-1', url: 'https://tenant.example/auth/graphql' } }
    } as const;

    const view = render(
      <ConstructiveConsoleKit
        database={database}
        resetRoleId='role-1'
        resetToken='token-1'
        session={firstSession}
        store={firstStore}
        transport={firstTransport}
      />
    );

    const firstProps = consoleKitCaptures.props.at(-1) as Readonly<{
      store: ReturnType<typeof createConsoleKitStore>;
      config: Readonly<{
        session: DatabaseScopedStandaloneConsoleSession;
        transport: ConsoleTransport;
        adapters: object;
      }>;
    }>;

    view.rerender(
      <ConstructiveConsoleKit
        database={database}
        resetRoleId='role-2'
        resetToken='token-2'
        session={secondSession}
        store={secondStore}
        transport={secondTransport}
      />
    );

    const secondProps = consoleKitCaptures.props.at(-1) as typeof firstProps;
    expect(secondProps.store).toBe(secondStore);
    expect(secondProps.config.session).toBe(secondSession);
    expect(secondProps.config.transport).toBe(secondTransport);
    expect(secondProps.config.adapters).not.toBe(firstProps.config.adapters);
  });

  it('mounts a blank data-only tenant with a host session despite its nominal auth route', () => {
    const hostSession = embeddedSession('database-1');
    const hostTransport = transport('blank');

    render(
      <ConstructiveConsoleKit
        database={{
          id: 'database-1',
          name: 'Blank tenant',
          endpoints: {
            data: { id: 'data-1', url: 'https://blank.example/data/graphql' },
            auth: { id: 'auth-1', url: 'https://blank.example/auth/graphql' }
          }
        }}
        session={hostSession}
        transport={hostTransport}
      />
    );

    expect(screen.getByText('Console Kit mounted')).toBeInTheDocument();
    expect(screen.queryByText(/Console Kit is not configured/u)).not.toBeInTheDocument();
    const props = consoleKitCaptures.props.at(-1) as Readonly<{
      store: ReturnType<typeof createConsoleKitStore>;
      config: Readonly<{
        endpoints: Readonly<Record<string, unknown>>;
        session: ConsoleSession;
        transport: ConsoleTransport;
        adapters: Readonly<Record<string, unknown>>;
      }>;
    }>;
    expect(props.store.getState().activeFeature).toBe('data');
    expect(props.config.endpoints).toEqual({
      data: { id: 'data-1', url: 'https://blank.example/data/graphql' },
      auth: { id: 'auth-1', url: 'https://blank.example/auth/graphql' }
    });
    expect(props.config.session).toBe(hostSession);
    expect(props.config.transport).toBe(hostTransport);
    expect(props.config.adapters.auth).toBeUndefined();
  });

  it('rejects a host-owned session from another tenant database', () => {
    const mismatchedSession = {
      ...session('other-database'),
      databaseId: 'database-2'
    };

    render(
      <ConstructiveConsoleKit
        database={{
          id: 'database-1',
          endpoints: {
            data: { id: 'data-1', url: 'https://blank.example/data/graphql' }
          }
        }}
        session={mismatchedSession}
      />
    );

    expect(screen.getByText(/session belongs to a different tenant database/u))
      .toBeInTheDocument();
    expect(screen.queryByText('Console Kit mounted')).not.toBeInTheDocument();
    expect(mismatchedSession.restorePersistedSession).not.toHaveBeenCalled();
  });

  it('uses the latest host CSRF provider in its internal standalone session', async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        data: {
          signIn: {
            result: {
              id: 'session-1',
              userId: 'user-1',
              accessToken: 'secret-token',
              accessTokenExpiresAt: null
            }
          }
        }
      })
    } as unknown as Response);
    vi.stubGlobal('fetch', fetchImpl);
    const firstProvider = vi.fn().mockResolvedValue('first-token');
    const secondProvider = vi.fn().mockResolvedValue('second-token');
    const database = {
      id: 'database-1',
      endpoints: { auth: { id: 'auth-1', url: 'https://tenant.example/auth/graphql' } }
    } as const;

    const view = render(<ConstructiveConsoleKit database={database} />);
    const unconfiguredProps = consoleKitCaptures.props.at(-1) as Readonly<{
      config: Readonly<{ session: DatabaseScopedStandaloneConsoleSession }>;
    }>;
    view.rerender(
      <ConstructiveConsoleKit
        csrfTokenProvider={firstProvider}
        database={database}
      />
    );
    const firstConfiguredProps = consoleKitCaptures.props.at(-1) as typeof unconfiguredProps;
    view.rerender(
      <ConstructiveConsoleKit
        csrfTokenProvider={secondProvider}
        database={database}
      />
    );

    const props = consoleKitCaptures.props.at(-1) as Readonly<{
      config: Readonly<{ session: DatabaseScopedStandaloneConsoleSession }>;
    }>;
    expect(firstConfiguredProps.config.session).toBe(unconfiguredProps.config.session);
    expect(props.config.session).toBe(firstConfiguredProps.config.session);
    await props.config.session.signIn({
      email: 'person@example.com',
      password: 'password'
    });

    expect(firstProvider).not.toHaveBeenCalled();
    expect(secondProvider).toHaveBeenCalledWith(expect.objectContaining({
      databaseId: 'database-1',
      operation: 'signIn'
    }));
    expect(JSON.parse(String(fetchImpl.mock.calls[0]?.[1]?.body))).toMatchObject({
      variables: { input: { csrfToken: 'second-token' } }
    });
  });

  it('keeps the internal session usable through React Strict Mode effect replay', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        data: {
          signIn: {
            result: {
              id: 'session-1',
              userId: 'user-1',
              accessToken: 'secret-token',
              accessTokenExpiresAt: null
            }
          }
        }
      })
    } as unknown as Response));
    const database = {
      id: 'database-1',
      endpoints: {
        auth: {
          id: 'auth-1',
          url: 'https://tenant.example/auth/graphql'
        }
      }
    } as const;

    render(
      <React.StrictMode>
        <ConstructiveConsoleKit database={database} />
      </React.StrictMode>
    );
    const props = consoleKitCaptures.props.at(-1) as Readonly<{
      config: Readonly<{ session: DatabaseScopedStandaloneConsoleSession }>;
    }>;

    await expect(props.config.session.signIn({
      email: 'person@example.com',
      password: 'password'
    })).resolves.toMatchObject({ status: 'authenticated' });
  });

  it('cancels a tenant authentication response when the kit switches databases', async () => {
    let resolveTenantA!: (response: Response) => void;
    const tenantAResponse = new Promise<Response>((resolve) => {
      resolveTenantA = resolve;
    });
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockReturnValue(tenantAResponse));
    const tenantA = {
      id: 'database-a',
      endpoints: { auth: { id: 'auth-a', url: 'https://a.example/graphql' } }
    } as const;
    const tenantB = {
      id: 'database-b',
      endpoints: { auth: { id: 'auth-b', url: 'https://b.example/graphql' } }
    } as const;
    const view = render(<ConstructiveConsoleKit database={tenantA} />);
    const tenantAProps = consoleKitCaptures.props.at(-1) as Readonly<{
      config: Readonly<{ session: DatabaseScopedStandaloneConsoleSession }>;
    }>;
    const pendingSignIn = tenantAProps.config.session.signIn({
      email: 'person@example.com',
      password: 'password'
    });

    view.rerender(<ConstructiveConsoleKit database={tenantB} />);
    resolveTenantA({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        data: {
          signIn: {
            result: {
              id: 'session-a',
              userId: 'user-a',
              accessToken: 'tenant-a-token',
              accessTokenExpiresAt: null
            }
          }
        }
      })
    } as unknown as Response);

    await expect(pendingSignIn).rejects.toMatchObject({
      code: 'AUTH_OPERATION_SUPERSEDED'
    });
    expect([...Array(window.sessionStorage.length)].map((_, index) =>
      window.sessionStorage.getItem(window.sessionStorage.key(index) ?? '')
    ).join('')).not.toContain('tenant-a-token');
  });
});

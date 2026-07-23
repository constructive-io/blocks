import * as React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  ConsoleKitAdapterContext,
  ConsoleKitConfig,
  ConsoleKitFeaturePropsMap
} from './console-kit-contracts';
import type { ConsoleKitFeatureModule } from './feature-module';

const runtimeMocks = vi.hoisted(() => ({
  useConsoleKitRuntime: vi.fn()
}));

vi.mock('./console-kit-runtime', async (importOriginal) => ({
  ...await importOriginal<typeof import('./console-kit-runtime')>(),
  useConsoleKitRuntime: runtimeMocks.useConsoleKitRuntime
}));

vi.mock('@constructive-io/ui/app-shell', () => ({
  AppShell: ({ account, children, navigation, renderLink }: Readonly<{
    account?: Readonly<{
      name: string;
      secondaryLabel?: string;
      avatarUrl?: string;
      avatarAlt?: string;
      actionGroups?: readonly Readonly<{
        actions: readonly Readonly<{ id: string; label: string; onSelect: () => void }>[];
      }>[];
    }>;
    children: React.ReactNode;
    navigation?: readonly Readonly<{
      items: readonly Readonly<{
        badge?: React.ReactNode;
        disabled?: boolean;
        href: string;
        id: string;
        isActive?: boolean;
        label: React.ReactNode;
      }>[];
    }>[];
    renderLink?: (props: Readonly<React.AnchorHTMLAttributes<HTMLAnchorElement> & {
      children: React.ReactNode;
      href: string;
    }>) => React.ReactNode;
  }>) => (
    <div>
      <nav>
        {navigation?.flatMap((group) => group.items).map((item) => (
          <React.Fragment key={item.id}>
            {renderLink?.({
              'aria-disabled': item.disabled || undefined,
              'aria-current': item.isActive ? 'page' : undefined,
              children: item.label,
              href: item.href,
              onClick: item.disabled
                ? (event) => event.preventDefault()
                : undefined
            })}
            {item.badge ? <span>{item.badge}</span> : null}
          </React.Fragment>
        ))}
      </nav>
      {account ? (
        <div data-testid='app-account'>
          <span>{account.name}</span>
          {account.secondaryLabel ? <span>{account.secondaryLabel}</span> : null}
          {account.avatarUrl
            ? <img alt={account.avatarAlt ?? account.name} src={account.avatarUrl} />
            : null}
        </div>
      ) : null}
      {account?.actionGroups?.flatMap((group) => group.actions).map((action) => (
        <button key={action.id} onClick={action.onSelect} type='button'>
          {action.label}
        </button>
      ))}
      {children}
    </div>
  )
}));

vi.mock('../feature-packs/auth/auth-feature-pack', () => ({
  AuthFeaturePack: ({ actions, onError }: Readonly<{
    actions?: Readonly<{
      changePassword?: (input: {
        currentPassword: string;
        newPassword: string;
      }) => unknown;
    }>;
    onError?: (error: { message: string; code: string }) => void;
  }>) => {
    const [draft, setDraft] = React.useState('');
    return (
      <div>
        Authentication
        <label>
          Credential draft
          <input
            onChange={(event) => setDraft(event.currentTarget.value)}
            value={draft}
          />
        </label>
        <button
          onClick={() => onError?.({ message: 'Action rejected', code: 'ACTION_REJECTED' })}
          type='button'
        >
          Trigger auth error
        </button>
        {actions?.changePassword ? (
          <button
            onClick={() => actions.changePassword?.({
              currentPassword: 'old-password',
              newPassword: 'new-password'
            })}
            type='button'
          >
            Invoke adapter action
          </button>
        ) : null}
      </div>
    );
  }
}));

import { ConsoleKit } from './console-kit';
import { createConsoleKitStore } from './store';
import { fullFeatureModules } from '../presets/full-console-kit';

function createFullConsoleKitStore(
  initialFeature: Parameters<typeof createConsoleKitStore>[0] = 'auth'
) {
  return createConsoleKitStore(
    initialFeature,
    null,
    (fullFeatureModules as readonly ConsoleKitFeatureModule[]).flatMap((module) =>
      module.storeSlice ? [module.storeSlice] : []
    )
  );
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<T>((next, fail) => {
    resolve = next;
    reject = fail;
  });
  return { promise, reject, resolve };
}

const snapshot = {
  status: 'authenticated',
  identity: {
    kind: 'authenticated',
    cachePartition: 'login-1',
    subjectId: 'user-1'
  }
} as const;

const runtime = {
  databaseId: 'database-1',
  endpoints: {
    auth: { id: 'auth', kind: 'auth', url: '/auth/graphql' }
  },
  session: snapshot,
  metadata: {
    status: 'compatible',
    meta: {},
    contractIntrospection: {},
    introspection: {}
  },
  transportFor: () => null
} as unknown as ConsoleKitAdapterContext;

describe('Console Kit observational callbacks', () => {
  afterEach(() => {
    runtimeMocks.useConsoleKitRuntime.mockReset();
    window.history.replaceState(null, '', '/');
  });

  it('marks configured protected navigation as sign-in required while anonymous', async () => {
    const anonymousSnapshot = {
      status: 'anonymous',
      identity: { kind: 'anonymous', cachePartition: 'anonymous-1' }
    } as const;
    runtimeMocks.useConsoleKitRuntime.mockReturnValue({
      ...runtime,
      endpoints: {
        auth: { id: 'auth', kind: 'auth', url: '/auth/graphql' },
        storage: { id: 'storage', kind: 'storage', url: '/storage/graphql' }
      },
      session: anonymousSnapshot
    });
    const onNavigate = vi.fn();
    const session = {
      mode: 'embedded',
      getSnapshot: () => anonymousSnapshot,
      subscribe: () => () => undefined,
      getAccessToken: () => null
    } as const;

    render(
      <ConsoleKit
        featureModules={fullFeatureModules}
        config={{
          adapters: {
            auth: {
              capabilities: ['auth.sessions', 'auth.credentials', 'auth.password'],
              load: async () => ({ view: 'entry' })
            },
            storage: {
              capabilities: ['storage.buckets', 'storage.files'],
              load: async () => ({ resource: { status: 'empty' } })
            }
          },
          databaseId: 'database-1',
          endpoints: {
            auth: '/auth/graphql',
            storage: '/storage/graphql'
          },
          order: ['auth', 'storage'],
          routes: { onNavigate },
          session,
          showUnavailable: true
        }}
      />
    );

    const storageLink = await screen.findByRole('link', { name: 'Storage' });
    expect(storageLink).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getAllByText('Sign in')).toHaveLength(2);
    fireEvent.click(storageLink);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it('does not subscribe adapters excluded by the configured module order', async () => {
    runtimeMocks.useConsoleKitRuntime.mockReturnValue(runtime);
    const storageSubscribe = vi.fn(() => () => undefined);
    const session = {
      mode: 'embedded',
      getSnapshot: () => snapshot,
      subscribe: () => () => undefined,
      getAccessToken: () => null
    } as const;

    render(
      <ConsoleKit
        featureModules={fullFeatureModules}
        config={{
          adapters: {
            storage: {
              capabilities: ['storage.buckets', 'storage.files'],
              load: async () => ({ resource: { status: 'empty' } }),
              subscribe: storageSubscribe
            }
          },
          databaseId: 'database-1',
          endpoints: { auth: '/auth/graphql' },
          order: ['auth'],
          session
        }}
        store={createFullConsoleKitStore()}
      />
    );

    await screen.findByRole('heading', {
      level: 1,
      name: 'Authentication is unavailable'
    });
    expect(storageSubscribe).not.toHaveBeenCalled();
  });

  it('reconciles navigation when a dynamic order removes the active feature', async () => {
    runtimeMocks.useConsoleKitRuntime.mockReturnValue(runtime);
    const session = {
      mode: 'embedded',
      getSnapshot: () => snapshot,
      subscribe: () => () => undefined,
      getAccessToken: () => null
    } as const;
    const config = (order: readonly ('auth' | 'users')[]) => ({
      databaseId: 'database-1',
      endpoints: { auth: '/auth/graphql' },
      order,
      session,
      showUnavailable: true
    });
    const view = render(
      <ConsoleKit
        config={config(['auth', 'users'])}
        featureModules={fullFeatureModules}
      />
    );

    await screen.findByRole('heading', {
      level: 1,
      name: 'Authentication is unavailable'
    });
    fireEvent.click(screen.getByRole('link', { name: 'Users' }));
    await screen.findByRole('heading', {
      level: 1,
      name: 'Users is unavailable'
    });

    view.rerender(
      <ConsoleKit
        config={config(['auth'])}
        featureModules={fullFeatureModules}
      />
    );

    await screen.findByRole('heading', {
      level: 1,
      name: 'Authentication is unavailable'
    });
    expect(screen.getByRole('link', { name: 'Authentication' }))
      .toHaveAttribute('aria-current', 'page');
  });

  it('installs slices for modules hidden from the initial order', async () => {
    runtimeMocks.useConsoleKitRuntime.mockReturnValue({
      ...runtime,
      endpoints: {
        auth: { id: 'auth', kind: 'auth', url: '/auth/graphql' },
        storage: { id: 'storage', kind: 'storage', url: '/storage/graphql' }
      }
    });
    const session = {
      mode: 'embedded',
      getSnapshot: () => snapshot,
      subscribe: () => () => undefined,
      getAccessToken: () => null
    } as const;
    const storageAdapter = {
      capabilities: ['storage.buckets', 'storage.files'] as const,
      load: async () => ({ resource: { status: 'empty' as const } })
    };
    const config = (order: readonly ('auth' | 'storage')[]) => ({
      adapters: { storage: storageAdapter },
      databaseId: 'database-1',
      endpoints: {
        auth: '/auth/graphql',
        storage: '/storage/graphql'
      },
      order,
      session,
      showUnavailable: true
    });
    const view = render(
      <ConsoleKit
        config={config(['auth'])}
        featureModules={fullFeatureModules}
      />
    );

    await screen.findByRole('heading', {
      level: 1,
      name: 'Authentication is unavailable'
    });
    view.rerender(
      <ConsoleKit
        config={config(['auth', 'storage'])}
        featureModules={fullFeatureModules}
      />
    );

    fireEvent.click(await screen.findByRole('link', { name: 'Storage' }));
    expect(await screen.findByRole('heading', { name: 'Storage' })).toBeVisible();
  });

  it('navigates with the current external store after store replacement', async () => {
    runtimeMocks.useConsoleKitRuntime.mockReturnValue(runtime);
    const session = {
      mode: 'embedded',
      getSnapshot: () => snapshot,
      subscribe: () => () => undefined,
      getAccessToken: () => null
    } as const;
    const config = {
      databaseId: 'database-1',
      endpoints: { auth: '/auth/graphql' },
      order: ['data', 'users'] as const,
      session,
      showUnavailable: true
    };
    const firstStore = createFullConsoleKitStore('data');
    const secondStore = createFullConsoleKitStore('data');
    const view = render(
      <ConsoleKit
        config={config}
        featureModules={fullFeatureModules}
        store={firstStore}
      />
    );

    await screen.findByRole('heading', {
      level: 1,
      name: 'Data is unavailable'
    });
    view.rerender(
      <ConsoleKit
        config={config}
        featureModules={fullFeatureModules}
        store={secondStore}
      />
    );
    fireEvent.click(screen.getByRole('link', { name: 'Users' }));

    await screen.findByRole('heading', {
      level: 1,
      name: 'Users is unavailable'
    });
    expect(firstStore.getState().activeFeature).toBe('data');
    expect(secondStore.getState().activeFeature).toBe('users');
  });

  it('keeps the standalone auth draft mounted while capability discovery refreshes', async () => {
    const anonymousSnapshot = {
      status: 'anonymous',
      identity: { kind: 'anonymous', cachePartition: 'anonymous-1' }
    } as const;
    runtimeMocks.useConsoleKitRuntime.mockReturnValue({
      ...runtime,
      sessionMode: 'standalone',
      session: anonymousSnapshot
    });
    const store = createFullConsoleKitStore();
    store.getState().setPackCapability('auth', {
      status: 'ready',
      packId: 'auth',
      supportedCapabilities: [
        'auth.sessions',
        'auth.credentials',
        'auth.password'
      ],
      evidence: []
    });
    const session = {
      mode: 'standalone',
      beginSignIn: vi.fn(),
      signOut: vi.fn(),
      getSnapshot: () => anonymousSnapshot,
      subscribe: () => () => undefined,
      getAccessToken: () => null
    } as const;
    const adapter = {
      capabilities: [
        'auth.sessions',
        'auth.credentials',
        'auth.password'
      ] as const,
      requiresCapabilityDiscovery: true,
      load: vi.fn().mockResolvedValue({ view: 'entry' as const })
    };

    render(
      <ConsoleKit
        featureModules={fullFeatureModules}
        config={{
          adapters: { auth: adapter },
          databaseId: 'database-1',
          endpoints: { auth: '/auth/graphql' },
          order: ['auth'],
          session
        }}
        store={store}
      />
    );

    const draft = await screen.findByLabelText('Credential draft');
    fireEvent.change(draft, { target: { value: 'keep signing in' } });
    expect(adapter.load).toHaveBeenCalledTimes(1);

    act(() => store.getState().setPackCapability('auth', {
      status: 'checking',
      packId: 'auth'
    }));

    expect(screen.queryByLabelText('Loading feature')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Credential draft')).toHaveValue('keep signing in');

    act(() => store.getState().setPackCapability('auth', {
      status: 'ready',
      packId: 'auth',
      supportedCapabilities: [...adapter.capabilities],
      evidence: []
    }));

    expect(screen.getByLabelText('Credential draft')).toHaveValue('keep signing in');
  });

  it('keeps feature-local input mounted during a same-identity adapter refresh', async () => {
    runtimeMocks.useConsoleKitRuntime.mockReturnValue(runtime);
    const store = createFullConsoleKitStore();
    store.getState().setPackCapability('auth', {
      status: 'ready',
      packId: 'auth',
      supportedCapabilities: [
        'auth.sessions',
        'auth.credentials',
        'auth.password'
      ],
      evidence: []
    });
    const session = {
      mode: 'embedded',
      getSnapshot: () => snapshot,
      subscribe: () => () => undefined,
      getAccessToken: () => null
    } as const;
    let notify: (() => void) | undefined;
    const adapter = {
      capabilities: [
        'auth.sessions',
        'auth.credentials',
        'auth.password'
      ] as const,
      requiresCapabilityDiscovery: true,
      subscribe: vi.fn((_runtime, listener: () => void) => {
        notify = listener;
        return () => undefined;
      }),
      load: vi.fn().mockResolvedValue({ view: 'account' as const })
    };

    const view = render(
      <ConsoleKit
        featureModules={fullFeatureModules}
        config={{
          adapters: { auth: adapter },
          databaseId: 'database-1',
          endpoints: { auth: '/auth/graphql' },
          order: ['auth'],
          session
        }}
        store={store}
      />
    );

    const draft = await screen.findByLabelText('Credential draft');
    fireEvent.change(draft, { target: { value: 'keep me' } });
    act(() => notify?.());

    await waitFor(() => expect(adapter.load).toHaveBeenCalledTimes(2));
    expect(screen.getByLabelText('Credential draft')).toHaveValue('keep me');

    runtimeMocks.useConsoleKitRuntime.mockReturnValue({
      ...runtime,
      session: {
        status: 'authenticated',
        identity: {
          kind: 'authenticated',
          cachePartition: 'login-2',
          subjectId: 'user-2'
        }
      }
    });
    view.rerender(
      <ConsoleKit
        featureModules={fullFeatureModules}
        config={{
          adapters: { auth: adapter },
          databaseId: 'database-1',
          endpoints: { auth: '/auth/graphql' },
          order: ['auth'],
          session
        }}
        store={store}
      />
    );

    await waitFor(() => expect(adapter.load).toHaveBeenCalledTimes(3));
    expect(await screen.findByLabelText('Credential draft')).toHaveValue('');
  });

  it('does not retain actions across a transport authorization change', async () => {
    const firstExecute = vi.fn().mockResolvedValue({ ok: true, data: {} });
    const secondExecute = vi.fn().mockResolvedValue({ ok: true, data: {} });
    const firstTransportFor = vi.fn(() => ({ execute: firstExecute }));
    const secondTransportFor = vi.fn(() => ({ execute: secondExecute }));
    runtimeMocks.useConsoleKitRuntime.mockReturnValue({
      ...runtime,
      transportFor: firstTransportFor
    });
    const nextLoad = deferred<{
      view: 'account';
      actions: {
        changePassword: () => Promise<unknown>;
      };
    }>();
    const adapter = {
      capabilities: [
        'auth.sessions',
        'auth.credentials',
        'auth.password'
      ] as const,
      load: vi.fn()
        .mockImplementationOnce(async (adapterRuntime: ConsoleKitAdapterContext) => ({
          view: 'account' as const,
          actions: {
            changePassword: () => adapterRuntime.transportFor('auth')?.execute({
              document: 'mutation ChangePassword { changePassword }'
            })
          }
        }))
        .mockImplementationOnce(() => nextLoad.promise)
    };
    const session = {
      mode: 'embedded',
      getSnapshot: () => snapshot,
      subscribe: () => () => undefined,
      getAccessToken: () => null
    } as const;
    const config = {
      adapters: { auth: adapter },
      databaseId: 'database-1',
      endpoints: { auth: '/auth/graphql' },
      order: ['auth'] as const,
      session
    };

    const view = render(
      <ConsoleKit config={config} featureModules={fullFeatureModules} />
    );
    fireEvent.click(await screen.findByRole('button', {
      name: 'Invoke adapter action'
    }));
    expect(firstExecute).toHaveBeenCalledTimes(1);

    runtimeMocks.useConsoleKitRuntime.mockReturnValue({
      ...runtime,
      transportFor: secondTransportFor
    });
    view.rerender(
      <ConsoleKit config={config} featureModules={fullFeatureModules} />
    );

    await waitFor(() => expect(adapter.load).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole('button', {
      name: 'Invoke adapter action'
    })).not.toBeInTheDocument();
    expect(firstExecute).toHaveBeenCalledTimes(1);

    act(() => nextLoad.resolve({
      view: 'account',
      actions: {
        changePassword: () => secondTransportFor()?.execute({
          document: 'mutation ChangePassword { changePassword }'
        }) ?? Promise.resolve()
      }
    }));
    fireEvent.click(await screen.findByRole('button', {
      name: 'Invoke adapter action'
    }));
    expect(secondExecute).toHaveBeenCalledTimes(1);
    expect(firstExecute).toHaveBeenCalledTimes(1);
  });

  it('hydrates the shell account from the ready auth adapter identity', async () => {
    runtimeMocks.useConsoleKitRuntime.mockReturnValue(runtime);
    const session = {
      mode: 'embedded',
      getSnapshot: () => snapshot,
      subscribe: () => () => undefined,
      getAccessToken: () => null
    } as const;
    const adapter = {
      capabilities: [
        'auth.sessions',
        'auth.credentials',
        'auth.password'
      ] as const,
      load: vi.fn().mockResolvedValue({
        view: 'account' as const,
        account: {
          status: 'ready' as const,
          quality: 'authoritative' as const,
          data: {
            identity: {
              id: 'user-1',
              displayName: 'Ada Lovelace',
              primaryEmail: 'ada@example.com',
              avatarUrl: 'https://images.example.com/ada.png'
            }
          }
        }
      })
    };

    render(
      <ConsoleKit
        featureModules={fullFeatureModules}
        config={{
          adapters: { auth: adapter },
          databaseId: 'database-1',
          endpoints: { auth: '/auth/graphql' },
          order: ['auth'],
          session
        }}
      />
    );

    const account = await screen.findByTestId('app-account');
    await waitFor(() => {
      expect(within(account).getByText('Ada Lovelace')).toBeVisible();
      expect(within(account).getByText('ada@example.com')).toBeVisible();
    });
    expect(within(account).queryByText('User user-1')).not.toBeInTheDocument();
    expect(within(account).getByRole('img')).toHaveAttribute(
      'src',
      'https://images.example.com/ada.png'
    );
  });

  it('does not reuse a ready auth identity across adapter, session, or tenant switches', async () => {
    runtimeMocks.useConsoleKitRuntime.mockReturnValue(runtime);
    const store = createFullConsoleKitStore();
    const session = {
      mode: 'embedded',
      getSnapshot: () => snapshot,
      subscribe: () => () => undefined,
      getAccessToken: () => null
    } as const;
    const firstAdapter = {
      capabilities: [
        'auth.sessions',
        'auth.credentials',
        'auth.password'
      ] as const,
      load: vi.fn().mockResolvedValue({
        view: 'account' as const,
        account: {
          status: 'ready' as const,
          data: {
            identity: {
              id: 'user-1',
              displayName: 'Ada Lovelace',
              primaryEmail: 'ada@example.com'
            }
          }
        }
      })
    };
    const secondAdapter = {
      ...firstAdapter,
      load: vi.fn().mockResolvedValue({ view: 'account' as const })
    };
    const config = (adapter: typeof firstAdapter) => ({
      adapters: { auth: adapter },
      databaseId: 'database-1',
      endpoints: { auth: '/auth/graphql' },
      order: ['auth', 'data'] as const,
      session,
      showUnavailable: true
    });

    const view = render(
      <ConsoleKit
        config={config(firstAdapter)}
        featureModules={fullFeatureModules}
        store={store}
      />
    );
    await screen.findByText('Ada Lovelace');
    fireEvent.click(screen.getByRole('link', { name: 'Data' }));
    await screen.findByRole('heading', { level: 1, name: 'Data is unavailable' });

    view.rerender(
      <ConsoleKit
        config={config(secondAdapter)}
        featureModules={fullFeatureModules}
        store={store}
      />
    );
    await waitFor(() => {
      expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument();
      expect(screen.getByText('User user-1')).toBeVisible();
    });

    runtimeMocks.useConsoleKitRuntime.mockReturnValue({
      ...runtime,
      databaseId: 'database-2',
      session: {
        status: 'authenticated',
        identity: {
          kind: 'authenticated',
          cachePartition: 'login-2',
          subjectId: 'user-2'
        }
      }
    });
    view.rerender(
      <ConsoleKit
        config={{ ...config(secondAdapter), databaseId: 'database-2' }}
        featureModules={fullFeatureModules}
        store={store}
      />
    );

    await waitFor(() => {
      expect(screen.queryByText('Ada Lovelace')).not.toBeInTheDocument();
      expect(screen.getByText('User user-2')).toBeVisible();
    });
    expect(store.getState().adapterLoads.auth).toMatchObject({
      status: 'ready',
      adapter: firstAdapter
    });
  });

  it('keeps hash navigation active when the host only supplies a link renderer', async () => {
    runtimeMocks.useConsoleKitRuntime.mockReturnValue(runtime);
    const session = {
      mode: 'embedded',
      getSnapshot: () => snapshot,
      subscribe: () => () => undefined,
      getAccessToken: () => null
    } as const;

    render(
      <ConsoleKit
        featureModules={fullFeatureModules}
        config={{
          databaseId: 'database-1',
          endpoints: { auth: '/auth/graphql' },
          order: ['auth', 'users'],
          routes: {
            renderLink: (props) => <a {...props} />
          },
          session,
          showUnavailable: true
        }}
      />
    );
    await screen.findByRole('heading', { level: 1, name: 'Authentication is unavailable' });

    act(() => {
      window.history.pushState(null, '', '#console-users');
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });

    await screen.findByRole('heading', { level: 1, name: 'Users is unavailable' });
  });

  it('does not mutate the active console for a modified link click', async () => {
    runtimeMocks.useConsoleKitRuntime.mockReturnValue(runtime);
    const onNavigate = vi.fn();
    const session = {
      mode: 'embedded',
      getSnapshot: () => snapshot,
      subscribe: () => () => undefined,
      getAccessToken: () => null
    } as const;
    render(
      <ConsoleKit
        featureModules={fullFeatureModules}
        config={{
          databaseId: 'database-1',
          endpoints: { auth: '/auth/graphql' },
          order: ['auth', 'users'],
          routes: { onNavigate },
          session,
          showUnavailable: true
        }}
      />
    );
    await screen.findByRole('heading', { level: 1, name: 'Authentication is unavailable' });

    fireEvent.click(screen.getByRole('link', { name: 'Users' }), {
      button: 0,
      metaKey: true
    });

    expect(onNavigate).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { level: 1, name: 'Authentication is unavailable' }))
      .toBeVisible();
  });

  it('renders standalone sign-in again after an authentication failure', async () => {
    const failedSnapshot = {
      status: 'error',
      error: {
        message: 'The credential has been revoked.',
        code: 'UNAUTHENTICATED'
      },
      identity: snapshot.identity
    } as const;
    runtimeMocks.useConsoleKitRuntime.mockReturnValue({
      ...runtime,
      sessionMode: 'standalone',
      session: failedSnapshot
    });
    const session = {
      mode: 'standalone',
      databaseId: 'database-1',
      beginSignIn: vi.fn(),
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
      restorePersistedSession: vi.fn(),
      handleAuthenticationFailure: vi.fn(),
      getSnapshot: () => failedSnapshot,
      getServerSnapshot: () => ({ status: 'loading' as const }),
      subscribe: () => () => undefined,
      getAccessToken: () => null
    } as const;

    render(
      <ConsoleKit
        featureModules={fullFeatureModules}
        config={{
          databaseId: 'database-1',
          endpoints: { auth: '/auth/graphql' },
          order: ['auth'],
          session
        }}
      />
    );

    expect(await screen.findByRole('button', { name: 'Trigger auth error' })).toBeVisible();
  });

  it('resets create-account mode after signing out from the global account menu', async () => {
    runtimeMocks.useConsoleKitRuntime.mockReturnValue(runtime);
    const store = createFullConsoleKitStore();
    store.getState().setAuthEntryMode('sign-up');
    const signOut = vi.fn();
    const session = {
      mode: 'standalone',
      databaseId: 'database-1',
      beginSignIn: vi.fn(),
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut,
      restorePersistedSession: vi.fn(),
      handleAuthenticationFailure: vi.fn(),
      getSnapshot: () => snapshot,
      getServerSnapshot: () => ({ status: 'loading' as const }),
      subscribe: () => () => undefined,
      getAccessToken: () => null
    } as const;

    render(
      <ConsoleKit
        featureModules={fullFeatureModules}
        config={{
          databaseId: 'database-1',
          endpoints: { auth: '/auth/graphql' },
          order: ['auth'],
          session
        }}
        store={store}
      />
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(store.getState().authEntryMode).toBe('sign-in'));
    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('resets create-account mode when remote revocation fails after local sign-out', async () => {
    runtimeMocks.useConsoleKitRuntime.mockReturnValue(runtime);
    const store = createFullConsoleKitStore();
    store.getState().setAuthEntryMode('sign-up');
    let currentSnapshot: typeof snapshot | Readonly<{
      status: 'anonymous';
      identity: Readonly<{
        kind: 'anonymous';
        cachePartition: string;
      }>;
    }> = snapshot;
    const signOut = vi.fn(async () => {
      currentSnapshot = {
        status: 'anonymous',
        identity: { kind: 'anonymous', cachePartition: 'signed-out' }
      };
      throw new Error('Revocation failed');
    });
    const onError = vi.fn();
    const session = {
      mode: 'standalone',
      databaseId: 'database-1',
      beginSignIn: vi.fn(),
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOut,
      restorePersistedSession: vi.fn(),
      handleAuthenticationFailure: vi.fn(),
      getSnapshot: () => currentSnapshot,
      getServerSnapshot: () => ({ status: 'loading' as const }),
      subscribe: () => () => undefined,
      getAccessToken: () => null
    } as const;

    render(
      <ConsoleKit
        featureModules={fullFeatureModules}
        config={{
          databaseId: 'database-1',
          endpoints: { auth: '/auth/graphql' },
          onError,
          order: ['auth'],
          session
        }}
        store={store}
      />
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }));

    await waitFor(() => expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Revocation failed' }),
      { phase: 'feature', feature: 'auth' }
    ));
    expect(store.getState().authEntryMode).toBe('sign-in');
  });

  it('adopts the latest error callback without restarting adapter load or subscription work', async () => {
    runtimeMocks.useConsoleKitRuntime.mockReturnValue(runtime);
    const load = deferred<ConsoleKitFeaturePropsMap['auth']>();
    const adapterLoad = vi.fn(() => load.promise);
    const unsubscribe = vi.fn();
    const subscribe = vi.fn(() => unsubscribe);
    const adapter = {
      capabilities: [
        'auth.sessions',
        'auth.credentials',
        'auth.password'
      ] as const,
      load: adapterLoad,
      subscribe
    };
    const session = {
      mode: 'embedded',
      getSnapshot: () => snapshot,
      subscribe: () => () => undefined,
      getAccessToken: () => null
    } as const;
    const stableConfig = {
      databaseId: 'database-1',
      endpoints: { auth: '/auth/graphql' },
      session,
      adapters: { auth: adapter },
      order: ['auth']
    } satisfies ConsoleKitConfig;
    const firstOnError = vi.fn();
    const secondOnError = vi.fn();

    const view = render(
      <ConsoleKit
        config={{ ...stableConfig, onError: firstOnError }}
        featureModules={fullFeatureModules}
      />
    );
    await waitFor(() => {
      expect(adapterLoad).toHaveBeenCalledTimes(1);
      expect(subscribe).toHaveBeenCalledTimes(1);
    });

    view.rerender(
      <ConsoleKit
        config={{ ...stableConfig, onError: secondOnError }}
        featureModules={fullFeatureModules}
      />
    );
    await act(async () => undefined);

    expect(adapterLoad).toHaveBeenCalledTimes(1);
    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(unsubscribe).not.toHaveBeenCalled();

    await act(async () => {
      load.reject(new Error('adapter failed'));
      await load.promise.catch(() => undefined);
    });

    await waitFor(() => expect(secondOnError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'adapter failed' }),
      { phase: 'adapter', feature: 'auth' }
    ));
    expect(firstOnError).not.toHaveBeenCalled();

    view.unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('forwards feature action failures through the Console Kit error boundary', async () => {
    runtimeMocks.useConsoleKitRuntime.mockReturnValue(runtime);
    const onError = vi.fn();
    const adapter = {
      capabilities: [
        'auth.sessions',
        'auth.credentials',
        'auth.password'
      ] as const,
      load: vi.fn().mockResolvedValue({})
    };
    const session = {
      mode: 'embedded',
      getSnapshot: () => snapshot,
      subscribe: () => () => undefined,
      getAccessToken: () => null
    } as const;
    render(
      <ConsoleKit
        featureModules={fullFeatureModules}
        config={{
          adapters: { auth: adapter },
          databaseId: 'database-1',
          endpoints: { auth: '/auth/graphql' },
          onError,
          order: ['auth'],
          session
        }}
      />
    );

    await screen.findByRole('button', { name: 'Trigger auth error' });
    act(() => screen.getByRole('button', { name: 'Trigger auth error' }).click());

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Action rejected', code: 'ACTION_REJECTED' }),
      { phase: 'feature', feature: 'auth' }
    );
  });
});

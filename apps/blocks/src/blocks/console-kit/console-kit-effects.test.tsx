import * as React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type {
  ConsoleKitAdapterContext,
  ConsoleKitConfig,
  ConsoleKitFeaturePropsMap
} from './console-kit-contracts';

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
      actionGroups?: readonly Readonly<{
        actions: readonly Readonly<{ id: string; label: string; onSelect: () => void }>[];
      }>[];
    }>;
    children: React.ReactNode;
    navigation?: readonly Readonly<{
      items: readonly Readonly<{ href: string; id: string; label: React.ReactNode }>[];
    }>[];
    renderLink?: (props: Readonly<{
      children: React.ReactNode;
      href: string;
    }>) => React.ReactNode;
  }>) => (
    <div>
      <nav>
        {navigation?.flatMap((group) => group.items).map((item) => (
          <React.Fragment key={item.id}>
            {renderLink?.({ children: item.label, href: item.href })}
          </React.Fragment>
        ))}
      </nav>
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
  AuthFeaturePack: ({ onError }: Readonly<{
    onError?: (error: { message: string; code: string }) => void;
  }>) => (
    <div>
      Authentication
      <button
        onClick={() => onError?.({ message: 'Action rejected', code: 'ACTION_REJECTED' })}
        type='button'
      >
        Trigger auth error
      </button>
    </div>
  )
}));

import { ConsoleKit } from './console-kit';
import { createConsoleKitStore } from './store';

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
    const store = createConsoleKitStore('auth');
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
    const store = createConsoleKitStore('auth');
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
      <ConsoleKit config={{ ...stableConfig, onError: firstOnError }} />
    );
    await waitFor(() => {
      expect(adapterLoad).toHaveBeenCalledTimes(1);
      expect(subscribe).toHaveBeenCalledTimes(1);
    });

    view.rerender(
      <ConsoleKit config={{ ...stableConfig, onError: secondOnError }} />
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

import * as React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type {
  ConsoleGraphQLResult,
  IdentityScopedConsoleTransport,
  ConsoleSession
} from '../console-runtime';
import type { ConsoleKitAdapterContext } from './console-kit-contracts';
import {
  resolveConsoleKitEndpoints,
  useConsoleSessionSnapshot,
  useConsoleKitMetadata,
  useConsoleKitRuntime
} from './console-kit-runtime';
import {
  ConsoleKitStoreProvider,
  createConsoleKitStore
} from './store';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

function transport(
  execute: () => Promise<ConsoleGraphQLResult<unknown>>
): IdentityScopedConsoleTransport {
  return {
    scope: {
      endpoint: { id: 'data', kind: 'data', url: '/graphql' },
      identity: {
        kind: 'authenticated',
        cachePartition: 'login-1',
        subjectId: 'user-1'
      },
      getAccessToken: () => null
    },
    execute
  } as IdentityScopedConsoleTransport;
}

function context(
  scopedTransport: IdentityScopedConsoleTransport
): Omit<ConsoleKitAdapterContext, 'metadata'> {
  return {
    databaseId: 'database-1',
    endpoints: {
      data: { id: 'data', kind: 'data', url: '/graphql' }
    },
    session: {
      status: 'authenticated',
      identity: {
        kind: 'authenticated',
        cachePartition: 'login-1',
        subjectId: 'user-1'
      }
    },
    transportFor: () => scopedTransport
  };
}

function StoreWrapper({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ConsoleKitStoreProvider initialFeature='data'>
      {children}
    </ConsoleKitStoreProvider>
  );
}

function SessionStatus({ session }: Readonly<{ session: ConsoleSession }>) {
  return <span>{useConsoleSessionSnapshot(session).status}</span>;
}

describe('Console Kit session hydration', () => {
  it('hydrates through a credential-free snapshot before reading browser state', async () => {
    const authenticated = {
      status: 'authenticated',
      identity: {
        kind: 'authenticated',
        subjectId: 'user-1',
        cachePartition: 'login-1'
      }
    } as const;
    const session: ConsoleSession = {
      mode: 'embedded',
      getSnapshot: () => authenticated,
      subscribe: () => () => undefined,
      getAccessToken: () => null
    };
    const markup = renderToString(<SessionStatus session={session} />);
    expect(markup).toContain('loading');

    const container = document.createElement('div');
    container.innerHTML = markup;
    document.body.appendChild(container);
    const onRecoverableError = vi.fn();
    let root: Root | undefined;
    await act(async () => {
      root = hydrateRoot(container, <SessionStatus session={session} />, {
        onRecoverableError
      });
    });

    await waitFor(() => expect(container).toHaveTextContent('authenticated'));
    expect(onRecoverableError).not.toHaveBeenCalled();
    await act(async () => root?.unmount());
    container.remove();
  });
});

describe('Console Kit metadata lifecycle', () => {
  it('does not restart metadata work when an observational callback changes', async () => {
    const execute = vi.fn(async () => ({ ok: true, data: {} }) as const);
    const scopedTransport = transport(execute);
    const stableContext = context(scopedTransport);
    const firstOnError = vi.fn();
    const secondOnError = vi.fn();
    const { result, rerender } = renderHook(
      ({ onError }) => useConsoleKitMetadata(stableContext, onError),
      {
        initialProps: { onError: firstOnError },
        wrapper: StoreWrapper
      }
    );

    await waitFor(() => expect(result.current.status).toBe('incompatible'));
    expect(execute).toHaveBeenCalledTimes(1);

    rerender({ onError: secondOnError });
    await act(async () => undefined);

    expect(execute).toHaveBeenCalledTimes(1);
    expect(firstOnError).not.toHaveBeenCalled();
    expect(secondOnError).not.toHaveBeenCalled();
  });

  it('does not let an aborted endpoint probe overwrite the current store state', async () => {
    const firstResponse = deferred<ConsoleGraphQLResult<unknown>>();
    const firstTransport = transport(() => firstResponse.promise);
    const secondTransport = transport(async () => ({ ok: true, data: {} }));

    const { result, rerender } = renderHook(
      ({ currentTransport }) => {
        const currentContext = React.useMemo(
          () => context(currentTransport),
          [currentTransport]
        );
        return useConsoleKitMetadata(currentContext);
      },
      {
        initialProps: { currentTransport: firstTransport },
        wrapper: StoreWrapper
      }
    );

    rerender({ currentTransport: secondTransport });
    await waitFor(() => expect(result.current.status).toBe('incompatible'));
    if (result.current.status !== 'incompatible') {
      throw new Error('Expected the second metadata probe to be incompatible.');
    }
    const currentMissing = result.current.missing;

    await act(async () => {
      firstResponse.resolve({
        ok: true,
        data: { queryType: { name: 'Query', fields: [] } }
      });
      await firstResponse.promise;
    });

    expect(result.current).toMatchObject({
      status: 'incompatible',
      missing: currentMissing
    });
  });
});

describe('Console Kit endpoint runtime', () => {
  it('resolves every semantic endpoint kind', () => {
    expect(resolveConsoleKitEndpoints('database-1', {
      data: '/api/graphql',
      auth: '/auth/graphql',
      admin: '/admin/graphql',
      billing: '/usage/graphql',
      storage: '/objects/graphql',
      notifications: '/notifications/graphql'
    }, undefined)).toMatchObject({
      data: { kind: 'data', url: '/api/graphql' },
      auth: { kind: 'auth', url: '/auth/graphql' },
      admin: { kind: 'admin', url: '/admin/graphql' },
      billing: { kind: 'billing', url: '/usage/graphql' },
      storage: { kind: 'storage', url: '/objects/graphql' },
      notifications: { kind: 'notifications', url: '/notifications/graphql' }
    });
  });

  it('synchronizes normalized endpoints into the per-console store', async () => {
    const store = createConsoleKitStore('data');
    const snapshot = {
      status: 'anonymous',
      identity: {
        kind: 'anonymous',
        cachePartition: 'anonymous-1',
        tenantId: 'database-1'
      }
    } as const;
    const session: ConsoleSession = {
      mode: 'embedded',
      getSnapshot: () => snapshot,
      subscribe: () => () => undefined,
      getAccessToken: () => null
    };
    const wrapper = ({ children }: Readonly<{ children: React.ReactNode }>) => (
      <ConsoleKitStoreProvider
        initialFeature='data'
        store={store}
      >
        {children}
      </ConsoleKitStoreProvider>
    );

    renderHook(() => useConsoleKitRuntime({
      databaseId: 'database-1',
      endpoints: {
        data: '/api/graphql',
        billing: '/usage/graphql',
        storage: '/objects/graphql',
        notifications: '/notifications/graphql'
      },
      session
    }), { wrapper });

    await waitFor(() => expect(store.getState().endpoints).toMatchObject({
      data: { kind: 'data', url: '/api/graphql' },
      billing: { kind: 'billing', url: '/usage/graphql' },
      storage: { kind: 'storage', url: '/objects/graphql' },
      notifications: { kind: 'notifications', url: '/notifications/graphql' }
    }));
  });
});

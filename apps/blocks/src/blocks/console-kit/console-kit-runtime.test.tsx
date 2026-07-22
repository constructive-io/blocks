import * as React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type {
  ConsoleGraphQLResult,
  IdentityScopedConsoleTransport
} from '../console-runtime';
import type { ConsoleKitAdapterContext } from './console-kit-contracts';
import { useConsoleKitMetadata } from './console-kit-runtime';
import { ConsoleKitStoreProvider } from './store';

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

describe('Console Kit metadata lifecycle', () => {
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

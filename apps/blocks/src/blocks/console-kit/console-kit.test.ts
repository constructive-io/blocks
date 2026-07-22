import { describe, expect, it } from 'vitest';

import type { ConsoleKitAdapterContext } from './console-kit-contracts';
import { getConsoleKitFeatureAvailability } from './console-kit';

const runtime = {
  databaseId: 'db-1',
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
  metadata: { status: 'checking' },
  transportFor: () => null
} satisfies ConsoleKitAdapterContext;

describe('Console Kit feature availability', () => {
  it('fails closed when an adapter omits required capability evidence', () => {
    const availability = getConsoleKitFeatureAvailability(
      'storage',
      runtime,
      {
        capabilities: [],
        load: async () => ({})
      },
      false
    );

    expect(availability).toEqual({
      status: 'unavailable',
      reason: 'The adapter does not provide required capability storage.buckets.'
    });
  });

  it('keeps standalone authentication reachable before metadata is available', () => {
    expect(
      getConsoleKitFeatureAvailability('auth', {
        ...runtime,
        endpoints: {
          ...runtime.endpoints,
          auth: { id: 'auth', kind: 'auth', url: '/auth/graphql' }
        },
        session: {
          status: 'anonymous',
          identity: { kind: 'anonymous', cachePartition: 'anonymous-1' }
        }
      }, undefined, true)
    ).toEqual({ status: 'available' });
  });

  it('fails closed when an errored session retains its last identity', () => {
    expect(
      getConsoleKitFeatureAvailability('data', {
        ...runtime,
        session: {
          status: 'error',
          error: {
            message: 'The session expired.',
            code: 'UNAUTHENTICATED'
          },
          identity: runtime.session.identity
        }
      }, undefined, false)
    ).toEqual({
      status: 'unauthorized',
      reason: 'The session expired.'
    });
  });
});

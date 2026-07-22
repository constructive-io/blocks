import { describe, expect, it } from 'vitest';

import { createConsoleKitStore } from './console-kit-store';

describe('Console Kit store', () => {
  it('composes navigation, runtime, and adapter slices in one isolated store', () => {
    const first = createConsoleKitStore('data', {
      databaseId: 'database-1',
      organizationId: null
    });
    const second = createConsoleKitStore('auth');
    const adapter = {};

    first.getState().setActiveFeature('organizations');
    first.getState().setAuthEntryMode('sign-up');
    first.getState().setSession({
      status: 'authenticated',
      identity: {
        kind: 'authenticated',
        cachePartition: 'login-1',
        subjectId: 'user-1',
        organizationId: 'org-1'
      }
    });
    first.getState().setAdapterLoad('users', {
      status: 'ready',
      adapter,
      requestKey: 'database-1:user-1:users',
      props: { members: [] }
    });
    first.getState().setMetadata('database-1:user-1:data', {
      status: 'incompatible',
      message: 'The endpoint is missing the current _meta contract.',
      missing: ['Query._meta']
    });
    first.getState().setEndpoints({
      data: { id: 'database-1-data', kind: 'data', url: '/graphql' }
    });
    first.getState().setPackCapability('data', {
      status: 'ready',
      packId: 'data',
      supportedCapabilities: ['data.read'],
      evidence: []
    });

    expect(first.getState()).toMatchObject({
      activeFeature: 'organizations',
      authEntryMode: 'sign-up',
      context: { databaseId: 'database-1', organizationId: null },
      session: { status: 'authenticated' },
      metadataKey: 'database-1:user-1:data',
      endpoints: { data: { id: 'database-1-data' } },
      packCapabilities: { data: { status: 'ready' } },
      adapterLoads: {
        users: {
          status: 'ready',
          adapter,
          requestKey: 'database-1:user-1:users'
        }
      }
    });
    expect(second.getState()).toMatchObject({
      activeFeature: 'auth',
      authEntryMode: 'sign-in',
      context: null,
      session: { status: 'loading' },
      endpoints: {},
      packCapabilities: {},
      adapterLoads: {}
    });
  });

  it('keeps adapter subscription and retry revisions in their own slice', () => {
    const store = createConsoleKitStore('data');

    store.getState().notifyAdapterChange();
    store.getState().retryAdapter('storage');
    store.getState().retryAdapter('storage');

    expect(store.getState().adapterRevision).toBe(1);
    expect(store.getState().adapterAttempts.storage).toBe(2);
  });
});

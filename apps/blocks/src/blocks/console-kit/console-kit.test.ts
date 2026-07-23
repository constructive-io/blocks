import { describe, expect, it } from 'vitest';

import type { ConsoleKitAdapterContext } from './console-kit-contracts';
import { getConsoleKitFeatureAvailability } from './console-kit';
import { authConsoleModule } from '../feature-packs/auth/auth-console-module';
import { dataConsoleModule } from '../feature-packs/data/data-console-module';
import { organizationsConsoleModule } from '../feature-packs/organizations/organizations-console-module';
import { storageConsoleModule } from '../feature-packs/storage/storage-console-module';

const runtime = {
  databaseId: 'db-1',
  sessionMode: 'standalone',
  endpoints: {
    data: { id: 'data', kind: 'data', url: '/graphql' },
    storage: { id: 'storage', kind: 'storage', url: '/storage/graphql' }
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
      storageConsoleModule,
      runtime,
      {
        capabilities: [],
        load: async () => ({})
      }
    );

    expect(availability).toEqual({
      status: 'unavailable',
      reason: 'The adapter does not provide required capability storage.buckets.'
    });
  });

  it('keeps standalone authentication reachable before metadata is available', () => {
    expect(
      getConsoleKitFeatureAvailability(authConsoleModule, {
        ...runtime,
        endpoints: {
          ...runtime.endpoints,
          auth: { id: 'auth', kind: 'auth', url: '/auth/graphql' }
        },
        session: {
          status: 'anonymous',
          identity: { kind: 'anonymous', cachePartition: 'anonymous-1' }
        }
      }, {
        capabilities: [
          'auth.sessions',
          'auth.credentials',
          'auth.password'
        ],
        getAvailability: () => ({
          status: 'unavailable',
          reason: 'The anonymous metadata surface is incomplete.'
        }),
        load: async () => ({ view: 'entry' })
      }, {
        status: 'unavailable',
        packId: 'auth',
        supportedCapabilities: [],
        evidence: [],
        missingCapabilities: [
          'auth.sessions',
          'auth.credentials',
          'auth.password'
        ],
        reason: 'The anonymous auth metadata surface is incomplete.'
      })
    ).toEqual({ status: 'available' });
  });

  it('fails closed when an errored session retains its last identity', () => {
    expect(
      getConsoleKitFeatureAvailability(dataConsoleModule, {
        ...runtime,
        session: {
          status: 'error',
          error: {
            message: 'The session expired.',
            code: 'UNAUTHENTICATED'
          },
          identity: runtime.session.identity
        }
      }, undefined)
    ).toEqual({
      status: 'unauthorized',
      reason: 'The session expired.'
    });
  });

  it('keeps standalone authentication available after credential rejection', () => {
    expect(
      getConsoleKitFeatureAvailability(authConsoleModule, {
        ...runtime,
        endpoints: {
          ...runtime.endpoints,
          auth: { id: 'auth', kind: 'auth', url: '/auth/graphql' }
        },
        session: {
          status: 'error',
          error: {
            message: 'The credential has been revoked.',
            code: 'UNAUTHENTICATED'
          },
          identity: runtime.session.identity
        }
      }, undefined)
    ).toEqual({ status: 'available' });
  });

  it('reports configured protected features as sign-in locked before capability discovery', () => {
    expect(
      getConsoleKitFeatureAvailability(storageConsoleModule, {
        ...runtime,
        session: {
          status: 'anonymous',
          identity: { kind: 'anonymous', cachePartition: 'anonymous-1' }
        }
      }, undefined, {
        status: 'unavailable',
        packId: 'storage',
        supportedCapabilities: [],
        evidence: [],
        missingCapabilities: ['storage.buckets', 'storage.files'],
        reason: 'The anonymous schema probe exposes no storage rows.'
      })
    ).toEqual({
      status: 'unauthorized',
      reason: 'Sign in to use this feature.'
    });
  });

  it('reports a genuinely missing required endpoint as setup work', () => {
    expect(
      getConsoleKitFeatureAvailability(dataConsoleModule, {
        ...runtime,
        endpoints: { storage: runtime.endpoints.storage },
        session: {
          status: 'anonymous',
          identity: { kind: 'anonymous', cachePartition: 'anonymous-1' }
        }
      }, undefined)
    ).toEqual({
      status: 'unavailable',
      reason: 'The data endpoint is not configured.'
    });
  });

  it('accepts data-backed storage when _meta proves both required capabilities', () => {
    expect(
      getConsoleKitFeatureAvailability(storageConsoleModule, {
        ...runtime,
        endpoints: { data: runtime.endpoints.data },
        metadata: {
          status: 'compatible',
          meta: {},
          contractIntrospection: {},
          introspection: {}
        } as ConsoleKitAdapterContext['metadata']
      }, {
        capabilities: ['storage.buckets', 'storage.files'],
        getAvailability: () => ({ status: 'available' }),
        load: async () => ({ resource: { status: 'empty' } })
      }, {
        status: 'ready',
        packId: 'storage',
        supportedCapabilities: ['storage.buckets', 'storage.files'],
        evidence: [
          {
            source: 'graphql-operation',
            endpointKind: 'data',
            coordinate: 'Query.workspaceBuckets'
          },
          {
            source: 'graphql-operation',
            endpointKind: 'data',
            coordinate: 'Query.workspaceFiles'
          }
        ]
      })
    ).toEqual({ status: 'available' });
  });

  it('accepts a read-only data organization directory when admin is not routed', () => {
    expect(
      getConsoleKitFeatureAvailability(organizationsConsoleModule, {
        ...runtime,
        endpoints: { data: runtime.endpoints.data },
        metadata: {
          status: 'compatible',
          meta: {},
          contractIntrospection: {},
          introspection: {}
        } as ConsoleKitAdapterContext['metadata']
      }, {
        capabilities: ['organizations.memberships'],
        getAvailability: () => ({ status: 'available' }),
        load: async () => ({ resource: { status: 'empty' } })
      }, {
        status: 'ready',
        packId: 'organizations',
        supportedCapabilities: ['organizations.memberships'],
        evidence: [{
          source: 'graphql-operation',
          endpointKind: 'data',
          coordinate: 'Query.tenantOrganizations'
        }]
      })
    ).toEqual({ status: 'available' });
  });
});

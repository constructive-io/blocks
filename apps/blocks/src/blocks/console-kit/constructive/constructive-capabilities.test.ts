import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fullFeatureModules } from '../../presets/full-console-kit';
import { storageConsoleModule } from '../../feature-packs/storage/storage-console-module';
import type { ConsoleKitAdapterContext } from '../console-kit-contracts';
import { createConsoleKitStore } from '../store';
import {
  inspectConstructiveSchema,
  type ConstructiveSchemaSnapshot
} from './constructive-graphql';
import { createConstructiveCapabilityDiscovery } from './constructive-capabilities';

vi.mock('./constructive-graphql', async (importOriginal) => ({
  ...await importOriginal<typeof import('./constructive-graphql')>(),
  inspectConstructiveSchema: vi.fn()
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

function schema(endpointId: string): ConstructiveSchemaSnapshot {
  return {
    endpointKind: 'auth',
    endpointId,
    queryFields: {},
    mutationFields: {},
    types: {}
  };
}

function schemaWithQueries(
  endpointKind: ConstructiveSchemaSnapshot['endpointKind'],
  endpointId: string,
  fields: readonly string[]
): ConstructiveSchemaSnapshot {
  return {
    endpointKind,
    endpointId,
    queryFields: Object.fromEntries(fields.map((name) => [name, {
      name,
      args: [],
      type: { kind: 'OBJECT', name: `${name}Connection` }
    }])),
    mutationFields: {},
    types: {}
  };
}

function schemaWithOperations(
  endpointKind: ConstructiveSchemaSnapshot['endpointKind'],
  endpointId: string,
  queries: readonly string[],
  mutations: readonly string[]
): ConstructiveSchemaSnapshot {
  const snapshot = schemaWithQueries(endpointKind, endpointId, queries);
  return {
    ...snapshot,
    mutationFields: Object.fromEntries(mutations.map((name) => [name, {
      name,
      args: [],
      type: { kind: 'OBJECT', name: `${name}Payload` }
    }]))
  };
}

function runtime(url: string): ConsoleKitAdapterContext {
  return {
    databaseId: 'database-1',
    endpoints: {
      auth: { id: 'auth', kind: 'auth', url }
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
  };
}

function compatibleMetadata(): ConsoleKitAdapterContext['metadata'] {
  return {
    status: 'compatible',
    meta: { _meta: { tables: [] } },
    contractIntrospection: {},
    introspection: {}
  } as unknown as ConsoleKitAdapterContext['metadata'];
}

function incompatibleMetadata(message = 'The endpoint metadata is incompatible.'):
ConsoleKitAdapterContext['metadata'] {
  return {
    status: 'incompatible',
    message,
    missing: ['MetaTable.scope']
  };
}

const inspectSchema = vi.mocked(inspectConstructiveSchema);

describe('Constructive capability discovery lifecycle', () => {
  beforeEach(() => {
    inspectSchema.mockReset();
  });

  it('re-inspects an endpoint when its URL changes without changing its id', async () => {
    inspectSchema
      .mockResolvedValueOnce(schema('first-schema'))
      .mockResolvedValueOnce(schema('second-schema'));
    const discovery = createConstructiveCapabilityDiscovery(
      createConsoleKitStore('data'),
      fullFeatureModules
    );

    await discovery.ensure(runtime('/first/graphql'));
    await discovery.ensure(runtime('/second/graphql'));

    expect(inspectSchema).toHaveBeenCalledTimes(2);
    expect(discovery.getSchemas().auth?.endpointId).toBe('second-schema');
  });

  it('keeps the current result when an aborted request resolves after it', async () => {
    const first = deferred<ConstructiveSchemaSnapshot>();
    const second = deferred<ConstructiveSchemaSnapshot>();
    const signals: AbortSignal[] = [];
    inspectSchema.mockImplementation((currentRuntime, _kind, signal) => {
      if (signal) signals.push(signal);
      return currentRuntime.endpoints.auth?.url === '/first/graphql'
        ? first.promise
        : second.promise;
    });
    const discovery = createConstructiveCapabilityDiscovery(
      createConsoleKitStore('data'),
      fullFeatureModules
    );
    const listener = vi.fn();
    discovery.subscribe(listener);

    const firstRequest = discovery.ensure(runtime('/first/graphql'));
    const secondRequest = discovery.ensure(runtime('/second/graphql'));

    expect(signals).toHaveLength(2);
    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);

    second.resolve(schema('second-schema'));
    await secondRequest;
    expect(discovery.getSchemas().auth?.endpointId).toBe('second-schema');

    first.resolve(schema('first-schema'));
    await firstRequest;

    expect(discovery.getSchemas().auth?.endpointId).toBe('second-schema');
    expect(listener).toHaveBeenCalledTimes(1);

    await discovery.ensure(runtime('/second/graphql'));
    expect(inspectSchema).toHaveBeenCalledTimes(2);
  });

  it('does not let an unused render-time discovery replace the committed owner', async () => {
    const result = deferred<ConstructiveSchemaSnapshot>();
    inspectSchema.mockReturnValue(result.promise);
    const store = createConsoleKitStore('auth');
    const discovery = createConstructiveCapabilityDiscovery(
      store,
      fullFeatureModules
    );
    discovery.subscribe(vi.fn());
    const request = discovery.ensure({
      ...runtime('/tenant-a/graphql'),
      metadata: compatibleMetadata(),
      metadataByEndpoint: { auth: compatibleMetadata() }
    });

    createConstructiveCapabilityDiscovery(store, fullFeatureModules);
    result.resolve(schemaWithOperations(
      'auth',
      'tenant-a-auth',
      ['emails'],
      ['signIn', 'signUp', 'signOut', 'forgotPassword', 'resetPassword']
    ));
    await request;

    const capability = store.getState().packCapabilities.auth;
    expect(capability?.status).not.toBe('checking');
    if (!capability || capability.status === 'checking') {
      throw new Error('The committed auth capability was not assessed.');
    }
    expect(capability.evidence).toContainEqual(expect.objectContaining({
      source: 'endpoint',
      endpointId: 'tenant-a-auth'
    }));
  });

  it('prevents a replaced discovery instance from overwriting a reused store', async () => {
    const first = deferred<ConstructiveSchemaSnapshot>();
    const second = deferred<ConstructiveSchemaSnapshot>();
    inspectSchema.mockImplementation((currentRuntime) =>
      currentRuntime.endpoints.auth?.url === '/tenant-a/graphql'
        ? first.promise
        : second.promise
    );
    const store = createConsoleKitStore('auth');
    const firstDiscovery = createConstructiveCapabilityDiscovery(
      store,
      fullFeatureModules
    );
    firstDiscovery.subscribe(vi.fn());
    const firstRequest = firstDiscovery.ensure({
      ...runtime('/tenant-a/graphql'),
      metadata: compatibleMetadata(),
      metadataByEndpoint: { auth: compatibleMetadata() }
    });
    const secondDiscovery = createConstructiveCapabilityDiscovery(
      store,
      fullFeatureModules
    );
    secondDiscovery.subscribe(vi.fn());
    const secondRequest = secondDiscovery.ensure({
      ...runtime('/tenant-b/graphql'),
      metadata: compatibleMetadata(),
      metadataByEndpoint: { auth: compatibleMetadata() }
    });

    second.resolve(schemaWithOperations(
      'auth',
      'tenant-b-auth',
      ['emails'],
      ['signIn', 'signUp', 'signOut', 'forgotPassword', 'resetPassword']
    ));
    await secondRequest;
    const tenantBCapability = store.getState().packCapabilities.auth;
    expect(tenantBCapability?.status).not.toBe('checking');
    if (!tenantBCapability || tenantBCapability.status === 'checking') {
      throw new Error('The tenant B auth capability was not assessed.');
    }
    expect(tenantBCapability.evidence).toContainEqual(expect.objectContaining({
      source: 'endpoint',
      endpointId: 'tenant-b-auth'
    }));

    first.resolve(schemaWithOperations(
      'auth',
      'tenant-a-auth',
      ['emails'],
      ['signIn', 'signUp', 'signOut', 'forgotPassword', 'resetPassword']
    ));
    await firstRequest;

    expect(store.getState().packCapabilities.auth).toEqual(tenantBCapability);
    firstDiscovery.invalidate();
    expect(store.getState().packCapabilities.auth).toEqual(tenantBCapability);
  });

  it('discovers organization limits on the semantic usage endpoint', async () => {
    inspectSchema.mockImplementation(async (_runtime, kind) => {
      if (kind === 'auth') return schemaWithQueries('auth', 'auth', ['users']);
      if (kind === 'admin') {
        return schemaWithQueries('admin', 'admin', ['appMemberships', 'orgMemberships']);
      }
      if (kind === 'billing') {
        return schemaWithQueries('billing', 'usage', ['orgLimits']);
      }
      throw new Error(`Unexpected endpoint ${kind}.`);
    });
    const store = createConsoleKitStore('data');
    const discovery = createConstructiveCapabilityDiscovery(
      store,
      fullFeatureModules
    );
    const currentRuntime: ConsoleKitAdapterContext = {
      ...runtime('/auth/graphql'),
      endpoints: {
        auth: { id: 'auth', kind: 'auth', url: '/auth/graphql' },
        admin: { id: 'admin', kind: 'admin', url: '/admin/graphql' },
        billing: { id: 'usage', kind: 'billing', url: '/usage/graphql' }
      },
      metadata: compatibleMetadata(),
      metadataByEndpoint: {
        auth: compatibleMetadata(),
        admin: compatibleMetadata(),
        billing: compatibleMetadata()
      }
    };

    await discovery.ensure(currentRuntime);

    expect(store.getState().packCapabilities.organizations).toMatchObject({
      supportedCapabilities: expect.arrayContaining(['organizations.limits']),
      evidence: expect.arrayContaining([
        expect.objectContaining({
          source: 'graphql-operation',
          endpointKind: 'billing',
          coordinate: 'Query.orgLimits'
        })
      ])
    });
  });

  it('uses operation roots only for packs that explicitly declare _meta optional', async () => {
    inspectSchema.mockImplementation(async (_runtime, kind) => {
      if (kind === 'auth') {
        return schemaWithOperations(
          'auth',
          'auth',
          ['users'],
          ['signIn', 'signUp', 'signOut', 'forgotPassword', 'resetPassword']
        );
      }
      if (kind === 'admin') {
        return schemaWithQueries('admin', 'admin', ['appMemberships']);
      }
      if (kind === 'billing') {
        return schemaWithQueries(
          'billing',
          'billing',
          ['plans', 'planSubscriptions']
        );
      }
      if (kind === 'notifications') {
        return schemaWithQueries(
          'notifications',
          'notifications',
          ['notifications']
        );
      }
      throw new Error(`Unexpected endpoint ${kind}.`);
    });
    const store = createConsoleKitStore('auth');
    const discovery = createConstructiveCapabilityDiscovery(
      store,
      fullFeatureModules
    );
    const rejectedMetadata = incompatibleMetadata();

    await discovery.ensure({
      ...runtime('/auth/graphql'),
      endpoints: {
        auth: { id: 'auth', kind: 'auth', url: '/auth/graphql' },
        admin: { id: 'admin', kind: 'admin', url: '/admin/graphql' },
        billing: { id: 'billing', kind: 'billing', url: '/billing/graphql' },
        notifications: {
          id: 'notifications',
          kind: 'notifications',
          url: '/notifications/graphql'
        }
      },
      metadata: rejectedMetadata,
      metadataByEndpoint: {
        auth: rejectedMetadata,
        admin: rejectedMetadata,
        billing: rejectedMetadata,
        notifications: rejectedMetadata
      }
    });

    for (const pack of ['auth', 'users', 'billing', 'notifications'] as const) {
      expect(store.getState().packCapabilities[pack]).toMatchObject({
        status: 'ready'
      });
    }
    expect(store.getState().packCapabilities.organizations).toMatchObject({
      status: 'unavailable',
      supportedCapabilities: []
    });
  });

  it('distinguishes a missing storage route from incompatible routed storage metadata', async () => {
    inspectSchema.mockImplementation(async (_runtime, kind) =>
      schemaWithQueries(kind, `${kind}-endpoint`, [])
    );
    const withoutRouteStore = createConsoleKitStore('storage');
    const withoutRoute = createConstructiveCapabilityDiscovery(
      withoutRouteStore,
      [storageConsoleModule]
    );
    const compatible = compatibleMetadata();

    await withoutRoute.ensure({
      ...runtime('/auth/graphql'),
      endpoints: {
        data: { id: 'data', kind: 'data', url: '/data/graphql' }
      },
      metadata: compatible,
      metadataByEndpoint: { data: compatible }
    });
    expect(withoutRouteStore.getState().packCapabilities.storage).toMatchObject({
      status: 'unavailable',
      reason: expect.stringMatching(/semantic storage endpoint is not routed/u)
    });

    const routedStore = createConsoleKitStore('storage');
    const routed = createConstructiveCapabilityDiscovery(
      routedStore,
      [storageConsoleModule]
    );
    await routed.ensure({
      ...runtime('/auth/graphql'),
      endpoints: {
        storage: {
          id: 'storage',
          kind: 'storage',
          url: '/storage/graphql'
        }
      },
      metadata: { status: 'checking' },
      metadataByEndpoint: { storage: compatible }
    });
    expect(routedStore.getState().packCapabilities.storage).toMatchObject({
      status: 'unavailable',
      reason: expect.stringMatching(/routed storage endpoint/u)
    });
  });

  it('uses _meta storage tables as capability evidence when the storage route has no table roots', async () => {
    inspectSchema.mockImplementation(async (_runtime, kind) =>
      schemaWithQueries(kind, `${kind}-endpoint`, [])
    );
    const store = createConsoleKitStore('storage');
    const discovery = createConstructiveCapabilityDiscovery(
      store,
      fullFeatureModules
    );
    const currentRuntime: ConsoleKitAdapterContext = {
      ...runtime('/auth/graphql'),
      endpoints: {
        data: { id: 'data', kind: 'data', url: '/data/graphql' },
        storage: { id: 'storage', kind: 'storage', url: '/objects/graphql' }
      },
      metadata: {
        status: 'compatible',
        meta: {
          _meta: {
            tables: [{
              name: 'workspace_buckets',
              query: { all: 'workspaceBuckets' },
              fields: [
                { name: 'id', type: { gqlType: 'UUID', isArray: false, pgType: 'uuid' } },
                { name: 'key', type: { gqlType: 'String', isArray: false, pgType: 'text' } }
              ],
              primaryKeyConstraints: [{
                name: 'workspace_buckets_pkey',
                fields: [{
                  name: 'id',
                  type: { gqlType: 'UUID', isArray: false, pgType: 'uuid' }
                }]
              }],
              storage: { isBucketsTable: true, isFilesTable: false }
            }, {
              name: 'workspace_files',
              query: { all: 'workspaceFiles' },
              fields: [
                { name: 'id', type: { gqlType: 'UUID', isArray: false, pgType: 'uuid' } },
                { name: 'key', type: { gqlType: 'String', isArray: false, pgType: 'text' } },
                { name: 'bucketId', type: { gqlType: 'UUID', isArray: false, pgType: 'uuid' } }
              ],
              primaryKeyConstraints: [{
                name: 'workspace_files_pkey',
                fields: [{
                  name: 'id',
                  type: { gqlType: 'UUID', isArray: false, pgType: 'uuid' }
                }]
              }],
              relations: {
                belongsTo: [{
                  isUnique: false,
                  keys: [{
                    name: 'bucketId',
                    type: { gqlType: 'UUID', isArray: false, pgType: 'uuid' }
                  }],
                  references: { name: 'workspace_buckets' }
                }]
              },
              storage: { isBucketsTable: false, isFilesTable: true }
            }]
          }
        },
        contractIntrospection: {},
        introspection: {}
      } as ConsoleKitAdapterContext['metadata']
    };

    const primaryMetadata = {
      status: 'compatible',
      meta: { _meta: { tables: [] } },
      contractIntrospection: {},
      introspection: {}
    } as unknown as ConsoleKitAdapterContext['metadata'];
    const waitingRuntime: ConsoleKitAdapterContext = {
      ...currentRuntime,
      metadata: primaryMetadata,
      metadataByEndpoint: {
        data: primaryMetadata,
        storage: { status: 'checking' }
      }
    };
    await discovery.ensure(waitingRuntime);
    expect(store.getState().packCapabilities.storage?.status).toBe('unavailable');

    await discovery.ensure({
      ...waitingRuntime,
      metadataByEndpoint: {
        data: primaryMetadata,
        storage: currentRuntime.metadata
      }
    });

    expect(store.getState().packCapabilities.storage).toMatchObject({
      status: 'ready',
      supportedCapabilities: expect.arrayContaining([
        'storage.buckets',
        'storage.files'
      ]),
      evidence: expect.arrayContaining([
        expect.objectContaining({
          source: 'graphql-operation',
          endpointKind: 'storage',
          coordinate: 'Query.workspaceBuckets'
        }),
        expect.objectContaining({
          source: 'graphql-operation',
          endpointKind: 'storage',
          coordinate: 'Query.workspaceFiles'
        })
      ])
    });
    expect(inspectSchema).toHaveBeenCalledTimes(4);
  });

  it('uses a data _meta organization directory as read-only capability evidence without admin', async () => {
    inspectSchema.mockImplementation(async (_runtime, kind) =>
      schemaWithQueries(kind, `${kind}-endpoint`, [])
    );
    const store = createConsoleKitStore('organizations');
    const discovery = createConstructiveCapabilityDiscovery(
      store,
      fullFeatureModules
    );
    const id = {
      name: 'id',
      type: { gqlType: 'UUID', isArray: false, pgType: 'uuid' }
    } as const;
    const organizationId = {
      name: 'organizationId',
      type: { gqlType: 'UUID', isArray: false, pgType: 'uuid' }
    } as const;
    const currentRuntime: ConsoleKitAdapterContext = {
      ...runtime('/auth/graphql'),
      endpoints: {
        data: { id: 'data', kind: 'data', url: '/data/graphql' }
      },
      metadata: {
        status: 'compatible',
        meta: {
          _meta: {
            tables: [{
              name: 'organizations',
              query: { all: 'tenantOrganizations' },
              fields: [id, {
                name: 'name',
                type: { gqlType: 'String', isArray: false, pgType: 'text' }
              }],
              primaryKeyConstraints: [{
                name: 'organizations_pkey',
                fields: [id]
              }]
            }, {
              name: 'members',
              query: { all: 'tenantMembers' },
              fields: [id, organizationId],
              primaryKeyConstraints: [{
                name: 'members_pkey',
                fields: [id]
              }],
              relations: {
                belongsTo: [{
                  isUnique: false,
                  keys: [organizationId],
                  references: { name: 'organizations' }
                }]
              }
            }]
          }
        },
        contractIntrospection: {},
        introspection: {}
      } as ConsoleKitAdapterContext['metadata']
    };

    await discovery.ensure(currentRuntime);

    expect(store.getState().packCapabilities.organizations).toMatchObject({
      status: 'ready',
      supportedCapabilities: expect.arrayContaining(['organizations.memberships']),
      evidence: expect.arrayContaining([
        expect.objectContaining({
          source: 'graphql-operation',
          endpointKind: 'data',
          coordinate: 'Query.tenantOrganizations'
        }),
        expect.objectContaining({
          source: 'graphql-operation',
          endpointKind: 'data',
          coordinate: 'Query.tenantMembers'
        })
      ])
    });
  });
});

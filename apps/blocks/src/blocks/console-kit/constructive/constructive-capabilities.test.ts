import { beforeEach, describe, expect, it, vi } from 'vitest';

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
      createConsoleKitStore('data')
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
      createConsoleKitStore('data')
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

  it('discovers application and organization limits on the semantic usage endpoint', async () => {
    inspectSchema.mockImplementation(async (_runtime, kind) => {
      if (kind === 'auth') return schemaWithQueries('auth', 'auth', ['users']);
      if (kind === 'admin') {
        return schemaWithQueries('admin', 'admin', ['appMemberships', 'orgMemberships']);
      }
      if (kind === 'billing') {
        return schemaWithQueries('billing', 'usage', ['appLimits', 'orgLimits']);
      }
      throw new Error(`Unexpected endpoint ${kind}.`);
    });
    const store = createConsoleKitStore('data');
    const discovery = createConstructiveCapabilityDiscovery(store);
    const currentRuntime: ConsoleKitAdapterContext = {
      ...runtime('/auth/graphql'),
      endpoints: {
        auth: { id: 'auth', kind: 'auth', url: '/auth/graphql' },
        admin: { id: 'admin', kind: 'admin', url: '/admin/graphql' },
        billing: { id: 'usage', kind: 'billing', url: '/usage/graphql' }
      }
    };

    await discovery.ensure(currentRuntime);

    expect(store.getState().packCapabilities.users).toMatchObject({
      supportedCapabilities: expect.arrayContaining(['users.limits']),
      evidence: expect.arrayContaining([
        expect.objectContaining({
          source: 'graphql-operation',
          endpointKind: 'billing',
          coordinate: 'Query.appLimits'
        })
      ])
    });
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
});

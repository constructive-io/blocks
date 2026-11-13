import {
  createFetchConsoleTransport,
  createIdentityScopedTransport,
  type ConsoleEndpoint,
  type ConsoleEndpointKind,
  type ConsoleIdentity
} from '../console-runtime';
import { inspectConstructiveSchema } from '../console-kit/constructive/constructive-graphql';
import type { ScopeRuntime, ScopeSchemas } from './scope-access-load';

/**
 * What an app without Console Kit hands the scope blocks: its GraphQL
 * endpoints, who is signed in, and how to read the session token. The token
 * is read right before each request and never kept.
 */
export type ScopeHost = Readonly<{
  /** Endpoint URLs by kind: `admin` and `auth` for members and users, `storage` for files. */
  endpoints: Readonly<Partial<Record<ConsoleEndpointKind, string>>>;
  /** The signed-in user's id; null when no one is signed in. */
  userId: string | null;
  getAccessToken: () => string | null | undefined;
  fetch?: typeof fetch;
}>;

export function createScopeRuntime(host: ScopeHost): ScopeRuntime {
  const identity: ConsoleIdentity = host.userId
    ? { kind: 'authenticated', cachePartition: host.userId, subjectId: host.userId }
    : { kind: 'anonymous', cachePartition: 'anonymous' };
  const endpoints: Partial<Record<ConsoleEndpointKind, ConsoleEndpoint>> = {};
  for (const [kind, url] of Object.entries(host.endpoints) as Array<[ConsoleEndpointKind, string | undefined]>) {
    if (url) endpoints[kind] = { id: kind, kind, url };
  }
  const transport = createFetchConsoleTransport(host.fetch ?? ((input, init) => fetch(input, init)));
  return {
    endpoints,
    session: identity.kind === 'authenticated'
      ? { status: 'authenticated', identity }
      : { status: 'anonymous', identity },
    transportFor: (kind) => {
      const endpoint = endpoints[kind];
      if (!endpoint) return null;
      return createIdentityScopedTransport(transport, {
        endpoint,
        identity,
        getAccessToken: () => host.getAccessToken()
      });
    }
  };
}

const schemaCache = new WeakMap<ScopeRuntime, Promise<ScopeSchemas>>();

/**
 * The admin, auth and app (`data`) schemas the scope blocks check their reads
 * and writes against, introspected once per runtime. Without an auth schema
 * the members show without names or emails; without the app's, no files.
 */
export function loadScopeSchemas(runtime: ScopeRuntime): Promise<ScopeSchemas> {
  const cached = schemaCache.get(runtime);
  if (cached) return cached;
  const optional = (kind: 'auth' | 'data') => runtime.endpoints[kind]
    ? inspectConstructiveSchema(runtime, kind).catch(() => undefined)
    : Promise.resolve(undefined);
  const loading = Promise.all([
    inspectConstructiveSchema(runtime, 'admin'),
    optional('auth'),
    optional('data')
  ]).then(([admin, auth, data]): ScopeSchemas => ({
    admin,
    ...(auth ? { auth } : {}),
    ...(data ? { data } : {})
  }));
  // A failed introspection is tried again on the next load, not cached.
  loading.catch(() => schemaCache.delete(runtime));
  schemaCache.set(runtime, loading);
  return loading;
}

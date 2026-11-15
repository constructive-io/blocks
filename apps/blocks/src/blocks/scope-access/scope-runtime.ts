import {
  createFetchConsoleTransport,
  createIdentityScopedTransport,
  type ConsoleEndpoint,
  type ConsoleEndpointKind,
  type ConsoleIdentity,
  type ConsoleSessionSnapshot
} from '../console-runtime';
import {
  inspectConstructiveSchema,
  type ConstructiveGraphQLRuntime,
  type ConstructiveSchemaSnapshot
} from '../console-kit/constructive/constructive-graphql';
import type { ScopeNames } from './scope-names';

/** A host's endpoints, transports and session: Console Kit's adapter context, or createScopeRuntime's. */
export type ScopeRuntime = ConstructiveGraphQLRuntime & Readonly<{
  session: ConsoleSessionSnapshot;
}>;

export type ScopeSchemas = Readonly<{
  admin?: ConstructiveSchemaSnapshot;
  auth?: ConstructiveSchemaSnapshot;
  /** The app API, where each scope's files and uploads are. */
  data?: ConstructiveSchemaSnapshot;
}>;

/** One scope's members or files: the app's, or one entity's (an organization, a data room). */
export type ScopeTarget = Readonly<{ names: ScopeNames; entityId?: string }>;

/** The entity an entity scope's reads and writes are limited to; none for `app`. */
export function scopeEntityId(target: ScopeTarget): string | undefined {
  if (!target.names.entity) return undefined;
  if (!target.entityId) {
    throw new Error(`The ${target.names.noun.long} scope needs the id of one ${target.names.noun.long}.`);
  }
  return target.entityId;
}

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

type SchemaKind = 'admin' | 'auth' | 'data';

// One introspection per endpoint and signed-in user for the life of the page:
// panels mount and unmount as the user moves around, and a schema is large.
const schemaCache = new Map<string, Promise<ScopeSchemas[SchemaKind]>>();

function inspectOnce(runtime: ScopeRuntime, kind: SchemaKind): Promise<ScopeSchemas[SchemaKind]> {
  const endpoint = runtime.endpoints[kind];
  if (!endpoint) return Promise.resolve(undefined);
  const subject = runtime.session.status === 'authenticated' ? runtime.session.identity.subjectId : '';
  const key = `${kind}\n${endpoint.url}\n${subject}`;
  const cached = schemaCache.get(key);
  if (cached) return cached;
  const loading = inspectConstructiveSchema(runtime, kind);
  // A failed introspection is tried again on the next load, not kept.
  loading.catch(() => schemaCache.delete(key));
  schemaCache.set(key, loading);
  return loading;
}

/**
 * The schemas a scope block checks its reads and writes against: only the
 * endpoints it names. The admin schema is required when asked for; without
 * the auth schema members show without names or emails, and without the
 * app's (`data`) there are no files.
 */
export async function loadScopeSchemas(
  runtime: ScopeRuntime,
  kinds: readonly SchemaKind[]
): Promise<ScopeSchemas> {
  const loaded = await Promise.all(kinds.map(async (kind) => {
    const schema = kind === 'admin'
      ? await inspectOnce(runtime, kind)
      : await inspectOnce(runtime, kind).catch(() => undefined);
    return [kind, schema] as const;
  }));
  return Object.fromEntries(loaded.filter(([, schema]) => schema)) as ScopeSchemas;
}

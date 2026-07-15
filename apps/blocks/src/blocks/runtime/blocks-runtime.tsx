'use client';

/**
 * @constructive/blocks-runtime
 *
 * The ONE wiring point for Constructive blocks. The host mounts this once at
 * the app root; every data block declares it as a `registryDependency`. It does
 * three things and nothing else:
 *
 *   1. Provides a single shared `QueryClient` — reusing the host's existing
 *      `QueryClientProvider` if one is already in the tree, otherwise mounting
 *      one. (Two QueryClients is the failure mode we avoid; reuse-or-mount means
 *      a block works whether or not the host already uses React Query.)
 *   2. Calls each namespace's generated `configure()` (from `@/generated/<ns>`),
 *      pointing it at the `endpoints` prop override or, as fallback,
 *      `NEXT_PUBLIC_<NS>_GRAPHQL_ENDPOINT`.
 *   3. Attaches auth via a host-supplied `getToken` → `Authorization: Bearer`
 *      adapter that reads the token *per request* (so it never goes stale).
 *
 * Blocks never mount a provider, never call `configure()`/`getClient()`, and
 * never read the token themselves — all of that lives here.
 *
 * @example
 * ```tsx
 * <BlocksRuntime namespaces={['auth', 'admin']} getToken={() => tokenManager.getAccessToken()}>
 *   {children}
 * </BlocksRuntime>
 * ```
 */

import { type ReactNode, useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';

import type { GraphQLAdapter, GraphQLError, OrmClientConfig, QueryResult } from '@/generated/auth';
import { configure as configureAuth } from '@/generated/auth';
import { configure as configureAdmin } from '@/generated/admin';
import { configure as configureSchemaBuilder } from '@/generated/schema-builder';
import { configure as configureModules } from '@/generated/modules';

/**
 * Known Constructive SDK namespaces. A host that generates additional
 * namespaces extends this union and the two maps below — the single expected
 * edit to this file, since it is the app's wiring point, not a leaf block.
 */
export type BlocksNamespace = 'auth' | 'admin' | 'schema-builder' | 'modules';

type ConfigureFn = (config: OrmClientConfig) => void;

/** namespace → its generated `configure()`. */
const CONFIGURERS: Record<BlocksNamespace, ConfigureFn> = {
  auth: configureAuth,
  admin: configureAdmin,
  'schema-builder': configureSchemaBuilder,
  modules: configureModules
};

/**
 * namespace → endpoint. Next.js only inlines statically-referenced
 * `process.env.NEXT_PUBLIC_*`, so each var is named literally here — never
 * `process.env[\`NEXT_PUBLIC_${ns}_...\`]`, which would not be replaced.
 */
const ENDPOINTS: Record<BlocksNamespace, string | undefined> = {
  auth: process.env.NEXT_PUBLIC_AUTH_GRAPHQL_ENDPOINT,
  admin: process.env.NEXT_PUBLIC_ADMIN_GRAPHQL_ENDPOINT,
  'schema-builder': process.env.NEXT_PUBLIC_SCHEMA_BUILDER_GRAPHQL_ENDPOINT,
  modules: process.env.NEXT_PUBLIC_MODULES_GRAPHQL_ENDPOINT
};

export type GetToken = () => string | null | undefined | Promise<string | null | undefined>;

/**
 * Adapter that injects a fresh `Authorization: Bearer <token>` on every request
 * by calling `getToken()` per `execute`. `configure({ headers })` captures
 * headers once, so a static token would go stale across login/refresh/logout —
 * hence a custom adapter. Mirrors the generated `FetchAdapter` response shape.
 */
class BearerFetchAdapter implements GraphQLAdapter {
  constructor(
    private readonly endpoint: string,
    private readonly getToken: GetToken
  ) {}

  async execute<T>(document: string, variables?: Record<string, unknown>): Promise<QueryResult<T>> {
    const token = await this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json'
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: document, variables: variables ?? {} })
    });

    if (!response.ok) {
      return {
        ok: false,
        data: null,
        errors: [{ message: `HTTP ${response.status}: ${response.statusText}` }]
      };
    }

    const json = (await response.json()) as { data?: T; errors?: GraphQLError[] };
    if (json.errors && json.errors.length > 0) {
      return { ok: false, data: null, errors: json.errors };
    }
    return { ok: true, data: json.data as T, errors: undefined };
  }

  getEndpoint(): string {
    return this.endpoint;
  }
}

export interface BlocksRuntimeProps {
  /** Namespaces to configure; each must have a generated SDK at `@/generated/<ns>`. */
  namespaces: BlocksNamespace[];
  /** Returns the current access token (sync or async); attached as Bearer per request. */
  getToken: GetToken;
  /**
   * Per-namespace endpoint overrides. Takes precedence over
   * `NEXT_PUBLIC_<NS>_GRAPHQL_ENDPOINT`, which is the fallback. Hosts outside a
   * Next build (no inlined env) or those that switch endpoints at runtime pass
   * URLs here. Changing a value reconfigures the affected namespaces.
   */
  endpoints?: Partial<Record<BlocksNamespace, string>>;
  children: ReactNode;
}

/**
 * Returns the host's `QueryClient` if a provider is already in the tree, else
 * `null`. `useQueryClient()` throws when unprovided; we treat that as "none".
 */
function useExistingQueryClient(): QueryClient | null {
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- one unconditional call; the throw path only means "no host provider"
    return useQueryClient();
  } catch {
    return null;
  }
}

export function BlocksRuntime({ namespaces, getToken, endpoints, children }: BlocksRuntimeProps) {
  const resolvedConfiguration = namespaces.map((namespace) => ({
    namespace,
    endpoint: endpoints?.[namespace] ?? ENDPOINTS[namespace]
  }));
  const key = JSON.stringify(resolvedConfiguration);

  const [configured, setConfigured] = useState<{
    key: string;
    getToken: GetToken;
  } | null>(null);

  useEffect(() => {
    let configurationComplete = true;
    for (const { namespace: ns, endpoint } of resolvedConfiguration) {
      const configure = CONFIGURERS[ns];
      if (!configure) {
        console.warn(`[blocks-runtime] Unknown namespace "${ns}" — no generated configure() registered.`);
        configurationComplete = false;
        continue;
      }
      if (!endpoint) {
        console.warn(
          `[blocks-runtime] No endpoint for "${ns}" — pass endpoints["${ns}"] or set NEXT_PUBLIC_${ns.toUpperCase()}_GRAPHQL_ENDPOINT.`
        );
        configurationComplete = false;
        continue;
      }
      configure({ adapter: new BearerFetchAdapter(endpoint, getToken) });
    }
    setConfigured(configurationComplete ? { key, getToken } : null);

    // `key` is the canonical signature of every namespace and resolved
    // endpoint used above. Depending on it instead of the caller's array/object
    // identities prevents equivalent inline props from reconfiguring forever.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, getToken]);

  // Host-safe: reuse the host's QueryClient if present, else mount our own.
  const existing = useExistingQueryClient();
  const [created] = useState(() => (existing ? null : new QueryClient()));

  const configurationIsCommitted = configured?.key === key && configured.getToken === getToken;
  if (!configurationIsCommitted) return null;

  if (existing) return <>{children}</>;
  return <QueryClientProvider client={created as QueryClient}>{children}</QueryClientProvider>;
}

import type { ConsoleEndpoint } from './endpoints';
import type {
  ConsoleIdentity,
  GetConsoleAccessToken
} from './session';

export type ConsoleGraphQLError = {
  message: string;
  path?: readonly (string | number)[];
  extensions?: Readonly<Record<string, unknown>>;
};

export type ConsoleGraphQLResult<TData> =
  | {
      ok: true;
      data: TData;
      errors?: never;
    }
  | {
      ok: false;
      data: TData | null;
      errors: readonly ConsoleGraphQLError[];
    };

export type ConsoleGraphQLRequest<
  TVariables extends Record<string, unknown> = Record<string, unknown>
> = {
  document: string;
  variables?: TVariables;
  operationName?: string;
  signal?: AbortSignal;
};

export type ConsoleTransportScope = {
  endpoint: ConsoleEndpoint;
  identity: ConsoleIdentity;
  getAccessToken: GetConsoleAccessToken;
};

/**
 * The host supplies the transport implementation. It receives identity and a
 * fresh token callback per request, so no SDK singleton or global client is
 * required.
 */
export interface ConsoleTransport {
  execute<
    TData,
    TVariables extends Record<string, unknown> = Record<string, unknown>
  >(
    scope: ConsoleTransportScope,
    request: ConsoleGraphQLRequest<TVariables>
  ): Promise<ConsoleGraphQLResult<TData>>;
}

type GraphQLResponsePayload<TData> = {
  data?: TData | null;
  errors?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeGraphQLError(error: unknown): ConsoleGraphQLError {
  if (!isRecord(error)) return { message: 'GraphQL request failed.' };

  const path = Array.isArray(error.path)
    ? error.path.filter(
        (part): part is string | number =>
          typeof part === 'string' || typeof part === 'number'
      )
    : undefined;
  return {
    message:
      typeof error.message === 'string' && error.message.length > 0
        ? error.message
        : 'GraphQL request failed.',
    path,
    extensions: isRecord(error.extensions) ? error.extensions : undefined
  };
}

function normalizeGraphQLErrors(errors: unknown): ConsoleGraphQLError[] {
  if (!Array.isArray(errors)) return [];
  return errors.map(normalizeGraphQLError);
}

/**
 * Creates a request-scoped GraphQL transport with no generated SDK or global
 * client. Tokens are read immediately before each request and are never stored
 * in a response, cache key, or log.
 */
export function createFetchConsoleTransport(
  fetchImpl: typeof fetch = fetch
): ConsoleTransport {
  return {
    async execute<
      TData,
      TVariables extends Record<string, unknown> = Record<string, unknown>
    >(
      scope: ConsoleTransportScope,
      request: ConsoleGraphQLRequest<TVariables>
    ): Promise<ConsoleGraphQLResult<TData>> {
      let token: string | null | undefined;
      try {
        token = await scope.getAccessToken({
          endpoint: scope.endpoint,
          signal: request.signal
        });
      } catch {
        return {
          ok: false,
          data: null,
          errors: [
            {
              message: 'Unable to acquire an access token.',
              extensions: { code: 'TOKEN_ERROR' }
            }
          ]
        };
      }

      const headers: Record<string, string> = {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      };
      if (token) headers.Authorization = `Bearer ${token}`;

      let response: Response;
      try {
        response = await fetchImpl(scope.endpoint.url, {
          method: 'POST',
          headers,
          signal: request.signal,
          body: JSON.stringify({
            query: request.document,
            variables: request.variables ?? {},
            operationName: request.operationName
          })
        });
      } catch (error) {
        const aborted =
          request.signal?.aborted === true ||
          (error instanceof Error && error.name === 'AbortError');
        return {
          ok: false,
          data: null,
          errors: [
            {
              message: aborted
                ? 'GraphQL request was aborted.'
                : 'GraphQL request failed before receiving a response.',
              extensions: {
                code: aborted ? 'REQUEST_ABORTED' : 'NETWORK_ERROR'
              }
            }
          ]
        };
      }

      let payload: GraphQLResponsePayload<TData> | null = null;
      try {
        const candidate: unknown = await response.json();
        if (isRecord(candidate)) {
          payload = candidate as GraphQLResponsePayload<TData>;
        }
      } catch {
        // HTTP status is reported below; a successful non-JSON response gets a
        // distinct invalid-response error without exposing its body.
      }

      const graphQLErrors = normalizeGraphQLErrors(payload?.errors);
      if (!response.ok) {
        return {
          ok: false,
          data: payload?.data ?? null,
          errors: [
            {
              message: response.statusText
                ? `HTTP ${response.status}: ${response.statusText}`
                : `HTTP ${response.status}`,
              extensions: {
                code: 'HTTP_ERROR',
                status: response.status
              }
            },
            ...graphQLErrors
          ]
        };
      }

      if (graphQLErrors.length > 0) {
        return {
          ok: false,
          data: payload?.data ?? null,
          errors: graphQLErrors
        };
      }

      if (!payload || !Object.prototype.hasOwnProperty.call(payload, 'data')) {
        return {
          ok: false,
          data: null,
          errors: [
            {
              message: 'GraphQL endpoint returned an invalid response.',
              extensions: { code: 'INVALID_RESPONSE' }
            }
          ]
        };
      }

      return { ok: true, data: payload.data as TData };
    }
  };
}

export interface IdentityScopedConsoleTransport {
  readonly scope: ConsoleTransportScope;
  execute<
    TData,
    TVariables extends Record<string, unknown> = Record<string, unknown>
  >(
    request: ConsoleGraphQLRequest<TVariables>
  ): Promise<ConsoleGraphQLResult<TData>>;
}

export function createIdentityScopedTransport(
  transport: ConsoleTransport,
  scope: ConsoleTransportScope
): IdentityScopedConsoleTransport {
  return {
    scope,
    execute: (request) => transport.execute(scope, request)
  };
}

export type ConsoleCacheKeyPart =
  | string
  | number
  | boolean
  | null
  | undefined
  | Readonly<Record<string, unknown>>
  | readonly unknown[];

/**
 * Stable, non-secret identity scope for caches owned by nested data clients.
 * Every authorization-relevant identity dimension participates in the key so
 * a tenant or organization switch cannot reuse the previous view's rows.
 */
export function createConsoleIdentityKey(identity: ConsoleIdentity): string {
  return JSON.stringify([
    identity.kind,
    identity.cachePartition,
    identity.kind === 'authenticated' ? identity.subjectId : null,
    identity.kind === 'authenticated' ? identity.sessionId ?? null : null,
    identity.tenantId ?? null,
    identity.organizationId ?? null
  ]);
}

/**
 * Produces a TanStack-compatible key partitioned by endpoint and identity.
 * Access tokens are intentionally excluded because they are secrets and rotate.
 */
export function createConsoleCacheKey(
  scope: Pick<ConsoleTransportScope, 'endpoint' | 'identity'>,
  ...parts: readonly ConsoleCacheKeyPart[]
) {
  const { endpoint, identity } = scope;
  return [
    'constructive-console',
    endpoint.kind,
    endpoint.id,
    createConsoleIdentityKey(identity),
    ...parts
  ] as const;
}

'use client';

import * as React from 'react';
import {
  META_CONTRACT_INTROSPECTION_SOURCE,
  META_QUERY_SOURCE,
  SCHEMA_INTROSPECTION_QUERY,
  assessMetaContract,
  assessSchemaIntrospectionCompatibility,
  assertMetaQuery,
  type IntrospectionQueryResponse,
  type MetaContractIntrospectionQuery,
  type MetaQuery
} from '@constructive-io/data';

import {
  CONSOLE_ENDPOINT_KINDS,
  SERVER_CONSOLE_SESSION_SNAPSHOT,
  createFetchConsoleTransport,
  createConsoleIdentityKey,
  createIdentityScopedTransport,
  getConsoleSessionIdentity,
  resolveConsoleEndpoint,
  type ConsoleEndpoint,
  type ConsoleEndpointKind,
  type ConsoleRuntimeError,
  type ConsoleSession,
  type ConsoleSessionSnapshot,
  type ConsoleTransport
} from '../console-runtime';
import type {
  ConsoleKitAdapterContext,
  ConsoleKitEndpointResolver,
  ConsoleKitMetadataState
} from './console-kit-contracts';
import { useConsoleKitStore } from './store';
import { useLatestCallback } from './use-latest-callback';

const CHECKING_METADATA_STATE = { status: 'checking' } as const;
const runtimeReferenceIds = new WeakMap<object, number>();
let nextRuntimeReferenceId = 1;

function runtimeReferenceId(value: object): number {
  const existing = runtimeReferenceIds.get(value);
  if (existing) return existing;
  const id = nextRuntimeReferenceId;
  nextRuntimeReferenceId += 1;
  runtimeReferenceIds.set(value, id);
  return id;
}

function metadataRequestKey(
  context: Omit<ConsoleKitAdapterContext, 'metadata'>
): string {
  const endpoint = context.endpoints.data;
  const identity = getConsoleSessionIdentity(context.session);
  return JSON.stringify([
    context.databaseId,
    endpoint?.id ?? null,
    endpoint?.url ?? null,
    context.session.status,
    identity ? createConsoleIdentityKey(identity) : null,
    runtimeReferenceId(context.transportFor)
  ]);
}

export function normalizeConsoleKitError(
  cause: unknown,
  fallback: string
): ConsoleRuntimeError {
  if (cause && typeof cause === 'object' && 'message' in cause) {
    const error = cause as { message?: unknown; code?: unknown; retryable?: unknown };
    return {
      message: typeof error.message === 'string' && error.message ? error.message : fallback,
      code: typeof error.code === 'string' ? error.code : undefined,
      retryable: typeof error.retryable === 'boolean' ? error.retryable : undefined,
      cause
    };
  }
  return { message: fallback, cause };
}

export function useConsoleSessionSnapshot(session: ConsoleSession): ConsoleSessionSnapshot {
  const subscribe = React.useCallback(
    (listener: () => void) => session.subscribe(listener),
    [session]
  );
  const getSnapshot = React.useCallback(() => session.getSnapshot(), [session]);
  const getServerSnapshot = React.useCallback(
    () => session.getServerSnapshot?.() ?? SERVER_CONSOLE_SESSION_SNAPSHOT,
    [session]
  );

  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function resolveConsoleKitEndpoints(
  databaseId: string,
  configured: Parameters<typeof resolveConsoleEndpoint>[0] | undefined,
  resolver: ConsoleKitEndpointResolver | undefined
): Readonly<Partial<Record<ConsoleEndpointKind, ConsoleEndpoint>>> {
  const endpoints: Partial<Record<ConsoleEndpointKind, ConsoleEndpoint>> = {};

  for (const kind of CONSOLE_ENDPOINT_KINDS) {
    const input = configured?.[kind] ?? resolver?.({ databaseId, kind });
    if (input === undefined) continue;
    const resolution = resolveConsoleEndpoint({ [kind]: input }, kind);
    if (resolution.status === 'resolved') endpoints[kind] = resolution.endpoint;
  }

  return endpoints;
}

function configuredEndpointsKey(
  configured: Parameters<typeof resolveConsoleEndpoint>[0] | undefined
): string {
  return JSON.stringify(CONSOLE_ENDPOINT_KINDS.map((kind) => {
    const endpoint = configured?.[kind];
    if (typeof endpoint === 'string') return [kind, endpoint];
    return [kind, endpoint?.id ?? null, endpoint?.url ?? null];
  }));
}

async function requireResult<T>(
  result: Awaited<ReturnType<ConsoleTransport['execute']>>,
  fallback: string
): Promise<T> {
  if (result.ok) return result.data as T;
  const first = result.errors[0];
  const error = new Error(first?.message || fallback) as Error & { code?: string };
  const code = first?.extensions?.code;
  if (typeof code === 'string') error.code = code;
  throw error;
}

export function useConsoleKitMetadata(
  context: Omit<ConsoleKitAdapterContext, 'metadata'>,
  onError?: (error: ConsoleRuntimeError) => void
): ConsoleKitMetadataState {
  const storedState = useConsoleKitStore((store) => store.metadata);
  const storedKey = useConsoleKitStore((store) => store.metadataKey);
  const setState = useConsoleKitStore((store) => store.setMetadata);
  const requestKey = metadataRequestKey(context);
  const state = storedKey === requestKey ? storedState : CHECKING_METADATA_STATE;
  const requestGeneration = React.useRef(0);
  const reportError = useLatestCallback((error: ConsoleRuntimeError) => {
    onError?.(error);
  });

  React.useEffect(() => {
    const generation = ++requestGeneration.current;
    const endpoint = context.endpoints.data;
    const transport = context.transportFor('data');
    if (!endpoint || !transport) {
      setState(requestKey, {
        status: 'incompatible',
        message: 'A data endpoint and active session identity are required to inspect this database.',
        missing: ['data endpoint']
      });
      return;
    }

    const controller = new AbortController();
    const isCurrent = () =>
      !controller.signal.aborted && requestGeneration.current === generation;
    setState(requestKey, CHECKING_METADATA_STATE);

    void (async () => {
      try {
        const introspectionResult = await transport.execute<MetaContractIntrospectionQuery>({
          document: META_CONTRACT_INTROSPECTION_SOURCE,
          operationName: 'ConstructiveMetaContract',
          signal: controller.signal
        });
        const contractIntrospection = await requireResult<MetaContractIntrospectionQuery>(
          introspectionResult,
          'The Constructive _meta contract could not be inspected.'
        );
        const compatibility = assessMetaContract(contractIntrospection);
        if (compatibility.status !== 'compatible') {
          if (!isCurrent()) return;
          setState(requestKey, {
            status: 'incompatible',
            message:
              compatibility.status === 'unavailable'
                ? 'This endpoint does not expose the current Constructive _meta contract.'
                : 'This endpoint must be upgraded to the current Constructive _meta contract.',
            missing: compatibility.missing
          });
          return;
        }
        if (!isCurrent()) return;

        const [metaResult, schemaIntrospectionResult] = await Promise.all([
          transport.execute<MetaQuery>({
            document: META_QUERY_SOURCE,
            operationName: 'ConstructiveMeta',
            signal: controller.signal
          }),
          transport.execute<IntrospectionQueryResponse>({
            document: SCHEMA_INTROSPECTION_QUERY,
            operationName: 'IntrospectSchema',
            signal: controller.signal
          })
        ]);
        const meta = await requireResult<MetaQuery>(metaResult, 'Constructive metadata could not be loaded.');
        assertMetaQuery(meta);
        const introspection = await requireResult<IntrospectionQueryResponse>(
          schemaIntrospectionResult,
          'Standard GraphQL introspection could not be loaded.'
        );
        const schemaCompatibility = assessSchemaIntrospectionCompatibility(
          introspection,
          meta
        );
        if (schemaCompatibility.status !== 'compatible') {
          if (!isCurrent()) return;
          setState(requestKey, {
            status: 'incompatible',
            message:
              'The endpoint GraphQL schema does not satisfy the operations declared by its Constructive _meta contract.',
            missing: schemaCompatibility.missingPaths
          });
          return;
        }

        if (!isCurrent()) return;
        setState(requestKey, {
          status: 'compatible',
          meta,
          contractIntrospection,
          introspection
        });
      } catch (cause) {
        if (!isCurrent()) return;
        const error = normalizeConsoleKitError(cause, 'Console metadata could not be loaded.');
        setState(requestKey, { status: 'error', error });
        reportError(error);
      }
    })();

    return () => {
      controller.abort();
      if (requestGeneration.current === generation) requestGeneration.current += 1;
    };
  }, [context.endpoints.data, context.transportFor, requestKey, setState]);

  return state;
}

export function useConsoleKitRuntime({
  databaseId,
  endpoints: configuredEndpoints,
  resolveEndpoint,
  session,
  transport,
  onMetadataError
}: Readonly<{
  databaseId: string;
  endpoints?: Parameters<typeof resolveConsoleEndpoint>[0];
  resolveEndpoint?: ConsoleKitEndpointResolver;
  session: ConsoleSession;
  transport?: ConsoleTransport;
  onMetadataError?: (error: ConsoleRuntimeError) => void;
}>): ConsoleKitAdapterContext {
  const snapshot = useConsoleSessionSnapshot(session);
  const setSession = useConsoleKitStore((store) => store.setSession);
  React.useEffect(() => setSession(snapshot), [setSession, snapshot]);
  const endpointConfigurationKey = configuredEndpointsKey(configuredEndpoints);
  const endpoints = React.useMemo(
    () => resolveConsoleKitEndpoints(databaseId, configuredEndpoints, resolveEndpoint),
    [databaseId, endpointConfigurationKey, resolveEndpoint]
  );
  const setEndpoints = useConsoleKitStore((store) => store.setEndpoints);
  React.useEffect(() => setEndpoints(endpoints), [endpoints, setEndpoints]);
  const selectedTransport = React.useMemo(() => transport ?? createFetchConsoleTransport(), [transport]);
  const identity = getConsoleSessionIdentity(snapshot);

  const transportFor = React.useCallback((kind: ConsoleEndpointKind) => {
    const endpoint = endpoints[kind];
    if (!endpoint || !identity) return null;
    return createIdentityScopedTransport(selectedTransport, {
      endpoint,
      identity,
      getAccessToken: session.getAccessToken
    });
  }, [endpoints, identity, selectedTransport, session.getAccessToken]);

  const baseContext = React.useMemo(
    () => ({ databaseId, endpoints, session: snapshot, transportFor }),
    [databaseId, endpoints, snapshot, transportFor]
  );
  const metadata = useConsoleKitMetadata(baseContext, onMetadataError);

  return React.useMemo(
    () => ({ ...baseContext, metadata }),
    [baseContext, metadata]
  );
}

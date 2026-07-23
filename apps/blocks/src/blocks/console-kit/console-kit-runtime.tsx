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
const useIsomorphicLayoutEffect = typeof window === 'undefined'
  ? React.useEffect
  : React.useLayoutEffect;
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
  context: Omit<ConsoleKitAdapterContext, 'metadata' | 'metadataByEndpoint'>
): string {
  const identity = getConsoleSessionIdentity(context.session);
  return JSON.stringify([
    context.databaseId,
    CONSOLE_ENDPOINT_KINDS.map((kind) => {
      const endpoint = context.endpoints[kind];
      return [kind, endpoint?.id ?? null, endpoint?.url ?? null];
    }),
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

function useConsoleKitMetadataByEndpoint(
  context: Omit<ConsoleKitAdapterContext, 'metadata' | 'metadataByEndpoint'>,
  onError?: (error: ConsoleRuntimeError) => void
): Readonly<{
  metadata: ConsoleKitMetadataState;
  metadataByEndpoint: Readonly<
    Partial<Record<ConsoleEndpointKind, ConsoleKitMetadataState>>
  >;
}> {
  const storedState = useConsoleKitStore((store) => store.metadataByEndpoint);
  const storedKey = useConsoleKitStore((store) => store.metadataKey);
  const setState = useConsoleKitStore((store) => store.setMetadataByEndpoint);
  const requestKey = metadataRequestKey(context);
  const state = storedKey === requestKey ? storedState : {};
  const requestGeneration = React.useRef(0);
  const reportError = useLatestCallback((error: ConsoleRuntimeError) => {
    onError?.(error);
  });

  React.useEffect(() => {
    const generation = ++requestGeneration.current;
    const endpointKinds = CONSOLE_ENDPOINT_KINDS.filter(
      (kind) => context.endpoints[kind] && context.transportFor(kind)
    );
    if (endpointKinds.length === 0) {
      setState(requestKey, {});
      return;
    }

    const controller = new AbortController();
    const isCurrent = () =>
      !controller.signal.aborted && requestGeneration.current === generation;
    setState(
      requestKey,
      Object.fromEntries(endpointKinds.map((kind) => [
        kind,
        CHECKING_METADATA_STATE
      ]))
    );

    void (async () => {
      const inspectEndpoint = async (
        kind: ConsoleEndpointKind
      ): Promise<ConsoleKitMetadataState> => {
        const transport = context.transportFor(kind);
        if (!transport) {
          return {
            status: 'incompatible',
            message: `The ${kind} endpoint has no active session transport.`,
            missing: [`${kind} transport`]
          };
        }
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
          return {
            status: 'incompatible',
            message:
              compatibility.status === 'unavailable'
                ? 'This endpoint does not expose the current Constructive _meta contract.'
                : 'This endpoint must be upgraded to the current Constructive _meta contract.',
            missing: compatibility.missing
          };
        }

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
          return {
            status: 'incompatible',
            message:
              'The endpoint GraphQL schema does not satisfy the operations declared by its Constructive _meta contract.',
            missing: schemaCompatibility.missingPaths
          };
        }

        return {
          status: 'compatible',
          meta,
          contractIntrospection,
          introspection
        };
      };

      const results = await Promise.all(endpointKinds.map(async (kind) => {
        try {
          return [kind, await inspectEndpoint(kind)] as const;
        } catch (cause) {
          const error = normalizeConsoleKitError(
            cause,
            `The ${kind} endpoint metadata could not be loaded.`
          );
          return [kind, { status: 'error', error } as const] as const;
        }
      }));
      if (!isCurrent()) return;
      const next = Object.fromEntries(results) as Partial<
        Record<ConsoleEndpointKind, ConsoleKitMetadataState>
      >;
      setState(requestKey, next);
      const firstError = results.find(([, result]) => result.status === 'error');
      if (firstError?.[1].status === 'error') {
        reportError(firstError[1].error);
      }
      /* istanbul ignore next -- an unexpected orchestration failure. */
    })().catch((cause) => {
        if (!isCurrent()) return;
        const error = normalizeConsoleKitError(cause, 'Console metadata could not be loaded.');
        setState(requestKey, { data: { status: 'error', error } });
        reportError(error);
      });

    return () => {
      controller.abort();
      if (requestGeneration.current === generation) requestGeneration.current += 1;
    };
  }, [context.endpoints, context.transportFor, requestKey, setState]);

  return React.useMemo(() => ({
    metadata: state.data ?? {
      status: 'incompatible' as const,
      message: 'A data endpoint is required to inspect application tables.',
      missing: ['data endpoint']
    },
    metadataByEndpoint: state
  }), [state]);
}

export function useConsoleKitMetadata(
  context: Omit<ConsoleKitAdapterContext, 'metadata' | 'metadataByEndpoint'>,
  onError?: (error: ConsoleRuntimeError) => void
): ConsoleKitMetadataState {
  return useConsoleKitMetadataByEndpoint(context, onError).metadata;
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
  const synchronizeScope = useConsoleKitStore(
    (store) => store.synchronizeScope
  );
  useIsomorphicLayoutEffect(
    () => synchronizeScope(databaseId, snapshot),
    [databaseId, snapshot, synchronizeScope]
  );
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
    () => ({
      databaseId,
      endpoints,
      session: snapshot,
      sessionMode: session.mode,
      transportFor
    }),
    [databaseId, endpoints, session.mode, snapshot, transportFor]
  );
  const metadataState = useConsoleKitMetadataByEndpoint(
    baseContext,
    onMetadataError
  );

  return React.useMemo(
    () => ({ ...baseContext, ...metadataState }),
    [baseContext, metadataState]
  );
}

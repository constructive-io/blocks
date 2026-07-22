'use client';

import * as React from 'react';
import { CircleAlertIcon } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@constructive-io/ui/alert';

import {
  createDatabaseScopedStandaloneSession,
  createFetchConsoleTransport,
  resolveConsoleEndpoint,
  type ConsoleSession,
  type ConsoleEndpoint,
  type ConsoleEndpointMap,
  type ConsoleCsrfTokenProvider,
  type ConsoleRuntimeError,
  type ConsoleTransport,
  type DatabaseScopedStandaloneConsoleSession
} from '../../console-runtime';
import type { FeaturePackId } from '../../../feature-packs';
import { ConsoleKit } from '../console-kit';
import type {
  ConsoleKitAdapters,
  ConsoleKitConfig,
  ConsoleKitRouteConfig
} from '../console-kit-contracts';
import {
  createConsoleKitStore,
  type ConsoleKitStoreApi
} from '../store';
import { createConstructiveAuthAdapter } from './auth-adapter';
import { createConstructiveBillingAdapter } from './billing-adapter';
import { createConstructiveCapabilityDiscovery } from './constructive-capabilities';
import { createConstructiveNotificationsAdapter } from './notifications-adapter';
import { createConstructiveOrganizationsAdapter } from './organizations-adapter';
import { createConstructiveStorageAdapter } from './storage-adapter';
import { createConstructiveUsersAdapter } from './users-adapter';

export type ConstructiveTenantDatabase = Readonly<{
  id: string;
  name?: string;
  endpoints: ConsoleEndpointMap;
  /** Exact application tables authorized by the provisioning manifest. */
  tableAllowlist?: readonly string[];
}>;

/** Host-owned Console Kit session explicitly scoped to one tenant database. */
export type ConstructiveTenantConsoleSession = ConsoleSession & Readonly<{
  databaseId: string;
}>;

export type ConstructiveConsoleKitProps = Readonly<{
  database: ConstructiveTenantDatabase;
  className?: string;
  order?: readonly FeaturePackId[];
  routes?: ConsoleKitRouteConfig;
  showUnavailable?: boolean;
  /**
   * Host-owned session for an existing database identity. This is required for
   * data-only tenants because Console Kit cannot mint authority without an auth
   * endpoint, and its databaseId must match the tenant descriptor.
   */
  session?: ConstructiveTenantConsoleSession;
  /** Required when the tenant enables require_csrf_for_auth. */
  csrfTokenProvider?: ConsoleCsrfTokenProvider;
  store?: ConsoleKitStoreApi;
  transport?: ConsoleTransport;
  resetRoleId?: string;
  resetToken?: string;
  /** Values parsed and scrubbed by the host from a client-only email-link fragment. */
  verificationEmailId?: string;
  verificationToken?: string;
  onError?: ConsoleKitConfig['onError'];
}>;

export type CreateConstructiveAdaptersOptions = Readonly<{
  store: ConsoleKitStoreApi;
  session?: DatabaseScopedStandaloneConsoleSession;
  resetRoleId?: string;
  resetToken?: string;
  verificationEmailId?: string;
  verificationToken?: string;
}>;

function endpoint(
  endpoints: ConsoleEndpointMap,
  kind: ConsoleEndpoint['kind']
): ConsoleEndpoint | null {
  const resolution = resolveConsoleEndpoint(endpoints, kind);
  return resolution.status === 'resolved' ? resolution.endpoint : null;
}

/** Creates the first-party adapters backed by Constructive GraphQL contracts. */
export function createConstructiveConsoleAdapters(
  options: CreateConstructiveAdaptersOptions
): ConsoleKitAdapters {
  const discovery = createConstructiveCapabilityDiscovery(options.store);
  return {
    ...(options.session
      ? { auth: createConstructiveAuthAdapter({ ...options, session: options.session, discovery }) }
      : {}),
    users: createConstructiveUsersAdapter({ store: options.store, discovery }),
    organizations: createConstructiveOrganizationsAdapter({
      store: options.store,
      discovery
    }),
    storage: createConstructiveStorageAdapter({ store: options.store, discovery }),
    billing: createConstructiveBillingAdapter({ store: options.store, discovery }),
    notifications: createConstructiveNotificationsAdapter({
      store: options.store,
      discovery
    })
  };
}

function isDatabaseScopedStandaloneSession(
  session: ConstructiveTenantConsoleSession | null | undefined
): session is DatabaseScopedStandaloneConsoleSession {
  if (!session || session.mode !== 'standalone') return false;
  const candidate = session as Partial<DatabaseScopedStandaloneConsoleSession>;
  return typeof candidate.signIn === 'function' &&
    typeof candidate.signUp === 'function' &&
    typeof candidate.restorePersistedSession === 'function' &&
    typeof candidate.handleAuthenticationFailure === 'function';
}

function ConfigurationError({ message }: Readonly<{ message: string }>) {
  return (
    <Alert className='m-6 max-w-2xl' variant='destructive'>
      <CircleAlertIcon aria-hidden='true' />
      <AlertTitle>Console Kit is not configured</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

function reportConsoleKitError(error: ConsoleRuntimeError) {
  if (process.env.NODE_ENV !== 'production') {
    console.error('[Constructive Console Kit]', error.message);
  }
}

function ConstructiveConsoleKitInstance(props: ConstructiveConsoleKitProps) {
  const authEndpoint = endpoint(props.database.endpoints, 'auth');
  const externalAuthSession = isDatabaseScopedStandaloneSession(props.session)
    ? props.session
    : null;
  const csrfTokenProviderRef = React.useRef(props.csrfTokenProvider);
  React.useEffect(() => {
    csrfTokenProviderRef.current = props.csrfTokenProvider;
  }, [props.csrfTokenProvider]);
  const resolveCsrfTokenProvider = React.useCallback(
    () => csrfTokenProviderRef.current,
    []
  );
  const internalStoreRef = React.useRef<ConsoleKitStoreApi | null>(null);
  if (!props.store && !internalStoreRef.current) {
    const startsWithAuth = Boolean(authEndpoint) &&
      (!props.session || Boolean(externalAuthSession));
    internalStoreRef.current = createConsoleKitStore(startsWithAuth ? 'auth' : 'data', {
      databaseId: props.database.id,
      organizationId: null
    });
  }
  const store = props.store ?? internalStoreRef.current;

  const hasExternalSession = Boolean(props.session);
  const internalSessionState = React.useMemo<Readonly<{
    session: DatabaseScopedStandaloneConsoleSession | null;
    error: string | null;
  }>>(() => {
    if (hasExternalSession || !authEndpoint) {
      return { session: null, error: null };
    }
    try {
      return {
        session: createDatabaseScopedStandaloneSession({
          databaseId: props.database.id,
          authEndpoint,
          resolveCsrfTokenProvider,
          deferRestore: true
        }),
        error: null
      };
    } catch (cause) {
      return {
        session: null,
        error: cause instanceof Error
          ? cause.message
          : 'The auth endpoint configuration is invalid.'
      };
    }
  }, [
    authEndpoint?.id,
    authEndpoint?.url,
    props.database.id,
    hasExternalSession,
    resolveCsrfTokenProvider
  ]);
  const internalSession = internalSessionState.session;
  const sessionDatabaseMismatch = props.session &&
    props.session.databaseId !== props.database.id;
  const session = sessionDatabaseMismatch
    ? null
    : props.session ?? internalSession;
  const authSession = sessionDatabaseMismatch
    ? null
    : internalSession ?? externalAuthSession;
  React.useEffect(() => {
    internalSession?.resume?.();
    authSession?.restorePersistedSession();
    return () => internalSession?.dispose?.();
  }, [authSession, internalSession]);

  const transport = React.useMemo(() => {
    if (props.transport) return props.transport;
    if (!session) return null;
    return createFetchConsoleTransport(fetch, {
      onAuthenticationError: ({ error, identity }) => {
        const code = typeof error.extensions?.code === 'string'
          ? error.extensions.code
          : 'UNAUTHENTICATED';
        authSession?.handleAuthenticationFailure({ message: error.message, code, identity });
      }
    });
  }, [authSession, props.transport, session]);

  const adapters = React.useMemo(() => {
    if (!store || !session) return null;
    return createConstructiveConsoleAdapters({
      store,
      session: authEndpoint ? authSession ?? undefined : undefined,
      resetRoleId: props.resetRoleId,
      resetToken: props.resetToken,
      verificationEmailId: props.verificationEmailId,
      verificationToken: props.verificationToken
    });
  }, [
    props.resetRoleId,
    props.resetToken,
    props.verificationEmailId,
    props.verificationToken,
    authEndpoint?.id,
    authEndpoint?.url,
    authSession,
    session,
    store
  ]);

  if (sessionDatabaseMismatch) {
    return (
      <ConfigurationError
        message='The host-owned session belongs to a different tenant database.'
      />
    );
  }

  if (!store || !session || !transport || !adapters) {
    return (
      <ConfigurationError
        message={internalSessionState.error ??
          'A routable auth endpoint or a matching host-owned session is required for Console Kit.'}
      />
    );
  }

  const reportError = props.onError ?? reportConsoleKitError;
  return (
    <ConsoleKit
      className={props.className}
      config={{
        databaseId: props.database.id,
        endpoints: props.database.endpoints,
        session,
        transport,
        adapters,
        order: props.order,
        routes: props.routes,
        showUnavailable: props.showUnavailable ?? true,
        table: { includeTables: props.database.tableAllowlist },
        brand: {
          name: props.database.name ?? 'Constructive',
          description: props.database.id
        },
        onError: reportError
      }}
      store={store}
    />
  );
}

/**
 * Batteries-included application console for one compatible Constructive
 * tenant database. A database switch remounts every session and cache scope.
 */
export function ConstructiveConsoleKit(props: ConstructiveConsoleKitProps) {
  const authEndpoint = endpoint(props.database.endpoints, 'auth');
  const instanceKey = [
    props.database.id,
    authEndpoint?.id ?? 'missing-auth-id',
    authEndpoint?.url ?? 'missing-auth-url'
  ].join(':');
  return <ConstructiveConsoleKitInstance key={instanceKey} {...props} />;
}

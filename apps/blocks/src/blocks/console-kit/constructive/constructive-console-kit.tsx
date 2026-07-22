'use client';

import * as React from 'react';
import { CircleAlertIcon } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@constructive-io/ui/alert';

import {
  createDatabaseScopedStandaloneSession,
  createFetchConsoleTransport,
  resolveConsoleEndpoint,
  type ConsoleEndpoint,
  type ConsoleEndpointMap,
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

export type ConstructiveConsoleKitProps = Readonly<{
  database: ConstructiveTenantDatabase;
  className?: string;
  order?: readonly FeaturePackId[];
  routes?: ConsoleKitRouteConfig;
  showUnavailable?: boolean;
  session?: DatabaseScopedStandaloneConsoleSession;
  store?: ConsoleKitStoreApi;
  transport?: ConsoleTransport;
  resetRoleId?: string;
  resetToken?: string;
  onError?: ConsoleKitConfig['onError'];
}>;

export type CreateConstructiveAdaptersOptions = Readonly<{
  store: ConsoleKitStoreApi;
  session: DatabaseScopedStandaloneConsoleSession;
  resetRoleId?: string;
  resetToken?: string;
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
    auth: createConstructiveAuthAdapter({ ...options, discovery }),
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

function ConfigurationError({ message }: Readonly<{ message: string }>) {
  return (
    <Alert className='m-6 max-w-2xl' variant='destructive'>
      <CircleAlertIcon aria-hidden='true' />
      <AlertTitle>Console Kit is not configured</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

function ConstructiveConsoleKitInstance(props: ConstructiveConsoleKitProps) {
  const authEndpoint = endpoint(props.database.endpoints, 'auth');
  const storeRef = React.useRef<ConsoleKitStoreApi | null>(null);
  if (!storeRef.current) {
    storeRef.current = props.store ?? createConsoleKitStore('auth', {
      databaseId: props.database.id,
      organizationId: null
    });
  }
  const store = storeRef.current;

  const sessionRef = React.useRef<DatabaseScopedStandaloneConsoleSession | null>(null);
  if (!sessionRef.current && authEndpoint) {
    sessionRef.current = props.session ?? createDatabaseScopedStandaloneSession({
      databaseId: props.database.id,
      authEndpoint
    });
  }
  const session = sessionRef.current;

  const transportRef = React.useRef<ConsoleTransport | null>(null);
  if (!transportRef.current && session) {
    transportRef.current = props.transport ?? createFetchConsoleTransport(fetch, {
      onAuthenticationError: ({ error }) => {
        const code = typeof error.extensions?.code === 'string'
          ? error.extensions.code
          : 'UNAUTHENTICATED';
        session.handleAuthenticationFailure({ message: error.message, code });
      }
    });
  }

  const adaptersRef = React.useRef<ConsoleKitAdapters | null>(null);
  if (!adaptersRef.current && session) {
    adaptersRef.current = createConstructiveConsoleAdapters({
      store,
      session,
      resetRoleId: props.resetRoleId,
      resetToken: props.resetToken
    });
  }

  if (!authEndpoint || !session || !transportRef.current || !adaptersRef.current) {
    return <ConfigurationError message='A routable auth endpoint is required for the standalone Console Kit.' />;
  }

  const reportError = props.onError ?? ((error: ConsoleRuntimeError) => {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[Constructive Console Kit]', error.message);
    }
  });
  return (
    <ConsoleKit
      className={props.className}
      config={{
        databaseId: props.database.id,
        endpoints: props.database.endpoints,
        session,
        transport: transportRef.current,
        adapters: adaptersRef.current,
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
  const authUrl = typeof props.database.endpoints.auth === 'string'
    ? props.database.endpoints.auth
    : props.database.endpoints.auth?.url;
  const instanceKey = `${props.database.id}:${authUrl ?? 'missing-auth'}`;
  return <ConstructiveConsoleKitInstance key={instanceKey} {...props} />;
}

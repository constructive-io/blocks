'use client';

import * as React from 'react';
import type { DocumentNode } from 'graphql';
import { print } from 'graphql';
import {
  BellIcon,
  Building2Icon,
  CircleAlertIcon,
  CreditCardIcon,
  DatabaseIcon,
  HardDriveIcon,
  LockKeyholeIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  UsersIcon
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@constructive-io/ui/alert';
import { AppShell, type AppAccount, type AppNavigationGroup } from '@constructive-io/ui/app-shell';
import type { AppLinkRenderProps } from '@constructive-io/ui/app-bar';
import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@constructive-io/ui/card';
import { Skeleton } from '@constructive-io/ui/skeleton';
import type { SheetsConfig, SheetsExecuteFn } from '@constructive-io/sheets';

import { FEATURE_PACK_MANIFESTS, FEATURE_PACK_IDS, type FeaturePackId } from '../../feature-packs';
import { AuthFeaturePack } from '../feature-packs/auth/auth-feature-pack';
import type { AuthFeaturePackProps } from '../feature-packs/auth/auth-contracts';
import { BillingFeaturePack, type BillingFeaturePackProps } from '../feature-packs/billing/billing-feature-pack';
import { DataFeaturePack, type DataFeaturePackProps } from '../feature-packs/data/data-feature-pack';
import {
  NotificationsFeaturePack,
  type NotificationsFeaturePackProps
} from '../feature-packs/notifications/notifications-feature-pack';
import {
  OrganizationsFeaturePack,
  type OrganizationsFeaturePackProps
} from '../feature-packs/organizations/organizations-feature-pack';
import { StorageFeaturePack, type StorageFeaturePackProps } from '../feature-packs/storage/storage-feature-pack';
import { UsersFeaturePack, type UsersFeaturePackProps } from '../feature-packs/users/users-feature-pack';
import type { ConsoleRuntimeError } from '../console-runtime';
import {
  CONSOLE_ENDPOINT_KINDS,
  createConsoleIdentityKey,
  getConsoleSessionIdentity,
  type ConsolePackCapabilityState
} from '../console-runtime';

import type {
  ConsoleKitAdapterContext,
  ConsoleKitConfig,
  ConsoleKitFeatureAdapter,
  ConsoleKitFeatureAvailability,
  ConsoleKitFeaturePropsMap,
  ConsoleKitProps
} from './console-kit-contracts';
import { normalizeConsoleKitError, useConsoleKitRuntime } from './console-kit-runtime';
import {
  ConsoleKitStoreProvider,
  useConsoleKitStore
} from './store';
import { useLatestCallback } from './use-latest-callback';

const FEATURE_ICONS = {
  data: DatabaseIcon,
  auth: ShieldCheckIcon,
  users: UsersIcon,
  organizations: Building2Icon,
  storage: HardDriveIcon,
  billing: CreditCardIcon,
  notifications: BellIcon
} as const;

const manifests = new Map(FEATURE_PACK_MANIFESTS.map((manifest) => [manifest.id, manifest]));
const adapterReferenceIds = new WeakMap<object, number>();
let nextAdapterReferenceId = 1;

function adapterReferenceId(value: object): number {
  const existing = adapterReferenceIds.get(value);
  if (existing) return existing;
  const id = nextAdapterReferenceId;
  nextAdapterReferenceId += 1;
  adapterReferenceIds.set(value, id);
  return id;
}

function adapterLoadRequestKey(
  feature: FeaturePackId,
  adapter: ConsoleKitFeatureAdapter<unknown>,
  runtime: ConsoleKitAdapterContext,
  attempt: number,
  subscriptionRevision: number
): string {
  const identity = getConsoleSessionIdentity(runtime.session);
  const endpoints = CONSOLE_ENDPOINT_KINDS.map((kind) => {
    const endpoint = runtime.endpoints[kind];
    return [kind, endpoint?.id ?? null, endpoint?.url ?? null];
  });

  return JSON.stringify([
    feature,
    runtime.databaseId,
    endpoints,
    runtime.session.status,
    identity ? createConsoleIdentityKey(identity) : null,
    adapterReferenceId(adapter),
    adapterReferenceId(runtime.transportFor),
    adapterReferenceId(runtime.metadata),
    attempt,
    subscriptionRevision
  ]);
}

export function getConsoleKitFeatureAvailability(
  feature: FeaturePackId,
  runtime: ConsoleKitAdapterContext,
  adapter: ConsoleKitFeatureAdapter<unknown> | undefined,
  standaloneAuth: boolean,
  discoveredCapability?: ConsolePackCapabilityState
): ConsoleKitFeatureAvailability {
  if (runtime.session.status === 'loading') return { status: 'checking' };
  if (runtime.session.status === 'error') {
    const unauthorized = runtime.session.error.code === 'UNAUTHENTICATED' || runtime.session.error.code === 'FORBIDDEN';
    if (
      feature === 'auth' &&
      unauthorized &&
      runtime.endpoints.auth &&
      (adapter || standaloneAuth)
    ) {
      return { status: 'available' };
    }
    return {
      status: unauthorized ? 'unauthorized' : 'error',
      reason: runtime.session.error.message
    };
  }

  const manifest = manifests.get(feature);
  if (!manifest) return { status: 'unavailable', reason: 'The feature is not part of this Console Kit release.' };

  if (discoveredCapability?.status === 'checking') return { status: 'checking' };
  if (discoveredCapability?.status === 'unavailable') {
    return { status: 'unavailable', reason: discoveredCapability.reason };
  }

  const missingEndpoint = manifest.endpoints.required.find((kind) => !runtime.endpoints[kind]);
  if (missingEndpoint) {
    return { status: 'unavailable', reason: `The ${missingEndpoint} endpoint is not configured.` };
  }

  let adapterAvailability: ConsoleKitFeatureAvailability | undefined;
  if (adapter?.getAvailability) {
    try {
      adapterAvailability = adapter.getAvailability(runtime);
    } catch (cause) {
      return {
        status: 'error',
        reason: normalizeConsoleKitError(
          cause,
          `The ${feature} adapter readiness check failed.`
        ).message
      };
    }
  }
  if (adapterAvailability && adapterAvailability.status !== 'available') {
    return adapterAvailability;
  }

  const requiredCapabilities = manifest.capabilities.required;
  if (adapter) {
    const available = new Set(adapter.capabilities ?? []);
    const missingCapability = requiredCapabilities.find(
      (capability) => !available.has(capability)
    );
    if (missingCapability) {
      return {
        status: 'unavailable',
        reason: `The adapter does not provide required capability ${missingCapability}.`
      };
    }
  }

  // Authentication must remain reachable before the data endpoint can be
  // inspected. A standalone session supplies the default sign-in adapter.
  if (feature === 'auth' && runtime.session.status === 'anonymous') {
    if (adapter || standaloneAuth) return { status: 'available' };
    return { status: 'unavailable', reason: 'No authentication adapter was supplied.' };
  }

  if (runtime.session.status === 'anonymous' && feature !== 'data') {
    return { status: 'unauthorized', reason: 'Sign in to use this feature.' };
  }

  if (runtime.metadata.status === 'checking') return { status: 'checking' };
  if (runtime.metadata.status === 'incompatible') {
    return { status: 'incompatible', reason: runtime.metadata.message };
  }
  if (runtime.metadata.status === 'error') {
    return { status: 'error', reason: runtime.metadata.error.message };
  }

  if (feature === 'data' && !adapter) return { status: 'available' };
  if (!adapter) {
    return { status: 'unavailable', reason: `No ${feature} adapter was supplied by the host application.` };
  }
  return { status: 'available' };
}

function FeatureLoadingState() {
  return (
    <Card aria-busy='true' aria-label='Loading feature' variant='flat'>
      <CardHeader>
        <Skeleton className='h-6 w-40' />
        <Skeleton className='h-4 w-72 max-w-full' />
      </CardHeader>
      <CardContent className='flex flex-col gap-3'>
        {Array.from({ length: 5 }, (_, index) => <Skeleton className='h-12 w-full' key={index} />)}
      </CardContent>
    </Card>
  );
}

function AdapterFeature({
  feature,
  adapter,
  runtime,
  dataConfig,
  defaultDataProps,
  onError,
  subscriptionRevision
}: Readonly<{
  feature: FeaturePackId;
  adapter: ConsoleKitFeatureAdapter<unknown>;
  runtime: ConsoleKitAdapterContext;
  dataConfig: SheetsConfig;
  defaultDataProps: Omit<DataFeaturePackProps, 'config'>;
  onError?: ConsoleKitConfig['onError'];
  subscriptionRevision: number;
}>) {
  const storedState = useConsoleKitStore((store) => store.adapterLoads[feature]);
  const attempt = useConsoleKitStore(
    (store) => store.adapterAttempts[feature] ?? 0
  );
  const retryAdapter = useConsoleKitStore((store) => store.retryAdapter);
  const setAdapterLoad = useConsoleKitStore((store) => store.setAdapterLoad);
  const requestKey = adapterLoadRequestKey(
    feature,
    adapter,
    runtime,
    attempt,
    subscriptionRevision
  );
  const state = storedState?.adapter === adapter && storedState.requestKey === requestKey
    ? storedState
    : undefined;
  const reportError = useLatestCallback((error: ConsoleRuntimeError) => {
    onError?.(error, { phase: 'adapter', feature });
  });

  React.useEffect(() => {
    const controller = new AbortController();
    setAdapterLoad(feature, { status: 'loading', adapter, requestKey });
    void Promise.resolve().then(
      () => adapter.load(runtime, controller.signal)
    ).then(
      (props) => {
        if (!controller.signal.aborted) {
          setAdapterLoad(feature, {
            status: 'ready',
            adapter,
            requestKey,
            props
          });
        }
      },
      (cause) => {
        if (controller.signal.aborted) return;
        const error = normalizeConsoleKitError(cause, `The ${feature} adapter could not be loaded.`);
        setAdapterLoad(feature, {
          status: 'error',
          adapter,
          requestKey,
          error
        });
        reportError(error);
      }
    );
    return () => controller.abort();
  }, [adapter, feature, requestKey, runtime, setAdapterLoad]);

  if (!state || state.status === 'loading') return <FeatureLoadingState />;
  if (state.status === 'error') {
    return (
      <Alert variant='destructive'>
        <CircleAlertIcon aria-hidden='true' />
        <AlertTitle>The {feature} feature could not be loaded</AlertTitle>
        <AlertDescription className='flex flex-col items-start gap-3'>
          <span>{state.error.message}</span>
          <Button onClick={() => retryAdapter(feature)} size='sm' variant='outline'>
            <RefreshCwIcon data-icon='inline-start' />
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const adapterOnError = (state.props as Readonly<{
    onError?: (error: ConsoleRuntimeError) => void;
  }>).onError;
  const forwardFeatureError = (error: ConsoleRuntimeError) => {
    adapterOnError?.(error);
    onError?.(
      normalizeConsoleKitError(error, `The ${feature} action failed.`),
      { phase: 'feature', feature }
    );
  };

  if (feature === 'data') {
    return (
      <DataFeaturePack
        {...defaultDataProps}
        {...(state.props as ConsoleKitFeaturePropsMap['data'])}
        config={dataConfig}
      />
    );
  }
  if (feature === 'auth') {
    return <AuthFeaturePack {...(state.props as AuthFeaturePackProps)} onError={forwardFeatureError} />;
  }
  if (feature === 'users') {
    return <UsersFeaturePack {...(state.props as UsersFeaturePackProps)} onError={forwardFeatureError} />;
  }
  if (feature === 'organizations') {
    return (
      <OrganizationsFeaturePack
        {...(state.props as OrganizationsFeaturePackProps)}
        onError={forwardFeatureError}
      />
    );
  }
  if (feature === 'storage') {
    return <StorageFeaturePack {...(state.props as StorageFeaturePackProps)} onError={forwardFeatureError} />;
  }
  if (feature === 'billing') {
    return <BillingFeaturePack {...(state.props as BillingFeaturePackProps)} onError={forwardFeatureError} />;
  }
  return (
    <NotificationsFeaturePack
      {...(state.props as NotificationsFeaturePackProps)}
      onError={forwardFeatureError}
    />
  );
}

function documentSource(document: unknown): string {
  if (typeof document === 'string') return document;
  if (document && typeof document === 'object' && 'kind' in document) return print(document as DocumentNode);
  return String(document);
}

function UnavailableFeature({
  feature,
  availability,
  render
}: Readonly<{
  feature: FeaturePackId;
  availability: ConsoleKitFeatureAvailability;
  render?: ConsoleKitConfig['renderUnavailableFeature'];
}>) {
  if (render) return render(feature, availability);
  const manifest = manifests.get(feature);
  const reason = availability.status === 'checking'
    ? 'Console Kit is checking this database.'
    : availability.status === 'available'
      ? ''
      : availability.reason;

  return (
    <Card className='max-w-2xl' variant='flat'>
      <CardHeader>
        <div className='bg-muted text-muted-foreground mb-2 flex size-10 items-center justify-center rounded-lg'>
          <LockKeyholeIcon aria-hidden='true' />
        </div>
        <CardTitle>
          <h1>{manifest?.title ?? feature} is unavailable</h1>
        </CardTitle>
        <CardDescription>{reason}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className='text-muted-foreground text-sm'>Install the matching database feature pack or update the host adapter, then reload this view.</p>
      </CardContent>
    </Card>
  );
}

function orderedFeatures(order: readonly FeaturePackId[] | undefined): FeaturePackId[] {
  const requested = order ?? FEATURE_PACK_IDS;
  return [...new Set(requested)].filter((feature): feature is FeaturePackId => FEATURE_PACK_IDS.includes(feature));
}

function useAdapterSubscriptions(
  adapters: ConsoleKitConfig['adapters'],
  runtime: ConsoleKitAdapterContext,
  onError?: ConsoleKitConfig['onError']
): number {
  const revision = useConsoleKitStore((store) => store.adapterRevision);
  const notifyAdapterChange = useConsoleKitStore(
    (store) => store.notifyAdapterChange
  );
  const reportError = useLatestCallback((
    error: ConsoleRuntimeError,
    feature: FeaturePackId
  ) => {
    onError?.(error, { phase: 'adapter', feature });
  });

  React.useEffect(() => {
    const unsubscribers: Array<Readonly<{
      feature: FeaturePackId;
      unsubscribe: () => void;
    }>> = [];
    const entries = Object.entries(adapters ?? {}) as Array<[
      FeaturePackId,
      ConsoleKitFeatureAdapter<unknown> | undefined
    ]>;

    for (const [feature, adapter] of entries) {
      if (!adapter?.subscribe) continue;
      try {
        unsubscribers.push({
          feature,
          unsubscribe: adapter.subscribe(runtime, notifyAdapterChange)
        });
      } catch (cause) {
        reportError(
          normalizeConsoleKitError(
            cause,
            `The ${feature} adapter subscription could not be started.`
          ),
          feature
        );
      }
    }

    return () => {
      for (const { feature, unsubscribe } of unsubscribers) {
        try {
          unsubscribe();
        } catch (cause) {
          reportError(
            normalizeConsoleKitError(
              cause,
              `The ${feature} adapter subscription could not be stopped.`
            ),
            feature
          );
        }
      }
    };
  }, [adapters, notifyAdapterChange, runtime]);

  return revision;
}

function ConsoleKitContent({ config, className }: ConsoleKitProps) {
  const runtime = useConsoleKitRuntime({
    databaseId: config.databaseId,
    endpoints: config.endpoints,
    resolveEndpoint: config.resolveEndpoint,
    session: config.session,
    transport: config.transport,
    onMetadataError: React.useCallback(
      (error: ConsoleRuntimeError) => config.onError?.(error, { phase: 'metadata' }),
      [config.onError]
    )
  });
  const featureOrder = React.useMemo(() => orderedFeatures(config.order), [config.order]);
  const adapterRevision = useAdapterSubscriptions(
    config.adapters,
    runtime,
    config.onError
  );
  const discoveredCapabilities = useConsoleKitStore(
    (store) => store.packCapabilities
  );
  const availability = React.useMemo(
    () => Object.fromEntries(featureOrder.map((feature) => [
      feature,
      getConsoleKitFeatureAvailability(
        feature,
        runtime,
        config.adapters?.[feature] as ConsoleKitFeatureAdapter<unknown> | undefined,
        config.session.mode === 'standalone',
        discoveredCapabilities[feature]
      )
    ])) as Record<FeaturePackId, ConsoleKitFeatureAvailability>,
    [adapterRevision, config.adapters, config.session.mode, discoveredCapabilities, featureOrder, runtime]
  );

  const internalFeature = useConsoleKitStore((store) => store.activeFeature);
  const setInternalFeature = useConsoleKitStore(
    (store) => store.setActiveFeature
  );
  const setAuthEntryMode = useConsoleKitStore(
    (store) => store.setAuthEntryMode
  );
  const activeFeature = config.routes?.activeFeature ?? internalFeature;
  React.useEffect(() => {
    if (config.routes?.activeFeature) {
      setInternalFeature(config.routes.activeFeature);
    }
  }, [config.routes?.activeFeature, setInternalFeature]);
  const activeAvailability = availability[activeFeature]
    ?? { status: 'unavailable', reason: 'This feature is not in the configured Console Kit order.' };

  const featureHref = React.useCallback(
    (feature: FeaturePackId) => config.routes?.getFeatureHref?.(feature) ?? `#console-${feature}`,
    [config.routes]
  );
  const hrefToFeature = React.useMemo(
    () => new Map(featureOrder.map((feature) => [featureHref(feature), feature])),
    [featureHref, featureOrder]
  );
  const navigate = React.useCallback((feature: FeaturePackId) => {
    setInternalFeature(feature);
    config.routes?.onNavigate?.(feature);
  }, [config.routes]);

  const renderLink = React.useCallback((props: AppLinkRenderProps) => {
    const feature = hrefToFeature.get(props.href);
    if (!feature) return config.routes?.renderLink ? config.routes.renderLink(props) : <a {...props} />;
    const onClick: React.MouseEventHandler<HTMLAnchorElement> = (event) => {
      props.onClick?.(event);
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        (event.currentTarget.target && event.currentTarget.target !== '_self')
      ) return;
      navigate(feature);
    };
    const next = { ...props, onClick };
    return config.routes?.renderLink ? config.routes.renderLink(next) : <a {...next} />;
  }, [config.routes, hrefToFeature, navigate]);

  React.useEffect(() => {
    if (config.routes?.activeFeature) return;

    const syncFeatureFromHash = () => {
      const feature = hrefToFeature.get(window.location.hash);
      if (runtime.session.status === 'loading') return;
      if (runtime.session.status === 'anonymous') {
        const authFeature = featureOrder.includes('auth') ? 'auth' : featureOrder[0];
        if (!authFeature) return;
        setInternalFeature(authFeature);
        if (feature && feature !== authFeature) {
          window.history.replaceState(null, '', featureHref(authFeature));
        }
        return;
      }
      if (feature) setInternalFeature(feature);
    };

    syncFeatureFromHash();
    window.addEventListener('hashchange', syncFeatureFromHash);
    return () => window.removeEventListener('hashchange', syncFeatureFromHash);
  }, [
    config.routes?.activeFeature,
    featureHref,
    featureOrder,
    hrefToFeature,
    runtime.session.status,
    setInternalFeature
  ]);

  const visibleFeatures = featureOrder.filter((feature) => {
    const status = availability[feature]?.status;
    return config.showUnavailable || status === 'available' || status === 'checking';
  });
  const navigation = React.useMemo<AppNavigationGroup[]>(() => [{
    id: 'features',
    label: 'Application',
    items: visibleFeatures.map((feature) => {
      const state = availability[feature];
      return {
        id: feature,
        label: config.labels?.[feature] ?? manifests.get(feature)?.title ?? feature,
        href: featureHref(feature),
        icon: FEATURE_ICONS[feature],
        isActive: feature === activeFeature,
        badge: state?.status === 'checking'
          ? '…'
          : discoveredCapabilities[feature]?.status === 'partial'
            ? 'Partial'
            : state?.status !== 'available'
              ? 'Setup'
              : undefined
      };
    })
  }], [activeFeature, availability, config.labels, discoveredCapabilities, featureHref, visibleFeatures]);

  const identity = runtime.session.status === 'authenticated' ? runtime.session.identity : undefined;
  const account = React.useMemo<AppAccount | undefined>(() => {
    if (config.account) return config.account;
    if (!identity) return undefined;
    return {
      name: identity.subjectId,
      secondaryLabel: identity.organizationId ?? identity.tenantId,
      actionGroups: config.session.mode === 'standalone'
        ? [{
            id: 'session',
            actions: [{
              id: 'sign-out',
              label: 'Sign out',
              onSelect: () => {
                if (config.session.mode !== 'standalone') return;
                let completed = false;
                void Promise.resolve()
                  .then(async () => {
                    if (config.session.mode !== 'standalone') return;
                    await config.session.signOut();
                    completed = true;
                  })
                  .catch((cause) => {
                    config.onError?.(
                      normalizeConsoleKitError(
                        cause,
                        'You could not be signed out.'
                      ),
                      { phase: 'feature', feature: 'auth' }
                    );
                  })
                  .finally(() => {
                    if (
                      config.session.mode === 'standalone' &&
                      (completed ||
                        config.session.getSnapshot().status !== 'authenticated')
                    ) {
                      setAuthEntryMode('sign-in');
                    }
                  });
              }
            }]
          }]
        : undefined
    };
  }, [config.account, config.onError, config.session, identity, setAuthEntryMode]);

  const dataEndpoint = runtime.endpoints.data;
  const scopedDataTransport = runtime.transportFor('data');
  const execute = React.useMemo<SheetsExecuteFn | undefined>(() => {
    if (!scopedDataTransport) return undefined;
    return async <T,>(document: unknown, variables?: Record<string, unknown>) => {
      const result = await scopedDataTransport.execute<T>({
        document: documentSource(document),
        variables
      });
      if (result.ok) return result.data;
      const first = result.errors[0];
      const error = new Error(first?.message || 'The GraphQL operation failed.') as Error & { code?: string };
      const code = first?.extensions?.code;
      if (typeof code === 'string') error.code = code;
      throw error;
    };
  }, [scopedDataTransport]);
  const sheetsConfig = React.useMemo<SheetsConfig>(() => ({
    endpoint: dataEndpoint?.url ?? '',
    databaseId: config.databaseId,
    auth: {
      mode: 'embedded',
      getToken: () => null,
      getIdentityKey: () => {
        if (runtime.session.status === 'authenticated' || runtime.session.status === 'anonymous') {
          return createConsoleIdentityKey(runtime.session.identity);
        }
        return null;
      }
    },
    execute,
    queryClient: config.queryClient,
    onAuthError: () => config.onError?.(
      { message: 'The data endpoint rejected the current session.', code: 'UNAUTHENTICATED' },
      { phase: 'feature', feature: 'data' }
    ),
    onError: (cause) => config.onError?.(
      normalizeConsoleKitError(cause, 'The data explorer reported an error.'),
      { phase: 'feature', feature: 'data' }
    )
  }), [config.databaseId, config.onError, config.queryClient, dataEndpoint?.url, execute, runtime.session]);
  const defaultDataProps = React.useMemo<Omit<DataFeaturePackProps, 'config'>>(() => ({
    applicationScopes: config.table?.applicationScopes,
    includeTables: config.table?.includeTables,
    excludeTables: config.table?.excludeTables,
    pageSize: config.table?.pageSize,
    onCreateTable: config.table?.onCreateTable,
    onEvent: config.table?.onEvent,
    sheetsProps: config.table?.sheetsProps
  }), [config.table]);

  let content: React.ReactNode;
  if (activeAvailability.status === 'checking') {
    content = <FeatureLoadingState />;
  } else if (activeAvailability.status !== 'available') {
    content = (
      <UnavailableFeature
        availability={activeAvailability}
        feature={activeFeature}
        render={config.renderUnavailableFeature}
      />
    );
  } else {
    const adapter = config.adapters?.[activeFeature] as ConsoleKitFeatureAdapter<unknown> | undefined;
    if (activeFeature === 'data' && !adapter) {
      content = <DataFeaturePack {...defaultDataProps} config={sheetsConfig} />;
    } else if (adapter) {
      content = (
        <AdapterFeature
          adapter={adapter}
          dataConfig={sheetsConfig}
          defaultDataProps={defaultDataProps}
          feature={activeFeature}
          onError={config.onError}
          runtime={runtime}
          subscriptionRevision={adapterRevision}
        />
      );
    } else if (
      activeFeature === 'auth' &&
      config.session.mode === 'standalone' &&
      runtime.session.status !== 'authenticated' &&
      runtime.session.status !== 'loading'
    ) {
      content = (
        <AuthFeaturePack
          actions={{
            signIn: ({ email, password }) => config.session.mode === 'standalone'
              ? config.session.beginSignIn({ credentials: { email, password } })
              : undefined
          }}
          onError={(error) => config.onError?.(error, {
            phase: 'feature',
            feature: 'auth'
          })}
          policy={{ signIn: true }}
          view='entry'
        />
      );
    } else {
      content = <UnavailableFeature availability={{ status: 'unavailable', reason: 'No adapter is configured.' }} feature={activeFeature} />;
    }
  }

  const metadataBadge = runtime.metadata.status === 'compatible'
    ? <Badge variant='outline'>_meta 2026-07</Badge>
    : runtime.metadata.status === 'checking'
      ? <Badge variant='secondary'>Checking _meta</Badge>
      : <Badge variant='destructive'>Metadata issue</Badge>;

  return (
    <AppShell
      account={account}
      barActions={metadataBadge}
      brand={config.brand ?? {
        name: 'Constructive',
        description: config.databaseId,
        logo: <DatabaseIcon aria-hidden='true' />
      }}
      breadcrumbs={[{
        id: activeFeature,
        label: config.labels?.[activeFeature] ?? manifests.get(activeFeature)?.title ?? activeFeature,
        current: true
      }]}
      className={className}
      contentClassName='bg-muted/20'
      navigation={navigation}
      renderLink={renderLink}
    >
      <div className='flex min-h-full min-w-0 flex-col p-4 sm:p-6'>{content}</div>
    </AppShell>
  );
}

function initialFeatureFor(config: ConsoleKitConfig): FeaturePackId {
  const order = orderedFeatures(config.order);
  const preferred = config.routes?.defaultFeature
    ?? ((config.adapters?.auth || config.session.mode === 'standalone')
      ? 'auth'
      : 'data');
  return order.includes(preferred) ? preferred : (order[0] ?? 'data');
}

export function ConsoleKit({ store, ...props }: ConsoleKitProps) {
  return (
    <ConsoleKitStoreProvider
      initialFeature={initialFeatureFor(props.config)}
      store={store}
    >
      <ConsoleKitContent {...props} />
    </ConsoleKitStoreProvider>
  );
}

export type {
  ConsoleKitAdapterContext,
  ConsoleKitAdapters,
  ConsoleKitConfig,
  ConsoleKitEndpointResolver,
  ConsoleKitFeatureAdapter,
  ConsoleKitFeatureAvailability,
  ConsoleKitFeaturePropsMap,
  ConsoleKitMetadataState,
  ConsoleKitProps,
  ConsoleKitRouteConfig,
  ConsoleKitTableConfig
} from './console-kit-contracts';
export {
  createConsoleKitStore,
  useConsoleKitStore,
  useConsoleKitStoreApi,
  type ConsoleKitStore,
  type ConsoleKitStoreApi
} from './store';

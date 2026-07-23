'use client';

import * as React from 'react';
import {
  CircleAlertIcon,
  DatabaseIcon,
  LockKeyholeIcon,
  RefreshCwIcon
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@constructive-io/ui/alert';
import { AppShell, type AppAccount, type AppNavigationGroup } from '@constructive-io/ui/app-shell';
import type { AppLinkRenderProps } from '@constructive-io/ui/app-bar';
import { Badge } from '@constructive-io/ui/badge';
import { Button } from '@constructive-io/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@constructive-io/ui/card';
import { Skeleton } from '@constructive-io/ui/skeleton';

import type { FeaturePackId } from '../../feature-packs';
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
  ConsoleKitProps
} from './console-kit-contracts';
import { ConsoleConnectionMenu } from './console-connection-menu';
import type { ConsoleKitFeatureModule } from './feature-module';
import { normalizeConsoleKitError, useConsoleKitRuntime } from './console-kit-runtime';
import {
  ConsoleKitStoreProvider,
  useConsoleKitStore
} from './store';
import { useLatestCallback } from './use-latest-callback';

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
  const scopeKey = adapterLoadScopeKey(feature, adapter, runtime);

  return JSON.stringify([
    scopeKey,
    adapterReferenceId(runtime.metadata),
    attempt,
    subscriptionRevision
  ]);
}

function adapterLoadScopeKey(
  feature: FeaturePackId,
  adapter: ConsoleKitFeatureAdapter<unknown>,
  runtime: ConsoleKitAdapterContext
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
    adapterReferenceId(runtime.transportFor),
    adapterReferenceId(adapter)
  ]);
}

export function getConsoleKitFeatureAvailability(
  module: ConsoleKitFeatureModule,
  runtime: ConsoleKitAdapterContext,
  adapter: ConsoleKitFeatureAdapter<unknown> | undefined,
  discoveredCapability?: ConsolePackCapabilityState
): ConsoleKitFeatureAvailability {
  const feature = module.id;
  const canRenderWithoutAdapter = module.canRenderWithoutAdapter?.(runtime) ?? false;
  if (runtime.session.status === 'loading') return { status: 'checking' };
  if (runtime.session.status === 'error') {
    const unauthorized = runtime.session.error.code === 'UNAUTHENTICATED' || runtime.session.error.code === 'FORBIDDEN';
    if (
      unauthorized &&
      module.canRenderWithSessionError &&
      canRenderWithoutAdapter
    ) {
      return { status: 'available' };
    }
    return {
      status: unauthorized ? 'unauthorized' : 'error',
      reason: runtime.session.error.message
    };
  }

  const manifest = module.manifest;

  const missingEndpoint = manifest.endpoints.required.find((kind) => !runtime.endpoints[kind]);
  if (missingEndpoint) {
    return { status: 'unavailable', reason: `The ${missingEndpoint} endpoint is not configured.` };
  }

  // A configured protected endpoint is auth-locked until the identity is
  // established. Capability discovery may itself be RLS-protected, so an
  // anonymous probe cannot prove that the feature pack is absent.
  if (
    runtime.session.status === 'anonymous' &&
    !canRenderWithoutAdapter
  ) {
    return { status: 'unauthorized', reason: 'Sign in to use this feature.' };
  }

  if (
    adapter?.requiresCapabilityDiscovery &&
    !discoveredCapability &&
    !canRenderWithoutAdapter
  ) {
    return { status: 'checking' };
  }
  if (
    discoveredCapability?.status === 'checking' &&
    !canRenderWithoutAdapter
  ) {
    return { status: 'checking' };
  }
  if (
    discoveredCapability?.status === 'unavailable' &&
    !module.canRenderWithoutAdapter?.(runtime)
  ) {
    return { status: 'unavailable', reason: discoveredCapability.reason };
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
  if (
    adapterAvailability &&
    adapterAvailability.status !== 'available' &&
    !canRenderWithoutAdapter
  ) {
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

  if (module.requiresMetadata) {
    if (runtime.metadata.status === 'checking') return { status: 'checking' };
    if (runtime.metadata.status === 'incompatible') {
      return { status: 'incompatible', reason: runtime.metadata.message };
    }
    if (runtime.metadata.status === 'error') {
      return { status: 'error', reason: runtime.metadata.error.message };
    }
  }

  if (!adapter && canRenderWithoutAdapter) {
    return { status: 'available' };
  }
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
  module,
  adapter,
  runtime,
  config,
  onError,
  subscriptionRevision
}: Readonly<{
  module: ConsoleKitFeatureModule;
  adapter: ConsoleKitFeatureAdapter<unknown>;
  runtime: ConsoleKitAdapterContext;
  config: ConsoleKitConfig;
  onError?: ConsoleKitConfig['onError'];
  subscriptionRevision: number;
}>) {
  const feature = module.id;
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
  const scopeKey = adapterLoadScopeKey(feature, adapter, runtime);
  const state = storedState?.adapter === adapter && storedState.requestKey === requestKey
    ? storedState
    : undefined;
  const retainedReadyRef = React.useRef<Readonly<{
    scopeKey: string;
    props: unknown;
  }> | null>(null);
  if (retainedReadyRef.current?.scopeKey !== scopeKey) {
    retainedReadyRef.current = null;
  }
  if (state?.status === 'ready') {
    retainedReadyRef.current = { scopeKey, props: state.props };
  } else if (state?.status === 'error') {
    retainedReadyRef.current = null;
  }
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

  const retained = retainedReadyRef.current?.scopeKey === scopeKey
    ? retainedReadyRef.current
    : null;
  if ((!state || state.status === 'loading') && !retained) {
    return <FeatureLoadingState />;
  }
  if (state?.status === 'error') {
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

  const forwardFeatureError = (cause: unknown) => {
    const error = normalizeConsoleKitError(
      cause,
      `The ${feature} action failed.`
    );
    onError?.(
      error,
      { phase: 'feature', feature }
    );
  };
  const Feature = module.Component;
  const adapterProps = state?.status === 'ready'
    ? state.props
    : retained?.props;
  return (
    <Feature
      adapterProps={adapterProps}
      config={config}
      onError={forwardFeatureError}
      runtime={runtime}
    />
  );
}

function UnavailableFeature({
  module,
  availability,
  render
}: Readonly<{
  module: ConsoleKitFeatureModule;
  availability: ConsoleKitFeatureAvailability;
  render?: ConsoleKitConfig['renderUnavailableFeature'];
}>) {
  const feature = module.id;
  if (render) return render(feature, availability);
  const manifest = module.manifest;
  const reason = availability.status === 'checking'
    ? 'Console Kit is checking this database.'
    : availability.status === 'available'
      ? ''
      : availability.reason;
  const requiresSignIn = availability.status === 'unauthorized';

  return (
    <Card className='max-w-2xl' variant='flat'>
      <CardHeader>
        <div className='bg-muted text-muted-foreground mb-2 flex size-10 items-center justify-center rounded-lg'>
          <LockKeyholeIcon aria-hidden='true' />
        </div>
        <CardTitle>
          <h1>
            {requiresSignIn
              ? `Sign in to use ${manifest?.title ?? feature}`
              : `${manifest?.title ?? feature} is unavailable`}
          </h1>
        </CardTitle>
        <CardDescription>{reason}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className='text-muted-foreground text-sm'>
          {requiresSignIn
            ? 'Authenticate with this tenant to load its policy-visible records and actions.'
            : 'Install the matching database feature pack or update the host adapter, then reload this view.'}
        </p>
      </CardContent>
    </Card>
  );
}

function orderedModules(
  modules: readonly ConsoleKitFeatureModule[],
  order: readonly FeaturePackId[] | undefined
): ConsoleKitFeatureModule[] {
  const byId = new Map<FeaturePackId, ConsoleKitFeatureModule>();
  for (const module of modules) {
    if (byId.has(module.id)) {
      throw new Error(`Console Kit received duplicate ${module.id} feature modules.`);
    }
    byId.set(module.id, module);
  }
  const requested = order ?? modules.map((module) => module.id);
  return [...new Set(requested)].flatMap((feature) => {
    const module = byId.get(feature);
    return module ? [module] : [];
  });
}

function useAdapterSubscriptions(
  adapters: ConsoleKitConfig['adapters'],
  features: readonly FeaturePackId[],
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
    const entries = features.map((feature) => [
      feature,
      adapters?.[feature] as ConsoleKitFeatureAdapter<unknown> | undefined
    ] as const);

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
  }, [adapters, features, notifyAdapterChange, runtime]);

  return revision;
}

function ConsoleKitContent({ config, featureModules, className }: ConsoleKitProps) {
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
  const ordered = React.useMemo(
    () => orderedModules(featureModules, config.order),
    [config.order, featureModules]
  );
  const moduleById = React.useMemo(
    () => new Map(ordered.map((module) => [module.id, module])),
    [ordered]
  );
  const featureOrder = React.useMemo(
    () => ordered.map((module) => module.id),
    [ordered]
  );
  const adapterRevision = useAdapterSubscriptions(
    config.adapters,
    featureOrder,
    runtime,
    config.onError
  );
  const discoveredCapabilities = useConsoleKitStore(
    (store) => store.packCapabilities
  );
  const authLoad = useConsoleKitStore((store) => store.adapterLoads.auth);
  const authAttempt = useConsoleKitStore(
    (store) => store.adapterAttempts.auth ?? 0
  );
  const authAdapter = config.adapters?.auth as
    | ConsoleKitFeatureAdapter<unknown>
    | undefined;
  const authModule = moduleById.get('auth');
  const authRequestKey = authAdapter
    ? adapterLoadRequestKey(
        'auth',
        authAdapter,
        runtime,
        authAttempt,
        adapterRevision
      )
    : null;
  const loadedAuthIdentity = React.useMemo(() => {
    if (
      !authAdapter ||
      !authRequestKey ||
      authLoad?.status !== 'ready' ||
      authLoad.adapter !== authAdapter ||
      authLoad.requestKey !== authRequestKey ||
      runtime.session.status !== 'authenticated'
    ) {
      return undefined;
    }
    return authModule?.resolveAccountIdentity?.(authLoad.props, runtime);
  }, [authAdapter, authLoad, authModule, authRequestKey, runtime]);
  const availability = React.useMemo(
    () => Object.fromEntries(ordered.map((module) => [
      module.id,
      getConsoleKitFeatureAvailability(
        module,
        runtime,
        config.adapters?.[module.id] as ConsoleKitFeatureAdapter<unknown> | undefined,
        discoveredCapabilities[module.id]
      )
    ])) as Record<FeaturePackId, ConsoleKitFeatureAvailability>,
    [adapterRevision, config.adapters, discoveredCapabilities, ordered, runtime]
  );

  const internalFeature = useConsoleKitStore((store) => store.activeFeature);
  const setInternalFeature = useConsoleKitStore(
    (store) => store.setActiveFeature
  );
  const setAuthEntryMode = useConsoleKitStore(
    (store) => store.setAuthEntryMode
  );
  const requestedActiveFeature = config.routes?.activeFeature ?? internalFeature;
  const activeFeature = featureOrder.includes(requestedActiveFeature)
    ? requestedActiveFeature
    : (featureOrder[0] ?? requestedActiveFeature);
  const activeModule = moduleById.get(activeFeature);
  React.useEffect(() => {
    if (activeFeature !== internalFeature) setInternalFeature(activeFeature);
  }, [activeFeature, internalFeature, setInternalFeature]);
  const activeAvailability = availability[activeModule?.id ?? activeFeature]
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
  }, [config.routes, setInternalFeature]);

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

  const visibleModules = ordered.filter((module) => {
    const status = availability[module.id]?.status;
    return config.showUnavailable || status === 'available' || status === 'checking';
  });
  const navigation = React.useMemo<AppNavigationGroup[]>(() => [{
    id: 'features',
    label: 'Application',
    items: visibleModules.map((module) => {
      const feature = module.id;
      const state = availability[module.id];
      return {
        id: feature,
        label: config.labels?.[feature] ?? module.manifest.title,
        href: featureHref(feature),
        icon: module.icon,
        isActive: feature === activeFeature,
        disabled: state?.status === 'unauthorized',
        badge: state?.status === 'checking'
          ? '…'
          : state?.status === 'unauthorized'
            ? 'Sign in'
          : discoveredCapabilities[feature]?.status === 'partial'
            ? 'Partial'
            : state?.status !== 'available'
              ? 'Setup'
              : undefined
      };
    })
  }], [activeFeature, availability, config.labels, discoveredCapabilities, featureHref, visibleModules]);

  const identity = runtime.session.status === 'authenticated' ? runtime.session.identity : undefined;
  const account = React.useMemo<AppAccount | undefined>(() => {
    if (config.account) return config.account;
    if (!identity) return undefined;
    const privateEmail = loadedAuthIdentity?.primaryEmail === 'Private email';
    const accountName = loadedAuthIdentity?.displayName ||
      (!privateEmail ? loadedAuthIdentity?.primaryEmail : undefined) ||
      'Signed-in user';
    const shortId = identity.subjectId.length > 12
      ? `${identity.subjectId.slice(0, 8)}…`
      : identity.subjectId;
    return {
      name: accountName,
      secondaryLabel: !privateEmail && loadedAuthIdentity?.primaryEmail
        ? loadedAuthIdentity.primaryEmail
        : `User ${shortId}`,
      avatarUrl: loadedAuthIdentity?.avatarUrl,
      avatarAlt: loadedAuthIdentity?.avatarUrl ? `${accountName} avatar` : undefined,
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
  }, [
    config.account,
    config.onError,
    config.session,
    identity,
    loadedAuthIdentity,
    setAuthEntryMode
  ]);

  let content: React.ReactNode;
  if (!activeModule) {
    content = (
      <Alert variant='destructive'>
        <CircleAlertIcon aria-hidden='true' />
        <AlertTitle>No feature modules are installed</AlertTitle>
        <AlertDescription>
          Install at least one Console Kit feature pack and pass its module to the core.
        </AlertDescription>
      </Alert>
    );
  } else if (activeAvailability.status === 'checking') {
    content = <FeatureLoadingState />;
  } else if (activeAvailability.status !== 'available') {
    content = (
      <UnavailableFeature
        availability={activeAvailability}
        module={activeModule}
        render={config.renderUnavailableFeature}
      />
    );
  } else {
    const adapter = config.adapters?.[activeModule.id] as ConsoleKitFeatureAdapter<unknown> | undefined;
    const discoveredCapability = discoveredCapabilities[activeModule.id];
    const canRenderWhileDiscovering = activeModule.canRenderWithoutAdapter?.(runtime) ?? false;
    const adapterAwaitingDiscovery = adapter?.requiresCapabilityDiscovery && (
      !discoveredCapability || discoveredCapability.status === 'checking'
    ) && !canRenderWhileDiscovering;
    if (adapter) {
      content = adapterAwaitingDiscovery
        ? <FeatureLoadingState />
        : (
            <AdapterFeature
              adapter={adapter}
              config={config}
              module={activeModule}
              onError={config.onError}
              runtime={runtime}
              subscriptionRevision={adapterRevision}
            />
          );
    } else if (activeModule.canRenderWithoutAdapter?.(runtime)) {
      const Feature = activeModule.Component;
      content = (
        <Feature
          config={config}
          onError={(cause) => config.onError?.(
            normalizeConsoleKitError(
              cause,
              `The ${activeModule.id} action failed.`
            ), {
            phase: 'feature',
            feature: activeModule.id
          })}
          runtime={runtime}
        />
      );
    } else {
      content = (
        <UnavailableFeature
          availability={{ status: 'unavailable', reason: 'No adapter is configured.' }}
          module={activeModule}
        />
      );
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
      barActions={(
        <div className='flex items-center gap-2'>
          <ConsoleConnectionMenu
            databaseId={runtime.databaseId}
            databaseLabel={config.brand?.name}
            endpoints={runtime.endpoints}
          />
          {metadataBadge}
        </div>
      )}
      brand={config.brand ?? {
        name: 'Constructive',
        description: config.databaseId,
        logo: <DatabaseIcon aria-hidden='true' />
      }}
      breadcrumbs={[{
        id: activeFeature,
        label: config.labels?.[activeFeature] ?? activeModule?.manifest.title ?? activeFeature,
        current: true
      }]}
      className={className}
      contentClassName='bg-muted/20'
      contentProps={{ id: 'main-content', tabIndex: -1 }}
      navigation={navigation}
      renderLink={renderLink}
    >
      <div className='flex min-h-full min-w-0 flex-col p-4 sm:p-6'>{content}</div>
    </AppShell>
  );
}

function initialFeatureFor(
  config: ConsoleKitConfig,
  featureModules: readonly ConsoleKitFeatureModule[]
): FeaturePackId {
  const order = orderedModules(featureModules, config.order).map(
    (module) => module.id
  );
  const preferred = config.routes?.defaultFeature
    ?? ((config.adapters?.auth || config.session.mode === 'standalone')
      ? 'auth'
      : 'data');
  return order.includes(preferred) ? preferred : (order[0] ?? 'data');
}

export function ConsoleKit({ store, featureModules, ...props }: ConsoleKitProps) {
  const sliceContributions = React.useMemo(
    () => featureModules.flatMap((module) =>
      module.storeSlice ? [module.storeSlice] : []
    ),
    [featureModules]
  );
  return (
    <ConsoleKitStoreProvider
      initialFeature={initialFeatureFor(props.config, featureModules)}
      sliceContributions={sliceContributions}
      store={store}
    >
      <ConsoleKitContent {...props} featureModules={featureModules} />
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
  ConsoleKitRouteConfig
} from './console-kit-contracts';
export type {
  ConsoleKitFeatureComponentProps,
  ConsoleKitFeatureModule
} from './feature-module';
export {
  createConsoleKitStore,
  useConsoleKitStore,
  useConsoleKitStoreApi,
  type ConsoleKitStore,
  type ConsoleKitStoreApi
} from './store';

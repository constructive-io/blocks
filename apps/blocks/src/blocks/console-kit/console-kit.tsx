'use client';

import * as React from 'react';
import {
  CircleAlertIcon,
  DatabaseIcon,
  LockKeyholeIcon,
  RefreshCwIcon
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@constructive-io/ui/alert';
import {
  AppShell,
  type AppAccount,
  type AppNavigationGroup,
  type AppNavigationItem,
  type AppShellBrand
} from '@constructive-io/ui/app-shell';
import type { AppLinkRenderProps } from '@constructive-io/ui/app-bar';
import { Button, buttonVariants } from '@constructive-io/ui/button';
import { Skeleton } from '@constructive-io/ui/skeleton';
import { cn } from '@/lib/utils';

import type { FeaturePackId } from '../../feature-packs';
import type { ConsoleRuntimeError } from '../console-runtime';
import {
  CONSOLE_ENDPOINT_KINDS,
  createConsoleIdentityKey,
  getConsoleSessionIdentity,
  type ConsolePackCapabilityState
} from '../console-runtime';

import {
  FeaturePackDiagnosticPanel
} from '../feature-packs/shared/feature-pack-ui';

import type {
  ConsoleKitAdapterContext,
  ConsoleKitConfig,
  ConsoleKitFeatureAdapter,
  ConsoleKitFeatureAvailability,
  ConsoleKitProps
} from './console-kit-contracts';
import { ConsoleConnectionMenu } from './console-connection-menu';
import type { ConsoleKitFeatureModule } from './feature-module';
import {
  consoleKitRouteKey,
  defaultConsoleKitRoute,
  type ConsoleKitRoute
} from './console-kit-routes';
import { normalizeConsoleKitError, useConsoleKitRuntime } from './console-kit-runtime';
import {
  ConsoleKitStoreProvider,
  authFlowFromEntryMode,
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
  subscriptionRevision: number,
  contextKey?: string | null
): string {
  const scopeKey = adapterLoadScopeKey(feature, adapter, runtime, contextKey);

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
  runtime: ConsoleKitAdapterContext,
  contextKey?: string | null
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
    contextKey ?? null,
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
    <div
      aria-busy='true'
      aria-live='polite'
      className='flex w-full max-w-5xl flex-col gap-5'
      role='status'
    >
      <span className='sr-only'>Loading feature…</span>
      <div className='flex items-start justify-between gap-4'>
        <div className='flex min-w-0 flex-1 flex-col gap-2'>
          <Skeleton className='h-7 w-40 max-w-2/3' />
          <Skeleton className='h-4 w-80 max-w-full' />
        </div>
        <Skeleton className='hidden h-9 w-24 shrink-0 sm:block' />
      </div>
      <div className='overflow-hidden rounded-xl border bg-card'>
        <div className='flex items-center justify-between gap-4 border-b px-4 py-3'>
          <Skeleton className='h-9 w-64 max-w-2/3' />
          <Skeleton className='size-9 shrink-0' />
        </div>
        <div className='divide-y'>
          {Array.from({ length: 5 }, (_, index) => (
            <div className='flex items-center gap-3 px-4 py-3' key={index}>
              <Skeleton className='size-9 shrink-0 rounded-full' />
              <div className='flex min-w-0 flex-1 flex-col gap-1.5'>
                <Skeleton className='h-4 w-40 max-w-2/3' />
                <Skeleton className='h-3 w-56 max-w-4/5' />
              </div>
              <Skeleton className='hidden h-6 w-16 shrink-0 sm:block' />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AdapterFeature({
  module,
  adapter,
  runtime,
  route,
  onRouteChange,
  config,
  onError,
  subscriptionRevision
}: Readonly<{
  module: ConsoleKitFeatureModule;
  adapter: ConsoleKitFeatureAdapter<unknown>;
  runtime: ConsoleKitAdapterContext;
  route: ConsoleKitRoute;
  onRouteChange: (route: ConsoleKitRoute) => void;
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
  const organizationId = useConsoleKitStore(
    (store) => store.context?.organizationId ?? null
  );
  const contextKey = feature === 'organizations' || feature === 'billing'
    ? organizationId
    : null;
  const requestKey = adapterLoadRequestKey(
    feature,
    adapter,
    runtime,
    attempt,
    subscriptionRevision,
    contextKey
  );
  const scopeKey = adapterLoadScopeKey(feature, adapter, runtime, contextKey);
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
  const forwardFeatureError = useLatestCallback((cause: unknown) => {
    const error = normalizeConsoleKitError(
      cause,
      `The ${feature} action failed.`
    );
    onError?.(
      error,
      { phase: 'feature', feature }
    );
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

  const Feature = module.Component;
  const adapterProps = state?.status === 'ready'
    ? state.props
    : retained?.props;
  return (
    <Feature
      adapterProps={adapterProps}
      config={config}
      onRouteChange={onRouteChange}
      onError={forwardFeatureError}
      route={route}
      runtime={runtime}
    />
  );
}

function unavailableGuidance(status: ConsoleKitFeatureAvailability['status']): string {
  switch (status) {
    case 'unauthorized':
      return 'Authenticate with this tenant to load its policy-visible records and actions. An unavailable public route is not a backend defect.';
    case 'incompatible':
      return 'The connected endpoint answered, but its contract does not satisfy this module. Confirm the tenant exposes the expected _meta sections and GraphQL operations.';
    case 'error':
      return 'Retry after checking network access and the endpoint URL. If the route is intentionally private, configure a routable public endpoint for this pack.';
    case 'checking':
      return 'Console Kit is still discovering endpoints and capabilities for this database.';
    case 'unavailable':
    default:
      return 'A missing public endpoint, capability, or host adapter is expected degraded behavior—not proof that the backend module is absent. Configure the routable endpoint, install the matching adapter, then reload.';
  }
}

function UnavailableFeature({
  module,
  availability,
  render,
  databaseId,
  endpoints,
  showDiagnostics
}: Readonly<{
  module: ConsoleKitFeatureModule;
  availability: ConsoleKitFeatureAvailability;
  render?: ConsoleKitConfig['renderUnavailableFeature'];
  databaseId?: string;
  endpoints?: ConsoleKitAdapterContext['endpoints'];
  showDiagnostics?: boolean;
}>) {
  const feature = module.id;
  const retryMetadata = useConsoleKitStore((store) => store.retryMetadata);
  const retryAdapter = useConsoleKitStore((store) => store.retryAdapter);
  const clearPackCapabilities = useConsoleKitStore(
    (store) => store.clearPackCapabilities
  );
  const notifyAdapterChange = useConsoleKitStore(
    (store) => store.notifyAdapterChange
  );

  if (render) {
    return render(feature, availability);
  }
  const manifest = module.manifest;
  const title = manifest?.title ?? feature;
  const reason = availability.status === 'checking'
    ? 'Console Kit is checking this database.'
    : availability.status === 'available'
      ? ''
      : availability.reason;
  const requiresSignIn = availability.status === 'unauthorized';
  const canRetry =
    availability.status === 'error' ||
    availability.status === 'incompatible' ||
    availability.status === 'unavailable';
  // Endpoint URLs stay host config. Only dump technical evidence when diagnostics are on.
  const requiredEndpoints = manifest?.endpoints.required ?? [];
  const diagnostics = showDiagnostics
    ? [
        { label: 'Feature', value: feature },
        { label: 'Status', value: availability.status },
        ...(databaseId ? [{ label: 'Database', value: databaseId }] : []),
        ...requiredEndpoints.map((kind) => ({
          label: `${kind} endpoint`,
          value: endpoints?.[kind]?.url
            ? endpoints[kind]!.url
            : 'Not configured (public route missing or not routable)'
        })),
        ...(reason ? [{ label: 'Reason', value: reason }] : [])
      ]
    : undefined;

  return (
    <FeaturePackDiagnosticPanel
      description={reason || `${title} cannot be opened for this tenant session.`}
      diagnostics={diagnostics}
      guidance={unavailableGuidance(availability.status)}
      icon={
        requiresSignIn
          ? <LockKeyholeIcon aria-hidden='true' />
          : <CircleAlertIcon aria-hidden='true' />
      }
      onRetry={
        canRetry
          ? () => {
              clearPackCapabilities();
              retryMetadata();
              retryAdapter(feature);
              notifyAdapterChange();
            }
          : undefined
      }
      retryLabel='Try again'
      title={
        requiresSignIn
          ? `Sign in to use ${title}`
          : `${title} is unavailable`
      }
      tone={
        availability.status === 'error' || availability.status === 'incompatible'
          ? 'warning'
          : 'muted'
      }
    />
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

function MobileFeatureNavigation({
  items,
  renderLink
}: Readonly<{
  items: readonly AppNavigationItem[];
  renderLink: (props: AppLinkRenderProps) => React.ReactElement;
}>) {
  const scrollerRef = React.useRef<HTMLDivElement | null>(null);
  const activeItemRef = React.useRef<HTMLDivElement | null>(null);
  const [overflow, setOverflow] = React.useState({ start: false, end: false });
  const activeItemId = items.find((item) => item.isActive)?.id;

  const measureOverflow = React.useCallback(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
    const start = scroller.scrollLeft > 2;
    const end = scroller.scrollLeft < maxScrollLeft - 2;
    setOverflow((previous) => {
      if (previous.start === start && previous.end === end) return previous;
      return { start, end };
    });
  }, []);

  React.useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    measureOverflow();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measureOverflow);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, [items, measureOverflow]);

  React.useEffect(() => {
    activeItemRef.current?.scrollIntoView?.({
      block: 'nearest',
      inline: 'center'
    });
    measureOverflow();
  }, [activeItemId, measureOverflow]);

  return (
    <nav
      aria-label='Application features'
      className='bg-background/95 fixed inset-x-0 bottom-0 z-40 border-t pb-[env(safe-area-inset-bottom)] md:hidden'
    >
      <div
        className='scrollbar-hide mx-auto flex max-w-2xl snap-x snap-mandatory gap-1 overflow-x-auto overscroll-x-contain scroll-smooth scroll-px-4 px-4 py-1.5 motion-reduce:scroll-auto'
        onScroll={measureOverflow}
        ref={scrollerRef}
      >
        {items.map((item) => {
          const Icon = item.icon;
          const label = typeof item.label === 'string' ? item.label : item.id;
          const shortLabel =
            label === 'Organizations'
              ? 'Orgs'
              : label === 'Notifications'
                ? 'Alerts'
                : label === 'Authentication'
                  ? 'Auth'
                  : label;
          const itemContent = (
            <>
              {Icon ? <Icon aria-hidden='true' /> : null}
              <span className='max-w-16 truncate'>{shortLabel}</span>
              {item.badge ? (
                <span
                  aria-hidden='true'
                  className='bg-primary absolute top-1.5 right-1.5 size-1.5 rounded-full'
                />
              ) : null}
              {item.isActive ? (
                <span
                  aria-hidden='true'
                  className='bg-primary absolute inset-x-5 bottom-0 h-0.5 rounded-full'
                />
              ) : null}
            </>
          );
          const className = cn(
            buttonVariants({
              size: 'sm',
              variant: item.isActive ? 'secondary' : 'ghost'
            }),
            'relative h-14 min-w-18 flex-1 flex-col gap-1 px-2 text-xs leading-tight'
          );
          return (
            <div
              className='snap-center'
              key={item.id}
              ref={item.isActive ? activeItemRef : undefined}
            >
              {item.disabled || !item.href ? (
                <span
                  aria-disabled='true'
                  aria-label={item.badge ? `${label} (${String(item.badge)})` : label}
                  className={cn(className, 'cursor-not-allowed opacity-60')}
                >
                  {itemContent}
                </span>
              ) : renderLink({
                  'aria-current': item.isActive ? 'page' : undefined,
                  'aria-label': item.badge ? `${label} (${String(item.badge)})` : label,
                  children: itemContent,
                  className,
                  href: item.href
                })}
            </div>
          );
        })}
      </div>
      <div
        aria-hidden='true'
        className={cn(
          'from-background pointer-events-none absolute inset-y-0 left-0 w-6 bg-linear-to-r to-transparent transition-opacity motion-reduce:transition-none',
          overflow.start ? 'opacity-100' : 'opacity-0'
        )}
      />
      <div
        aria-hidden='true'
        className={cn(
          'from-background pointer-events-none absolute inset-y-0 right-0 w-8 bg-linear-to-l to-transparent transition-opacity motion-reduce:transition-none',
          overflow.end ? 'opacity-100' : 'opacity-0'
        )}
      />
    </nav>
  );
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
  const adapters = React.useMemo(() => {
    if (!config.adapterEnhancers) return config.adapters;
    return Object.fromEntries(featureOrder.flatMap((feature) => {
      const base = config.adapters?.[feature] as
        | ConsoleKitFeatureAdapter<unknown>
        | undefined;
      const enhancer = config.adapterEnhancers?.[feature];
      const enhanced = enhancer ? enhancer(base) : base;
      return enhanced ? [[feature, enhanced] as const] : [];
    }));
  }, [config.adapterEnhancers, config.adapters, featureOrder]);
  const adapterRevision = useAdapterSubscriptions(
    adapters,
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
  const authAdapter = adapters?.auth as
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
        adapters?.[module.id] as ConsoleKitFeatureAdapter<unknown> | undefined,
        discoveredCapabilities[module.id]
      )
    ])) as Record<FeaturePackId, ConsoleKitFeatureAvailability>,
    [adapterRevision, adapters, discoveredCapabilities, ordered, runtime]
  );

  const internalRoute = useConsoleKitStore((store) => store.route);
  const setInternalRoute = useConsoleKitStore((store) => store.setRoute);
  const setAuthFlow = useConsoleKitStore((store) => store.setAuthFlow);
  const controlledRoute = config.routes?.route;
  const getRouteHref = config.routes?.getHref;
  const onRouteChange = config.routes?.onRouteChange;
  const renderHostLink = config.routes?.renderLink;
  const requestedRoute = controlledRoute ?? internalRoute;
  const activeRoute = React.useMemo(
    () => featureOrder.includes(requestedRoute.feature)
      ? requestedRoute
      : defaultConsoleKitRoute(featureOrder[0] ?? requestedRoute.feature),
    [featureOrder, requestedRoute]
  );
  const activeRouteKey = consoleKitRouteKey(activeRoute);
  const internalRouteKey = consoleKitRouteKey(internalRoute);
  const activeFeature = activeRoute.feature;
  const activeModule = moduleById.get(activeFeature);
  const forwardActiveFeatureError = useLatestCallback((cause: unknown) => {
    const feature = activeModule?.id ?? activeFeature;
    config.onError?.(
      normalizeConsoleKitError(cause, `The ${feature} action failed.`),
      { phase: 'feature', feature }
    );
  });
  React.useEffect(() => {
    if (
      controlledRoute === undefined &&
      activeRouteKey !== internalRouteKey
    ) {
      setInternalRoute(activeRoute);
    }
  }, [activeRoute, activeRouteKey, controlledRoute, internalRouteKey, setInternalRoute]);
  const activeAvailability = availability[activeModule?.id ?? activeFeature]
    ?? { status: 'unavailable', reason: 'This feature is not in the configured Console Kit order.' };

  const routeHref = React.useCallback(
    (route: ConsoleKitRoute) => getRouteHref?.(route) ??
      `#console-${route.feature}`,
    [getRouteHref]
  );
  const featureRoutes = React.useMemo(
    () => new Map(featureOrder.map((feature) => [
      feature,
      defaultConsoleKitRoute(feature)
    ])),
    [featureOrder]
  );
  const hrefToRoute = React.useMemo(
    () => new Map([...featureRoutes.values()].map((route) => [
      routeHref(route),
      route
    ])),
    [featureRoutes, routeHref]
  );
  const navigate = React.useCallback((route: ConsoleKitRoute) => {
    if (controlledRoute === undefined) setInternalRoute(route);
    onRouteChange?.(route);
  }, [controlledRoute, onRouteChange, setInternalRoute]);

  const renderLink = React.useCallback((props: AppLinkRenderProps) => {
    const route = hrefToRoute.get(props.href);
    if (!route) return renderHostLink ? renderHostLink(props) : <a {...props} />;
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
      if (controlledRoute !== undefined) event.preventDefault();
      navigate(route);
    };
    const next = { ...props, onClick };
    return renderHostLink ? renderHostLink(next) : <a {...next} />;
  }, [controlledRoute, hrefToRoute, navigate, renderHostLink]);

  React.useEffect(() => {
    if (controlledRoute) return;

    const syncRouteFromHash = () => {
      const route = hrefToRoute.get(window.location.hash);
      if (runtime.session.status === 'loading') return;
      if (runtime.session.status === 'anonymous') {
        const authFeature = featureOrder.includes('auth') ? 'auth' : featureOrder[0];
        if (!authFeature) return;
        const authRoute = featureRoutes.get(authFeature);
        if (!authRoute) return;
        setInternalRoute(authRoute);
        if (route && route.feature !== authFeature) {
          window.history.replaceState(null, '', routeHref(authRoute));
        }
        return;
      }
      if (route) setInternalRoute(route);
    };

    syncRouteFromHash();
    window.addEventListener('hashchange', syncRouteFromHash);
    return () => window.removeEventListener('hashchange', syncRouteFromHash);
  }, [
    controlledRoute,
    featureOrder,
    featureRoutes,
    hrefToRoute,
    routeHref,
    runtime.session.status,
    setInternalRoute
  ]);

  const visibleModules = React.useMemo(() => ordered.filter((module) => {
    const status = availability[module.id]?.status;
    return config.showUnavailable || status === 'available' || status === 'checking';
  }), [availability, config.showUnavailable, ordered]);
  const navigationItems = React.useMemo(() => visibleModules.map((module) => {
    const feature = module.id;
    const state = availability[module.id];
    const route = featureRoutes.get(feature) ?? defaultConsoleKitRoute(feature);
    return {
      id: feature,
      label: config.labels?.[feature] ?? module.manifest.title,
      href: routeHref(route),
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
  }), [activeFeature, availability, config.labels, discoveredCapabilities, featureRoutes, routeHref, visibleModules]);

  // Platform Kit uses a quiet section label above icon+text manager links.
  const navigation = React.useMemo<AppNavigationGroup[]>(() => [{
    id: 'features',
    label: 'Manage application',
    items: navigationItems
  }], [navigationItems]);

  const mobileFeatureNav = navigationItems.length > 1 ? (
    <MobileFeatureNavigation
      items={navigationItems}
      renderLink={renderLink}
    />
  ) : null;

  const identity = runtime.session.status === 'authenticated' ? runtime.session.identity : undefined;
  const [signOutPending, setSignOutPending] = React.useState(false);
  const [sessionActionError, setSessionActionError] = React.useState<ConsoleRuntimeError>();
  const signOutPendingRef = React.useRef(false);
  const signOutGenerationRef = React.useRef(0);
  React.useEffect(() => {
    signOutGenerationRef.current += 1;
    signOutPendingRef.current = false;
    setSignOutPending(false);
    setSessionActionError(undefined);
  }, [config.databaseId, config.session]);
  const signOut = useLatestCallback(async () => {
    const session = config.session;
    if (session.mode !== 'standalone' || signOutPendingRef.current) return;
    const generation = signOutGenerationRef.current;
    signOutPendingRef.current = true;
    setSignOutPending(true);
    setSessionActionError(undefined);
    try {
      await session.signOut();
      if (signOutGenerationRef.current !== generation) return;
      setAuthFlow(authFlowFromEntryMode('sign-in'));
    } catch (cause) {
      if (signOutGenerationRef.current !== generation) return;
      const error = normalizeConsoleKitError(cause, 'You could not be signed out.');
      setSessionActionError(error);
      config.onError?.(error, { phase: 'feature', feature: 'auth' });
      if (session.getSnapshot().status !== 'authenticated') {
        setAuthFlow(authFlowFromEntryMode('sign-in'));
      }
    } finally {
      if (signOutGenerationRef.current === generation) {
        signOutPendingRef.current = false;
        setSignOutPending(false);
      }
    }
  });
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
              disabled: signOutPending,
              label: signOutPending ? 'Signing out…' : 'Sign out',
              onSelect: () => void signOut()
            }]
          }]
        : undefined
    };
  }, [
    config.account,
    config.session,
    identity,
    loadedAuthIdentity,
    signOut,
    signOutPending
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
        databaseId={runtime.databaseId}
        endpoints={runtime.endpoints}
        module={activeModule}
        render={config.renderUnavailableFeature}
        showDiagnostics={config.showDiagnostics}
      />
    );
  } else {
    const adapter = adapters?.[activeModule.id] as ConsoleKitFeatureAdapter<unknown> | undefined;
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
              onRouteChange={navigate}
              onError={config.onError}
              route={activeRoute}
              runtime={runtime}
              subscriptionRevision={adapterRevision}
            />
          );
    } else if (activeModule.canRenderWithoutAdapter?.(runtime)) {
      const Feature = activeModule.Component;
      content = (
        <Feature
          config={config}
          onRouteChange={navigate}
          onError={forwardActiveFeatureError}
          route={activeRoute}
          runtime={runtime}
        />
      );
    } else {
      content = (
        <UnavailableFeature
          availability={{ status: 'unavailable', reason: 'No adapter is configured.' }}
          databaseId={runtime.databaseId}
          endpoints={runtime.endpoints}
          module={activeModule}
          showDiagnostics={config.showDiagnostics}
        />
      );
    }
  }

  // Top-level features own the page title. The bar stays free of endpoint/_meta chrome
  // and only shows nested trail when the host supplies multi-segment breadcrumbs later.
  const barActions = config.showDiagnostics ? (
    <ConsoleConnectionMenu
      databaseId={runtime.databaseId}
      databaseLabel={config.brand?.name}
      endpoints={runtime.endpoints}
      metadataStatus={runtime.metadata.status}
    />
  ) : undefined;
  const activeFeatureLabel = config.labels?.[activeFeature]
    ?? activeModule?.manifest.title
    ?? activeFeature;
  const shellBrand: AppShellBrand = {
    name: config.brand?.name ?? 'Application',
    description: config.brand?.description,
    href: config.brand?.href,
    logo: config.brand?.logo ?? <DatabaseIcon aria-hidden='true' />
  };

  return (
    <AppShell
      account={account}
      barActions={barActions}
      barPlacement='content'
      brand={shellBrand}
      breadcrumbs={[{
        id: `feature-${activeFeature}`,
        label: activeFeatureLabel,
        current: true
      }]}
      className={className}
      contentClassName='bg-background'
      contentFooter={mobileFeatureNav}
      contentProps={{ id: 'main-content', tabIndex: -1 }}
      headerHeight='3rem'
      navigation={navigation}
      renderLink={renderLink}
      sidebarProps={{
        collapsible: 'offcanvas',
        className: 'border-r'
      }}
      sidebarWidth='15rem'
    >
      <div className='flex min-h-full min-w-0 flex-col gap-4 p-4 pt-4 sm:p-6 lg:p-8 lg:pt-8'>
        {sessionActionError ? (
          <Alert className='w-full max-w-5xl' role='alert' variant='destructive'>
            <CircleAlertIcon aria-hidden='true' />
            <AlertTitle>Session action failed</AlertTitle>
            <AlertDescription>{sessionActionError.message}</AlertDescription>
          </Alert>
        ) : null}
        {content}
      </div>
    </AppShell>
  );
}

function initialRouteFor(
  config: ConsoleKitConfig,
  featureModules: readonly ConsoleKitFeatureModule[]
): ConsoleKitRoute {
  const order = orderedModules(featureModules, config.order).map(
    (module) => module.id
  );
  const preferred = config.routes?.defaultRoute
    ?? ((config.adapters?.auth || config.session.mode === 'standalone')
      ? defaultConsoleKitRoute('auth')
      : defaultConsoleKitRoute('data'));
  return order.includes(preferred.feature)
    ? preferred
    : defaultConsoleKitRoute(order[0] ?? 'data');
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
      initialRoute={initialRouteFor(props.config, featureModules)}
      sliceContributions={sliceContributions}
      store={store}
    >
      <ConsoleKitContent {...props} featureModules={featureModules} />
    </ConsoleKitStoreProvider>
  );
}

export type {
  ConsoleKitAdapterContext,
  ConsoleKitAdapterEnhancer,
  ConsoleKitAdapterEnhancers,
  ConsoleKitAdapters,
  ConsoleKitAuthMethodConfig,
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
  ConsoleKitAppAccessRoute,
  ConsoleKitAuthRoute,
  ConsoleKitBillingRoute,
  ConsoleKitDataRoute,
  ConsoleKitNotificationsRoute,
  ConsoleKitOrganizationsRoute,
  ConsoleKitRoute,
  ConsoleKitStorageRoute
} from './console-kit-routes';
export {
  consoleKitRouteKey,
  defaultConsoleKitRoute
} from './console-kit-routes';
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

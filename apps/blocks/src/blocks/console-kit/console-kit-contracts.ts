import type { QueryClient } from '@tanstack/react-query';
import type {
  IntrospectionQueryResponse,
  MetaContractIntrospectionQuery,
  MetaQuery
} from '@constructive-io/data';
import type {
  AppAccount,
  AppShellBrand
} from '@constructive-io/ui/app-shell';
import type { AppLinkRenderer } from '@constructive-io/ui/app-bar';

import type {
  ConsoleEndpoint,
  ConsoleEndpointInput,
  ConsoleEndpointKind,
  ConsoleEndpointMap,
  ConsoleRuntimeError,
  ConsoleSession,
  ConsoleSessionSnapshot,
  ConsoleTransport,
  IdentityScopedConsoleTransport,
  FeatureAdapter,
  FeatureAvailability
} from '../console-runtime';
import type { AtomicCapabilityId, FeaturePackId } from '../../feature-packs';
import type { ConsoleKitFeatureModule } from './feature-module';
import type { ConsoleKitRoute } from './console-kit-routes';
import type { ConsoleKitStoreApi } from './store';

export type ConsoleKitMetadataState =
  | Readonly<{ status: 'checking' }>
  | Readonly<{
      status: 'compatible';
      meta: MetaQuery;
      contractIntrospection: MetaContractIntrospectionQuery;
      introspection: IntrospectionQueryResponse;
    }>
  | Readonly<{
      status: 'incompatible';
      message: string;
      missing: readonly string[];
    }>
  | Readonly<{ status: 'error'; error: ConsoleRuntimeError }>;

export type ConsoleKitFeatureAvailability = FeatureAvailability;

export type ConsoleKitAdapterContext = Readonly<{
  databaseId: string;
  endpoints: Readonly<Partial<Record<ConsoleEndpointKind, ConsoleEndpoint>>>;
  /** Session ownership determines whether a pack can expose standalone flows. */
  sessionMode?: ConsoleSession['mode'];
  session: ConsoleSessionSnapshot;
  metadata: ConsoleKitMetadataState;
  metadataByEndpoint?: Readonly<
    Partial<Record<ConsoleEndpointKind, ConsoleKitMetadataState>>
  >;
  transportFor: (kind: ConsoleEndpointKind) => IdentityScopedConsoleTransport | null;
}>;

export type ConsoleKitFeatureAdapter<TProps> = FeatureAdapter<
  TProps,
  ConsoleKitAdapterContext,
  AtomicCapabilityId
> & Readonly<{
  /** First-party adapters wait for live schema/capability discovery before loading. */
  requiresCapabilityDiscovery?: boolean;
}>;

export type ConsoleKitFeaturePropsMap = Readonly<
  Record<FeaturePackId, unknown>
>;

export type ConsoleKitAdapters = Readonly<
  Partial<Record<FeaturePackId, ConsoleKitFeatureAdapter<unknown>>>
>;

export type ConsoleKitAdapterEnhancer = (
  adapter: ConsoleKitFeatureAdapter<unknown> | undefined
) => ConsoleKitFeatureAdapter<unknown> | undefined;

export type ConsoleKitAdapterEnhancers = Readonly<
  Partial<Record<FeaturePackId, ConsoleKitAdapterEnhancer>>
>;

export type ConsoleKitAuthMethod =
  | 'password'
  | 'email-otp'
  | 'sms-otp'
  | 'totp'
  | 'passkey'
  | 'oauth';

export type ConsoleKitPasswordPolicy = Readonly<{
  minLength?: number;
  maxLength?: number;
  hint?: string;
  validate?: (password: string) => string | undefined;
}>;

/**
 * Undefined methods are discovered from complete public operation chains.
 * False always hides a method; true permits it only when a trusted adapter can
 * prove and own the complete start-to-finish flow.
 */
export type ConsoleKitAuthMethodConfig = Readonly<
  Partial<Record<ConsoleKitAuthMethod, boolean>>
>;

export type ConsoleKitEndpointResolver = (input: Readonly<{
  databaseId: string;
  kind: ConsoleEndpointKind;
}>) => ConsoleEndpointInput | undefined;

export type ConsoleKitRouteConfig = Readonly<{
  /** When supplied, the host owns navigation state. */
  route?: ConsoleKitRoute;
  defaultRoute?: ConsoleKitRoute;
  getHref?: (route: ConsoleKitRoute) => string;
  onRouteChange?: (route: ConsoleKitRoute) => void;
  renderLink?: AppLinkRenderer;
}>;

export type ConsoleKitConfig = Readonly<{
  databaseId: string;
  endpoints?: ConsoleEndpointMap;
  resolveEndpoint?: ConsoleKitEndpointResolver;
  session: ConsoleSession;
  transport?: ConsoleTransport;
  adapters?: ConsoleKitAdapters;
  adapterEnhancers?: ConsoleKitAdapterEnhancers;
  authMethods?: ConsoleKitAuthMethodConfig;
  authPasswordPolicy?: ConsoleKitPasswordPolicy;
  queryClient?: QueryClient;
  order?: readonly FeaturePackId[];
  labels?: Partial<Record<FeaturePackId, string>>;
  showUnavailable?: boolean;
  /**
   * When true, expose connection/endpoint/_meta diagnostics in the shell.
   * Default false — those belong in host config and degraded-state details.
   */
  showDiagnostics?: boolean;
  routes?: ConsoleKitRouteConfig;
  /** Pack-owned configuration keyed by an installed feature module id. */
  featureOptions?: Readonly<Partial<Record<FeaturePackId, unknown>>>;
  brand?: AppShellBrand;
  account?: AppAccount;
  onError?: (
    error: ConsoleRuntimeError,
    context: Readonly<{
      phase: 'metadata' | 'adapter' | 'feature';
      feature?: FeaturePackId;
    }>
  ) => void;
  renderUnavailableFeature?: (
    feature: FeaturePackId,
    availability: ConsoleKitFeatureAvailability
  ) => React.ReactNode;
}>;

export type ConsoleKitProps = Readonly<{
  config: ConsoleKitConfig;
  /** The exact feature modules installed into this console instance. */
  featureModules: readonly ConsoleKitFeatureModule[];
  className?: string;
  /** Optional pre-created per-console store for host integration and testing. */
  store?: ConsoleKitStoreApi;
}>;

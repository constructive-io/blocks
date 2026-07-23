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

export type ConsoleKitEndpointResolver = (input: Readonly<{
  databaseId: string;
  kind: ConsoleEndpointKind;
}>) => ConsoleEndpointInput | undefined;

export type ConsoleKitRouteConfig = Readonly<{
  activeFeature?: FeaturePackId;
  defaultFeature?: FeaturePackId;
  getFeatureHref?: (feature: FeaturePackId) => string;
  onNavigate?: (feature: FeaturePackId) => void;
  renderLink?: AppLinkRenderer;
}>;

export type ConsoleKitConfig = Readonly<{
  databaseId: string;
  endpoints?: ConsoleEndpointMap;
  resolveEndpoint?: ConsoleKitEndpointResolver;
  session: ConsoleSession;
  transport?: ConsoleTransport;
  adapters?: ConsoleKitAdapters;
  queryClient?: QueryClient;
  order?: readonly FeaturePackId[];
  labels?: Partial<Record<FeaturePackId, string>>;
  showUnavailable?: boolean;
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

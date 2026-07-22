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
import type { AuthFeaturePackProps } from '../feature-packs/auth/auth-contracts';
import type { BillingFeaturePackProps } from '../feature-packs/billing/billing-feature-pack';
import type { DataFeaturePackProps } from '../feature-packs/data/data-feature-pack';
import type { NotificationsFeaturePackProps } from '../feature-packs/notifications/notifications-feature-pack';
import type { OrganizationsFeaturePackProps } from '../feature-packs/organizations/organizations-feature-pack';
import type { StorageFeaturePackProps } from '../feature-packs/storage/storage-feature-pack';
import type { UsersFeaturePackProps } from '../feature-packs/users/users-feature-pack';
import type { AtomicCapabilityId, FeaturePackId } from '../../feature-packs';
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
  session: ConsoleSessionSnapshot;
  metadata: ConsoleKitMetadataState;
  transportFor: (kind: ConsoleEndpointKind) => IdentityScopedConsoleTransport | null;
}>;

export type ConsoleKitFeatureAdapter<TProps> = FeatureAdapter<
  TProps,
  ConsoleKitAdapterContext,
  AtomicCapabilityId
>;

export type ConsoleKitFeaturePropsMap = Readonly<{
  data: Omit<DataFeaturePackProps, 'config'>;
  auth: AuthFeaturePackProps;
  users: UsersFeaturePackProps;
  organizations: OrganizationsFeaturePackProps;
  storage: StorageFeaturePackProps;
  billing: BillingFeaturePackProps;
  notifications: NotificationsFeaturePackProps;
}>;

export type ConsoleKitAdapters = Partial<{
  [Id in FeaturePackId]: ConsoleKitFeatureAdapter<ConsoleKitFeaturePropsMap[Id]>;
}>;

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

export type ConsoleKitTableConfig = Readonly<{
  /** Exact `_meta.scope.scope` values included in the Data explorer. Defaults to `app`. */
  applicationScopes?: readonly string[];
  excludeTables?: readonly string[];
  pageSize?: number;
  onCreateTable?: () => void;
  onEvent?: DataFeaturePackProps['onEvent'];
  sheetsProps?: DataFeaturePackProps['sheetsProps'];
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
  table?: ConsoleKitTableConfig;
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
  className?: string;
  /** Optional pre-created per-console store for host integration and testing. */
  store?: ConsoleKitStoreApi;
}>;

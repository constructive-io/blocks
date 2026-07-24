import type * as React from 'react';
import type { LucideIcon } from 'lucide-react';

import type { FeaturePackManifestV1, FeaturePackId } from '../../feature-packs';
import type { DatabaseScopedStandaloneConsoleSession } from '../console-runtime';
import type {
  ConsoleKitAdapterContext,
  ConsoleKitAuthMethodConfig,
  ConsoleKitConfig,
  ConsoleKitFeatureAdapter,
  ConsoleKitPasswordPolicy
} from './console-kit-contracts';
import type {
  ConstructiveCallbackCredentialVault,
  ConstructiveConsoleCallback
} from './constructive/constructive-callback';
import type { ConsoleKitRoute } from './console-kit-routes';
import type {
  ConstructiveCapabilityContribution,
  ConstructiveCapabilityDiscovery
} from './constructive/constructive-capabilities';
import type { ConsoleKitStoreApi, ConsoleKitStoreSliceContribution } from './store';

export type ConsoleKitModuleAccountIdentity = Readonly<{
  id: string;
  displayName?: string;
  primaryEmail?: string;
  avatarUrl?: string;
}>;

export type ConsoleKitFeatureComponentProps = Readonly<{
  adapterProps?: unknown;
  config: ConsoleKitConfig;
  runtime: ConsoleKitAdapterContext;
  route: ConsoleKitRoute;
  onRouteChange: (route: ConsoleKitRoute) => void;
  onError: (error: unknown) => void;
}>;

export type ConstructiveFeatureAdapterFactoryContext = Readonly<{
  store: ConsoleKitStoreApi;
  discovery: ConstructiveCapabilityDiscovery;
  session?: DatabaseScopedStandaloneConsoleSession;
  callback?: ConstructiveConsoleCallback;
  callbackCredentials: ConstructiveCallbackCredentialVault;
  authMethods?: ConsoleKitAuthMethodConfig;
  passwordPolicy?: ConsoleKitPasswordPolicy;
}>;

/** One installable feature contribution consumed by the leaf-independent core. */
export type ConsoleKitFeatureModule = Readonly<{
  id: FeaturePackId;
  manifest: FeaturePackManifestV1;
  icon: LucideIcon;
  Component: React.ComponentType<ConsoleKitFeatureComponentProps>;
  createAdapter?: (
    context: ConstructiveFeatureAdapterFactoryContext
  ) => ConsoleKitFeatureAdapter<unknown> | undefined;
  capabilityDiscovery?: ConstructiveCapabilityContribution;
  canRenderWithoutAdapter?: (
    runtime: ConsoleKitAdapterContext
  ) => boolean;
  canRenderWithSessionError?: boolean;
  requiresMetadata?: boolean;
  resolveAccountIdentity?: (
    adapterProps: unknown,
    runtime: ConsoleKitAdapterContext
  ) => ConsoleKitModuleAccountIdentity | undefined;
  storeSlice?: ConsoleKitStoreSliceContribution;
}>;

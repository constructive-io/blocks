import type { AtomicCapabilityId } from '../../../feature-packs';
import type { UsersFeaturePackProps } from '../../feature-packs/users/users-feature-pack';
import { loadScopeAccess } from '../../scope-access/scope-access-load';
import { scopeAccessView } from '../../scope-access/scope-access-view';
import { scopeNames } from '../../scope-access/scope-names';
import type { ConsoleKitFeatureAdapter } from '../console-kit-contracts';
import type { ConsoleKitStoreApi } from '../store';
import type { ConstructiveCapabilityDiscovery } from './constructive-capabilities';
import { notifyConsoleAdapters, packAvailability } from './constructive-adapter-utils';

export type ConstructiveUsersAdapterOptions = Readonly<{
  store: ConsoleKitStoreApi;
  discovery: ConstructiveCapabilityDiscovery;
}>;

const APP = { names: scopeNames('app') };

/**
 * App access in Console Kit: the scope-access core on the `app` scope, with
 * Console Kit's discovery for the schemas and its store for reloads.
 */
export function createConstructiveUsersAdapter(
  options: ConstructiveUsersAdapterOptions
): ConsoleKitFeatureAdapter<UsersFeaturePackProps> {
  const capabilities: readonly AtomicCapabilityId[] = [
    'users.directory',
    'users.memberships',
    'users.capabilities',
    'users.profiles',
    'users.invites'
  ];

  return {
    capabilities,
    requiresCapabilityDiscovery: true,
    getAvailability: () => packAvailability(options.store, 'users'),
    subscribe(runtime, listener) {
      const unsubscribe = options.discovery.subscribe(listener);
      void options.discovery.ensure(runtime);
      return unsubscribe;
    },
    async load(runtime, signal) {
      const schemas = options.discovery.getSchemas();
      const directory = await loadScopeAccess(runtime, schemas, APP, signal);
      return scopeAccessView(runtime, schemas, APP, directory, () => notifyConsoleAdapters(options.store));
    }
  };
}

import type { FeaturePackId } from '../../../feature-packs';
import type { ConsoleKitFeatureAvailability } from '../console-kit-contracts';
import type { ConsoleKitStoreApi } from '../store';

export {
  asBoolean,
  asRecord,
  asString,
  assertAuthorizedTarget,
  capabilityMaskIsSubset,
  connectionNodes,
  expiresIn,
  graphQLError,
  hasEffectiveCapability,
  imageUrl
} from './constructive-values';

export function packAvailability(
  store: ConsoleKitStoreApi,
  feature: FeaturePackId,
  usableWhenPartial = false
): ConsoleKitFeatureAvailability {
  const state = store.getState().packCapabilities[feature];
  if (!state || state.status === 'checking') return { status: 'checking' };
  if (state.status === 'ready') return { status: 'available' };
  if (state.status === 'partial' && usableWhenPartial) return { status: 'available' };
  if (state.status === 'partial') {
    return {
      status: 'unavailable',
      reason: `This database is missing ${state.missingCapabilities.join(', ')}.`
    };
  }
  return { status: 'unavailable', reason: state.reason };
}

export function notifyConsoleAdapters(store: ConsoleKitStoreApi) {
  store.getState().notifyAdapterChange();
}

import type { StateCreator } from 'zustand/vanilla';

import type { FeaturePackId } from '../../../feature-packs';
import type {
  ConsoleEndpoint,
  ConsoleEndpointKind,
  ConsolePackCapabilityState
} from '../../console-runtime';

type ConsoleEndpointState = Readonly<
  Partial<Record<ConsoleEndpointKind, ConsoleEndpoint>>
>;

function sameEndpoints(
  current: ConsoleEndpointState,
  next: ConsoleEndpointState
): boolean {
  const currentEntries = Object.entries(current);
  const nextEntries = Object.entries(next);
  if (currentEntries.length !== nextEntries.length) return false;
  return nextEntries.every(([kind, endpoint]) => {
    const existing = current[kind as ConsoleEndpointKind];
    return existing?.id === endpoint?.id &&
      existing?.kind === endpoint?.kind &&
      existing?.url === endpoint?.url;
  });
}

export type ConsoleKitEndpointCapabilitySlice = {
  endpoints: ConsoleEndpointState;
  packCapabilities: Readonly<
    Partial<Record<FeaturePackId, ConsolePackCapabilityState>>
  >;
  setEndpoints: (endpoints: ConsoleEndpointState) => void;
  setPackCapability: (
    pack: FeaturePackId,
    capability: ConsolePackCapabilityState
  ) => void;
  clearPackCapabilities: () => void;
};

export const createConsoleKitEndpointCapabilitySlice: StateCreator<
  ConsoleKitEndpointCapabilitySlice,
  [],
  [],
  ConsoleKitEndpointCapabilitySlice
> = (set) => ({
  endpoints: {},
  packCapabilities: {},
  setEndpoints: (endpoints) => set((state) =>
    sameEndpoints(state.endpoints, endpoints)
      ? state
      : { endpoints: { ...endpoints } }
  ),
  setPackCapability: (pack, capability) => set((state) => ({
    packCapabilities: {
      ...state.packCapabilities,
      [pack]: capability
    }
  })),
  clearPackCapabilities: () => set({ packCapabilities: {} })
});

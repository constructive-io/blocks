import type { StateCreator } from 'zustand/vanilla';

import type { FeaturePackId } from '../../../feature-packs';
import type {
  ConsoleEndpoint,
  ConsoleEndpointKind,
  ConsolePackCapabilityState
} from '../../console-runtime';

export type ConsoleKitEndpointCapabilitySlice = {
  endpoints: Readonly<Partial<Record<ConsoleEndpointKind, ConsoleEndpoint>>>;
  packCapabilities: Readonly<
    Partial<Record<FeaturePackId, ConsolePackCapabilityState>>
  >;
  setEndpoints: (
    endpoints: Readonly<Partial<Record<ConsoleEndpointKind, ConsoleEndpoint>>>
  ) => void;
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
  setEndpoints: (endpoints) => set({ endpoints: { ...endpoints } }),
  setPackCapability: (pack, capability) => set((state) => ({
    packCapabilities: {
      ...state.packCapabilities,
      [pack]: capability
    }
  })),
  clearPackCapabilities: () => set({ packCapabilities: {} })
});

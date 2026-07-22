import type { StateCreator } from 'zustand/vanilla';

import type { FeaturePackId } from '../../../feature-packs';

export type ConsoleKitNavigationSlice = {
  activeFeature: FeaturePackId;
  setActiveFeature: (feature: FeaturePackId) => void;
};

export function createConsoleKitNavigationSlice(
  initialFeature: FeaturePackId
): StateCreator<
  ConsoleKitNavigationSlice,
  [],
  [],
  ConsoleKitNavigationSlice
> {
  return (set) => ({
    activeFeature: initialFeature,
    setActiveFeature: (activeFeature) => set({ activeFeature })
  });
}

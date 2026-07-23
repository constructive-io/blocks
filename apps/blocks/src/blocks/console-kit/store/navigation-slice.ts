import type { StateCreator } from 'zustand/vanilla';

import type { FeaturePackId } from '../../../feature-packs';

export type ConsoleKitAuthEntryMode =
  | 'sign-in'
  | 'sign-up'
  | 'recover-password'
  | 'reset-password';

export type ConsoleKitNavigationSlice = {
  activeFeature: FeaturePackId;
  authEntryMode: ConsoleKitAuthEntryMode;
  setActiveFeature: (feature: FeaturePackId) => void;
  setAuthEntryMode: (mode: ConsoleKitAuthEntryMode) => void;
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
    authEntryMode: 'sign-in',
    setActiveFeature: (activeFeature) => set({ activeFeature }),
    setAuthEntryMode: (authEntryMode) => set({ authEntryMode })
  });
}

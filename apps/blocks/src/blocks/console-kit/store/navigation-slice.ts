import type { StateCreator } from 'zustand/vanilla';

import type { FeaturePackId } from '../../../feature-packs';
import type { AuthEntryMode } from '../../feature-packs/auth/auth-contracts';

export type ConsoleKitNavigationSlice = {
  activeFeature: FeaturePackId;
  authEntryMode: AuthEntryMode;
  setActiveFeature: (feature: FeaturePackId) => void;
  setAuthEntryMode: (mode: AuthEntryMode) => void;
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

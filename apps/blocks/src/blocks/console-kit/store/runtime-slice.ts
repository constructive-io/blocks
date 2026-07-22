import type { StateCreator } from 'zustand/vanilla';

import type { ConsoleKitMetadataState } from '../console-kit-contracts';

export type ConsoleKitRuntimeSlice = {
  metadata: ConsoleKitMetadataState;
  metadataKey: string | null;
  setMetadata: (key: string, metadata: ConsoleKitMetadataState) => void;
};

export const createConsoleKitRuntimeSlice: StateCreator<
  ConsoleKitRuntimeSlice,
  [],
  [],
  ConsoleKitRuntimeSlice
> = (set) => ({
  metadata: { status: 'checking' },
  metadataKey: null,
  setMetadata: (metadataKey, metadata) => set({ metadataKey, metadata })
});

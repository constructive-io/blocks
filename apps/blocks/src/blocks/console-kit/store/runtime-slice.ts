import type { StateCreator } from 'zustand/vanilla';

import type { ConsoleSessionSnapshot } from '../../console-runtime';
import type { ConsoleKitMetadataState } from '../console-kit-contracts';

export type ConsoleKitRuntimeSlice = {
  metadata: ConsoleKitMetadataState;
  metadataKey: string | null;
  session: ConsoleSessionSnapshot;
  setMetadata: (key: string, metadata: ConsoleKitMetadataState) => void;
  setSession: (session: ConsoleSessionSnapshot) => void;
};

export const createConsoleKitRuntimeSlice: StateCreator<
  ConsoleKitRuntimeSlice,
  [],
  [],
  ConsoleKitRuntimeSlice
> = (set) => ({
  metadata: { status: 'checking' },
  metadataKey: null,
  session: { status: 'loading' },
  setMetadata: (metadataKey, metadata) => set({ metadataKey, metadata }),
  setSession: (session) => set({ session })
});

import type { StateCreator } from 'zustand/vanilla';

import type { ConsoleEndpointKind } from '../../console-runtime';
import type { ConsoleKitMetadataState } from '../console-kit-contracts';

export type ConsoleKitRuntimeSlice = {
  metadata: ConsoleKitMetadataState;
  metadataByEndpoint: Readonly<
    Partial<Record<ConsoleEndpointKind, ConsoleKitMetadataState>>
  >;
  metadataKey: string | null;
  /** Bumped to re-run endpoint metadata discovery for the current scope. */
  metadataRevision: number;
  setMetadata: (key: string, metadata: ConsoleKitMetadataState) => void;
  setMetadataByEndpoint: (
    key: string,
    metadata: Readonly<
      Partial<Record<ConsoleEndpointKind, ConsoleKitMetadataState>>
    >
  ) => void;
  retryMetadata: () => void;
};

export const createConsoleKitRuntimeSlice: StateCreator<
  ConsoleKitRuntimeSlice,
  [],
  [],
  ConsoleKitRuntimeSlice
> = (set) => ({
  metadata: { status: 'checking' },
  metadataByEndpoint: {},
  metadataKey: null,
  metadataRevision: 0,
  setMetadata: (metadataKey, metadata) => set({
    metadataKey,
    metadata,
    metadataByEndpoint: { data: metadata }
  }),
  setMetadataByEndpoint: (metadataKey, metadataByEndpoint) => set({
    metadataKey,
    metadataByEndpoint: { ...metadataByEndpoint },
    metadata: metadataByEndpoint.data ?? {
      status: 'incompatible',
      message: 'A data endpoint is required to inspect application tables.',
      missing: ['data endpoint']
    }
  }),
  retryMetadata: () => set((state) => ({
    metadataRevision: state.metadataRevision + 1,
    metadataKey: null,
    metadataByEndpoint: {},
    metadata: { status: 'checking' }
  }))
});

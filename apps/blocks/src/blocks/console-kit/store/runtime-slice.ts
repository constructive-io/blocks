import type { StateCreator } from 'zustand/vanilla';

import type { ConsoleEndpointKind } from '../../console-runtime';
import type { ConsoleKitMetadataState } from '../console-kit-contracts';

export type ConsoleKitRuntimeSlice = {
  metadata: ConsoleKitMetadataState;
  metadataByEndpoint: Readonly<
    Partial<Record<ConsoleEndpointKind, ConsoleKitMetadataState>>
  >;
  metadataKey: string | null;
  setMetadata: (key: string, metadata: ConsoleKitMetadataState) => void;
  setMetadataByEndpoint: (
    key: string,
    metadata: Readonly<
      Partial<Record<ConsoleEndpointKind, ConsoleKitMetadataState>>
    >
  ) => void;
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
  })
});

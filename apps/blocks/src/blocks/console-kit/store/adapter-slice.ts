import type { StateCreator } from 'zustand/vanilla';

import type { FeaturePackId } from '../../../feature-packs';
import type { ConsoleRuntimeError } from '../../console-runtime';

export type ConsoleKitAdapterLoadState =
  | Readonly<{ status: 'loading'; adapter: object; requestKey: string }>
  | Readonly<{
      status: 'ready';
      adapter: object;
      requestKey: string;
      props: unknown;
    }>
  | Readonly<{
      status: 'error';
      adapter: object;
      requestKey: string;
      error: ConsoleRuntimeError;
    }>;

export type ConsoleKitAdapterSlice = {
  adapterRevision: number;
  adapterAttempts: Partial<Record<FeaturePackId, number>>;
  adapterLoads: Partial<Record<FeaturePackId, ConsoleKitAdapterLoadState>>;
  notifyAdapterChange: () => void;
  retryAdapter: (feature: FeaturePackId) => void;
  setAdapterLoad: (
    feature: FeaturePackId,
    state: ConsoleKitAdapterLoadState
  ) => void;
};

export const createConsoleKitAdapterSlice: StateCreator<
  ConsoleKitAdapterSlice,
  [],
  [],
  ConsoleKitAdapterSlice
> = (set) => ({
  adapterRevision: 0,
  adapterAttempts: {},
  adapterLoads: {},
  notifyAdapterChange: () => set((state) => ({
    adapterRevision: state.adapterRevision + 1
  })),
  retryAdapter: (feature) => set((state) => ({
    adapterAttempts: {
      ...state.adapterAttempts,
      [feature]: (state.adapterAttempts[feature] ?? 0) + 1
    }
  })),
  setAdapterLoad: (feature, loadState) => set((state) => ({
    adapterLoads: {
      ...state.adapterLoads,
      [feature]: loadState
    }
  }))
});

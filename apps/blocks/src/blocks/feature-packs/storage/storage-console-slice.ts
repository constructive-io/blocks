import type { ConsoleKitStoreApi, ConsoleKitStoreSliceContribution } from '../../console-kit/store';

export type ConsoleKitStorageSelection = Readonly<{
  scope: string;
  bucketKey: string;
}>;

export type ConsoleKitStorageSlice = Readonly<{
  storageSelection: ConsoleKitStorageSelection | null;
  selectStorageBucket: (scope: string, bucketKey: string) => void;
}>;

export function getConsoleKitStorageSlice(
  store: ConsoleKitStoreApi
): ConsoleKitStorageSlice {
  const state = store.getState() as unknown as ConsoleKitStorageSlice;
  if (typeof state.selectStorageBucket !== 'function') {
    throw new Error('The Storage feature module store slice is not installed.');
  }
  return state;
}

export const storageConsoleStoreSlice = {
  id: 'storage',
  create: (set) => ({
    storageSelection: null,
    selectStorageBucket: (scope: string, bucketKey: string) => set({
      storageSelection: { scope, bucketKey }
    })
  })
} satisfies ConsoleKitStoreSliceContribution;

import type { StateCreator } from 'zustand/vanilla';

import type { ConsoleSessionSnapshot } from '../../console-runtime';

export type ConsoleKitSessionSlice = {
  session: ConsoleSessionSnapshot;
  setSession: (session: ConsoleSessionSnapshot) => void;
};

export const createConsoleKitSessionSlice: StateCreator<
  ConsoleKitSessionSlice,
  [],
  [],
  ConsoleKitSessionSlice
> = (set) => ({
  session: { status: 'loading' },
  setSession: (session) => set({ session })
});

import type { StateCreator } from 'zustand/vanilla';

import {
  createConsoleIdentityKey,
  getConsoleSessionIdentity,
  type ConsoleSessionSnapshot
} from '../../console-runtime';
import type { ConsoleKitContextSlice } from './context-slice';

export type ConsoleKitSessionSlice = {
  session: ConsoleSessionSnapshot;
  setSession: (session: ConsoleSessionSnapshot) => void;
};

type ConsoleKitSessionState = ConsoleKitSessionSlice & ConsoleKitContextSlice;

function identityScope(session: ConsoleSessionSnapshot): string | null {
  const identity = getConsoleSessionIdentity(session);
  return identity ? createConsoleIdentityKey(identity) : null;
}

export const createConsoleKitSessionSlice: StateCreator<
  ConsoleKitSessionState,
  [],
  [],
  ConsoleKitSessionSlice
> = (set) => ({
  session: { status: 'loading' },
  setSession: (session) => set((state) => {
    if (identityScope(state.session) === identityScope(session)) {
      return { session };
    }
    return {
      session,
      context: state.context
        ? { ...state.context, organizationId: null }
        : null
    };
  })
});

import { createContext, useContext } from 'react';
import { createStore, useStore as useZustandStore, type StoreApi } from 'zustand';

import { createDraftRowsSlice, type DraftRowsSlice } from './draft-rows-slice';
import { createRelationInfoSlice, type RelationInfoSlice } from './relation-info-slice';

export interface SheetsAuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  expiresAt: string | null;
  identityKey: string | null;
  setAuthenticated: (token: string, expiresAt: string, identityKey?: string | null) => void;
  setUnauthenticated: () => void;
}

export type SheetsStoreState = DraftRowsSlice & RelationInfoSlice & SheetsAuthState;

export function createSheetsStore(): StoreApi<SheetsStoreState> {
  return createStore<SheetsStoreState>((set, get) => ({
    // Draft rows
    ...createDraftRowsSlice(set),

    // Relation info cache
    ...createRelationInfoSlice(set, get),

    // Auth state (standalone mode)
    isAuthenticated: false,
    accessToken: null,
    expiresAt: null,
    identityKey: null,
    setAuthenticated: (token: string, expiresAt: string, identityKey = null) =>
      set({ isAuthenticated: true, accessToken: token, expiresAt, identityKey }),
    setUnauthenticated: () => set({ isAuthenticated: false, accessToken: null, expiresAt: null, identityKey: null }),
  }));
}

export const SheetsStoreContext = createContext<StoreApi<SheetsStoreState> | null>(null);

export function useSheetsStore<T>(selector: (state: SheetsStoreState) => T): T {
  const store = useContext(SheetsStoreContext);
  if (!store) {
    throw new Error('useSheetsStore must be used within a <SheetsProvider>');
  }
  return useZustandStore(store, selector);
}

export function useSheetsStoreApi(): StoreApi<SheetsStoreState> {
  const store = useContext(SheetsStoreContext);
  if (!store) {
    throw new Error('useSheetsStoreApi must be used within a <SheetsProvider>');
  }
  return store;
}

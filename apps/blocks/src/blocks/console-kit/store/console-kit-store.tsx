'use client';

import * as React from 'react';
import { useStore as useZustandStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';

import type { FeaturePackId } from '../../../feature-packs';
import {
  createConsoleKitAdapterSlice,
  type ConsoleKitAdapterSlice
} from './adapter-slice';
import {
  createConsoleKitContextSlice,
  type ConsoleKitContext,
  type ConsoleKitContextSlice
} from './context-slice';
import {
  createConsoleKitEndpointCapabilitySlice,
  type ConsoleKitEndpointCapabilitySlice
} from './endpoint-capability-slice';
import {
  createConsoleKitNavigationSlice,
  type ConsoleKitNavigationSlice
} from './navigation-slice';
import {
  createConsoleKitRuntimeSlice,
  type ConsoleKitRuntimeSlice
} from './runtime-slice';
import {
  createConsoleKitSessionSlice,
  type ConsoleKitSessionSlice
} from './session-slice';

export type ConsoleKitStore = ConsoleKitNavigationSlice &
  ConsoleKitContextSlice &
  ConsoleKitSessionSlice &
  ConsoleKitEndpointCapabilitySlice &
  ConsoleKitRuntimeSlice &
  ConsoleKitAdapterSlice;

export type ConsoleKitStoreApi = StoreApi<ConsoleKitStore>;

export function createConsoleKitStore(
  initialFeature: FeaturePackId,
  initialContext: ConsoleKitContext | null = null
): ConsoleKitStoreApi {
  return createStore<ConsoleKitStore>()((...args) => ({
    ...createConsoleKitNavigationSlice(initialFeature)(...args),
    ...createConsoleKitContextSlice(initialContext)(...args),
    ...createConsoleKitSessionSlice(...args),
    ...createConsoleKitEndpointCapabilitySlice(...args),
    ...createConsoleKitRuntimeSlice(...args),
    ...createConsoleKitAdapterSlice(...args)
  }));
}

const ConsoleKitStoreContext = React.createContext<ConsoleKitStoreApi | null>(
  null
);

export function ConsoleKitStoreProvider({
  children,
  initialFeature,
  initialContext = null,
  store
}: Readonly<{
  children: React.ReactNode;
  initialFeature: FeaturePackId;
  initialContext?: ConsoleKitContext | null;
  store?: ConsoleKitStoreApi;
}>) {
  const internalStoreRef = React.useRef<ConsoleKitStoreApi | null>(null);
  if (!store && !internalStoreRef.current) {
    internalStoreRef.current = createConsoleKitStore(initialFeature, initialContext);
  }
  const selectedStore = store ?? internalStoreRef.current;
  if (!selectedStore) throw new Error('Console Kit could not create its state store.');

  return (
    <ConsoleKitStoreContext.Provider value={selectedStore}>
      {children}
    </ConsoleKitStoreContext.Provider>
  );
}

export function useConsoleKitStore<T>(
  selector: (state: ConsoleKitStore) => T
): T {
  const store = React.useContext(ConsoleKitStoreContext);
  if (!store) {
    throw new Error(
      'useConsoleKitStore must be used within ConsoleKitStoreProvider.'
    );
  }
  return useZustandStore(store, selector);
}

export function useConsoleKitStoreApi(): ConsoleKitStoreApi {
  const store = React.useContext(ConsoleKitStoreContext);
  if (!store) {
    throw new Error(
      'useConsoleKitStoreApi must be used within ConsoleKitStoreProvider.'
    );
  }
  return store;
}

export type { ConsoleKitAdapterLoadState } from './adapter-slice';

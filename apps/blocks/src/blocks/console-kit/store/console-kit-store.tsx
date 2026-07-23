'use client';

import * as React from 'react';
import { useStore as useZustandStore } from 'zustand';
import { createStore, type StoreApi } from 'zustand/vanilla';

import type { FeaturePackId } from '../../../feature-packs';
import {
  createConsoleIdentityKey,
  getConsoleSessionIdentity,
  type ConsoleSessionSnapshot
} from '../../console-runtime';
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
  ConsoleKitAdapterSlice &
  ConsoleKitScopeSlice &
  Record<string, unknown>;

export type ConsoleKitStoreApi = StoreApi<ConsoleKitStore>;

export type ConsoleKitScopeSlice = Readonly<{
  synchronizeScope: (
    databaseId: string,
    session: ConsoleSessionSnapshot
  ) => void;
}>;

export type ConsoleKitStoreSliceSetState = (
  update: Record<string, unknown> | ((
    state: Readonly<Record<string, unknown>>
  ) => Record<string, unknown>)
) => void;

export type ConsoleKitStoreSliceContribution = Readonly<{
  id: FeaturePackId;
  /**
   * Called when the store is created and again for every database or identity
   * scope reset. Return fresh state so nested mutable values cannot cross
   * tenant boundaries.
   */
  create: (
    set: ConsoleKitStoreSliceSetState,
    get: () => Readonly<Record<string, unknown>>
  ) => Record<string, unknown>;
}>;

type InstalledSliceContributions = WeakMap<
  ConsoleKitStoreApi,
  ReadonlyMap<FeaturePackId, ConsoleKitStoreSliceContribution>
>;

// Keep the opaque composition attestation through Fast Refresh. The WeakMap
// still releases each entry with its store and exposes no tenant state.
const installedSliceContributionsKey = Symbol.for(
  '@constructive-io/console-kit/installed-slice-contributions'
);
const installedSliceContributions = (
  Reflect.get(globalThis, installedSliceContributionsKey) as
    | InstalledSliceContributions
    | undefined
) ?? new WeakMap();
Reflect.set(
  globalThis,
  installedSliceContributionsKey,
  installedSliceContributions
);

function assertStoreSliceContributions(
  store: ConsoleKitStoreApi,
  required: readonly ConsoleKitStoreSliceContribution[]
): void {
  if (required.length === 0) return;
  const installed = installedSliceContributions.get(store);
  if (!installed) {
    throw new Error(
      'A host-owned Console Kit store must be created with createConsoleKitStore.'
    );
  }
  for (const contribution of required) {
    if (installed.get(contribution.id) !== contribution) {
      throw new Error(
        `The host-owned Console Kit store is missing the ${contribution.id} module slice. Pass every installed module's storeSlice contribution to createConsoleKitStore.`
      );
    }
  }
}

function contributedState(
  core: ConsoleKitStore,
  contributions: readonly ConsoleKitStoreSliceContribution[],
  set: ConsoleKitStoreApi['setState'],
  get: ConsoleKitStoreApi['getState'],
  isCurrentScope: () => boolean
): Record<string, unknown> {
  const owners = new Map(Object.keys(core).map((key) => [key, 'Console Kit core']));
  const state: Record<string, unknown> = Object.create(null);

  for (const contribution of contributions) {
    const ownedKeys = new Set<string>();
    const selectOwnedState = (
      current: Readonly<ConsoleKitStore>
    ): Readonly<Record<string, unknown>> =>
      Object.fromEntries(
        [...ownedKeys].map((key) => [key, current[key]])
    );
    const getOwnedState = (): Readonly<Record<string, unknown>> =>
      isCurrentScope()
        ? selectOwnedState(get())
        : Object.freeze(Object.create(null)) as Readonly<Record<string, unknown>>;
    const setOwnedState: ConsoleKitStoreSliceSetState = (update) => {
      if (!isCurrentScope()) return;
      if (ownedKeys.size === 0) {
        throw new Error(
          `The ${contribution.id} store slice cannot update state while it is being created.`
        );
      }
      set((current) => {
        const patch = typeof update === 'function'
          ? update(selectOwnedState(current))
          : update;
        if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
          throw new Error(
            `The ${contribution.id} store slice update must return a state object.`
          );
        }
        for (const key of Object.keys(patch)) {
          if (!ownedKeys.has(key)) {
            throw new Error(
              `The ${contribution.id} store slice cannot update state key "${key}".`
            );
          }
        }
        return patch;
      });
    };
    const slice = contribution.create(setOwnedState, getOwnedState);
    if (!slice || typeof slice !== 'object' || Array.isArray(slice)) {
      throw new Error(
        `The ${contribution.id} store slice must return a state object.`
      );
    }
    for (const [key, value] of Object.entries(slice)) {
      const owner = owners.get(key);
      if (owner) {
        throw new Error(
          `The ${contribution.id} store slice key "${key}" conflicts with ${owner}.`
        );
      }
      owners.set(key, `the ${contribution.id} store slice`);
      ownedKeys.add(key);
      state[key] = value;
    }
  }

  return state;
}

function identityScope(session: ConsoleSessionSnapshot): string | null {
  const identity = getConsoleSessionIdentity(session);
  return identity ? createConsoleIdentityKey(identity) : null;
}

export function createConsoleKitStore(
  initialFeature: FeaturePackId,
  initialContext: ConsoleKitContext | null = null,
  sliceContributions: readonly ConsoleKitStoreSliceContribution[] = []
): ConsoleKitStoreApi {
  const ids = new Set<FeaturePackId>();
  for (const contribution of sliceContributions) {
    if (ids.has(contribution.id)) {
      throw new Error(`Console Kit received duplicate ${contribution.id} store slices.`);
    }
    ids.add(contribution.id);
  }

  const createdStore = createStore<ConsoleKitStore>()((...args) => {
    const [set, get] = args;
    let contributionGeneration = 0;
    const core = {
      ...createConsoleKitNavigationSlice(initialFeature)(...args),
      ...createConsoleKitContextSlice(initialContext)(...args),
      ...createConsoleKitSessionSlice(...args),
      ...createConsoleKitEndpointCapabilitySlice(...args),
      ...createConsoleKitRuntimeSlice(...args),
      ...createConsoleKitAdapterSlice(...args),
      synchronizeScope: () => undefined
    } as ConsoleKitStore;

    const createContributedState = () => {
      const generation = contributionGeneration;
      return contributedState(
        core,
        sliceContributions,
        set,
        get,
        () => generation === contributionGeneration
      );
    };
    const contributed = createContributedState();

    const resetScope = (
      state: ConsoleKitStore,
      context: ConsoleKitContext | null,
      session: ConsoleSessionSnapshot
    ): Partial<ConsoleKitStore> => {
      contributionGeneration += 1;
      return {
        activeFeature: initialFeature,
        authEntryMode: 'sign-in',
        context,
        session,
        endpoints: {},
        packCapabilities: {},
        metadata: { status: 'checking' },
        metadataByEndpoint: {},
        metadataKey: null,
        adapterRevision: state.adapterRevision + 1,
        adapterAttempts: {},
        adapterLoads: {},
        ...createContributedState()
      };
    };

    return {
      ...core,
      ...contributed,
      setContext: (context) => set((state) => {
        if (state.context?.databaseId === context.databaseId) {
          return { context: { ...context } };
        }
        return resetScope(
          state,
          { ...context },
          { status: 'loading' }
        );
      }),
      clearContext: () => set((state) => resetScope(
        state,
        null,
        { status: 'loading' }
      )),
      setSession: (session) => set((state) => {
        if (identityScope(state.session) === identityScope(session)) {
          return { session };
        }
        return resetScope(
          state,
          state.context
            ? { ...state.context, organizationId: null }
            : null,
          session
        );
      }),
      synchronizeScope: (databaseId, session) => set((state) => {
        const sameDatabase = state.context?.databaseId === databaseId;
        const sameIdentity = identityScope(state.session) === identityScope(session);
        if (sameDatabase && sameIdentity) return { session };
        return resetScope(
          state,
          { databaseId, organizationId: null },
          session
        );
      })
    };
  });
  installedSliceContributions.set(
    createdStore,
    new Map(sliceContributions.map((contribution) => [
      contribution.id,
      contribution
    ]))
  );
  return createdStore;
}

const ConsoleKitStoreContext = React.createContext<ConsoleKitStoreApi | null>(
  null
);

export function ConsoleKitStoreProvider({
  children,
  initialFeature,
  initialContext = null,
  sliceContributions = [],
  store
}: Readonly<{
  children: React.ReactNode;
  initialFeature: FeaturePackId;
  initialContext?: ConsoleKitContext | null;
  sliceContributions?: readonly ConsoleKitStoreSliceContribution[];
  store?: ConsoleKitStoreApi;
}>) {
  const internalStoreRef = React.useRef<ConsoleKitStoreApi | null>(null);
  if (!store && !internalStoreRef.current) {
    internalStoreRef.current = createConsoleKitStore(
      initialFeature,
      initialContext,
      sliceContributions
    );
  }
  const selectedStore = store ?? internalStoreRef.current;
  if (!selectedStore) throw new Error('Console Kit could not create its state store.');
  assertStoreSliceContributions(selectedStore, sliceContributions);

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

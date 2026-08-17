import { describe, expect, it } from 'vitest';

import {
  getConsoleKitStorageSlice,
  storageConsoleStoreSlice
} from '../../feature-packs/storage/storage-console-slice';
import { createConsoleKitStore } from './console-kit-store';

describe('Console Kit store', () => {
  it('clears organization selection whenever the session identity changes', () => {
    const store = createConsoleKitStore('organizations', {
      databaseId: 'database-1',
      organizationId: null
    }, [storageConsoleStoreSlice]);
    const firstSession = {
      status: 'authenticated',
      identity: {
        kind: 'authenticated',
        cachePartition: 'login-1',
        subjectId: 'user-1'
      }
    } as const;

    store.getState().setSession(firstSession);
    store.getState().setContext({
      databaseId: 'database-1',
      organizationId: 'organization-user-1'
    });
    getConsoleKitStorageSlice(store).selectStorageBucket(
      'database-1:login-1',
      'documents'
    );
    store.getState().setSession(firstSession);
    expect(store.getState().context?.organizationId).toBe('organization-user-1');
    expect(getConsoleKitStorageSlice(store).storageSelection).toEqual({
      scope: 'database-1:login-1',
      bucketKey: 'documents'
    });

    store.getState().setSession({
      status: 'authenticated',
      identity: {
        kind: 'authenticated',
        cachePartition: 'login-2',
        subjectId: 'user-2'
      }
    });

    expect(store.getState().context).toEqual({
      databaseId: 'database-1',
      organizationId: null
    });
    expect(getConsoleKitStorageSlice(store).storageSelection).toBeNull();
  });

  it('resets every contributed slice and scoped cache on database changes', () => {
    const store = createConsoleKitStore('storage', {
      databaseId: 'database-1',
      organizationId: 'organization-1'
    }, [storageConsoleStoreSlice]);
    const session = {
      status: 'authenticated',
      identity: {
        kind: 'authenticated',
        cachePartition: 'login-1',
        subjectId: 'user-1'
      }
    } as const;

    store.getState().synchronizeScope('database-1', session);
    getConsoleKitStorageSlice(store).selectStorageBucket(
      'database-1:login-1',
      'documents'
    );
    store.getState().setPackCapability('storage', {
      status: 'ready',
      packId: 'storage',
      supportedCapabilities: ['storage.read'],
      evidence: []
    });
    store.getState().setAdapterLoad('storage', {
      status: 'ready',
      adapter: {},
      requestKey: 'database-1:login-1:storage',
      props: { buckets: [] }
    });

    store.getState().synchronizeScope('database-2', session);

    expect(store.getState()).toMatchObject({
      route: { feature: 'storage', screen: 'buckets' },
      authFlow: { status: 'entry', mode: 'sign-in' },
      context: { databaseId: 'database-2', organizationId: null },
      session,
      packCapabilities: {},
      adapterAttempts: {},
      adapterLoads: {},
      metadata: { status: 'checking' },
      metadataByEndpoint: {},
      metadataKey: null,
      storageSelection: null
    });
  });

  it('keeps contributed state during same-scope refreshes', () => {
    const store = createConsoleKitStore('storage', null, [
      storageConsoleStoreSlice
    ]);
    const session = {
      status: 'authenticated',
      identity: {
        kind: 'authenticated',
        cachePartition: 'login-1',
        subjectId: 'user-1'
      }
    } as const;

    store.getState().synchronizeScope('database-1', session);
    getConsoleKitStorageSlice(store).selectStorageBucket(
      'database-1:login-1',
      'documents'
    );
    store.getState().synchronizeScope('database-1', { ...session });

    expect(getConsoleKitStorageSlice(store).storageSelection).toEqual({
      scope: 'database-1:login-1',
      bucketKey: 'documents'
    });
  });

  it('creates fresh nested contribution state for every scope reset', () => {
    const store = createConsoleKitStore('storage', null, [{
      id: 'storage',
      create: () => ({
        storageDraft: { bucketIds: [] as string[] }
      })
    }]);
    const firstDraft = store.getState().storageDraft as {
      bucketIds: string[];
    };

    firstDraft.bucketIds.push('secret-bucket');
    store.getState().synchronizeScope('database-2', {
      status: 'anonymous',
      identity: {
        kind: 'anonymous',
        cachePartition: 'anonymous-2'
      }
    });

    const resetDraft = store.getState().storageDraft as {
      bucketIds: string[];
    };
    expect(resetDraft).not.toBe(firstDraft);
    expect(resetDraft.bucketIds).toEqual([]);
  });

  it('ignores stale contributed actions after a scope reset', async () => {
    let resolveResult!: (value: string) => void;
    const result = new Promise<string>((resolve) => {
      resolveResult = resolve;
    });
    const store = createConsoleKitStore('storage', null, [{
      id: 'storage',
      create: (set, get) => ({
        storageResult: null,
        completeStorageLoad: async () => {
          const next = await result;
          set({ storageResult: next });
          return get().storageResult;
        }
      })
    }]);
    const staleAction = store.getState().completeStorageLoad as
      () => Promise<unknown>;
    const completion = staleAction();

    store.getState().synchronizeScope('database-2', {
      status: 'anonymous',
      identity: {
        kind: 'anonymous',
        cachePartition: 'anonymous-2'
      }
    });
    resolveResult('database-1-result');

    await expect(completion).resolves.toBeUndefined();
    expect(store.getState().storageResult).toBeNull();
  });

  it('rejects module slices that overwrite core or sibling state', () => {
    expect(() => createConsoleKitStore('data', null, [{
      id: 'storage',
      create: () => ({ setSession: 'overwritten' })
    }])).toThrow(/storage store slice key "setSession" conflicts with Console Kit core/u);

    expect(() => createConsoleKitStore('data', null, [
      { id: 'storage', create: () => ({ packSelection: 'storage' }) },
      { id: 'organizations', create: () => ({ packSelection: 'organizations' }) }
    ])).toThrow(
      /organizations store slice key "packSelection" conflicts with the storage store slice/u
    );
  });

  it('prevents module actions from mutating core or sibling-owned state', () => {
    const store = createConsoleKitStore('data', null, [{
      id: 'storage',
      create: (set) => ({
        storageSelection: null,
        overwriteSession: () => set({
          session: { status: 'loading' }
        })
      })
    }]);
    const overwriteSession = store.getState().overwriteSession;

    expect(typeof overwriteSession).toBe('function');
    expect(() => (overwriteSession as () => void)()).toThrow(
      /storage store slice cannot update state key "session"/u
    );

    const getterStore = createConsoleKitStore('data', null, [{
      id: 'storage',
      create: (_set, get) => ({
        storageSelection: null,
        readCoreSession: () => get().setSession
      })
    }]);
    const readCoreSession = getterStore.getState().readCoreSession;
    expect((readCoreSession as () => unknown)()).toBeUndefined();

    let observedCoreSession: unknown = 'not-called';
    const updaterStore = createConsoleKitStore('data', null, [{
      id: 'storage',
      create: (set) => ({
        storageSelection: null,
        updateOwnedState: () => set((state) => {
          observedCoreSession = state.session;
          return { storageSelection: 'documents' };
        })
      })
    }]);
    const updateOwnedState = updaterStore.getState().updateOwnedState;
    (updateOwnedState as () => void)();
    expect(observedCoreSession).toBeUndefined();
    expect(updaterStore.getState().session).toEqual({ status: 'loading' });
    expect(updaterStore.getState().storageSelection).toBe('documents');
  });
});

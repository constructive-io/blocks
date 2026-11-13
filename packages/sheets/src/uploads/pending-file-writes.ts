// File cell writes that outlive the editor: while the server confirms a new
// file, the cell shows "Processing file…"; if the wait runs out or the write
// fails, the cell shows that the file was not saved and offers a retry. The
// uploaded file is never dropped silently.
//
// One store per Sheets scope (endpoint, database, user), keyed by table, grid
// row id and column.

import { useCallback, useSyncExternalStore } from 'react';

import type { SheetsScopeKey } from '../context/sheets-context';

export type PendingFileWrite =
	| { status: 'processing' }
	| { status: 'failed'; message: string; retry: () => void; dismiss: () => void };

type Listener = () => void;

class PendingFileWrites {
	private readonly entries = new Map<string, PendingFileWrite>();
	private readonly listeners = new Set<Listener>();

	get(key: string): PendingFileWrite | null {
		return this.entries.get(key) ?? null;
	}

	set(key: string, entry: PendingFileWrite | null): void {
		if (entry) this.entries.set(key, entry);
		else this.entries.delete(key);
		for (const listener of this.listeners) listener();
	}

	subscribe = (listener: Listener): (() => void) => {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	};
}

const stores = new WeakMap<SheetsScopeKey, PendingFileWrites>();

function storeFor(scope: SheetsScopeKey): PendingFileWrites {
	let store = stores.get(scope);
	if (!store) {
		store = new PendingFileWrites();
		stores.set(scope, store);
	}
	return store;
}

export function pendingWriteKey(tableKey: string, rowId: string, column: string): string {
	return JSON.stringify([tableKey, rowId, column]);
}

export function setPendingFileWrite(scope: SheetsScopeKey, key: string, entry: PendingFileWrite | null): void {
	storeFor(scope).set(key, entry);
}

export function getPendingFileWrite(scope: SheetsScopeKey, key: string): PendingFileWrite | null {
	return storeFor(scope).get(key);
}

/** The pending write of one cell, or null. */
export function usePendingFileWrite(scope: SheetsScopeKey, key: string | null): PendingFileWrite | null {
	const store = storeFor(scope);
	const read = useCallback(() => (key ? store.get(key) : null), [store, key]);
	return useSyncExternalStore(store.subscribe, read, read);
}

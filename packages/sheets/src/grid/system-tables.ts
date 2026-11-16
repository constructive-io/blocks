// Whether table lists show system tables: the tables a platform module made and keeps (sessions,
// memberships, limits, storage). Off by default. The browser remembers the choice, and every list
// on the page follows the one setting (a sidebar and a narrow-screen picker stay in step).
import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'constructive:sheets:show-system-tables';

const listeners = new Set<() => void>();
// Where the choice lives when the browser keeps no storage (a private window, blocked site data).
let unsaved: boolean | null = null;

function readShown(): boolean {
	try {
		const stored = window.localStorage.getItem(STORAGE_KEY);
		if (stored !== null) return stored === 'true';
	} catch {
		// No storage: the in-memory choice stands.
	}
	return unsaved ?? false;
}

function writeShown(show: boolean): void {
	unsaved = show;
	try {
		window.localStorage.setItem(STORAGE_KEY, String(show));
	} catch {
		// No storage: the choice lasts for this page.
	}
	for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
	listeners.add(listener);
	// Another tab changed it.
	const onStorage = (event: StorageEvent) => {
		if (event.key === STORAGE_KEY) listener();
	};
	window.addEventListener('storage', onStorage);
	return () => {
		listeners.delete(listener);
		window.removeEventListener('storage', onStorage);
	};
}

/** Whether system tables show in table lists, and the setter every list on the page follows. */
export function useShowSystemTables(): [boolean, (show: boolean) => void] {
	const shown = useSyncExternalStore(subscribe, readShown, () => false);
	return [shown, writeShown];
}

/**
 * The tables a list shows: the owner's, and the system tables only while they are shown. The open
 * table always stays, so a system table opened by a link or an address is never missing from the list.
 */
export function visibleTables<T extends { system?: boolean }>(
	tables: readonly T[],
	showSystem: boolean,
	isOpen: (table: T) => boolean,
): T[] {
	return tables.filter((table) => !table.system || showSystem || isOpen(table));
}

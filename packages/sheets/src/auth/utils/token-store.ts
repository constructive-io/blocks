const KEY_PREFIX = 'sheets-auth-token';

function storageKey(databaseId: string): string {
	return `${KEY_PREFIX}:${databaseId}`;
}

function getStorage(): Storage | null {
	if (typeof window === 'undefined') return null;
	try {
		return window.localStorage;
	} catch {
		return null;
	}
}

export interface StoredToken {
	accessToken: string;
	expiresAt: string;
	identityKey?: string | null;
}

export function getStoredToken(databaseId: string): StoredToken | null {
	const storage = getStorage();
	if (!storage) return null;

	try {
		const raw = storage.getItem(storageKey(databaseId));
		if (!raw) return null;
		const parsed = JSON.parse(raw) as StoredToken;
		if (!parsed.accessToken || !parsed.expiresAt) return null;
		if (parsed.identityKey != null && typeof parsed.identityKey !== 'string') return null;
		return parsed;
	} catch {
		return null;
	}
}

export function setStoredToken(
	databaseId: string,
	accessToken: string,
	expiresAt: string,
	identityKey?: string | null,
): void {
	const storage = getStorage();
	if (!storage) return;

	try {
		const data: StoredToken = { accessToken, expiresAt, identityKey };
		storage.setItem(storageKey(databaseId), JSON.stringify(data));
	} catch {
		// Silently fail — localStorage might be full or unavailable
	}
}

export function clearStoredToken(databaseId: string): void {
	const storage = getStorage();
	if (!storage) return;

	try {
		storage.removeItem(storageKey(databaseId));
	} catch {
		// Silently fail
	}
}

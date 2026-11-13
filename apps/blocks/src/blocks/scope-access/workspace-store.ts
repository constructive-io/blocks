/**
 * The active workspace per membership scope, readable outside React: a
 * data layer that fills a record's organization key asks
 * `activeWorkspaceId('org')` at create time. The choice is kept per user in
 * localStorage, so a reload or a second tab keeps it, and another user on
 * the same browser starts from their own.
 */

type Listener = () => void;

const listeners = new Set<Listener>();
const memory = new Map<string, string>();

const storageKey = (userId: string, scope: string) => `constructive-workspace:${userId}:${scope}`;

let currentUser: string | null = null;

function read(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? memory.get(key) ?? null;
  } catch {
    return memory.get(key) ?? null;
  }
}

function write(key: string, value: string): void {
  memory.set(key, value);
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    // Private windows and blocked storage keep the choice for this page only.
  }
}

/** Whose choices the store reads; set when the session changes. */
export function setWorkspaceUser(userId: string | null): void {
  if (userId === currentUser) return;
  currentUser = userId;
  for (const listener of listeners) listener();
}

/** The active workspace's entity id in `scope`; null before a choice or signed out. */
export function activeWorkspaceId(scope = 'org'): string | null {
  return currentUser ? read(storageKey(currentUser, scope)) : null;
}

export function setActiveWorkspace(scope: string, id: string): void {
  if (!currentUser) return;
  write(storageKey(currentUser, scope), id);
  for (const listener of listeners) listener();
}

export function subscribeWorkspace(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

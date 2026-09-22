'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { Skeleton } from '@constructive-io/ui/skeleton';

import {
  DEFAULT_DRAFT,
  decodeDraft,
  encodeDraft,
  randomDraft,
  sanitizeDraft,
  type ThemeDraft,
} from '@/lib/theme-playground/draft';
import { DEFAULT_WALL, wallFromSearch, type WallId } from '@/lib/theme-playground/walls';

const STORAGE_KEY = 'constructive:theme-draft';
const SYNC_DEBOUNCE_MS = 150;

interface ThemeDraftContextValue {
  draft: ThemeDraft;
  setDraft: (patch: Partial<ThemeDraft>) => void;
  reset: () => void;
  shuffle: () => void;
  wall: WallId;
  setWall: (wall: WallId) => void;
  shareUrl: string;
}

const ThemeDraftContext = createContext<ThemeDraftContextValue | null>(null);

export function useThemeDraft(): ThemeDraftContextValue {
  const ctx = useContext(ThemeDraftContext);
  if (!ctx) throw new Error('useThemeDraft must be used within ThemeDraftProvider');
  return ctx;
}

/**
 * Draft state for /blocks/create.
 *
 * Resolution order on mount: `?d=` URL param → localStorage → default. Changes
 * sync back to both (debounced) so a reload or a copied link restores the
 * exact tuning. Children render only once the initial draft resolves — the
 * iframe URL depends on it, and mounting early would flash the default theme.
 */
export function ThemeDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraftState] = useState<ThemeDraft | null>(null);
  const [wall, setWallState] = useState<WallId>(DEFAULT_WALL);

  useEffect(() => {
    setWallState(wallFromSearch(window.location.search));
    const encoded = new URLSearchParams(window.location.search).get('d');
    if (encoded) {
      setDraftState(decodeDraft(encoded));
      return;
    }
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setDraftState(sanitizeDraft(JSON.parse(stored)));
        return;
      }
    } catch {
      // unreadable storage — fall through to default
    }
    setDraftState({ ...DEFAULT_DRAFT });
  }, []);

  useEffect(() => {
    if (!draft) return;
    const timeout = window.setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      } catch {
        // storage may be unavailable — the URL still carries the state
      }
      const url = new URL(window.location.href);
      if (encodeDraft(draft) === encodeDraft(DEFAULT_DRAFT)) {
        url.searchParams.delete('d');
      } else {
        url.searchParams.set('d', encodeDraft(draft));
      }
      if (wall === DEFAULT_WALL) {
        url.searchParams.delete('wall');
      } else {
        url.searchParams.set('wall', wall);
      }
      window.history.replaceState(null, '', url);
    }, SYNC_DEBOUNCE_MS);
    return () => window.clearTimeout(timeout);
  }, [draft, wall]);

  // Stable identities: consumers subscribe to these in effects that must not
  // re-run when the draft itself changes.
  const setDraft = useCallback(
    (patch: Partial<ThemeDraft>) => setDraftState((prev) => (prev ? { ...prev, ...patch } : prev)),
    [],
  );
  const reset = useCallback(() => setDraftState({ ...DEFAULT_DRAFT }), []);
  const shuffle = useCallback(() => setDraftState((prev) => (prev ? randomDraft(prev) : prev)), []);
  const setWall = useCallback((next: WallId) => setWallState(next), []);

  const value = useMemo<ThemeDraftContextValue | null>(() => {
    if (!draft) return null;
    const share = new URL(`${window.location.origin}${window.location.pathname}`);
    share.searchParams.set('d', encodeDraft(draft));
    if (wall !== DEFAULT_WALL) share.searchParams.set('wall', wall);
    return {
      draft,
      setDraft,
      reset,
      shuffle,
      wall,
      setWall,
      shareUrl: share.toString(),
    };
  }, [draft, wall, setDraft, reset, shuffle, setWall]);

  if (!value) {
    // Same two-pane shape as the resolved layout — no empty first paint in the
    // static export while the ?d=/localStorage draft resolves on the client.
    return (
      <div
        className="flex min-h-[calc(100dvh-var(--registry-topbar-h))] flex-col gap-4 p-4 min-[861px]:grid min-[861px]:h-[calc(100dvh-var(--registry-topbar-h))] min-[861px]:grid-cols-[minmax(0,1fr)_300px]"
        aria-hidden
      >
        <Skeleton className="min-h-[60dvh] rounded-xl min-[861px]:min-h-0" />
        <Skeleton className="h-64 rounded-xl min-[861px]:h-auto" />
      </div>
    );
  }
  return <ThemeDraftContext.Provider value={value}>{children}</ThemeDraftContext.Provider>;
}

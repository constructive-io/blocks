'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

/**
 * Package-manager context (DESIGN.md §4.6). The right panel lets the reader pick
 * their package manager; every install command on the site renders through
 * `installCommand(pm, url)` so a single choice flows to `InstallField` and the
 * Introduction steps at once. Persisted to localStorage (`cb-pm`), default pnpm.
 */

export const PACKAGE_MANAGERS = ['pnpm', 'npm', 'bun', 'yarn'] as const;
export type PackageManager = (typeof PACKAGE_MANAGERS)[number];

const STORAGE_KEY = 'cb-pm';
const DEFAULT_PM: PackageManager = 'pnpm';

/** Build the `shadcn add` command for a registry item URL under a package manager. */
export function installCommand(pm: PackageManager, url: string): string {
  switch (pm) {
    case 'npm':
      return `npx shadcn@latest add ${url}`;
    case 'bun':
      return `bunx --bun shadcn@latest add ${url}`;
    case 'yarn':
      return `yarn dlx shadcn@latest add ${url}`;
    case 'pnpm':
    default:
      return `pnpm dlx shadcn@latest add ${url}`;
  }
}

interface PmContextValue {
  pm: PackageManager;
  setPm: (pm: PackageManager) => void;
}

// A default value (rather than null) keeps `usePm()` safe for any stray consumer
// rendered outside a provider — it falls back to the default pm with a no-op
// setter instead of throwing. The real provider (mounted in providers.tsx) wires
// persistence + updates.
const PmContext = createContext<PmContextValue>({ pm: DEFAULT_PM, setPm: () => {} });

function isPackageManager(value: string | null): value is PackageManager {
  return value !== null && (PACKAGE_MANAGERS as readonly string[]).includes(value);
}

export function PmProvider({ children }: { children: ReactNode }) {
  // Start on the default so SSR and the first client paint agree (no hydration
  // mismatch). The persisted choice is adopted on the next paint, after mount.
  const [pm, setPmState] = useState<PackageManager>(DEFAULT_PM);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (isPackageManager(stored)) setPmState(stored);
    } catch {
      // localStorage unavailable (private mode) — keep the default.
    }
  }, []);

  const setPm = useCallback((next: PackageManager) => {
    setPmState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore write failures.
    }
  }, []);

  return <PmContext.Provider value={{ pm, setPm }}>{children}</PmContext.Provider>;
}

export function usePm() {
  return useContext(PmContext);
}

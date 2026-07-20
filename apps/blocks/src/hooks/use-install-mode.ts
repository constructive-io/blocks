'use client';

import { useCallback, useEffect, useState } from 'react';

import {
  INSTALL_MODE_EVENT,
  INSTALL_MODE_KEY,
  isInstallMode,
  type InstallMode,
} from '@/lib/install-mode';

export function useInstallMode(): [InstallMode, (mode: InstallMode) => void] {
  const [mode, setModeState] = useState<InstallMode>('npm');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(INSTALL_MODE_KEY);
      if (isInstallMode(stored)) setModeState(stored);
    } catch {
      // Storage can be unavailable in privacy-restricted browsing contexts.
    }

    function onStorage(event: StorageEvent) {
      if (event.key === INSTALL_MODE_KEY && isInstallMode(event.newValue)) {
        setModeState(event.newValue);
      }
    }

    function onInstallMode(event: Event) {
      const detail = (event as CustomEvent<InstallMode>).detail;
      if (isInstallMode(detail)) setModeState(detail);
    }

    window.addEventListener('storage', onStorage);
    window.addEventListener(INSTALL_MODE_EVENT, onInstallMode);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(INSTALL_MODE_EVENT, onInstallMode);
    };
  }, []);

  const setMode = useCallback((next: InstallMode) => {
    setModeState(next);
    try {
      localStorage.setItem(INSTALL_MODE_KEY, next);
    } catch {
      // Keep the in-memory selection when persistence is unavailable.
    }
    window.dispatchEvent(new CustomEvent(INSTALL_MODE_EVENT, { detail: next }));
  }, []);

  return [mode, setMode];
}

'use client';

/**
 * shell-command-palette-provider.tsx
 *
 * Provides a React context so deeply-nested components can register commands
 * without prop drilling. The context is consumed by `use-command-palette.ts`
 * which merges provider-registered commands with the block's built-in commands.
 *
 * Usage:
 *   // App root
 *   <ShellCommandPaletteProvider commands={myCommands}>
 *     {children}
 *   </ShellCommandPaletteProvider>
 *
 *   // Anywhere in the tree
 *   useRegisterCommands(myDynamicCommands);
 */

import React, { createContext, useContext, useMemo, useState, useCallback } from 'react';
import type { CommandRegistryEntry } from './command-palette';

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

type ShellCommandPaletteContextValue = {
  /** Commands registered at provider level (static, via `commands` prop). */
  staticCommands: CommandRegistryEntry[];
  /** Commands registered dynamically via `useRegisterCommands`. */
  dynamicCommands: CommandRegistryEntry[];
  /** Register a batch of commands from a nested component. */
  registerCommands: (commands: CommandRegistryEntry[]) => void;
  /** Unregister a previously-registered batch (by reference equality). */
  unregisterCommands: (commands: CommandRegistryEntry[]) => void;
};

const ShellCommandPaletteContext = createContext<ShellCommandPaletteContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export type ShellCommandPaletteProviderProps = {
  /**
   * Static commands registered at the provider level. These are merged with
   * commands registered via `useRegisterCommands` and the block's built-in
   * commands inside `use-command-palette.ts`.
   */
  commands?: CommandRegistryEntry[];
  children?: React.ReactNode;
};

export function ShellCommandPaletteProvider({
  commands: staticCommands = [],
  children,
}: ShellCommandPaletteProviderProps) {
  const [dynamicBatches, setDynamicBatches] = useState<CommandRegistryEntry[][]>([]);

  const registerCommands = useCallback((cmds: CommandRegistryEntry[]) => {
    setDynamicBatches((prev) => [...prev, cmds]);
  }, []);

  const unregisterCommands = useCallback((cmds: CommandRegistryEntry[]) => {
    setDynamicBatches((prev) => prev.filter((batch) => batch !== cmds));
  }, []);

  const dynamicCommands = useMemo(
    () => dynamicBatches.flat(),
    [dynamicBatches]
  );

  const value = useMemo<ShellCommandPaletteContextValue>(
    () => ({ staticCommands, dynamicCommands, registerCommands, unregisterCommands }),
    [staticCommands, dynamicCommands, registerCommands, unregisterCommands]
  );

  return (
    <ShellCommandPaletteContext.Provider value={value}>
      {children}
    </ShellCommandPaletteContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook: useRegisterCommands
// ---------------------------------------------------------------------------

/**
 * Register a set of commands from anywhere inside a `<ShellCommandPaletteProvider>`.
 * Commands are automatically unregistered when the calling component unmounts.
 *
 * NOTE: Stabilize the `commands` array with `useMemo` to avoid re-registering
 * on every render.
 *
 * @example
 * ```tsx
 * const commands = useMemo(() => [
 *   { id: 'create-org', label: 'Create organization', onSelect: openCreateOrgModal },
 * ], [openCreateOrgModal]);
 * useRegisterCommands(commands);
 * ```
 */
export function useRegisterCommands(commands: CommandRegistryEntry[]): void {
  const ctx = useContext(ShellCommandPaletteContext);
  const registerCommands = ctx?.registerCommands;
  const unregisterCommands = ctx?.unregisterCommands;

  React.useEffect(() => {
    if (!registerCommands || !unregisterCommands) return;
    registerCommands(commands);
    return () => {
      unregisterCommands(commands);
    };
  }, [commands, registerCommands, unregisterCommands]);
}

// ---------------------------------------------------------------------------
// Internal hook: useShellCommandPaletteContext
// ---------------------------------------------------------------------------

/**
 * Read the provider context. Returns `null` when called outside a provider
 * (graceful degradation — no throw, just no extra commands).
 */
export function useShellCommandPaletteContext(): ShellCommandPaletteContextValue | null {
  return useContext(ShellCommandPaletteContext);
}

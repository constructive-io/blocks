'use client';

/**
 * use-command-palette.ts
 *
 * Block-owned utility hook. Internally calls `useCurrentUserQuery` from the
 * host's generated `auth` SDK (`@/generated/auth`) to build the block's
 * built-in commands (go-to-settings, sign-out) and read the active user's
 * session permissions for client-side `requiredPermission` filtering.
 *
 * Merges (in order):
 *   1. Built-in commands derived from the current user session
 *   2. Static commands from `<ShellCommandPaletteProvider commands={[...]}>`
 *   3. Dynamic commands registered via `useRegisterCommands()`
 *   4. Inline commands passed directly to `<ShellCommandPalette commands={[...]}>`
 *
 * Only commands the current user is permitted to see (based on
 * `requiredPermission` vs the session's permission bits) are returned.
 *
 * NOTE: This hook does NOT supply navigation callbacks. The consumer is
 * responsible for wiring the built-in command `onSelect` handlers. The built-in
 * commands below are stubs that the consumer can override by providing commands
 * with the same `id` via the provider or inline props.
 */

import { useMemo } from 'react';

import { useCurrentUserQuery } from '@/generated/auth';

import type { CommandRegistryEntry } from './command-palette';
import { useShellCommandPaletteContext } from './shell-command-palette-provider';

// ---------------------------------------------------------------------------
// Built-in command IDs (stable, used for deduplication)
// ---------------------------------------------------------------------------

export const BUILTIN_COMMAND_IDS = {
  GO_TO_SETTINGS: 'shell:go-to-settings',
  SIGN_OUT: 'shell:sign-out',
} as const;

// ---------------------------------------------------------------------------
// Hook return type
// ---------------------------------------------------------------------------

export type UseCommandPaletteResult = {
  /** All visible commands (built-ins + provider + inline), filtered by permission. */
  allCommands: CommandRegistryEntry[];
  /** True while the current-user query is loading (built-ins not yet resolved). */
  isPending: boolean;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * @param inlineCommands - Commands passed directly as `<ShellCommandPalette commands={[...]}>`
 *                         (lowest-priority; merged after provider commands).
 * @param onSignOut      - Handler wired to the built-in sign-out command.
 * @param onGoToSettings - Handler wired to the built-in go-to-settings command.
 */
export function useCommandPalette(
  inlineCommands: CommandRegistryEntry[] = [],
  onSignOut?: () => void | Promise<void>,
  onGoToSettings?: () => void | Promise<void>
): UseCommandPaletteResult {
  const ctx = useShellCommandPaletteContext();

  // Fetch current user to get id, type, displayName and permissions.
  const currentUserQuery = useCurrentUserQuery({
    selection: {
      fields: {
        id: true,
        type: true,
        displayName: true,
      },
    },
  });

  const currentUser = currentUserQuery.data?.currentUser ?? null;
  const isPending = currentUserQuery.isLoading;

  // Extract permissions from user data.
  // The current user query returns the user's type which is used for
  // client-side permission checks. We cast to `any` to access the permissions
  // array if the selection includes it — the hook selection above is minimal
  // and does not fetch permissions (client-side filter is based on user type
  // and the requiredPermission string set by the consumer).
  // For a first-class permissions array the consumer would extend the selection;
  // here we treat the user `type` as the single permission token.
  const userPermissions = useMemo<string[]>(() => {
    if (!currentUser) return [];
    const perms: string[] = [];
    const userType = (currentUser as { type?: string | null }).type;
    if (userType) perms.push(userType);
    return perms;
  }, [currentUser]);

  // Built-in commands (present only when user session is loaded).
  const builtinCommands = useMemo<CommandRegistryEntry[]>(() => {
    if (!currentUser) return [];

    const cmds: CommandRegistryEntry[] = [];

    if (onGoToSettings) {
      cmds.push({
        id: BUILTIN_COMMAND_IDS.GO_TO_SETTINGS,
        label: 'Go to account settings',
        group: 'navigation',
        onSelect: onGoToSettings,
      });
    }

    if (onSignOut) {
      cmds.push({
        id: BUILTIN_COMMAND_IDS.SIGN_OUT,
        label: 'Sign out',
        group: 'account',
        onSelect: onSignOut,
      });
    }

    return cmds;
  }, [currentUser, onGoToSettings, onSignOut]);

  // Merge all command sources. Built-ins first so they appear at the top of
  // their groups; provider commands next; inline last.
  const mergedCommands = useMemo<CommandRegistryEntry[]>(() => {
    const providerStatic = ctx?.staticCommands ?? [];
    const providerDynamic = ctx?.dynamicCommands ?? [];
    return [...builtinCommands, ...providerStatic, ...providerDynamic, ...inlineCommands];
  }, [builtinCommands, ctx?.staticCommands, ctx?.dynamicCommands, inlineCommands]);

  // Client-side permission filter.
  const allCommands = useMemo<CommandRegistryEntry[]>(() => {
    return mergedCommands.filter((cmd) => {
      if (!cmd.requiredPermission) return true;
      return userPermissions.includes(cmd.requiredPermission);
    });
  }, [mergedCommands, userPermissions]);

  return { allCommands, isPending };
}

'use client';

/**
 * shell-command-palette  (registry: shell-command-palette)
 *
 * Auth-aware command palette (Cmd+K) wrapping the shadcn `command` primitive.
 * Built-in commands (go-to-settings, sign-out, context-switch) and
 * permission-filtered consumer commands are produced by the companion hook
 * `use-command-palette.ts`. The provider `shell-command-palette-provider.tsx`
 * lets deeply-nested components register commands without prop drilling.
 *
 * Keyboard shortcut: Mod+K (Cmd on macOS, Ctrl elsewhere) opens/closes the
 * palette via a global `keydown` listener registered by this component.
 */

import React, { useCallback, useEffect, useState } from 'react';

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from '@constructive-io/ui/command';

import { cn } from '@/lib/utils';

import {
  defaultShellCommandPaletteMessages,
  type ShellCommandPaletteMessages,
} from './messages';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type CommandRegistryEntry = {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  group?: string;
  /**
   * If set, the entry is only shown when the active user has this permission
   * (client-side filter — security enforced by server RLS).
   * Filtering is performed inside `use-command-palette.ts`, not by this component.
   */
  requiredPermission?: string;
  /** May be async — Promise rejections are routed to `onError`. */
  onSelect: () => void | Promise<void>;
  /** Keyboard shortcut display label (rendering only; actual binding is caller's responsibility). */
  shortcut?: string;
};

export type ShellCommandPaletteMessageOverrides = Partial<
  Omit<ShellCommandPaletteMessages, 'errors'>
> & {
  errors?: Partial<ShellCommandPaletteMessages['errors']>;
};

export type ShellCommandPaletteProps = {
  /** Controlled open state. When omitted, the block manages open state internally. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Consumer-registered commands merged after provider-registered and built-in commands. */
  commands?: CommandRegistryEntry[];
  /** Global keyboard shortcut that opens/closes the palette. Default: 'mod+k' */
  trigger?: string;
  /**
   * Notification config slot (forward-compatibility). Reserved for v2 toast
   * integration — has no runtime effect in v1.
   */
  notifications?: boolean | Record<string, unknown>;
  messages?: ShellCommandPaletteMessageOverrides;
  /** Fires on any error propagated by a command handler (sync or async). */
  onError?: (err: unknown) => void;
  className?: string;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Group commands by their `group` field, preserving insertion order per group. */
function groupCommands(commands: CommandRegistryEntry[]): Map<string, CommandRegistryEntry[]> {
  const map = new Map<string, CommandRegistryEntry[]>();
  for (const cmd of commands) {
    const g = cmd.group ?? 'other';
    const existing = map.get(g);
    if (existing) {
      existing.push(cmd);
    } else {
      map.set(g, [cmd]);
    }
  }
  return map;
}

/** Derive the human-readable group heading from the group key and messages. */
function groupLabel(
  group: string,
  merged: ShellCommandPaletteMessages
): string {
  switch (group) {
    case 'navigation':
      return merged.navigationGroupLabel;
    case 'account':
      return merged.accountGroupLabel;
    case 'context':
      return merged.contextGroupLabel;
    default:
      return group.charAt(0).toUpperCase() + group.slice(1);
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ShellCommandPalette({
  open: controlledOpen,
  onOpenChange,
  commands = [],
  trigger: _trigger = 'mod+k',
  notifications: _notifications,
  messages: messageOverrides,
  onError,
  className,
}: ShellCommandPaletteProps) {
  // Deep merge: top-level copy + errors object merged separately.
  const merged: ShellCommandPaletteMessages = {
    ...defaultShellCommandPaletteMessages,
    ...messageOverrides,
    errors: {
      ...defaultShellCommandPaletteMessages.errors,
      ...messageOverrides?.errors,
    },
  };

  // Internal open state — used when the consumer does not pass `open`.
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = useCallback(
    (next: boolean) => {
      if (!isControlled) setInternalOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  // Global Mod+K shortcut.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const modKey = e.metaKey || e.ctrlKey;
      if (modKey && e.key === 'k') {
        e.preventDefault();
        setOpen(!open);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, setOpen]);

  // Commands are pre-filtered by use-command-palette.ts (via the provider) or
  // passed directly by the consumer. No permission filtering at render time.
  const grouped = groupCommands(commands);

  async function handleSelect(cmd: CommandRegistryEntry) {
    setOpen(false);
    try {
      await cmd.onSelect();
    } catch (err) {
      onError?.(err);
    }
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={setOpen}
      aria-label={merged.searchPlaceholder}
      data-slot="command-palette"
      className={cn(className)}
    >
      <Command>
        <CommandInput placeholder={merged.searchPlaceholder} autoFocus />
        <CommandList>
          <CommandEmpty>{merged.noResultsMessage}</CommandEmpty>
          {Array.from(grouped.entries()).map(([group, entries]) => (
            <CommandGroup
              key={group}
              heading={groupLabel(group, merged)}
              data-testid={`command-group-${group}`}
            >
              {entries.map((cmd) => (
                <CommandItem
                  key={cmd.id}
                  value={cmd.id}
                  onSelect={() => handleSelect(cmd)}
                  data-testid={`command-item-${cmd.id}`}
                >
                  {cmd.icon && (
                    <span className="mr-2 flex shrink-0 items-center">{cmd.icon}</span>
                  )}
                  <span className="flex flex-col min-w-0">
                    <span className="truncate">{cmd.label}</span>
                    {cmd.description && (
                      <span className="text-muted-foreground truncate text-xs">
                        {cmd.description}
                      </span>
                    )}
                  </span>
                  {cmd.shortcut && <CommandShortcut>{cmd.shortcut}</CommandShortcut>}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}

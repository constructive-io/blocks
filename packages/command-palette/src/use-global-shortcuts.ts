'use client';

import { useEffect, useRef } from 'react';
import { matchKeyBinding, isEditableTarget } from './keybinding';
import type { CommandDefinition } from './types';

/**
 * Registers global keyboard shortcuts for commands that have a `shortcut` binding.
 *
 * - Single document-level `keydown` listener (not N per command)
 * - Skips events when target is an editable element
 * - Disabled/hidden commands are excluded
 * - First match wins, calls preventDefault + stopPropagation
 */
export function useGlobalShortcuts(
  commands: CommandDefinition[],
  execute: (cmd: CommandDefinition) => Promise<void>,
  enabled = true
): void {
  // Keep refs to avoid re-registering listener on every command/execute change
  const commandsRef = useRef(commands);
  commandsRef.current = commands;

  const executeRef = useRef(execute);
  executeRef.current = execute;

  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (isEditableTarget(e.target)) return;

      const cmds = commandsRef.current;
      for (const cmd of cmds) {
        if (!cmd.shortcut || cmd.disabled || cmd.hidden) continue;
        if (matchKeyBinding(e, cmd.shortcut)) {
          e.preventDefault();
          e.stopPropagation();
          executeRef.current(cmd);
          return;
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}

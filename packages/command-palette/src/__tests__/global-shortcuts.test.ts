import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { kbd, matchKeyBinding } from '../keybinding';
import type { CommandDefinition } from '../types';

// Minimal React hooks mock — useGlobalShortcuts only uses useEffect and useRef
// We simulate the hook by manually calling the effect logic
function simulateHook(
  commands: CommandDefinition[],
  execute: (cmd: CommandDefinition) => Promise<void>,
  enabled = true
): () => void {
  // Mirror the hook's effect: when enabled, add keydown listener
  if (!enabled) return () => {};

  const commandsRef = { current: commands };
  const executeRef = { current: execute };

  function handleKeyDown(e: KeyboardEvent) {
    // Inline isEditableTarget check
    const target = e.target;
    if (target && target instanceof HTMLElement) {
      const tag = target.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target.isContentEditable
      )
        return;
    }

    for (const cmd of commandsRef.current) {
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
}

function makeCmd(
  overrides: Partial<CommandDefinition> = {}
): CommandDefinition {
  return {
    id: 'test',
    label: 'Test',
    type: 'action',
    group: 'g',
    onSelect: vi.fn(),
    ...overrides,
  };
}

function fireKeyDown(
  key: string,
  opts: {
    metaKey?: boolean;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    target?: EventTarget;
  } = {}
) {
  const event = new KeyboardEvent('keydown', {
    key,
    metaKey: opts.metaKey ?? false,
    ctrlKey: opts.ctrlKey ?? false,
    shiftKey: opts.shiftKey ?? false,
    altKey: opts.altKey ?? false,
    bubbles: true,
    cancelable: true,
  });

  if (opts.target) {
    Object.defineProperty(event, 'target', {
      value: opts.target,
      writable: false,
    });
  }

  document.dispatchEvent(event);
  return event;
}

describe('useGlobalShortcuts (simulated)', () => {
  const originalNavigator = globalThis.navigator;
  let cleanup: () => void;

  beforeEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { platform: 'Win32' },
      writable: true,
    });
    cleanup = () => {};
  });

  afterEach(() => {
    cleanup();
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
    });
  });

  it('executes command when shortcut matches', () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const cmd = makeCmd({ id: 'home', shortcut: kbd('h', 'mod') });

    cleanup = simulateHook([cmd], execute);

    fireKeyDown('h', { ctrlKey: true });
    expect(execute).toHaveBeenCalledWith(cmd);
  });

  it('does not execute when shortcut does not match', () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const cmd = makeCmd({ shortcut: kbd('h', 'mod') });

    cleanup = simulateHook([cmd], execute);

    fireKeyDown('j', { ctrlKey: true });
    expect(execute).not.toHaveBeenCalled();
  });

  it('skips disabled commands', () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const cmd = makeCmd({ shortcut: kbd('h', 'mod'), disabled: true });

    cleanup = simulateHook([cmd], execute);

    fireKeyDown('h', { ctrlKey: true });
    expect(execute).not.toHaveBeenCalled();
  });

  it('skips hidden commands', () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const cmd = makeCmd({ shortcut: kbd('h', 'mod'), hidden: true });

    cleanup = simulateHook([cmd], execute);

    fireKeyDown('h', { ctrlKey: true });
    expect(execute).not.toHaveBeenCalled();
  });

  it('skips commands without shortcut', () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const cmd = makeCmd({ shortcut: undefined });

    cleanup = simulateHook([cmd], execute);

    fireKeyDown('h', { ctrlKey: true });
    expect(execute).not.toHaveBeenCalled();
  });

  it('does nothing when disabled', () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const cmd = makeCmd({ shortcut: kbd('h', 'mod') });

    cleanup = simulateHook([cmd], execute, false);

    fireKeyDown('h', { ctrlKey: true });
    expect(execute).not.toHaveBeenCalled();
  });

  it('first match wins', () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const cmd1 = makeCmd({ id: 'first', shortcut: kbd('h', 'mod') });
    const cmd2 = makeCmd({ id: 'second', shortcut: kbd('h', 'mod') });

    cleanup = simulateHook([cmd1, cmd2], execute);

    fireKeyDown('h', { ctrlKey: true });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(execute).toHaveBeenCalledWith(cmd1);
  });

  it('skips when target is an input', () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const cmd = makeCmd({ shortcut: kbd('h', 'mod') });

    cleanup = simulateHook([cmd], execute);

    const input = document.createElement('input');
    document.body.appendChild(input);
    fireKeyDown('h', { ctrlKey: true, target: input });
    document.body.removeChild(input);

    expect(execute).not.toHaveBeenCalled();
  });

  it('cleans up listener on cleanup call', () => {
    const execute = vi.fn().mockResolvedValue(undefined);
    const cmd = makeCmd({ shortcut: kbd('h', 'mod') });

    cleanup = simulateHook([cmd], execute);
    cleanup();

    fireKeyDown('h', { ctrlKey: true });
    expect(execute).not.toHaveBeenCalled();
  });
});

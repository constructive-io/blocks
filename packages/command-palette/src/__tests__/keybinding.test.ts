import { afterEach, describe, expect, it } from 'vitest';

import { formatKeyBinding, isEditableTarget, isMac, kbd, matchKeyBinding } from '../keybinding';

const originalNavigator = globalThis.navigator;

function setPlatform(platform?: string) {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: platform === undefined ? undefined : { platform },
  });
}

function keyEvent(key: string, modifiers: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return {
    key,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    ...modifiers,
  } as KeyboardEvent;
}

afterEach(() => {
  Object.defineProperty(globalThis, 'navigator', {
    configurable: true,
    value: originalNavigator,
  });
});

describe('keybinding', () => {
  it('detects macOS without breaking server rendering', () => {
    setPlatform();
    expect(isMac()).toBe(false);
    setPlatform('MacIntel');
    expect(isMac()).toBe(true);
    setPlatform('Win32');
    expect(isMac()).toBe(false);
  });

  it('recognizes editable targets that must retain keyboard input', () => {
    for (const tag of ['input', 'textarea', 'select'] as const) {
      expect(isEditableTarget(document.createElement(tag)), tag).toBe(true);
    }
    const editable = document.createElement('div');
    editable.contentEditable = 'true';
    expect(isEditableTarget(editable)).toBe(true);
    expect(isEditableTarget(document.createElement('div'))).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });

  it('matches keys case-insensitively and rejects missing or extra modifiers', () => {
    setPlatform('Win32');
    expect(matchKeyBinding(keyEvent('H'), kbd('h'))).toBe(true);
    expect(matchKeyBinding(keyEvent('k', { ctrlKey: true }), kbd('k', 'mod'))).toBe(true);
    expect(matchKeyBinding(keyEvent('k'), kbd('k', 'mod'))).toBe(false);
    expect(matchKeyBinding(keyEvent('h', { shiftKey: true }), kbd('h'))).toBe(false);
  });

  it('maps the mod key to Command on macOS instead of Control', () => {
    setPlatform('MacIntel');
    expect(matchKeyBinding(keyEvent('k', { metaKey: true }), kbd('k', 'mod'))).toBe(true);
    expect(matchKeyBinding(keyEvent('k', { ctrlKey: true }), kbd('k', 'mod'))).toBe(false);
  });

  it('formats shortcuts for the active platform', () => {
    setPlatform('MacIntel');
    expect(formatKeyBinding(kbd('p', 'mod', 'shift'))).toEqual(['⌘', '⇧', 'P']);
    setPlatform('Win32');
    expect(formatKeyBinding(kbd('p', 'mod', 'shift'))).toEqual(['Ctrl', 'Shift', 'P']);
  });
});

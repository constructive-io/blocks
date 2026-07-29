import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  kbd,
  isMac,
  isEditableTarget,
  matchKeyBinding,
  formatKeyBinding,
} from '../keybinding';
import type { KeyBinding } from '../keybinding';

// Helper to create a KeyboardEvent-like object
function fakeKeyEvent(
  key: string,
  opts: {
    metaKey?: boolean;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
  } = {}
): KeyboardEvent {
  return {
    key,
    metaKey: opts.metaKey ?? false,
    ctrlKey: opts.ctrlKey ?? false,
    shiftKey: opts.shiftKey ?? false,
    altKey: opts.altKey ?? false,
  } as KeyboardEvent;
}

describe('kbd factory', () => {
  it('creates binding with key only', () => {
    expect(kbd('enter')).toEqual({ key: 'enter' });
  });

  it('creates binding with one modifier', () => {
    expect(kbd('h', 'mod')).toEqual({ key: 'h', modifiers: ['mod'] });
  });

  it('creates binding with multiple modifiers', () => {
    expect(kbd('p', 'mod', 'shift')).toEqual({
      key: 'p',
      modifiers: ['mod', 'shift'],
    });
  });
});

describe('isMac', () => {
  const originalNavigator = globalThis.navigator;

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
    });
  });

  it('returns false when navigator is undefined (SSR)', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: undefined,
      writable: true,
    });
    expect(isMac()).toBe(false);
  });

  it('returns true for Mac platform', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { platform: 'MacIntel' },
      writable: true,
    });
    expect(isMac()).toBe(true);
  });

  it('returns false for Windows platform', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { platform: 'Win32' },
      writable: true,
    });
    expect(isMac()).toBe(false);
  });
});

describe('isEditableTarget', () => {
  it('returns false for null', () => {
    expect(isEditableTarget(null)).toBe(false);
  });

  it('returns true for INPUT', () => {
    const el = document.createElement('input');
    expect(isEditableTarget(el)).toBe(true);
  });

  it('returns true for TEXTAREA', () => {
    const el = document.createElement('textarea');
    expect(isEditableTarget(el)).toBe(true);
  });

  it('returns true for SELECT', () => {
    const el = document.createElement('select');
    expect(isEditableTarget(el)).toBe(true);
  });

  it('returns true for contentEditable', () => {
    const el = document.createElement('div');
    el.contentEditable = 'true';
    expect(isEditableTarget(el)).toBe(true);
  });

  it('returns false for regular div', () => {
    const el = document.createElement('div');
    expect(isEditableTarget(el)).toBe(false);
  });

  it('returns false for non-HTMLElement', () => {
    expect(isEditableTarget({} as EventTarget)).toBe(false);
  });
});

describe('matchKeyBinding', () => {
  // Set platform to non-Mac for predictable tests
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { platform: 'Win32' },
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
    });
  });

  it('matches simple key', () => {
    expect(matchKeyBinding(fakeKeyEvent('h'), kbd('h'))).toBe(true);
  });

  it('case insensitive key match', () => {
    expect(matchKeyBinding(fakeKeyEvent('H'), kbd('h'))).toBe(true);
  });

  it('rejects wrong key', () => {
    expect(matchKeyBinding(fakeKeyEvent('j'), kbd('h'))).toBe(false);
  });

  it('matches mod+key on Windows (ctrlKey)', () => {
    expect(
      matchKeyBinding(fakeKeyEvent('k', { ctrlKey: true }), kbd('k', 'mod'))
    ).toBe(true);
  });

  it('rejects mod+key when ctrl is not pressed', () => {
    expect(matchKeyBinding(fakeKeyEvent('k'), kbd('k', 'mod'))).toBe(false);
  });

  it('rejects extra modifiers (ctrl pressed but not required)', () => {
    expect(
      matchKeyBinding(fakeKeyEvent('h', { ctrlKey: true }), kbd('h'))
    ).toBe(false);
  });

  it('rejects extra shift modifier', () => {
    expect(
      matchKeyBinding(
        fakeKeyEvent('h', { ctrlKey: true, shiftKey: true }),
        kbd('h', 'mod')
      )
    ).toBe(false);
  });

  it('matches mod+shift+key', () => {
    expect(
      matchKeyBinding(
        fakeKeyEvent('p', { ctrlKey: true, shiftKey: true }),
        kbd('p', 'mod', 'shift')
      )
    ).toBe(true);
  });

  it('matches alt+key', () => {
    expect(
      matchKeyBinding(fakeKeyEvent('a', { altKey: true }), kbd('a', 'alt'))
    ).toBe(true);
  });

  describe('Mac platform', () => {
    beforeEach(() => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { platform: 'MacIntel' },
        writable: true,
      });
    });

    it('matches mod+key on Mac (metaKey)', () => {
      expect(
        matchKeyBinding(fakeKeyEvent('k', { metaKey: true }), kbd('k', 'mod'))
      ).toBe(true);
    });

    it('rejects ctrlKey for mod on Mac', () => {
      expect(
        matchKeyBinding(fakeKeyEvent('k', { ctrlKey: true }), kbd('k', 'mod'))
      ).toBe(false);
    });
  });
});

describe('formatKeyBinding', () => {
  const originalNavigator = globalThis.navigator;

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
    });
  });

  it('formats single key', () => {
    expect(formatKeyBinding(kbd('enter'))).toEqual(['enter']);
  });

  it('capitalizes single-char keys', () => {
    expect(formatKeyBinding(kbd('h'))).toEqual(['H']);
  });

  describe('Mac', () => {
    beforeEach(() => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { platform: 'MacIntel' },
        writable: true,
      });
    });

    it('formats mod as ⌘', () => {
      expect(formatKeyBinding(kbd('h', 'mod'))).toEqual(['⌘', 'H']);
    });

    it('formats shift as ⇧', () => {
      expect(formatKeyBinding(kbd('p', 'mod', 'shift'))).toEqual([
        '⌘',
        '⇧',
        'P',
      ]);
    });

    it('formats alt as ⌥', () => {
      expect(formatKeyBinding(kbd('a', 'alt'))).toEqual(['⌥', 'A']);
    });
  });

  describe('PC', () => {
    beforeEach(() => {
      Object.defineProperty(globalThis, 'navigator', {
        value: { platform: 'Win32' },
        writable: true,
      });
    });

    it('formats mod as Ctrl', () => {
      expect(formatKeyBinding(kbd('h', 'mod'))).toEqual(['Ctrl', 'H']);
    });

    it('formats shift as Shift', () => {
      expect(formatKeyBinding(kbd('p', 'mod', 'shift'))).toEqual([
        'Ctrl',
        'Shift',
        'P',
      ]);
    });

    it('formats alt as Alt', () => {
      expect(formatKeyBinding(kbd('a', 'alt'))).toEqual(['Alt', 'A']);
    });
  });
});

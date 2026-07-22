/**
 * Spec for keymap resolution (keymap.ts / resolveKeyCommand). Covers Mod chords (undo /
 * redo / select-all, mac + non-mac), strict modifier disambiguation (Mod+Z vs Mod+Shift+Z),
 * arrow move vs shift-extend, first-match-wins, and printable-unbound → null (so the funnel
 * can fall to the editor.typeToEdit sentinel).
 */

import { afterEach, describe, expect, it } from 'vitest';

import { DEFAULT_KEYMAP, resolveKeyCommand } from '../keymap';

function ev(key: string, mods: Partial<{ ctrl: boolean; meta: boolean; shift: boolean; alt: boolean }> = {}): KeyboardEvent {
	return {
		key,
		ctrlKey: !!mods.ctrl,
		metaKey: !!mods.meta,
		shiftKey: !!mods.shift,
		altKey: !!mods.alt,
	} as KeyboardEvent;
}

// isMac() reads navigator.platform; control it directly (intra-module calls bind the local
// reference, so a vi.spyOn on the module export would NOT take effect — stub the global).
const ORIGINAL_PLATFORM = Object.getOwnPropertyDescriptor(navigator, 'platform');
function setPlatform(value: string) {
	Object.defineProperty(navigator, 'platform', { value, configurable: true });
}
afterEach(() => {
	if (ORIGINAL_PLATFORM) Object.defineProperty(navigator, 'platform', ORIGINAL_PLATFORM);
});

describe('resolveKeyCommand (non-mac: Mod = ctrl)', () => {
	function asWindows() {
		setPlatform('Win32');
	}

	it('resolves Ctrl+Z → edit.undo', () => {
		asWindows();
		expect(resolveKeyCommand(ev('z', { ctrl: true }))).toBe('edit.undo');
	});

	it('resolves Ctrl+Shift+Z → edit.redo (strict shift disambiguation, not undo)', () => {
		asWindows();
		expect(resolveKeyCommand(ev('z', { ctrl: true, shift: true }))).toBe('edit.redo');
	});

	it('resolves Ctrl+Y → edit.redo', () => {
		asWindows();
		expect(resolveKeyCommand(ev('y', { ctrl: true }))).toBe('edit.redo');
	});

	it('resolves Ctrl+A → selection.all', () => {
		asWindows();
		expect(resolveKeyCommand(ev('a', { ctrl: true }))).toBe('selection.all');
	});

	it('does NOT resolve a bare Z (no modifier) to undo', () => {
		asWindows();
		expect(resolveKeyCommand(ev('z'))).toBeNull();
	});
});

describe('resolveKeyCommand (mac: Mod = meta)', () => {
	it('resolves Cmd+Z → edit.undo and Cmd+Shift+Z → edit.redo', () => {
		setPlatform('MacIntel');
		expect(resolveKeyCommand(ev('z', { meta: true }))).toBe('edit.undo');
		expect(resolveKeyCommand(ev('z', { meta: true, shift: true }))).toBe('edit.redo');
	});

	it('does NOT resolve Ctrl+Z on mac (mod is meta there)', () => {
		setPlatform('MacIntel');
		expect(resolveKeyCommand(ev('z', { ctrl: true }))).toBeNull();
	});
});

describe('resolveKeyCommand arrows', () => {
	it('plain arrows resolve to move commands', () => {
		expect(resolveKeyCommand(ev('ArrowUp'))).toBe('cell.moveUp');
		expect(resolveKeyCommand(ev('ArrowDown'))).toBe('cell.moveDown');
		expect(resolveKeyCommand(ev('ArrowLeft'))).toBe('cell.moveLeft');
		expect(resolveKeyCommand(ev('ArrowRight'))).toBe('cell.moveRight');
	});

	it('shift+arrows resolve to extend commands (not move)', () => {
		expect(resolveKeyCommand(ev('ArrowUp', { shift: true }))).toBe('cell.extendUp');
		expect(resolveKeyCommand(ev('ArrowRight', { shift: true }))).toBe('cell.extendRight');
	});
});

describe('resolveKeyCommand absolute nav + editor', () => {
	it('Tab/Home/End/PageUp/PageDown → cell.navAbsolute', () => {
		for (const k of ['Tab', 'Home', 'End', 'PageUp', 'PageDown']) {
			expect(resolveKeyCommand(ev(k))).toBe('cell.navAbsolute');
		}
	});

	it('Enter/F2 → editor.openActive', () => {
		expect(resolveKeyCommand(ev('Enter'))).toBe('editor.openActive');
		expect(resolveKeyCommand(ev('F2'))).toBe('editor.openActive');
	});
});

describe('resolveKeyCommand printable fallthrough', () => {
	it('an unbound printable key returns null (funnel falls to editor.typeToEdit)', () => {
		expect(resolveKeyCommand(ev('q'))).toBeNull();
		expect(resolveKeyCommand(ev('5'))).toBeNull();
	});
});

describe('first-match-wins', () => {
	it('returns the first matching binding when two map the same key', () => {
		const map = [
			{ trigger: { kind: 'key' as const, binding: { key: 'x' } }, command: 'first' },
			{ trigger: { kind: 'key' as const, binding: { key: 'x' } }, command: 'second' },
		];
		expect(resolveKeyCommand(ev('x'), map)).toBe('first');
	});

	it('skips pointer/native triggers (only key triggers resolve)', () => {
		const map = [
			{ trigger: { kind: 'pointer' as const, gesture: 'click' as const }, command: 'p' },
			{ trigger: { kind: 'key' as const, binding: { key: 'x' } }, command: 'k' },
		];
		expect(resolveKeyCommand(ev('x'), map)).toBe('k');
	});
});

describe('DEFAULT_KEYMAP shape', () => {
	it('declares pointer triggers for the structural gestures', () => {
		const pointers = DEFAULT_KEYMAP.filter((b) => b.trigger.kind === 'pointer').map((b) => b.command);
		expect(pointers).toEqual(
			expect.arrayContaining([
				'cell.activate',
				'cell.extendToClicked',
				'editor.open',
				'header.sortToggle',
				'rowmarker.toggleRow',
				'rowmarker.toggleAll',
			]),
		);
	});
});

/**
 * DEFAULT_KEYMAP + resolveKeyCommand (P4 Phase 1).
 *
 * A keymap is an ordered Binding[]; `resolveKeyCommand` returns the FIRST matching
 * binding's command id (first-match-wins) or `null` when nothing matches — including
 * for an unbound PRINTABLE key, so the dispatch funnel can fall to the `editor.typeToEdit`
 * sentinel (the printable-key path is NOT in the keymap; the funnel routes it explicitly).
 *
 * Triggers come in three kinds — `key` (matched here via the copied matchKeyBinding),
 * `pointer` (gesture, wired in Stage B / Phase 2), and `native` (a raw DOM event name).
 * Pointer + native triggers are declared in the table for invariant completeness even
 * though only key triggers resolve through `resolveKeyCommand`.
 *
 * `Mod` is ctrl on win/linux, cmd on mac — encoded as the copied `'mod'` KeyModifier, so
 * matchKeyBinding's platform branch (isMac) picks the right physical key.
 */

import { kbd, matchKeyBinding, type KeyBinding } from './keybinding';

/** A pointer gesture name (resolved by the pointer handlers, not the key funnel). */
export type PointerGesture = 'click' | 'shiftClick' | 'dblclick' | 'headerClick' | 'rowToggle' | 'rowToggleAll';

/** What fires a command. */
export type Trigger =
	| { kind: 'key'; binding: KeyBinding }
	| { kind: 'pointer'; gesture: PointerGesture }
	| { kind: 'native'; event: string };

/** A trigger -> command id mapping. */
export interface Binding {
	trigger: Trigger;
	command: string;
}

/** key-trigger shorthand. */
function key(binding: KeyBinding, command: string): Binding {
	return { trigger: { kind: 'key', binding }, command };
}

/** pointer-trigger shorthand. */
function pointer(gesture: PointerGesture, command: string): Binding {
	return { trigger: { kind: 'pointer', gesture }, command };
}

/**
 * The default key + pointer + native bindings. Order matters for the key kind
 * (first-match-wins). matchKeyBinding is STRICT on modifiers, so the undo (Mod+Z) and
 * redo (Mod+Shift+Z) chords never alias even though they share the 'z' key.
 */
export const DEFAULT_KEYMAP: Binding[] = [
	// undo / redo
	key(kbd('z', 'mod'), 'edit.undo'),
	key(kbd('z', 'mod', 'shift'), 'edit.redo'),
	key(kbd('y', 'mod'), 'edit.redo'),

	// select all
	key(kbd('a', 'mod'), 'selection.all'),

	// clear cells (Delete / Backspace → null over the active range). The funnel bails
	// while an overlay editor is open, so these still edit text inside an editor.
	key(kbd('Delete'), 'cell.clear'),
	key(kbd('Backspace'), 'cell.clear'),

	// fill (Mod = Cmd/mac, Ctrl/win)
	key(kbd('d', 'mod'), 'fill.down'),
	key(kbd('r', 'mod'), 'fill.right'),

	// arrow move (plain)
	key(kbd('ArrowUp'), 'cell.moveUp'),
	key(kbd('ArrowDown'), 'cell.moveDown'),
	key(kbd('ArrowLeft'), 'cell.moveLeft'),
	key(kbd('ArrowRight'), 'cell.moveRight'),

	// arrow extend (shift)
	key(kbd('ArrowUp', 'shift'), 'cell.extendUp'),
	key(kbd('ArrowDown', 'shift'), 'cell.extendDown'),
	key(kbd('ArrowLeft', 'shift'), 'cell.extendLeft'),
	key(kbd('ArrowRight', 'shift'), 'cell.extendRight'),

	// absolute nav — base + ctrl/meta + shift variants all resolve to one command (the
	// command body branches on the payload via computeKeyNavTarget, matching the original).
	key(kbd('Tab'), 'cell.navAbsolute'),
	key(kbd('Tab', 'shift'), 'cell.navAbsolute'),
	key(kbd('Home'), 'cell.navAbsolute'),
	key(kbd('Home', 'mod'), 'cell.navAbsolute'),
	key(kbd('End'), 'cell.navAbsolute'),
	key(kbd('End', 'mod'), 'cell.navAbsolute'),
	key(kbd('PageUp'), 'cell.navAbsolute'),
	key(kbd('PageDown'), 'cell.navAbsolute'),

	// open editor at active cell
	key(kbd('Enter'), 'editor.openActive'),
	key(kbd('F2'), 'editor.openActive'),

	// pointer gestures (wired Stage B / Phase 2)
	pointer('click', 'cell.activate'),
	pointer('shiftClick', 'cell.extendToClicked'),
	pointer('dblclick', 'editor.open'),
	pointer('headerClick', 'header.sortToggle'),
	pointer('rowToggle', 'rowmarker.toggleRow'),
	pointer('rowToggleAll', 'rowmarker.toggleAll'),
];

/**
 * Resolve a KeyboardEvent to a command id via the keymap (first key-trigger match wins).
 * Returns `null` when no key binding matches — including unbound printable keys — so the
 * caller can fall to the `editor.typeToEdit` sentinel. Pointer / native triggers are
 * ignored here (they are not key events).
 */
export function resolveKeyCommand(event: KeyboardEvent, keymap: Binding[] = DEFAULT_KEYMAP): string | null {
	for (const binding of keymap) {
		if (binding.trigger.kind !== 'key') continue;
		if (matchKeyBinding(event, binding.trigger.binding)) return binding.command;
	}
	return null;
}

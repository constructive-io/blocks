/**
 * DEFAULT_KEYMAP + resolveKeyCommand (P4 Phase 1).
 *
 * A keymap is an ordered Binding[]; `resolveKeyCommand` returns the FIRST matching
 * binding's command id (first-match-wins) or `null` when nothing matches. The grid tries
 * every binding of a chord in order (`resolveKeyBindings`) and runs the first whose command
 * can run, so one key can mean "close the panel, else clear the selection". Nothing matches
 * an unbound PRINTABLE key either, so the dispatch funnel can fall to the `editor.typeToEdit`
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
export type PointerGesture =
	| 'click'
	| 'shiftClick'
	| 'dblclick'
	| 'headerClick'
	| 'headerShiftClick'
	| 'rowToggle'
	| 'rowToggleAll';

/** What fires a command. */
export type Trigger =
	| { kind: 'key'; binding: KeyBinding }
	| { kind: 'pointer'; gesture: PointerGesture }
	| { kind: 'native'; event: string };

/** A trigger -> command id mapping. */
export interface Binding {
	trigger: Trigger;
	command: string;
	/**
	 * Keep the key from the browser while the grid has focus even when the command
	 * does not run. For chords whose browser action loses work (Mod+R reloads the page).
	 */
	claim?: boolean;
}

/** key-trigger shorthand. */
function key(binding: KeyBinding, command: string, options: { claim?: boolean } = {}): Binding {
	return { trigger: { kind: 'key', binding }, command, ...(options.claim ? { claim: true } : {}) };
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

	// fill (Mod = Cmd/mac, Ctrl/win). Mod+R is the spreadsheet chord for fill right and the
	// browser chord for reload. The grid claims it, so pressing it on a selection that cannot
	// fill right never reloads the page and loses unsaved drafts.
	key(kbd('d', 'mod'), 'fill.down'),
	key(kbd('r', 'mod'), 'fill.right', { claim: true }),

	// view: search, filters, sort
	key(kbd('f', 'mod'), 'view.focusSearch'),
	key(kbd('f', 'mod', 'shift'), 'view.openFilters'),
	key(kbd('s', 'mod', 'shift'), 'view.openSort'),
	key(kbd('s', 'mod'), 'view.saveView'),

	// record panel: open the active row (plain Space stays type-to-edit)
	key(kbd(' ', 'shift'), 'record.open'),

	// Escape, outermost first: close the record panel, else collapse the range, else clear the
	// active cell. An open editor or popover takes Escape before the grid sees it.
	key(kbd('Escape'), 'record.close'),
	key(kbd('Escape'), 'selection.clear'),

	// context menu at the active cell (its "Open link" item opens a link cell from the keyboard)
	key(kbd('F10', 'shift'), 'cell.openContextMenu'),
	key(kbd('ContextMenu'), 'cell.openContextMenu'),

	// columns: header menu, move the active cell's column
	key(kbd('ArrowDown', 'alt'), 'column.openMenu'),
	key(kbd('ArrowLeft', 'alt', 'shift'), 'column.moveLeft'),
	key(kbd('ArrowRight', 'alt', 'shift'), 'column.moveRight'),

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
	pointer('headerShiftClick', 'header.sortToggle'),
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
	return resolveKeyBinding(event, keymap)?.command ?? null;
}

/** The first key binding that matches the event, or null. Use it to honor `claim`. */
export function resolveKeyBinding(event: KeyboardEvent, keymap: Binding[] = DEFAULT_KEYMAP): Binding | null {
	return resolveKeyBindings(event, keymap)[0] ?? null;
}

/** Every key binding that matches the event, in keymap order (consumer bindings first). */
export function resolveKeyBindings(event: KeyboardEvent, keymap: Binding[] = DEFAULT_KEYMAP): Binding[] {
	return keymap.filter((binding) => binding.trigger.kind === 'key' && matchKeyBinding(event, binding.trigger.binding));
}

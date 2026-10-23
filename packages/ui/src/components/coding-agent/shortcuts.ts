/**
 * Keyboard shortcuts. Picked to avoid the ones browsers keep for themselves (⌘T, ⌘W, ⌘N, ⌃Tab), so they work the
 * same in a browser tab as in a desktop shell.
 */
export const SHORTCUTS = {
	commandMenu: { key: 'k', mod: true, label: '⌘K' },
	newSession: { key: 'n', mod: true, alt: true, label: '⌥⌘N' },
	closeSession: { key: 'w', mod: true, alt: true, label: '⌥⌘W' },
	openFile: { key: 'p', mod: true, label: '⌘P' },
	browser: { key: 'b', mod: true, shift: true, label: '⇧⌘B' },
	togglePanel: { key: '\\', mod: true, label: '⌘\\' },
	toggleTree: { key: '\\', mod: true, shift: true, label: '⇧⌘\\' },
	toggleTerminal: { key: '`', ctrl: true, label: '⌃`' }
} as const;

export type ShortcutId = keyof typeof SHORTCUTS;

type Shortcut = { key: string; mod?: boolean; alt?: boolean; shift?: boolean; ctrl?: boolean };

/** True when `event` is `shortcut`. `mod` is ⌘ on Apple platforms and Ctrl elsewhere. */
export function matches(event: KeyboardEvent, shortcut: Shortcut) {
	const apple = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
	const mod = apple ? event.metaKey : event.ctrlKey;
	// ⌥ and ⇧ change `key` on some layouts, so letters are matched on the physical key.
	const key = /^[a-z]$/.test(shortcut.key) ? event.code === `Key${shortcut.key.toUpperCase()}` : event.key === shortcut.key || (shortcut.key === '\\' && event.code === 'Backslash') || (shortcut.key === '`' && event.code === 'Backquote');
	// A ⌃ shortcut is Ctrl everywhere; off Apple that is also `mod`, so the mod check would reject it.
	const modMatches = shortcut.ctrl && !apple ? true : Boolean(shortcut.mod) === mod;
	return (
		key &&
		modMatches &&
		Boolean(shortcut.alt) === event.altKey &&
		Boolean(shortcut.shift) === event.shiftKey &&
		(shortcut.ctrl ? event.ctrlKey : true)
	);
}

/** "New session (⌥⌘N)": the tooltip text for a control with a shortcut. */
export function withShortcut(label: string, id: ShortcutId) {
	return `${label} (${SHORTCUTS[id].label})`;
}

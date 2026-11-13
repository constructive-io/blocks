// Keys and the clipboard on the grid root: every chord resolves to a named command through
// the one dispatch pipeline; native copy, cut and paste events do too.
import { useCallback, useRef, type MutableRefObject } from 'react';
import type React from 'react';

import type { Dispatch } from '../../commands/dispatch';
import { resolveKeyBindings, type Binding } from '../../commands/keymap';
import type { NavAbsolutePayload } from '../../commands/registry';

// Rows moved per PageUp/PageDown when the scroll element's clientHeight can't be read
// (jsdom / detached). A sensible spreadsheet page span.
const FALLBACK_PAGE_ROWS = 10;

/** The absolute-nav keys whose command (`cell.navAbsolute`) needs the payload below. */
const ABSOLUTE_NAV_KEYS = new Set(['Tab', 'Home', 'End', 'PageUp', 'PageDown']);

/**
 * Build the dispatch payload for a key event. Only `cell.navAbsolute` (Tab/Home/End/Page*)
 * needs one — the funnel's old inline branch derived the page span from the scroll element's
 * clientHeight (e.currentTarget IS the scroll root), falling back to a constant under jsdom.
 * Arrows / extends / undo / redo / select-all / open read everything from the command context,
 * so they get `undefined`.
 */
function buildKeyPayload(e: React.KeyboardEvent, rowHeight: number): NavAbsolutePayload | undefined {
	if (!ABSOLUTE_NAV_KEYS.has(e.key)) return undefined;
	const clientHeight = (e.currentTarget as HTMLElement).clientHeight;
	const pageRows = clientHeight > 0 ? Math.max(1, Math.floor(clientHeight / rowHeight)) : FALLBACK_PAGE_ROWS;
	return { key: e.key, ctrlOrMeta: e.ctrlKey || e.metaKey, shift: e.shiftKey, pageRows };
}

export interface UseGridKeyboardInput {
	isOverlayOpen: boolean;
	dispatch: Dispatch;
	keymapRef: MutableRefObject<Binding[]>;
	rowHeightPx: number;
}

export function useGridKeyboard({ isOverlayOpen, dispatch, keymapRef, rowHeightPx }: UseGridKeyboardInput) {
	// Every grid key now resolves to a NAMED command through the ONE dispatch pipeline. The
	// keymap (first-match-wins) covers undo/redo/select-all/arrows/extend/abs-nav/open; an
	// UNRESOLVED key that is a single printable char (no ctrl/meta/alt) falls to the
	// `editor.typeToEdit` sentinel (also through dispatch, so it is interceptable). Any other
	// unresolved key is left untouched — NO dispatch, NO preventDefault — so it reaches the
	// browser. preventDefault lives in the dispatch CORE, gated on a resolved+runnable command.
	// Page span (PageUp / PageDown) follows the view's row height.
	const rowHeightRef = useRef(rowHeightPx);
	rowHeightRef.current = rowHeightPx;
	const handleGridKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			// Don't intercept while editing — the overlay editor owns its own keys.
			if (isOverlayOpen) return;
			// Every binding of the chord, in keymap order, until one runs (Escape: close the record
			// panel, else clear the selection).
			const bindings = resolveKeyBindings(e.nativeEvent, keymapRef.current);
			if (bindings.length > 0) {
				const payload = buildKeyPayload(e, rowHeightRef.current);
				let ran = false;
				let prevented = false;
				for (const binding of bindings) {
					const result = dispatch(binding.command, e.nativeEvent, payload);
					prevented ||= result.prevented;
					if (result.ran) {
						ran = true;
						break;
					}
				}
				// A claimed chord (Mod+R) never reaches the browser, even when its command did not run.
				if (!prevented && bindings.some((binding) => binding.claim)) e.preventDefault();
				// A printable chord whose command did not run (Shift+Space with no record panel) still types.
				if (ran || e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
			}
			// Unresolved: only the printable-key sentinel routes through dispatch; everything
			// else falls through to the browser with no preventDefault.
			if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
				dispatch('editor.typeToEdit', e.nativeEvent, { char: e.key });
			}
		},
		[isOverlayOpen, dispatch],
	);

	// ============== NATIVE CLIPBOARD (Stage B) ==============
	// The grid root (role=grid, tabIndex=0) receives the browser's native copy/cut/paste events
	// when focused. We do NOT bind Ctrl/Cmd+C/X/V in the keymap — pressing them fires these native
	// events directly, so binding the keys too would double-handle. Each handler is SKIPPED while an
	// overlay editor is open (the editor owns its own clipboard) and routes through the ONE dispatch
	// pipeline as `clipboard.copy`/`cut`/`paste`, threading the native ClipboardData as the payload.
	// preventDefault happens in the dispatch core (so the browser does not also copy/paste).
	const handleCopy = useCallback(
		(e: React.ClipboardEvent) => {
			if (isOverlayOpen) return;
			dispatch('clipboard.copy', e.nativeEvent, { clipboard: (e.nativeEvent as ClipboardEvent).clipboardData });
		},
		[isOverlayOpen, dispatch],
	);
	const handleCut = useCallback(
		(e: React.ClipboardEvent) => {
			if (isOverlayOpen) return;
			dispatch('clipboard.cut', e.nativeEvent, { clipboard: (e.nativeEvent as ClipboardEvent).clipboardData });
		},
		[isOverlayOpen, dispatch],
	);
	const handlePaste = useCallback(
		(e: React.ClipboardEvent) => {
			if (isOverlayOpen) return;
			dispatch('clipboard.paste', e.nativeEvent, { clipboard: (e.nativeEvent as ClipboardEvent).clipboardData });
		},
		[isOverlayOpen, dispatch],
	);

	return { handleGridKeyDown, handleCopy, handleCut, handlePaste };
}

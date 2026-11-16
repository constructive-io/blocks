// Keyboard focus in the file editor.
//
// First focus goes to the control that adds a file (the dropzone, or "Replace"),
// or to Close or Cancel when the editor cannot take a file. Not to the first
// file's first action: that is an "Open" link, which a held Enter would follow.
//
// Focus also comes back when the focused control goes away: a removed file row,
// or a button that turns disabled while an upload runs. The browser then moves
// focus to the page body, where Escape and Tab no longer reach the editor.

import { useCallback, useEffect, useRef, type RefObject } from 'react';

/** Marks the control that adds a file. */
export const ADD_CONTROL = 'add';
/** Marks the Close or Cancel button. */
export const CLOSE_CONTROL = 'close';

function focusTarget(root: HTMLElement): HTMLElement | null {
	return root.querySelector<HTMLElement>(`[data-initial-focus="${ADD_CONTROL}"]:not([aria-disabled="true"]):not([disabled])`)
		?? root.querySelector<HTMLElement>(`[data-initial-focus="${CLOSE_CONTROL}"]:not([disabled])`);
}

function focusIsLost(): boolean {
	const active = document.activeElement;
	return !active || active === document.body || active === document.documentElement;
}

/**
 * `canAdd` is true once the editor can take a file (storage resolved, nothing
 * running). An editor that opened before that has focus on Close or Cancel; it
 * moves to the add control when it appears, unless the user has moved on.
 */
export function useEditorFocus(rootRef: RefObject<HTMLElement | null>, canAdd: boolean): void {
	const placed = useRef<HTMLElement | null>(null);

	const recover = useCallback(() => {
		const root = rootRef.current;
		if (root?.isConnected && focusIsLost()) focusTarget(root)?.focus();
	}, [rootRef]);

	// A passive effect, so it runs after the focus traps' own first focus.
	useEffect(() => {
		const root = rootRef.current;
		const target = root ? focusTarget(root) : null;
		target?.focus();
		placed.current = target;
	}, [rootRef]);

	useEffect(() => {
		const root = rootRef.current;
		const first = placed.current;
		if (!canAdd || !root || !first || document.activeElement !== first || first.dataset.initialFocus !== CLOSE_CONTROL) return;
		const target = focusTarget(root);
		if (target && target !== first) {
			target.focus();
			placed.current = target;
		}
	}, [canAdd, rootRef]);

	useEffect(() => {
		const root = rootRef.current;
		if (!root) return;
		// Focus leaving for nowhere (no related target): a removed control leaves at once,
		// a disabled one on the browser's next rendering step. Check once it has settled.
		let timer: ReturnType<typeof setTimeout> | undefined;
		const onFocusOut = (event: FocusEvent) => {
			if (event.relatedTarget) return;
			clearTimeout(timer);
			timer = setTimeout(recover, 0);
		};
		root.addEventListener('focusout', onFocusOut);
		return () => {
			root.removeEventListener('focusout', onFocusOut);
			clearTimeout(timer);
		};
	}, [recover, rootRef]);
}

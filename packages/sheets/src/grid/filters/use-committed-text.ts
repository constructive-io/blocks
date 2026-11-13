import { useCallback, useEffect, useRef, useState } from 'react';

/** Pause after the last keystroke before typed text is committed. */
export const TEXT_COMMIT_DELAY_MS = 250;

export interface CommittedText {
	/** The text in the input. */
	text: string;
	/** Set the text and commit it after a pause in typing. */
	change: (text: string) => void;
	/** Commit the current text now (Enter, blur). */
	flush: () => void;
	/** Set and commit `text` now (clear, pick). */
	commitNow: (text: string) => void;
}

/**
 * Text that a control commits after a pause in typing, so a list query runs
 * once per pause instead of once per keystroke. A new committed value from
 * outside (a host or a reset) replaces the text unless the user is typing.
 */
export function useCommittedText(value: string, commit: (text: string) => void, delay = TEXT_COMMIT_DELAY_MS): CommittedText {
	const [text, setText] = useState(value);
	const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
	const latest = useRef({ text, commit, value });
	latest.current = { text, commit, value };

	const cancel = () => {
		if (pending.current) clearTimeout(pending.current);
		pending.current = null;
	};

	useEffect(() => {
		if (!pending.current) setText(value);
	}, [value]);

	// Unmounting drops a pending commit: the commit would carry the closure of a condition that
	// may have changed since. Leaving the input (blur) and Enter commit at once.
	useEffect(() => cancel, []);

	const flush = useCallback(() => {
		cancel();
		if (latest.current.text !== latest.current.value) latest.current.commit(latest.current.text);
	}, []);

	const change = useCallback(
		(next: string) => {
			setText(next);
			latest.current.text = next;
			cancel();
			pending.current = setTimeout(() => {
				pending.current = null;
				if (latest.current.text !== latest.current.value) latest.current.commit(latest.current.text);
			}, delay);
		},
		[delay],
	);

	const commitNow = useCallback((next: string) => {
		cancel();
		setText(next);
		latest.current.text = next;
		if (next !== latest.current.value) latest.current.commit(next);
	}, []);

	return { text, change, flush, commitNow };
}

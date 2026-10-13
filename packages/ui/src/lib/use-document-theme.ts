import { useSyncExternalStore } from 'react';

export type DocumentTheme = 'light' | 'dark';

const listeners = new Set<() => void>();
let observer: MutationObserver | undefined;

/** One observer on `<html>` serves every subscriber; it connects with the first and disconnects with the last. */
function subscribe(listener: () => void) {
	listeners.add(listener);
	if (!observer) {
		observer = new MutationObserver(() => listeners.forEach((notify) => notify()));
		observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
	}
	return () => {
		listeners.delete(listener);
		if (listeners.size === 0) {
			observer?.disconnect();
			observer = undefined;
		}
	};
}

const subscribeToNothing = () => () => {};

const getTheme = (): DocumentTheme => (document.documentElement.classList.contains('dark') ? 'dark' : 'light');

const getServerTheme = (): DocumentTheme => 'light';

/**
 * The theme the page is in, following the `dark` class on `<html>`. Pass `false` when the caller has a theme of its
 * own, so it does not subscribe to changes it would ignore.
 */
export function useDocumentTheme(follow = true): DocumentTheme {
	return useSyncExternalStore(follow ? subscribe : subscribeToNothing, getTheme, getServerTheme);
}

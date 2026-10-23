'use client';

import * as React from 'react';

import type { HarnessEvent } from './harness';

/**
 * A store a host pushes harness events into as they happen, for harnesses that stream rather than hand over a
 * finished log. The template subscribes to it; nothing else is needed on the host's side.
 */
export type HarnessStore = {
	push: (...events: HarnessEvent[]) => void;
	/** The full log so far. The same array until something is pushed. */
	getEvents: () => readonly HarnessEvent[];
	subscribe: (listener: () => void) => () => void;
	clear: () => void;
};

export function createHarnessStore(initial: readonly HarnessEvent[] = []): HarnessStore {
	let events: readonly HarnessEvent[] = initial;
	const listeners = new Set<() => void>();
	const notify = () => {
		for (const listener of listeners) listener();
	};
	return {
		push: (...next) => {
			if (next.length === 0) return;
			events = [...events, ...next];
			notify();
		},
		getEvents: () => events,
		subscribe: (listener) => {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		clear: () => {
			events = [];
			notify();
		}
	};
}

const EMPTY: readonly HarnessEvent[] = [];

/** The store's events, re-rendering as they arrive. */
export function useHarnessStoreEvents(store: HarnessStore | undefined) {
	return React.useSyncExternalStore(
		store ? store.subscribe : noopSubscribe,
		store ? store.getEvents : () => EMPTY,
		store ? store.getEvents : () => EMPTY
	);
}

function noopSubscribe() {
	return () => {};
}

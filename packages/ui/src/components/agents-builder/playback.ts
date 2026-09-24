'use client';

import * as React from 'react';

/** Longest wait, in milliseconds, between scripted steps when reduced motion is requested. */
const REDUCED_MOTION_DELAY = 40;

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function prefersReducedMotion() {
	return typeof window !== 'undefined' && Boolean(window.matchMedia?.(REDUCED_MOTION_QUERY).matches);
}

function subscribeReducedMotion(onChange: () => void) {
	const query = typeof window === 'undefined' ? undefined : window.matchMedia?.(REDUCED_MOTION_QUERY);
	query?.addEventListener('change', onChange);
	return () => query?.removeEventListener('change', onChange);
}

/** Reduced-motion preference that renders `false` on the server and hydrates without a mismatch. */
export function useReducedMotion() {
	return React.useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, () => false);
}

/**
 * Drives a queue of timed steps: waits `head.delay` and then calls `onDue`,
 * which is expected to consume the head. Keyed on the head's identity, so
 * appending to the queue never restarts the current wait.
 */
export function usePlaybackClock(head: { delay: number } | undefined, paused: boolean, onDue: () => void) {
	const onDueRef = React.useRef(onDue);
	React.useLayoutEffect(() => {
		onDueRef.current = onDue;
	});

	React.useEffect(() => {
		if (!head || paused) return;
		const delay = prefersReducedMotion() ? Math.min(head.delay, REDUCED_MOTION_DELAY) : head.delay;
		const timer = window.setTimeout(() => onDueRef.current(), delay);
		return () => window.clearTimeout(timer);
	}, [head, paused]);
}

'use client';

import * as React from 'react';

import { prefersReducedMotion } from '../workspace-kit/reduced-motion';

export { prefersReducedMotion, useReducedMotion } from '../workspace-kit/reduced-motion';

/** Longest wait, in milliseconds, between scripted steps when reduced motion is requested. */
const REDUCED_MOTION_DELAY = 40;

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

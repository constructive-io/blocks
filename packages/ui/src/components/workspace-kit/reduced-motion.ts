'use client';

import * as React from 'react';

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

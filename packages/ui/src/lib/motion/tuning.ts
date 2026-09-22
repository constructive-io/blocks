import { useSyncExternalStore } from 'react';

/**
 * Live-tunable motion tiers.
 *
 * `springTiers` holds the shared enter/exit timing for the library's motion
 * system (duration-based springs + quicker tween exits). The DialKit panel in
 * Storybook mutates this store so every consumer that reads through
 * `useSpringTiers` / `getSpringTiers` updates live while tuning.
 */
export interface SpringTier {
	/** Enter transition duration in seconds. */
	duration: number;
	/** Spring bounce (0 = critically damped). */
	bounce: number;
	/** Exit tween duration in seconds — always quicker than the enter tier. */
	exitDuration: number;
}

export interface SpringTiers {
	fast: SpringTier;
	moderate: SpringTier;
	slow: SpringTier;
}

export const DEFAULT_SPRING_TIERS: SpringTiers = {
	/** Hover, focus rings, fades, tooltips, selection indicators. */
	fast: { duration: 0.08, bounce: 0, exitDuration: 0.06 },
	/** Short travel and panels that must land exactly: dropdowns, tabs, drawers. */
	moderate: { duration: 0.16, bounce: 0, exitDuration: 0.12 },
	/** Large surfaces: dialogs, side panels, stepped flows. */
	slow: { duration: 0.24, bounce: 0.12, exitDuration: 0.16 },
};

let tiers: SpringTiers = { ...DEFAULT_SPRING_TIERS };
const listeners = new Set<() => void>();

function emit() {
	for (const listener of listeners) listener();
}

export function getSpringTiers(): SpringTiers {
	return tiers;
}

export function setSpringTiers(next: SpringTiers) {
	tiers = { ...next };
	emit();
}

export function resetSpringTiers() {
	tiers = { ...DEFAULT_SPRING_TIERS };
	emit();
}

export function subscribeSpringTiers(listener: () => void): () => void {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

/** Reactive read for components and stories that should re-render on dial changes. */
export function useSpringTiers(): SpringTiers {
	return useSyncExternalStore(subscribeSpringTiers, getSpringTiers, getSpringTiers);
}

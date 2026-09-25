'use client';

import { AnimateView, type AnimateViewProps } from 'motion/react-animate-view';
import * as React from 'react';

import { useReducedMotion } from './reduced-motion';

/**
 * React 19.3 ships `ViewTransition` and `addTransitionType`; older React keeps
 * working, just without these view swaps. Read at runtime so the template
 * builds against any React 18/19 host.
 */
const react = React as typeof React & {
	ViewTransition?: unknown;
	addTransitionType?: (type: string) => void;
};
const supported = typeof react.ViewTransition !== 'undefined';

/** Timing for view swaps: short enough that the non-interruptible transition never blocks the next click. */
const VIEW_TRANSITION = { duration: 0.2, ease: [0.22, 1, 0.36, 1] } as const;

type ViewAnimationProps = AnimateViewProps & { children: React.ReactNode };

/**
 * `AnimateView` for full-view swaps (route-like changes, list swaps, shared
 * elements). Renders children untouched when React lacks `ViewTransition`, and
 * zeroes durations under reduced motion because view-transition pseudo-elements
 * sit outside the app's reduced-motion CSS.
 */
function ViewAnimation({ children, transition, ...props }: ViewAnimationProps) {
	const reduced = useReducedMotion();
	if (!supported) return <>{children}</>;
	return (
		<AnimateView {...props} transition={reduced ? { duration: 0 } : { ...VIEW_TRANSITION, ...transition }}>
			{children}
		</AnimateView>
	);
}

/**
 * Runs a state update as a view transition, tagging it with `types` (e.g. a
 * direction) that `enter`/`exit`/`update` functions can read.
 */
function startViewTransition(update: () => void, ...types: string[]) {
	React.startTransition(() => {
		if (supported) for (const type of types) react.addTransitionType?.(type);
		update();
	});
}

export { ViewAnimation, startViewTransition };

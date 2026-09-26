import type * as React from 'react';

/**
 * A damped spring (mass 1) from 0 to 1, sampled into a CSS `linear()` easing.
 * CSS transitions keep hundreds of moving cards and wires inside the style
 * engine, which is far cheaper per frame than writing them from script, and
 * one shared curve keeps every wire attached to its cards.
 */
function springEasing(stiffness: number, damping: number, samples = 48) {
	const omega = Math.sqrt(stiffness);
	const zeta = damping / (2 * omega);
	const decay = zeta * omega;
	const damped = omega * Math.sqrt(Math.max(0, 1 - zeta * zeta));
	const at = (t: number) =>
		zeta < 1 ? 1 - Math.exp(-decay * t) * (Math.cos(damped * t) + (decay / damped) * Math.sin(damped * t)) : 1 - Math.exp(-omega * t) * (1 + omega * t);
	// Settled once the swing stays within 0.2% of the distance travelled.
	const envelope = zeta < 1 ? Math.sqrt(1 + (decay / damped) ** 2) : 1;
	const seconds = Math.log(envelope / 0.002) / decay;
	const points = Array.from({ length: samples + 1 }, (_, index) => (index === samples ? 1 : Math.round(at((index / samples) * seconds) * 1000) / 1000));
	return { easing: `linear(${points.join(', ')})`, duration: Math.round(seconds * 1000) };
}

/**
 * The chart's one spring: quick, with a whisper of overshoot (about 1.5%),
 * so a whole division unfolding feels physical without wobbling.
 */
export const CHART_SPRING = springEasing(420, 33);

/** Exposes the spring to every card, wire, and dot in the chart as CSS custom properties. */
export const CHART_SPRING_STYLE = {
	'--org-spring': CHART_SPRING.easing,
	'--org-spring-duration': `${CHART_SPRING.duration}ms`,
} as React.CSSProperties;

/** Tailwind classes for a spring transition on the given properties. */
export const springTransition = 'duration-(--org-spring-duration) ease-(--org-spring) motion-reduce:transition-none';

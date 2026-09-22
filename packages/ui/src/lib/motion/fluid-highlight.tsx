'use client';

import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';

import { cn } from '../utils';
import { useSpringTiers } from './tuning';

interface Rect {
	top: number;
	left: number;
	width: number;
	height: number;
}

/**
 * Base UI toggles a bare `data-highlighted` attribute; cmdk uses
 * `data-selected="true"`; Toggle/ToggleGroup mark the active item with
 * `data-pressed`. The `:not([...="false"])` guards cover components
 * like multi-select that render the attribute explicitly as "false".
 */
const TARGET_SELECTOR =
	'[data-highlighted]:not([data-highlighted="false"]), [data-selected="true"], [data-pressed]:not([data-pressed="false"])';
const OBSERVED_ATTRIBUTES = ['data-highlighted', 'data-selected', 'data-pressed'];

/**
 * Track the highlighted descendant of `container` and return its rect in the
 * container's padding-box coordinates. Updates on highlight changes, DOM
 * mutations, and any nested scroll (scroll doesn't bubble, so capture).
 */
function useFluidHighlight(container: HTMLElement | null): { rect: Rect; visible: boolean } | null {
	const [state, setState] = useState<{ rect: Rect; visible: boolean } | null>(null);

	useEffect(() => {
		if (!container) return;

		const update = () => {
			const target = container.querySelector<HTMLElement>(TARGET_SELECTOR);
			if (!target) {
				setState((s) => (s ? { ...s, visible: false } : s));
				return;
			}
			const t = target.getBoundingClientRect();
			const c = container.getBoundingClientRect();
			setState({
				rect: {
					top: t.top - c.top - container.clientTop + container.scrollTop,
					left: t.left - c.left - container.clientLeft,
					width: t.width,
					height: t.height,
				},
				visible: true,
			});
		};

		update();
		const observer = new MutationObserver(update);
		observer.observe(container, {
			attributes: true,
			attributeFilter: OBSERVED_ATTRIBUTES,
			childList: true,
			subtree: true,
		});
		// Re-measure on resize too — items can reflow without attribute changes.
		// ResizeObserver is absent in jsdom and some embedded webviews.
		const resizeObserver =
			typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
		resizeObserver?.observe(container);
		container.addEventListener('scroll', update, { capture: true, passive: true });
		return () => {
			observer.disconnect();
			resizeObserver?.disconnect();
			container.removeEventListener('scroll', update, { capture: true });
		};
	}, [container]);

	return state;
}

/**
 * Traveling highlight for menu/list popups — slides under whichever item is
 * `[data-highlighted]` (Base UI) or `[data-selected="true"]` (cmdk) instead of
 * flashing a per-item background. Render as the first child of a `relative`
 * container; positioned siblings paint on top. No props needed — it locates
 * its own parent as the tracking container.
 *
 * Appears/fades instantly at the target; travel uses the dial-tunable fast
 * spring tier. Reduced-motion renders an untransitioned fill.
 */
export function FluidHighlight({ className, inset = 0 }: { className?: string; inset?: number }) {
	// offsetParent is the containing block this span is positioned against —
	// measuring the target in the same coordinate space keeps rect math exact
	// whether the container itself scrolls or sits inside scrolled content.
	const [container, setContainer] = useState<HTMLElement | null>(null);
	const state = useFluidHighlight(container);
	const reduce = useReducedMotion();
	const tier = useSpringTiers().fast;

	const mountRef = (el: HTMLElement | null) => {
		setContainer((el?.offsetParent as HTMLElement | null) ?? el?.parentElement ?? null);
	};

	const rect = state
		? {
				top: state.rect.top + inset,
				left: state.rect.left + inset,
				width: state.rect.width - inset * 2,
				height: state.rect.height - inset * 2,
			}
		: null;

	return (
		// Remount on idle→tracking so the pill fades in at the target instead of
		// sliding from (0,0) — `initial` only applies on mount.
		<motion.span
			key={state ? 'tracking' : 'idle'}
			ref={mountRef}
			aria-hidden
			className={cn('pointer-events-none absolute rounded-sm bg-accent', className)}
			initial={rect ? { ...rect, opacity: 0 } : false}
			animate={rect ? { ...rect, opacity: state?.visible ? 1 : 0 } : { opacity: 0 }}
			transition={
				reduce ? { duration: 0 } : { type: 'spring', visualDuration: tier.duration, bounce: tier.bounce }
			}
		/>
	);
}

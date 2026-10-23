'use client';

import * as React from 'react';

import { useLatest } from './use-latest';

// Layout effects warn during React 18 server rendering; plain effects are enough there.
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? React.useEffect : React.useLayoutEffect;

export type ElementSize = { width: number; height: number };

/** The callback ref the hooks hand back; a plain function type so declaration builds can name it. */
export type MeasureRef<T extends HTMLElement> = (node: T | null) => void;

/** Before its first measurement an element reads as unbounded, so a layout starts roomy rather than cramped. */
const UNMEASURED: ElementSize = { width: Infinity, height: Infinity };

/**
 * Observes whichever element the returned callback ref lands on. The ref binds again when that element is replaced,
 * so a subtree that remounts (a layout switch, an empty state giving way to content) keeps being measured.
 */
function useResizeTarget<T extends HTMLElement>(onResize: (node: T, entry: ResizeObserverEntry) => void): MeasureRef<T> {
	const [node, setNode] = React.useState<T | null>(null);
	const latest = useLatest(onResize);
	useIsomorphicLayoutEffect(() => {
		if (!node) return;
		const observer = new ResizeObserver(([entry]) => {
			if (entry) latest.current(node, entry);
		});
		observer.observe(node);
		return () => observer.disconnect();
	}, [node, latest]);
	return setNode;
}

/**
 * An element's content-box size, as `[ref, size]`. With `ignoreHidden`, a 0×0 report keeps the last real size: a
 * hidden element (a background tab, an inactive panel) measures nothing, and re-laying it out for a size nobody
 * sees would remount or repaint whatever depends on it.
 */
export function useElementSize<T extends HTMLElement = HTMLElement>({ ignoreHidden = false }: { ignoreHidden?: boolean } = {}): [MeasureRef<T>, ElementSize] {
	const [size, setSize] = React.useState<ElementSize>(UNMEASURED);
	const ref = useResizeTarget<T>((_, entry) => {
		const { width, height } = entry.contentRect;
		if (ignoreHidden && width === 0 && height === 0) return;
		setSize((current) => (current.width === width && current.height === height ? current : { width, height }));
	});
	return [ref, size];
}

/**
 * How much width a scroller's vertical scrollbar takes, as `[ref, inset]`; 0 where scrollbars overlay the content.
 * Content outside the scroller can take the same inset to stay on the scrolled content's axis. The content box
 * narrows when a scrollbar appears, so the scroller starting to scroll is caught too.
 */
export function useScrollbarInset<T extends HTMLElement = HTMLElement>(): [MeasureRef<T>, number] {
	const [inset, setInset] = React.useState(0);
	const ref = useResizeTarget<T>((node) => {
		const style = getComputedStyle(node);
		// Unset widths parse as NaN in some environments, which would poison the inset.
		const borders = (parseFloat(style.borderInlineStartWidth) || 0) + (parseFloat(style.borderInlineEndWidth) || 0);
		setInset(Math.max(0, node.offsetWidth - node.clientWidth - borders));
	});
	return [ref, inset];
}

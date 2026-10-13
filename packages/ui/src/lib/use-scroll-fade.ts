import * as React from 'react';

const FADE = '1.5rem';

/** Physical sides of a sideways scroller that still have content past them. */
type HiddenSides = { left: boolean; right: boolean };

const NONE: HiddenSides = { left: false, right: false };

export interface ScrollFade<T extends HTMLElement> {
	/** A callback ref, so the fade follows the scroller even when it mounts after the component does. */
	ref: (node: T | null) => void;
	/** The scroller, once mounted. */
	node: T | null;
	/** Whether the content is wider than the scroller. */
	overflowing: boolean;
	/** A mask that fades each edge with content past it; undefined while everything fits. */
	style: React.CSSProperties | undefined;
}

/**
 * Tracks a sideways scroller and fades each edge that still has content past it, so a row cut off at the edge reads
 * as scrollable instead of ending in a hard cut. The sides are physical, so the mask is right in both directions.
 */
export function useScrollFade<T extends HTMLElement>(): ScrollFade<T> {
	const [node, ref] = React.useState<T | null>(null);
	const [hidden, setHidden] = React.useState<HiddenSides>(NONE);

	React.useEffect(() => {
		if (!node) return;
		const measure = () => {
			const rtl = getComputedStyle(node).direction === 'rtl';
			const room = node.scrollWidth - node.clientWidth;
			const offset = Math.abs(node.scrollLeft);
			const before = room > 1 && offset > 1;
			const after = room > 1 && room - offset > 1;
			const next = { left: rtl ? after : before, right: rtl ? before : after };
			setHidden((current) => (current.left === next.left && current.right === next.right ? current : next));
		};
		measure();
		node.addEventListener('scroll', measure, { passive: true });
		const resize = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
		resize?.observe(node);
		for (const child of Array.from(node.children)) resize?.observe(child);
		// A size observer reports only the elements it was given, and a row that grows because a child was added
		// resizes nothing it watches, so children coming and going are watched too.
		const mutation =
			typeof MutationObserver === 'undefined'
				? null
				: new MutationObserver((records) => {
						for (const record of records) {
							for (const removed of Array.from(record.removedNodes)) if (removed instanceof Element) resize?.unobserve(removed);
							for (const added of Array.from(record.addedNodes)) if (added instanceof Element) resize?.observe(added);
						}
						measure();
					});
		mutation?.observe(node, { childList: true });
		return () => {
			node.removeEventListener('scroll', measure);
			resize?.disconnect();
			mutation?.disconnect();
		};
	}, [node]);

	const overflowing = hidden.left || hidden.right;
	const style = React.useMemo(() => {
		if (!overflowing) return undefined;
		const mask = `linear-gradient(to right, transparent, black ${hidden.left ? FADE : '0px'}, black calc(100% - ${hidden.right ? FADE : '0px'}), transparent)`;
		return { maskImage: mask, WebkitMaskImage: mask };
	}, [overflowing, hidden.left, hidden.right]);

	return { ref, node, overflowing, style };
}

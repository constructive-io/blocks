import { useLayoutEffect, useState, type RefObject } from 'react';

/**
 * The inner width of an element (without its scrollbar), in whole pixels: 0 until it
 * is measured. It follows the element through one `ResizeObserver`, applies at most
 * one change per animation frame, and ignores changes under 1 px, so a container
 * resize renders the grid once per frame at most.
 */
export function useInnerWidth(ref: RefObject<HTMLElement | null>): number {
	const [width, setWidth] = useState(0);

	useLayoutEffect(() => {
		const element = ref.current;
		if (!element) return;
		// Measure before the first paint, so the grid never shows unfilled for a frame.
		let applied = element.clientWidth;
		setWidth(applied);
		if (typeof ResizeObserver === 'undefined') return;

		let pending: number | null = null;
		let frame = 0;
		const observer = new ResizeObserver((entries) => {
			const entry = entries[entries.length - 1];
			if (!entry) return;
			// The content box excludes the scrollbar, like clientWidth, and reading it forces no layout.
			pending = Math.floor(entry.contentRect.width);
			if (frame) return;
			frame = requestAnimationFrame(() => {
				frame = 0;
				if (pending === null || Math.abs(pending - applied) < 1) return;
				applied = pending;
				setWidth(applied);
			});
		});
		observer.observe(element);
		return () => {
			observer.disconnect();
			if (frame) cancelAnimationFrame(frame);
		};
	}, [ref]);

	return width;
}

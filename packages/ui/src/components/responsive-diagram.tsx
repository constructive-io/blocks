'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { cn } from '../lib/utils';

interface ResponsiveDiagramProps {
	children: React.ReactNode;
	/** Share of the container the diagram may fill before it scales down to fit. Default: 0.95. */
	targetRatio?: number;
	/**
	 * Smallest scale. A diagram that would need to shrink below this stops shrinking and scrolls sideways
	 * instead, because text at a few pixels cannot be read. Default: 0.6 (about 10px for 16px text).
	 */
	minZoom?: number;
	className?: string;
}

type Fit = { zoom: number; width: number; height: number; scrollable: boolean };

export function ResponsiveDiagram({ children, targetRatio = 0.95, minZoom = 0.6, className }: ResponsiveDiagramProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);
	const [fit, setFit] = useState<Fit>({ zoom: 1, width: 0, height: 0, scrollable: false });

	const calculateZoom = useCallback(() => {
		const container = containerRef.current;
		const content = contentRef.current;
		if (!container || !content) return;

		// `offsetWidth` and `offsetHeight` are the diagram's natural size: transforms do not change them.
		const { offsetWidth: width, offsetHeight: height } = content;
		const style = getComputedStyle(container);
		const room = container.clientWidth - (parseFloat(style.paddingLeft) || 0) - (parseFloat(style.paddingRight) || 0);
		const natural = width > 0 && width > room * targetRatio ? (room * targetRatio) / width : 1;
		const zoom = Math.min(1, Math.max(minZoom, natural));

		setFit((current) => {
			const scrollable = Math.ceil(width * zoom) > room;
			return current.zoom === zoom && current.width === width && current.height === height && current.scrollable === scrollable
				? current
				: { zoom, width, height, scrollable };
		});
	}, [targetRatio, minZoom]);

	useLayoutEffect(() => {
		// Defer measurement to next frame to avoid blocking animations
		// This prevents layout thrashing during Stack card enter/exit
		const rafId = requestAnimationFrame(() => {
			calculateZoom();
		});
		return () => cancelAnimationFrame(rafId);
	}, [calculateZoom, children]);

	useEffect(() => {
		// ResizeObserver is absent in jsdom and some embedded webviews.
		if (typeof ResizeObserver === 'undefined') return;
		const resizeObserver = new ResizeObserver(() => {
			calculateZoom();
		});

		if (containerRef.current) resizeObserver.observe(containerRef.current);
		if (contentRef.current) resizeObserver.observe(contentRef.current);

		return () => resizeObserver.disconnect();
	}, [calculateZoom]);

	return (
		<div
			ref={containerRef}
			// A scroller must be reachable without a pointer.
			tabIndex={fit.scrollable ? 0 : undefined}
			className={cn(
				`flex overflow-x-auto overflow-y-hidden rounded-lg border bg-neutral-50 px-4 py-6
				dark:bg-neutral-900/50`,
				className,
			)}
		>
			{/* `transform` leaves the unscaled size behind, so this box takes the scaled size: the container then
			    gets the right height, and scrolls (rather than clips) when the diagram stops at `minZoom`. */}
			<div
				className="m-auto shrink-0"
				style={fit.width > 0 ? { width: fit.width * fit.zoom, height: fit.height * fit.zoom } : undefined}
			>
				<div
					ref={contentRef}
					className="flex w-max items-center justify-center"
					style={{ transform: `scale(${fit.zoom})`, transformOrigin: 'top left' }}
				>
					{children}
				</div>
			</div>
		</div>
	);
}

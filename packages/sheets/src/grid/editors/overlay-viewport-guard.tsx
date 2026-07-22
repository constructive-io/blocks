import React, { useLayoutEffect, useMemo, useRef } from 'react';

import { sheetsLogger } from '../../utils/sheets-logger';

type TargetRect = {
	x: number;
	y: number;
	width: number;
	height: number;
};

type Props = {
	children?: React.ReactNode;
	debugName?: string;
	marginPx?: number;
	minBelowPx?: number;
	target?: TargetRect;
};

export const OverlayMeasureContext = React.createContext<{
	maxHeight: number;
	shouldFlip: boolean;
}>({ maxHeight: 0, shouldFlip: false });

export function computeOverlayGeometry(
	viewportHeight: number,
	targetY: number | undefined,
	targetH: number | undefined,
	marginPx: number,
	minBelowPx: number,
) {
	const maxHeightPx = Math.max(0, viewportHeight - marginPx * 2);
	const hasTarget = targetY != null && targetH != null;
	const targetBottom = hasTarget ? targetY + targetH : 0;
	const spaceBelow = viewportHeight - targetBottom - marginPx;
	const shouldFlip = hasTarget && spaceBelow < minBelowPx;
	const maxHeight = shouldFlip ? maxHeightPx : Math.max(0, spaceBelow);
	return { shouldFlip, maxHeight, targetBottom, spaceBelow, maxHeightPx };
}

export function OverlayViewportGuard({ children, debugName, marginPx = 12, minBelowPx = 320, target }: Props) {
	const ref = useRef<HTMLDivElement | null>(null);
	const overlayRootRef = useRef<HTMLElement | null>(null);
	const clipRegionRef = useRef<HTMLElement | null>(null);
	const restoreRef = useRef<{ top: string; maxHeight: string; clipOverflow: string } | null>(null);

	const targetY = target?.y;
	const targetH = target?.height;
	const computed = useMemo(() => {
		const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
		const { shouldFlip, maxHeight } = computeOverlayGeometry(vh, targetY, targetH, marginPx, minBelowPx);
		return { shouldFlip, maxHeight };
	}, [marginPx, minBelowPx, targetY, targetH]);

	const positionRef = useRef<() => void>(null);
	positionRef.current = () => {
		const el = ref.current;
		if (!el) return;

		// Use cached clipRegion/overlayRoot when still connected, re-query otherwise
		let clipRegion = clipRegionRef.current;
		if (!clipRegion?.isConnected) {
			clipRegion = el.closest('.gdg-clip-region') as HTMLElement | null;
			clipRegionRef.current = clipRegion;
		}

		const cachedRoot = overlayRootRef.current;
		const overlayRoot =
			(cachedRoot?.isConnected ? cachedRoot : null) ??
			(clipRegion?.parentElement as HTMLElement | null) ?? null;
		if (!overlayRoot) return;
		overlayRootRef.current = overlayRoot;

		if (!restoreRef.current) {
			restoreRef.current = {
				top: overlayRoot.style.top,
				maxHeight: overlayRoot.style.maxHeight,
				clipOverflow: clipRegion?.style.overflow ?? '',
			};
		}

		if (clipRegion && clipRegion.style.overflow !== 'visible') {
			clipRegion.style.overflow = 'visible';
		}

		const { shouldFlip, spaceBelow, targetBottom, maxHeightPx } = computeOverlayGeometry(
			window.innerHeight, target?.y, target?.height, marginPx, minBelowPx,
		);

		if (!shouldFlip) {
			const restoreTop = restoreRef.current?.top ?? '';
			if (overlayRoot.style.top !== restoreTop) {
				overlayRoot.style.top = restoreTop;
			}
			const newMaxHeight = `${Math.max(0, spaceBelow)}px`;
			if (overlayRoot.style.maxHeight !== newMaxHeight) {
				overlayRoot.style.maxHeight = newMaxHeight;
			}
			return;
		}

		// Flip path: set maxHeight, force reflow, set top synchronously.
		const newFlipMaxHeight = `${maxHeightPx}px`;
		if (overlayRoot.style.maxHeight !== newFlipMaxHeight) {
			overlayRoot.style.maxHeight = newFlipMaxHeight;
		}

		const h = overlayRoot.getBoundingClientRect().height;
		let nextTop = targetBottom - h;
		nextTop = Math.max(marginPx, Math.min(nextTop, window.innerHeight - marginPx - h));
		if (!Number.isFinite(nextTop)) nextTop = marginPx;
		const newTop = `${nextTop}px`;
		if (overlayRoot.style.top !== newTop) {
			overlayRoot.style.top = newTop;
		}

		if (typeof globalThis !== 'undefined' && (globalThis as Record<string, unknown>).__DEV__) {
			sheetsLogger().debug?.('[data-grid][overlay-flip]', { debugName, shouldFlip, spaceBelow });
		}
	};

	useLayoutEffect(() => {
		positionRef.current?.();

		// Reveal via Web Animations API — immune to React Strict Mode and Glide style overwrites.
		// Only delay when Glide's async useStayOnScreen needs to adjust horizontal position
		// (~100ms via IntersectionObserver + rAF). For overlays that fit within the viewport,
		// reveal immediately with a short fade for polish.
		const el = ref.current;
		const overlayRoot = overlayRootRef.current;
		const clipsRight = overlayRoot ? overlayRoot.getBoundingClientRect().right > window.innerWidth : false;
		const animation = el?.animate(
			[{ opacity: 0 }, { opacity: 1 }],
			{ duration: 50, delay: clipsRight ? 50 : 0, easing: 'ease-out', fill: 'both' },
		);

		const handleResize = () => positionRef.current?.();
		window.addEventListener('resize', handleResize);

		let ro: ResizeObserver | undefined;
		let roRaf = 0;
		if ('ResizeObserver' in window && el) {
			ro = new ResizeObserver(() => {
				cancelAnimationFrame(roRaf);
				roRaf = requestAnimationFrame(() => positionRef.current?.());
			});
			ro.observe(el);
		}

		return () => {
			animation?.cancel();
			cancelAnimationFrame(roRaf);
			window.removeEventListener('resize', handleResize);
			ro?.disconnect();
			const root = overlayRootRef.current;
			if (root && restoreRef.current) {
				root.style.top = restoreRef.current.top;
				root.style.maxHeight = restoreRef.current.maxHeight;
			}
			const clip = clipRegionRef.current;
			if (clip && restoreRef.current) {
				clip.style.overflow = restoreRef.current.clipOverflow;
			}
		};
	}, []);

	return (
		<OverlayMeasureContext.Provider value={computed}>
			<div ref={ref}>
				{children}
			</div>
		</OverlayMeasureContext.Provider>
	);
}

'use client';

import * as React from 'react';

import { prefersReducedMotion } from './playback';

export type Viewport = { x: number; y: number; zoom: number };

const ZOOM = { min: 0.5, max: 2, step: 0.25 } as const;
/** Smallest zoom the first fit may choose before it falls back to left-aligning. */
const MIN_FIT_ZOOM = 0.5;
const EDGE = { side: 24, top: 64, bottom: 68 } as const;
const EASE = {
	pan: '240ms cubic-bezier(0.5, 0, 0.1, 1)',
	reveal: '600ms cubic-bezier(0.32, 0, 0.08, 1)',
} as const;

/** Elements marked with this attribute (and native controls) never start a pan or swallow wheel scrolling. */
export const NO_PAN_ATTRIBUTE = 'data-no-pan';
const NO_PAN_SELECTOR = `button, a, input, textarea, select, [${NO_PAN_ATTRIBUTE}]`;

function clampZoom(zoom: number) {
	return Math.min(ZOOM.max, Math.max(ZOOM.min, zoom));
}

/** Zooms around a point in viewport coordinates, keeping that point still. */
function zoomAround(view: Viewport, zoom: number, cx: number, cy: number): Viewport {
	const next = clampZoom(zoom);
	const px = (cx - view.x) / view.zoom;
	const py = (cy - view.y) / view.zoom;
	return { zoom: next, x: cx - px * next, y: cy - py * next };
}

/**
 * Pan and zoom state for a canvas of fixed-width content: drag, wheel,
 * ctrl/⌘-wheel, keyboard, and zoom buttons, plus `reveal` to ease a node into
 * view. Transitions are skipped while dragging so the canvas tracks the
 * pointer 1:1.
 */
export function useCanvasViewport(contentWidth: number) {
	const viewportRef = React.useRef<HTMLDivElement>(null);
	/** Active pointers by id; one drags, two pinch. */
	const pointers = React.useRef(new Map<number, { x: number; y: number }>());
	const gesture = React.useRef<{ view: Viewport; x: number; y: number; distance: number } | null>(null);
	const [view, setView] = React.useState<Viewport>({ x: EDGE.side, y: EDGE.top, zoom: 1 });
	const [transition, setTransition] = React.useState<string>('none');
	const [dragging, setDragging] = React.useState(false);
	const viewRef = React.useRef(view);
	React.useLayoutEffect(() => {
		viewRef.current = view;
	});

	/** Set once the person pans or zooms; until then the view keeps fitting its container. */
	const touched = React.useRef(false);

	const place = React.useCallback((update: (view: Viewport) => Viewport, ease: keyof typeof EASE | null) => {
		setTransition(ease && !prefersReducedMotion() ? EASE[ease] : 'none');
		setView(update);
	}, []);

	const move = React.useCallback(
		(update: (view: Viewport) => Viewport, ease: keyof typeof EASE | null) => {
			touched.current = true;
			place(update, ease);
		},
		[place],
	);

	// Fit the content width to the canvas, and keep fitting as the canvas resizes
	// (a panel opening, a mobile tab revealing it) until the person takes over.
	React.useLayoutEffect(() => {
		const viewport = viewportRef.current;
		if (!viewport) return;
		const fit = () => {
			const width = viewport.clientWidth;
			if (width === 0 || touched.current) return;
			const available = width - EDGE.side * 2;
			const zoom = Math.max(MIN_FIT_ZOOM, Math.min(1, Math.floor((available / contentWidth) * 20) / 20));
			const x = Math.max(EDGE.side, Math.round((width - contentWidth * zoom) / 2));
			place(() => ({ x, y: EDGE.top, zoom }), null);
		};
		fit();
		const observer = new ResizeObserver(fit);
		observer.observe(viewport);
		return () => observer.disconnect();
	}, [contentWidth, place]);

	const zoomTo = React.useCallback(
		(zoom: number) => {
			const viewport = viewportRef.current;
			if (!viewport) return;
			move((current) => zoomAround(current, zoom, viewport.clientWidth / 2, viewport.clientHeight / 2), 'pan');
		},
		[move],
	);

	/** Eases the view just enough to bring `node` inside the canvas margins. */
	const reveal = React.useCallback(
		(node: Element) => {
			const viewport = viewportRef.current;
			if (!viewport) return;
			const frame = viewport.getBoundingClientRect();
			const rect = node.getBoundingClientRect();
			let dx = 0;
			let dy = 0;
			if (rect.right > frame.right - EDGE.side) dx = frame.right - EDGE.side - rect.right;
			if (rect.left + dx < frame.left + EDGE.side) dx = frame.left + EDGE.side - rect.left;
			if (rect.bottom > frame.bottom - EDGE.bottom) dy = frame.bottom - EDGE.bottom - rect.bottom;
			if (rect.top + dy < frame.top + EDGE.side) dy = frame.top + EDGE.side - rect.top;
			if (dx || dy) place((current) => ({ ...current, x: current.x + dx, y: current.y + dy }), 'reveal');
		},
		[place],
	);

	React.useEffect(() => {
		const viewport = viewportRef.current;
		if (!viewport) return;
		const onWheel = (event: WheelEvent) => {
			if ((event.target as Element).closest(`[${NO_PAN_ATTRIBUTE}]`)) return;
			event.preventDefault();
			if (event.ctrlKey || event.metaKey) {
				const rect = viewport.getBoundingClientRect();
				move(
					(current) =>
						zoomAround(current, current.zoom * Math.exp(-event.deltaY * 0.01), event.clientX - rect.left, event.clientY - rect.top),
					null,
				);
			} else {
				move((current) => ({ ...current, x: current.x - event.deltaX, y: current.y - event.deltaY }), null);
			}
		};
		viewport.addEventListener('wheel', onWheel, { passive: false });
		return () => viewport.removeEventListener('wheel', onWheel);
	}, [move]);

	/** Snapshot of the gesture origin: centroid and spread of the active pointers. */
	const beginGesture = (current: Viewport) => {
		const points = [...pointers.current.values()];
		const x = points.reduce((sum, point) => sum + point.x, 0) / points.length;
		const y = points.reduce((sum, point) => sum + point.y, 0) / points.length;
		const distance = points.length > 1 ? Math.hypot(points[0]!.x - points[1]!.x, points[0]!.y - points[1]!.y) : 0;
		gesture.current = { view: current, x, y, distance };
	};

	const handlers = {
		onPointerDown(event: React.PointerEvent<HTMLDivElement>) {
			if (event.button !== 0 || (event.target as Element).closest(NO_PAN_SELECTOR)) return;
			event.currentTarget.setPointerCapture(event.pointerId);
			pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
			beginGesture(viewRef.current);
			setDragging(true);
		},
		onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
			const start = gesture.current;
			if (!start || !pointers.current.has(event.pointerId)) return;
			pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
			const points = [...pointers.current.values()];
			const x = points.reduce((sum, point) => sum + point.x, 0) / points.length;
			const y = points.reduce((sum, point) => sum + point.y, 0) / points.length;
			const panned = { ...start.view, x: start.view.x + x - start.x, y: start.view.y + y - start.y };
			if (points.length < 2 || !start.distance) {
				move(() => panned, null);
				return;
			}
			const rect = event.currentTarget.getBoundingClientRect();
			const scale = Math.hypot(points[0]!.x - points[1]!.x, points[0]!.y - points[1]!.y) / start.distance;
			move(() => zoomAround(panned, start.view.zoom * scale, x - rect.left, y - rect.top), null);
		},
		onPointerUp(event: React.PointerEvent<HTMLDivElement>) {
			if (!pointers.current.delete(event.pointerId)) return;
			if (pointers.current.size === 0) {
				gesture.current = null;
				setDragging(false);
			} else {
				// Re-anchor so lifting one finger of a pinch continues as a pan without a jump.
				beginGesture(viewRef.current);
			}
		},
		onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
			if (event.target !== event.currentTarget) return;
			const step = event.shiftKey ? 120 : 40;
			const moves: Record<string, [number, number]> = {
				ArrowLeft: [step, 0],
				ArrowRight: [-step, 0],
				ArrowUp: [0, step],
				ArrowDown: [0, -step],
			};
			const delta = moves[event.key];
			if (delta) {
				event.preventDefault();
				move((current) => ({ ...current, x: current.x + delta[0], y: current.y + delta[1] }), 'pan');
			} else if (event.key === '+' || event.key === '=') zoomTo(view.zoom + ZOOM.step);
			else if (event.key === '-') zoomTo(view.zoom - ZOOM.step);
			else if (event.key === '0') zoomTo(1);
		},
	};

	return {
		viewportRef,
		view,
		transition,
		dragging,
		handlers: { ...handlers, onPointerCancel: handlers.onPointerUp },
		zoomTo,
		zoomIn: () => zoomTo(view.zoom + ZOOM.step),
		zoomOut: () => zoomTo(view.zoom - ZOOM.step),
		canZoomIn: view.zoom < ZOOM.max,
		canZoomOut: view.zoom > ZOOM.min,
		reveal,
	};
}

'use client';

import { Minus, Plus, Scan } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { focusRingClass, pressClass, SurfaceBody, surfaceInsetClass, TooltipIconButton } from './primitives';
import { prefersReducedMotion } from './reduced-motion';

export type Viewport = { x: number; y: number; zoom: number };

type CanvasInset = { side: number; top: number; bottom: number };

export type CanvasViewportOptions = {
	/**
	 * `width` fits the content's width and pins it to the top, for a column
	 * layout that grows downwards. `contain` fits both axes and centres.
	 */
	fit?: 'width' | 'contain';
	/** Content height in canvas units; `contain` needs it. */
	contentHeight?: number;
	minZoom?: number;
	maxZoom?: number;
	/**
	 * Smallest zoom a `contain` fit may choose; below it the content stays
	 * readable, centred horizontally and pinned to the top. Defaults to `minZoom`.
	 */
	minFitZoom?: number;
	/** Room kept clear at the edges when fitting and revealing, e.g. for pinned controls. */
	inset?: CanvasInset;
};

const ZOOM_STEP = 0.25;
const DEFAULT_INSET: CanvasInset = { side: 24, top: 64, bottom: 68 };
const EASE = {
	pan: '240ms cubic-bezier(0.5, 0, 0.1, 1)',
	reveal: '600ms cubic-bezier(0.32, 0, 0.08, 1)',
} as const;

/** Elements marked with this attribute (and native controls) never start a pan or swallow wheel scrolling. */
export const NO_PAN_ATTRIBUTE = 'data-no-pan';
/** Nodes that handle their own presses (select, drag) but still let the wheel pan and zoom over them. */
export const CANVAS_NODE_ATTRIBUTE = 'data-canvas-node';
const NO_PAN_SELECTOR = `button, a, input, textarea, select, [${NO_PAN_ATTRIBUTE}], [${CANVAS_NODE_ATTRIBUTE}]`;

function zoomAround(view: Viewport, zoom: number, cx: number, cy: number): Viewport {
	const px = (cx - view.x) / view.zoom;
	const py = (cy - view.y) / view.zoom;
	return { zoom, x: cx - px * zoom, y: cy - py * zoom };
}

/**
 * Pan and zoom state for a canvas: drag, pinch, wheel, ctrl/⌘-wheel,
 * keyboard, and zoom buttons, plus `reveal` to ease a node into view and
 * `fit` to frame the content again. The view keeps fitting its container
 * until the person pans or zooms. Transitions are skipped while dragging so
 * the canvas tracks the pointer 1:1.
 */
export function useCanvasViewport(contentWidth: number, options: CanvasViewportOptions = {}) {
	const { fit: fitMode = 'width', contentHeight = 0, minZoom = 0.5, maxZoom = 2 } = options;
	const minFitZoom = options.minFitZoom ?? minZoom;
	const inset = options.inset ?? DEFAULT_INSET;
	const { side, top, bottom } = inset;
	const viewportRef = React.useRef<HTMLDivElement | null>(null);
	// The canvas may mount after the hook (e.g. once data loads), so effects follow the element itself.
	const [element, setElement] = React.useState<HTMLDivElement | null>(null);
	const attach = React.useCallback((node: HTMLDivElement | null) => {
		viewportRef.current = node;
		setElement(node);
	}, []);
	/** Active pointers by id; one drags, two pinch. */
	const pointers = React.useRef(new Map<number, { x: number; y: number }>());
	const gesture = React.useRef<{ view: Viewport; x: number; y: number; distance: number } | null>(null);
	const [view, setView] = React.useState<Viewport>({ x: side, y: top, zoom: 1 });
	const [transition, setTransition] = React.useState<string>('none');
	const [dragging, setDragging] = React.useState(false);
	const viewRef = React.useRef(view);
	React.useLayoutEffect(() => {
		viewRef.current = view;
	});

	/** Set once the person pans or zooms; until then the view keeps fitting its container. */
	const touched = React.useRef(false);
	/** Whether the last press moved far enough to count as a pan rather than a click. */
	const panned = React.useRef(false);

	const clampZoom = React.useCallback((zoom: number) => Math.min(maxZoom, Math.max(minZoom, zoom)), [maxZoom, minZoom]);

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

	const fitted = React.useCallback((): Viewport | null => {
		const viewport = viewportRef.current;
		if (!viewport || viewport.clientWidth === 0 || contentWidth === 0) return null;
		const width = viewport.clientWidth;
		const availableWidth = width - side * 2;
		if (fitMode === 'width') {
			const zoom = Math.max(minZoom, Math.min(1, Math.floor((availableWidth / contentWidth) * 20) / 20));
			return { x: Math.max(side, Math.round((width - contentWidth * zoom) / 2)), y: top, zoom };
		}
		const availableHeight = viewport.clientHeight - top - bottom;
		const fitZoom = Math.min(1, availableWidth / contentWidth, contentHeight ? availableHeight / contentHeight : 1);
		const zoom = Math.max(minFitZoom, Math.floor(fitZoom * 20) / 20);
		return {
			x: Math.round((width - contentWidth * zoom) / 2),
			y: Math.round(top + Math.max(0, (availableHeight - contentHeight * zoom) / 2)),
			zoom,
		};
	}, [bottom, contentHeight, contentWidth, fitMode, minFitZoom, minZoom, side, top]);

	// Keep fitting as the canvas resizes (a panel opening, a mobile tab
	// revealing it) until the person takes over.
	React.useLayoutEffect(() => {
		if (!element) return;
		const refit = () => {
			if (touched.current) return;
			const next = fitted();
			if (next) place(() => next, null);
		};
		refit();
		const observer = new ResizeObserver(refit);
		observer.observe(element);
		return () => observer.disconnect();
	}, [element, fitted, place]);

	/** Frames the content again and resumes fitting on resize. */
	const fit = React.useCallback(() => {
		const next = fitted();
		if (!next) return;
		touched.current = false;
		place(() => next, 'pan');
	}, [fitted, place]);

	const zoomTo = React.useCallback(
		(zoom: number) => {
			const viewport = viewportRef.current;
			if (!viewport) return;
			move((current) => zoomAround(current, clampZoom(zoom), viewport.clientWidth / 2, viewport.clientHeight / 2), 'pan');
		},
		[clampZoom, move],
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
			if (rect.right > frame.right - side) dx = frame.right - side - rect.right;
			if (rect.left + dx < frame.left + side) dx = frame.left + side - rect.left;
			if (rect.bottom > frame.bottom - bottom) dy = frame.bottom - bottom - rect.bottom;
			if (rect.top + dy < frame.top + side) dy = frame.top + side - rect.top;
			if (dx || dy) place((current) => ({ ...current, x: current.x + dx, y: current.y + dy }), 'reveal');
		},
		[bottom, place, side],
	);

	React.useEffect(() => {
		if (!element) return;
		const onWheel = (event: WheelEvent) => {
			if ((event.target as Element).closest(`[${NO_PAN_ATTRIBUTE}]`)) return;
			event.preventDefault();
			if (event.ctrlKey || event.metaKey) {
				const rect = element.getBoundingClientRect();
				move(
					(current) =>
						zoomAround(current, clampZoom(current.zoom * Math.exp(-event.deltaY * 0.01)), event.clientX - rect.left, event.clientY - rect.top),
					null,
				);
			} else {
				move((current) => ({ ...current, x: current.x - event.deltaX, y: current.y - event.deltaY }), null);
			}
		};
		element.addEventListener('wheel', onWheel, { passive: false });
		return () => element.removeEventListener('wheel', onWheel);
	}, [clampZoom, element, move]);

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
			if (pointers.current.size === 1) panned.current = false;
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
			if (!panned.current && Math.hypot(x - start.x, y - start.y) < 3) return;
			panned.current = true;
			const next = { ...start.view, x: start.view.x + x - start.x, y: start.view.y + y - start.y };
			if (points.length < 2 || !start.distance) {
				move(() => next, null);
				return;
			}
			const rect = event.currentTarget.getBoundingClientRect();
			const scale = Math.hypot(points[0]!.x - points[1]!.x, points[0]!.y - points[1]!.y) / start.distance;
			move(() => zoomAround(next, clampZoom(start.view.zoom * scale), x - rect.left, y - rect.top), null);
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
			} else if (event.key === '+' || event.key === '=') zoomTo(view.zoom + ZOOM_STEP);
			else if (event.key === '-') zoomTo(view.zoom - ZOOM_STEP);
			else if (event.key === '0') zoomTo(1);
		},
	};

	return {
		/** Read-only handle on the canvas element; attach it with `attach`. */
		viewportRef,
		attach,
		view,
		transition,
		dragging,
		handlers: { ...handlers, onPointerCancel: handlers.onPointerUp },
		zoomTo,
		zoomIn: () => zoomTo(view.zoom + ZOOM_STEP),
		zoomOut: () => zoomTo(view.zoom - ZOOM_STEP),
		canZoomIn: view.zoom < maxZoom,
		canZoomOut: view.zoom > minZoom,
		fit,
		reveal,
		/** True when the last press panned; use it to ignore the click that ends a drag. */
		wasPanned: () => panned.current,
	};
}

export type CanvasViewport = ReturnType<typeof useCanvasViewport>;

type CanvasSurfaceProps = {
	viewport: CanvasViewport;
	/** Accessible name; say how to pan and zoom. */
	label: string;
	layerRef?: React.Ref<HTMLDivElement>;
	/** Content in canvas coordinates; it pans and zooms with the view. */
	children: React.ReactNode;
	/** Controls pinned to the canvas edges, such as the zoom pill. */
	overlay?: React.ReactNode;
	/** A click on empty canvas, not the end of a pan, e.g. to clear a selection. */
	onPaneClick?: () => void;
	className?: string;
};

/**
 * The canvas card: a dotted grid that pans and zooms with a transformed layer
 * of nodes, and an overlay for pinned controls. Spread the viewport handlers
 * here once; mark interactive node parts with `NO_PAN_ATTRIBUTE`.
 */
export function CanvasSurface({ viewport, label, layerRef, children, overlay, onPaneClick, className }: CanvasSurfaceProps) {
	const { view, transition } = viewport;
	const eased = transition !== 'none';
	// Below half zoom every other dot drops out so the grid stays quiet.
	const grid = 16 * view.zoom * (view.zoom < 0.5 ? 2 : 1);
	return (
		<div
			ref={viewport.attach}
			tabIndex={0}
			role="region"
			aria-roledescription="canvas"
			aria-label={label}
			{...viewport.handlers}
			onClick={
				onPaneClick
					? (event) => {
							if (!viewport.wasPanned() && !(event.target as Element).closest(NO_PAN_SELECTOR)) onPaneClick();
						}
					: undefined
			}
			className={cn(
				'h-full touch-none rounded-xl bg-card shadow-card select-none',
				surfaceInsetClass,
				focusRingClass,
				viewport.dragging ? 'cursor-grabbing' : 'cursor-grab',
				className,
			)}
		>
			<SurfaceBody>
				<div
					aria-hidden="true"
					className="absolute inset-0"
					style={{
						backgroundImage: 'radial-gradient(circle, color-mix(in oklab, var(--foreground) 13%, transparent) 1px, transparent 1.2px)',
						backgroundSize: `${grid}px ${grid}px`,
						backgroundPosition: `${view.x}px ${view.y}px`,
						transition: eased ? `background-size ${transition}, background-position ${transition}` : 'none',
					}}
				/>
				<div
					ref={layerRef}
					className="absolute top-0 left-0 will-change-transform"
					style={{
						transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
						transformOrigin: '0 0',
						transition: eased ? `transform ${transition}` : 'none',
					}}
				>
					{children}
				</div>
				{overlay}
			</SurfaceBody>
		</div>
	);
}

/** Floating zoom pill: out, the current percentage (resets to 100%), in, and an optional fit. */
export function CanvasZoomControls({ viewport, fit = false, className }: { viewport: CanvasViewport; fit?: boolean; className?: string }) {
	const percent = Math.round(viewport.view.zoom * 100);
	return (
		<div
			role="group"
			aria-label="Zoom"
			className={cn(
				'absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-lg bg-card p-0.5 shadow-card-lg',
				className,
			)}
		>
			<TooltipIconButton label="Zoom out" extendHitArea={false} disabled={!viewport.canZoomOut} onClick={viewport.zoomOut}>
				<Minus aria-hidden="true" className="size-3.5" />
			</TooltipIconButton>
			<button
				type="button"
				aria-label={`Zoom ${percent}%, reset to 100%`}
				onClick={() => viewport.zoomTo(1)}
				className={cn('h-7 w-12 cursor-pointer rounded-md text-[13px] text-foreground tabular-nums hover:bg-overlay-hover', pressClass, focusRingClass)}
			>
				{percent}%
			</button>
			<TooltipIconButton label="Zoom in" extendHitArea={false} disabled={!viewport.canZoomIn} onClick={viewport.zoomIn}>
				<Plus aria-hidden="true" className="size-3.5" />
			</TooltipIconButton>
			{fit ? (
				<>
					<span aria-hidden="true" className="mx-0.5 h-4 w-px bg-border" />
					<TooltipIconButton label="Fit to view" extendHitArea={false} onClick={viewport.fit}>
						<Scan aria-hidden="true" className="size-3.5" />
					</TooltipIconButton>
				</>
			) : null}
		</div>
	);
}

/* ------------------------------------------------------------------ *
 * Nodes
 * ------------------------------------------------------------------ */

/** Shell radius; its 1px border and 3px inset make the inner card 10px (concentric). */
export const NODE_RADIUS = 'rounded-[14px]';
const INNER_RADIUS = 'rounded-[10px]';

export type NodeShellTone = 'plain' | 'new' | 'target';

type NodeShellProps = Omit<React.ComponentProps<'div'>, 'children'> & {
	as?: 'div' | 'section';
	/** `new` marks parts added since the last save; `target` marks a valid drop target. */
	tone?: NodeShellTone;
	selected?: boolean;
	/** Painted between the bezel and the card, e.g. a loading glow. */
	underlay?: React.ReactNode;
	/** Classes for the raised card, e.g. `flex-1` when the shell has a fixed height. */
	cardClassName?: string;
	innerClassName?: string;
	children: React.ReactNode;
};

const TINT: Partial<Record<NodeShellTone, React.CSSProperties>> = {
	new: {
		borderColor: 'color-mix(in oklab, var(--primary) 40%, transparent)',
		backgroundColor: 'color-mix(in oklab, var(--primary) 7%, var(--muted))',
	},
	target: {
		borderColor: 'color-mix(in oklab, var(--primary) 60%, transparent)',
		backgroundColor: 'color-mix(in oklab, var(--primary) 14%, var(--muted))',
	},
};

/**
 * Double-framed canvas node: a quiet bezel around a raised card, with
 * concentric corners. Selected nodes get a primary edge and a soft halo.
 */
export function NodeShell({
	as: Element = 'div',
	tone = 'plain',
	selected = false,
	underlay,
	cardClassName,
	innerClassName,
	className,
	style,
	children,
	...props
}: NodeShellProps) {
	return (
		<Element
			data-selected={selected || undefined}
			style={{ ...TINT[tone], ...style }}
			className={cn(
				'relative isolate flex flex-col border p-[3px] transition-[border-color,background-color,box-shadow] duration-(--duration-moderate) ease-out motion-reduce:transition-none',
				NODE_RADIUS,
				tone === 'plain' ? 'border-foreground/[0.07] bg-muted/80' : 'border-dashed',
				selected && 'border-primary/50 shadow-[0_0_0_3px_color-mix(in_oklab,var(--primary)_16%,transparent)]',
				className,
			)}
			{...props}
		>
			{underlay}
			<div className={cn(surfaceInsetClass, 'bg-card shadow-card', INNER_RADIUS, cardClassName)}>
				<SurfaceBody className={innerClassName}>{children}</SurfaceBody>
			</div>
		</Element>
	);
}

/** Small framed tile holding a node's primary-tinted icon. */
export function NodeIconTile({ icon: Icon }: { icon: React.ComponentType<{ className?: string; strokeWidth?: number }> }) {
	return (
		<span aria-hidden="true" className="grid size-[22px] shrink-0 place-items-center rounded-[6px] bg-card text-primary shadow-card">
			<Icon className="size-3" strokeWidth={2} />
		</span>
	);
}

/* ------------------------------------------------------------------ *
 * Wires
 * ------------------------------------------------------------------ */

export type WireTone = 'rest' | 'live' | 'warn';
export type WirePoint = [number, number];

export const WIRE_STROKE: Record<WireTone, string> = {
	rest: 'color-mix(in oklab, var(--foreground) 20%, transparent)',
	live: 'color-mix(in oklab, var(--primary) 55%, transparent)',
	warn: 'color-mix(in oklab, var(--warning) 70%, transparent)',
};

/** One decimal is below a device pixel at any zoom the canvas allows. */
const round = (value: number) => Math.round(value * 10) / 10;

/** Cubic bezier between two anchors, leaving and entering along `axis`. */
export function wirePath(start: WirePoint, end: WirePoint, axis: 'horizontal' | 'vertical' = 'horizontal') {
	const [x1, y1, x2, y2] = [start[0], start[1], end[0], end[1]].map(round) as [number, number, number, number];
	if (axis === 'vertical') {
		const dy = round(Math.max(24, (y2 - y1) / 2));
		return `M ${x1} ${y1} C ${x1} ${round(y1 + dy)}, ${x2} ${round(y2 - dy)}, ${x2} ${y2}`;
	}
	const dx = round(Math.max(40, (x2 - x1) / 2));
	return `M ${x1} ${y1} C ${round(x1 + dx)} ${y1}, ${round(x2 - dx)} ${y2}, ${x2} ${y2}`;
}

type CanvasWireProps = {
	start: WirePoint;
	end: WirePoint;
	tone?: WireTone;
	axis?: 'horizontal' | 'vertical';
	/** Marching dashes; pass only when motion is allowed. */
	animated?: boolean;
	/** Draw the start anchor; turn off when several wires share one start. */
	startDot?: boolean;
	/**
	 * Ease to new anchors when the layout changes, alongside nodes that
	 * transition their position. Browsers without CSS `d` support jump.
	 */
	glide?: boolean;
};

const GLIDE = 'd var(--duration-slow) var(--ease-out), cx var(--duration-slow) var(--ease-out), cy var(--duration-slow) var(--ease-out), stroke var(--duration-moderate)';

/** Anchor dot; its position also lives in CSS so `glide` can ease it. */
export function WireDot({ at, glide = false, stroke }: { at: WirePoint; glide?: boolean; stroke?: string }) {
	return (
		<circle
			cx={at[0]}
			cy={at[1]}
			r={3}
			fill="var(--card)"
			stroke={stroke}
			strokeWidth={stroke ? 1 : undefined}
			style={glide ? { cx: at[0], cy: at[1], transition: GLIDE } : undefined}
		/>
	);
}

/**
 * One wire with anchor dots. Render inside an SVG in layer coordinates.
 * `rest` wires are solid; `live` and `warn` wires are dashed.
 */
export function CanvasWire({ start, end, tone = 'rest', axis = 'horizontal', animated = false, startDot = true, glide = false }: CanvasWireProps) {
	const d = wirePath(start, end, axis);
	return (
		<g stroke={WIRE_STROKE[tone]} strokeWidth={1} className="transition-[stroke] duration-(--duration-moderate)">
			<path
				d={d}
				fill="none"
				strokeDasharray={tone === 'rest' ? undefined : '4 4'}
				strokeLinecap="round"
				style={glide ? { d: `path("${d}")`, transition: GLIDE } : undefined}
			>
				{animated ? <animate attributeName="stroke-dashoffset" from="8" to="0" dur="0.5s" repeatCount="indefinite" /> : null}
			</path>
			{startDot ? <WireDot at={start} glide={glide} /> : null}
			<WireDot at={end} glide={glide} />
		</g>
	);
}

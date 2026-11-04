'use client';

// Native (DOM React-portal) overlay container — the Phase-4 analogue of glide's
// `#portal` fixed host, but it anchors off the cell DOM node's measured rect and
// portals straight into `document.body` (viewport coords, matching the
// `window.innerHeight` assumption in `computeOverlayGeometry`). It REUSES the pure
// flip math + `EditorFocusTrap` + `EditorErrorGuard` + overlay-preset width class.
// It NEVER mutates `.gdg-clip-region` — that DOM coupling stays in the canvas
// `OverlayViewportGuard` so the glide path is untouched.

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { computeOverlayGeometry, OverlayMeasureContext } from '../../grid/editors/overlay-viewport-guard';
import { EditorFocusTrap } from '../../grid/editors/editor-focus-trap';
import { EditorErrorGuard } from '../../grid/feedback/editor-error-boundary';
import { cn } from '../../utils/cn';

const MARGIN_PX = 12;
const MIN_BELOW_PX = 320;

// Open and close follow the transitions.dev menu-dropdown recipe (05): grow from
// the anchored cell corner from 0.97 to 1 with a 250ms smooth-out, then leave with
// a shorter 150ms fade to 0.99. Each value reads the host's `--dropdown-*` token
// (the Dashboard ships them with its other popovers) and falls back to the recipe
// default. `transform` and `opacity` are the only transitioned properties, so the
// measured left/top placement always applies instantly.
const DROPDOWN_MOTION = [
	'opacity-0 pointer-events-none will-change-[transform,opacity]',
	'[transform:scale(var(--dropdown-pre-scale,0.97))]',
	'[transition-property:transform,opacity]',
	'[transition-duration:var(--dropdown-open-dur,250ms)]',
	'[transition-timing-function:var(--dropdown-ease,cubic-bezier(0.22,1,0.36,1))]',
	'data-[state=open]:opacity-100 data-[state=open]:pointer-events-auto data-[state=open]:[transform:scale(1)]',
	'data-[state=closing]:[transform:scale(var(--dropdown-closing-scale,0.99))]',
	'data-[state=closing]:[transition-duration:var(--dropdown-close-dur,150ms)]',
	'motion-reduce:transition-none!',
].join(' ');

function prefersReducedMotion(): boolean {
	return typeof window.matchMedia !== 'function' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * The editor unmounts as soon as it closes, so its exit plays on an inert copy of
 * the last open frame. The copy holds no React state or handlers, cannot take
 * focus or pointer input, and is removed once the close transition ends.
 */
function playCloseTransition(node: HTMLElement): void {
	if (node.dataset.state !== 'open' || prefersReducedMotion()) return;
	const host = node.parentNode ?? document.getElementById('portal-root') ?? document.body;
	const ghost = node.cloneNode(true) as HTMLElement;
	for (const el of [ghost, ...ghost.querySelectorAll('[id]')]) el.removeAttribute('id');
	ghost.setAttribute('aria-hidden', 'true');
	ghost.inert = true;
	host.insertBefore(ghost, node.parentNode === host ? node : null);
	void ghost.offsetWidth; // Start from the copied open frame.
	ghost.dataset.state = 'closing';
	const closeMs = parseFloat(getComputedStyle(ghost).transitionDuration) * 1000;
	window.setTimeout(() => ghost.remove(), (Number.isFinite(closeMs) ? closeMs : 150) + 50);
}

// Nested floating layers an editor MIGHT portal outside the overlay (Base UI / Radix
// / Floating UI popover, select, menu, dialog, tooltip). A pointerdown inside one of
// these must NOT dismiss the overlay. The current editors render their pickers inline
// inside the overlay, so this is a forward-looking safety net.
const FLOATING_LAYER_SELECTOR =
	'[role="listbox"],[role="menu"],[role="dialog"],[role="tooltip"],[data-floating-ui-portal],[data-base-ui-positioner],[data-radix-popper-content-wrapper]';

interface OverlayManagerProps {
	anchorRect: DOMRect | null;
	open: boolean;
	presetClass?: string;
	onCancel: () => void;
	/**
	 * Outside-pointerdown policy (Stage B). `'cancel'` (default) dismisses with no write
	 * — for editors that DON'T commit-on-blur (relation/date/json/url/inet/…). `'commit'`
	 * — for the commit-on-blur value editors (text/number) — instead BLURS the focused
	 * element inside the overlay so its `onBlur → onCommit` fires (commit-on-click-away),
	 * rather than cancelling. The blur path then commits AND closes; the manager does NOT
	 * also call onCancel, so there is exactly one dismiss per click-away.
	 */
	dismissMode?: 'cancel' | 'commit';
	children: React.ReactNode;
}

export function OverlayManager({ anchorRect, open, presetClass, onCancel, dismissMode = 'cancel', children }: OverlayManagerProps): React.ReactNode {
	const containerRef = useRef<HTMLDivElement | null>(null);
	// React detaches the ref before it removes the node, so the closing copy still
	// sees the editor's last open frame in place.
	const setContainer = useCallback((node: HTMLDivElement | null) => {
		const previous = containerRef.current;
		containerRef.current = node;
		if (!node && previous) playCloseTransition(previous);
	}, []);
	// Measured, viewport-clamped position (both axes). Null until the overlay has been
	// measured once, so first paint stays hidden rather than flashing at an unclamped
	// spot. Covers the FLIP (no room below -> open above) AND the horizontal shift (an
	// anchor near the right edge -> slide left so the overlay stays on-screen instead of
	// overflowing off the viewport, e.g. the last column's editor).
	const [pos, setPos] = useState<{ left: number; top: number; originX: number } | null>(null);
	// False until the measured position has painted once at the pre-open scale.
	const [entered, setEntered] = useState(false);

	const targetY = anchorRect?.top;
	const targetH = anchorRect?.height;
	const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
	const { shouldFlip, maxHeight } = computeOverlayGeometry(vh, targetY, targetH, MARGIN_PX, MIN_BELOW_PX);

	// Geometry an editor needs to self-bound its internal scroll areas (the canvas path
	// supplied this via OverlayViewportGuard; the DOM host must too). WITHOUT it, editors
	// that read OverlayMeasureContext (relation/image/geometry) see the default maxHeight:0,
	// skip their scroll-budget effect, and render UNBOUNDED lists — so a relation editor's
	// infinite "related records" sentinel stays permanently in view and pages continuously.
	const overlayMeasure = useMemo(() => ({ maxHeight, shouldFlip }), [maxHeight, shouldFlip]);

	// Measure the rendered overlay, then position it: vertically below the anchor (or
	// flipped above when there's no room), horizontally left-aligned to the anchor (or
	// shifted left to stay on-screen), clamped into the viewport on BOTH axes. DOM-read
	// only — mirrors the canvas guard's layout-effect measure; no hasMounted flag.
	useLayoutEffect(() => {
		if (!open || !anchorRect) {
			setPos(null);
			setEntered(false);
			return;
		}
		const el = containerRef.current;
		if (!el) return;
		const place = () => {
			// Layout size, not getBoundingClientRect: the pre-open scale would shrink it.
			const width = el.offsetWidth;
			const height = el.offsetHeight;
			const vw = window.innerWidth;
			const vhNow = window.innerHeight;

			let left = anchorRect.left;
			left = Math.max(MARGIN_PX, Math.min(left, vw - MARGIN_PX - width));
			if (!Number.isFinite(left)) left = MARGIN_PX;

			let top = shouldFlip ? anchorRect.top - height : anchorRect.bottom;
			top = Math.max(MARGIN_PX, Math.min(top, vhNow - MARGIN_PX - height));
			if (!Number.isFinite(top)) top = MARGIN_PX;

			// Grow from the anchor cell's corner, even when the overlay is shifted left.
			const originX = Math.max(0, Math.min(anchorRect.left - left, width));
			setPos((prev) => (prev && prev.left === left && prev.top === top && prev.originX === originX
				? prev
				: { left, top, originX }));
		};
		place();
		// Lazy editors (date) and state changes (image) resize after opening; keep the
		// overlay clamped on-screen as its content settles.
		if (typeof ResizeObserver === 'undefined') return;
		const observer = new ResizeObserver(place);
		observer.observe(el);
		return () => observer.disconnect();
	}, [open, shouldFlip, anchorRect, maxHeight]);

	useEffect(() => {
		if (!open || pos === null || entered) return;
		const el = containerRef.current;
		if (!el) return;
		void el.offsetWidth; // Commit the pre-open frame so the state change below transitions.
		setEntered(true);
	}, [open, pos, entered]);

	// Dismiss on a pointerdown OUTSIDE the overlay — standard popover behaviour. The
	// overlay was previously only closable via Esc / commit / scroll, so a click in the
	// grid or page left it stuck open. Attached in an effect (after commit) so the
	// activating double-click that OPENED the overlay has fully settled and cannot
	// self-dismiss; capture phase so an inner editor that stops propagation can't
	// suppress it. Clicks inside the overlay (or a nested floating layer it portals)
	// are ignored.
	useEffect(() => {
		if (!open) return;
		const onPointerDown = (e: PointerEvent) => {
			const el = containerRef.current;
			const target = e.target as Node | null;
			if (!el || (target && el.contains(target))) return;
			if (target instanceof Element && target.closest(FLOATING_LAYER_SELECTOR)) return;
			// COMMIT-ON-CLICK-AWAY (Stage B): for commit-on-blur editors, move DOM focus out of
			// the overlay so the focused input's `onBlur → onCommit` fires (commit, then close).
			// We DON'T also call onCancel — the blur path closes the overlay, so this is exactly
			// one dismiss. A bare outside element may not be focusable (so a natural focus shift
			// wouldn't fire), hence we blur explicitly. Falls back to onCancel when nothing in the
			// overlay is focused. `'cancel'` editors discard as before.
			if (dismissMode === 'commit') {
				const focused = document.activeElement;
				if (focused instanceof HTMLElement && el.contains(focused)) {
					focused.blur();
					return;
				}
			}
			onCancel();
		};
		document.addEventListener('pointerdown', onPointerDown, true);
		return () => document.removeEventListener('pointerdown', onPointerDown, true);
	}, [open, onCancel, dismissMode]);

	if (!open || !anchorRect || typeof document === 'undefined') return null;

	// Reveal only once the measured, viewport-clamped position is applied, so the
	// entrance never fights the layout-effect measure.
	const positioned = pos !== null;
	const style: React.CSSProperties = {
		position: 'fixed',
		// Pre-measure default = the ANCHOR position (below, or above when flipping), NOT a
		// screen corner. So an overlay that fits (the common case) renders at its FINAL spot
		// with zero left/top change once measured — no travel. It stays hidden until measured
		// and left/top are never transitioned, so the rare off-screen clamp is instant and the
		// overlay is never seen sliding to the anchor (the correction happens pre-reveal).
		left: pos ? pos.left : anchorRect.left,
		top: pos ? pos.top : shouldFlip ? anchorRect.top : anchorRect.bottom,
		maxHeight,
		// Hidden until measured to avoid a 1-frame flash at an unclamped position.
		visibility: positioned ? 'visible' : 'hidden',
		// Join the shared design-system overlay layer instead of an
		// arbitrary z, so the editor and any popover/tooltip it opens (e.g. the relation
		// "Record Data" popover, which portals into #portal-root) stack coherently.
		zIndex: 'var(--z-layer-floating)',
		transformOrigin: `${pos?.originX ?? 0}px ${shouldFlip ? '100%' : '0'}`,
	};

	// Portal into the app's shared floating-overlay host (#portal-root) so the editor and
	// nested UI popovers live in the SAME stacking context (siblings) — fixing the
	// host-dependent z-index race where the editor could paint OVER a popover opened from
	// within it. Fall back to <body> when no portal root is mounted (e.g. tests). The host
	// has pointer-events:none, so the overlay opts back in with pointer-events-auto.
	const portalHost = document.getElementById('portal-root') ?? document.body;

	return createPortal(
		<div
			ref={setContainer}
			data-slot='sheets-editor-overlay'
			data-state={entered ? 'open' : 'closed'}
			style={style}
			className={DROPDOWN_MOTION}
		>
			{/* Provide the overlay geometry so editors (relation/image/geometry) can self-bound their
			    internal scroll lists; without it they read maxHeight:0 and render unbounded (the
			    relation infinite-scroll bug). Mirrors the canvas OverlayViewportGuard's provider. */}
			<OverlayMeasureContext.Provider value={overlayMeasure}>
				<EditorErrorGuard onClose={onCancel}>
					{/* overflow-VISIBLE, never auto/hidden: each editor renders its own rounded card with a
					    `shadow-lg`, and a clipping wrapper the same size as the card squares off that shadow
					    into the "weird halo" around the rounded corners. Editors self-bound their height
					    (relation/image/json scroll internally), so the wrapper never needs to scroll. */}
					<EditorFocusTrap onEscape={onCancel} className={cn('overflow-visible', presetClass)}>
						{children}
					</EditorFocusTrap>
				</EditorErrorGuard>
			</OverlayMeasureContext.Provider>
		</div>,
		portalHost,
	);
}

'use client';

// Native (DOM React-portal) overlay container — the Phase-4 analogue of glide's
// `#portal` fixed host, but it anchors off the cell DOM node's measured rect and
// portals straight into `document.body` (viewport coords, matching the
// `window.innerHeight` assumption in `computeOverlayGeometry`). It REUSES the pure
// flip math + `EditorFocusTrap` + `EditorErrorGuard` + overlay-preset width class.
// It NEVER mutates `.gdg-clip-region` — that DOM coupling stays in the canvas
// `OverlayViewportGuard` so the glide path is untouched.

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { computeOverlayGeometry, OverlayMeasureContext } from '../../grid/editors/overlay-viewport-guard';
import { EditorFocusTrap } from '../../grid/editors/editor-focus-trap';
import { EditorErrorGuard } from '../../grid/feedback/editor-error-boundary';
import { cn } from '../../utils/cn';
import { OVERLAY_PENDING_ATTRIBUTE } from './overlay-pending';

const MARGIN_PX = 12;
const MIN_BELOW_PX = 320;

// Opening and closing a cell editor is one of the most frequent keyboard actions in
// the grid (Enter, F2, type-to-edit, Escape), so the overlay appears and disappears at
// once, with no scale or fade (Craft: Hover Restraint). It stays hidden only until its
// measured, viewport-clamped position is applied, so it never flashes at a wrong spot.

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
	// Measured, viewport-clamped position (both axes). Null until the overlay has been
	// measured once, so first paint stays hidden rather than flashing at an unclamped
	// spot. Covers the FLIP (no room below -> open above) AND the horizontal shift (an
	// anchor near the right edge -> slide left so the overlay stays on-screen instead of
	// overflowing off the viewport, e.g. the last column's editor).
	const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

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
			return;
		}
		const el = containerRef.current;
		if (!el) return;
		const place = () => {
			// An editor still loading its code stays hidden; it is placed (and shown) once it
			// has rendered, when the resize observer reports its real size.
			if (el.querySelector(`[${OVERLAY_PENDING_ATTRIBUTE}]`)) {
				setPos(null);
				return;
			}
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

			setPos((prev) => (prev && prev.left === left && prev.top === top ? prev : { left, top }));
		};
		place();
		// Lazy editors (date) and state changes (image) resize after opening; keep the
		// overlay clamped on-screen as its content settles.
		if (typeof ResizeObserver === 'undefined') return;
		const observer = new ResizeObserver(place);
		observer.observe(el);
		return () => observer.disconnect();
	}, [open, shouldFlip, anchorRect, maxHeight]);

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
		// with zero left/top change once measured — no travel. It stays transparent until measured
		// and left/top are never transitioned, so the rare off-screen clamp is instant and the
		// overlay is never seen sliding to the anchor (the correction happens pre-reveal).
		left: pos ? pos.left : anchorRect.left,
		top: pos ? pos.top : shouldFlip ? anchorRect.top : anchorRect.bottom,
		// The width is the editor's own (max-content, bounded by its preset and the viewport),
		// never the room left of the right edge. A fixed box with no width shrinks to the
		// space between `left` and the viewport edge, so near the right edge each clamp moved
		// `left` 1px, the box grew 1px, the resize observer clamped again, and the editor
		// visibly grew leftwards one pixel per frame until it reached its natural width.
		width: 'max-content',
		maxWidth: `calc(100vw - ${MARGIN_PX * 2}px)`,
		maxHeight,
		// Transparent until measured to avoid a 1-frame flash at an unclamped position. Not
		// `visibility: hidden`: the editor's focus trap focuses its input on mount, before the
		// measure, and a hidden element cannot take focus, so the keyboard would stay on the grid.
		opacity: positioned ? undefined : 0,
		// Join the shared design-system overlay layer instead of an
		// arbitrary z, so the editor and any popover/tooltip it opens (e.g. the relation
		// "Record Data" popover, which portals into #portal-root) stack coherently.
		zIndex: 'var(--z-layer-floating)',
	};

	// Portal into the app's shared floating-overlay host (#portal-root) so the editor and
	// nested UI popovers live in the SAME stacking context (siblings) — fixing the
	// host-dependent z-index race where the editor could paint OVER a popover opened from
	// within it. Fall back to <body> when no portal root is mounted (e.g. tests). The host
	// has pointer-events:none, so the overlay opts back in with pointer-events-auto.
	const portalHost = document.getElementById('portal-root') ?? document.body;

	return createPortal(
		<div
			ref={containerRef}
			data-slot='sheets-editor-overlay'
			data-state={positioned ? 'open' : 'closed'}
			style={style}
			className='pointer-events-auto'
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

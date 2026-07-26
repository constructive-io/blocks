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

const MARGIN_PX = 12;
const MIN_BELOW_PX = 320;

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
		const rect = el.getBoundingClientRect();
		const vw = window.innerWidth;
		const vhNow = window.innerHeight;

		let left = anchorRect.left;
		left = Math.max(MARGIN_PX, Math.min(left, vw - MARGIN_PX - rect.width));
		if (!Number.isFinite(left)) left = MARGIN_PX;

		let top = shouldFlip ? anchorRect.top - rect.height : anchorRect.bottom;
		top = Math.max(MARGIN_PX, Math.min(top, vhNow - MARGIN_PX - rect.height));
		if (!Number.isFinite(top)) top = MARGIN_PX;

		setPos({ left, top });
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

	// Animate only once the measured, viewport-clamped position is applied, so the
	// entrance transform never fights the layout-effect measure.
	const positioned = pos !== null;
	const style: React.CSSProperties = {
		position: 'fixed',
		// Pre-measure default = the ANCHOR position (below, or above when flipping), NOT a
		// screen corner. So an overlay that fits (the common case) renders at its FINAL spot
		// with zero left/top change once measured — no travel. It stays hidden until measured
		// and `transition-none` keeps the rare off-screen clamp instant, so the overlay is
		// never seen sliding to the anchor (the correction happens off-screen, pre-reveal).
		left: pos ? pos.left : anchorRect.left,
		top: pos ? pos.top : shouldFlip ? anchorRect.top : anchorRect.bottom,
		maxHeight,
		// Hidden until measured to avoid a 1-frame flash at an unclamped position.
		visibility: positioned ? 'visible' : 'hidden',
		// Join the shared overlay layer (@constructive-io/ui z-scale) instead of an
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
			style={style}
			className={cn(
				// `transition-none`: the entrance is an ANIMATION (scale + fade); left/top must NEVER
				// transition, or measuring/clamping the position would visibly slide the overlay across
				// the screen to its anchor. This keeps the position application instant.
				'pointer-events-auto transition-none',
				// Origin-aware entrance (DESIGN_SPEC §10 / Emil standards): subtle scale + fade from the
				// cell corner, reusing the UI popover's tw-animate utilities for a consistent feel. Gated
				// on `positioned` so the overlay animates only after its measured position is applied.
				positioned && 'animate-in fade-in-0 zoom-in-95 duration-150 ease-out motion-reduce:animate-none',
				shouldFlip ? 'origin-bottom-left' : 'origin-top-left'
			)}
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

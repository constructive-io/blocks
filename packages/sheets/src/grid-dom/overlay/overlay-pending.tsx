'use client';

// A Suspense fallback for an overlay editor whose code is still loading. While it is in
// the overlay, the OverlayManager keeps the overlay hidden, so the editor appears once,
// at its final size and place, when its code arrives. It draws nothing itself.

/** Marks an overlay whose editor is not ready to be shown yet. */
export const OVERLAY_PENDING_ATTRIBUTE = 'data-overlay-pending';

export function OverlayPending() {
	return <div {...{ [OVERLAY_PENDING_ATTRIBUTE]: '' }} aria-busy='true' />;
}

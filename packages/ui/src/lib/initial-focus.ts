/**
 * Initial focus for an overlay that can scroll.
 *
 * By default the first tabbable element gets focus. When that element sits below the fold (a footer button under a
 * long list, say) focusing it scrolls the overlay down to it, so the overlay opens showing its end instead of its
 * title. This keeps the default whenever that element is already on screen, and otherwise focuses the overlay
 * itself, which does not scroll: the overlay opens at the top, and the focus moves on with the first Tab. That is
 * the WAI-ARIA dialog pattern for content long enough to scroll.
 *
 * ```tsx
 * <DialogPrimitive.Popup ref={popupRef} initialFocus={scrollSafeInitialFocus(() => popupRef.current)} />
 * ```
 */
const TABBABLE = [
	'a[href]',
	'area[href]',
	'button',
	'input:not([type="hidden"])',
	'select',
	'textarea',
	'summary',
	'[contenteditable]:not([contenteditable="false"])',
	'[tabindex]',
].join(',');

const SCROLLS = /auto|scroll/;

function firstTabbableIsInView(overlay: HTMLElement) {
	const first = Array.from(overlay.querySelectorAll<HTMLElement>(TABBABLE)).find(
		(element) => element.tabIndex >= 0 && !(element as HTMLButtonElement).disabled && element.getClientRects().length > 0 && !element.closest('[inert]'),
	);
	if (!first) return true;

	// Visible means inside every scroll container between the element and the overlay, the overlay included.
	const box = first.getBoundingClientRect();
	for (let node = first.parentElement; node; node = node.parentElement) {
		const style = getComputedStyle(node);
		if (SCROLLS.test(style.overflowY) || SCROLLS.test(style.overflowX)) {
			const room = node.getBoundingClientRect();
			if (box.top < room.top - 1 || box.bottom > room.bottom + 1 || box.left < room.left - 1 || box.right > room.right + 1) return false;
		}
		if (node === overlay) break;
	}
	return true;
}

/**
 * Returns an `initialFocus` function for a Base UI popup. `getOverlay` reads the popup element when focus is
 * placed, so it can come from a ref.
 */
export function scrollSafeInitialFocus(getOverlay: () => HTMLElement | null) {
	return (): true | HTMLElement => {
		const overlay = getOverlay();
		return overlay && !firstTabbableIsInView(overlay) ? overlay : true;
	};
}

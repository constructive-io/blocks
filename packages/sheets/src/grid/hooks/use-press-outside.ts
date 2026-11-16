import { useCallback, useEffect, useRef } from 'react';

/**
 * Report a pointer press outside one part of the React tree.
 *
 * "Inside" follows the React tree, not the DOM: React events bubble out of portals to
 * the component that rendered them, so a press in a portalled surface the part owns (an
 * editor, popover, menu, dialog or panel) counts as inside. Spread the returned handler
 * on the part's root element. `onPressOutside` runs only while `active` is true.
 *
 * The part's capture handler marks the press itself, and the document's bubble listener
 * reads that mark. That holds wherever React listens: under a host that hydrates the whole
 * document (Next.js), React's own document listeners run before any added later, so a
 * flag reset by a document capture listener would mark every press as outside.
 */
export function usePressOutside(active: boolean, onPressOutside: () => void): { onPointerDownCapture: (event: { nativeEvent: Event }) => void } {
	const insidePresses = useRef(new WeakSet<Event>());
	const onPressOutsideRef = useRef(onPressOutside);
	onPressOutsideRef.current = onPressOutside;

	useEffect(() => {
		if (!active) return;
		// Bubble phase: every capture handler, React's included, has run for this press.
		const finish = (event: PointerEvent) => {
			if (!insidePresses.current.has(event)) onPressOutsideRef.current();
		};
		document.addEventListener('pointerdown', finish);
		return () => document.removeEventListener('pointerdown', finish);
	}, [active]);

	const onPointerDownCapture = useCallback((event: { nativeEvent: Event }) => {
		insidePresses.current.add(event.nativeEvent);
	}, []);
	return { onPointerDownCapture };
}

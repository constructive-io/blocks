import { useCallback, useEffect, useRef } from 'react';

/**
 * Report a pointer press outside one part of the React tree.
 *
 * "Inside" follows the React tree, not the DOM: React events bubble out of portals to
 * the component that rendered them, so a press in a portalled surface the part owns (an
 * editor, popover, menu, dialog or panel) counts as inside. Spread the returned handler
 * on the part's root element. `onPressOutside` runs only while `active` is true.
 */
export function usePressOutside(active: boolean, onPressOutside: () => void): { onPointerDownCapture: () => void } {
	const insideRef = useRef(false);
	const onPressOutsideRef = useRef(onPressOutside);
	onPressOutsideRef.current = onPressOutside;

	useEffect(() => {
		if (!active) return;
		// The document's capture listener runs before React sees the press, its bubble
		// listener after, so the flag in between says whether React passed through the part.
		const start = () => {
			insideRef.current = false;
		};
		const finish = () => {
			if (!insideRef.current) onPressOutsideRef.current();
			insideRef.current = false;
		};
		document.addEventListener('pointerdown', start, true);
		document.addEventListener('pointerdown', finish);
		return () => {
			document.removeEventListener('pointerdown', start, true);
			document.removeEventListener('pointerdown', finish);
		};
	}, [active]);

	const onPointerDownCapture = useCallback(() => {
		insideRef.current = true;
	}, []);
	return { onPointerDownCapture };
}

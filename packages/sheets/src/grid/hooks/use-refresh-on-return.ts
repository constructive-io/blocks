// Fresh data when the user comes back. A grid left open in a background tab keeps the rows
// and the table's shape it last read; when the page is shown again (visible, focused or back
// online) after a real absence, the grid reads them again. A quick tab switch does nothing, and
// nothing is refetched under an open editor or a save in flight: that waits until they finish.
import { useEffect, useRef, useState } from 'react';

/** How long the page must be away before coming back refreshes it. */
export const RETURN_REFRESH_AFTER_MS = 30_000;

export interface RefreshOnReturnOptions {
	/** Read the data again. */
	refresh: () => void;
	/** An editor is open or a save is in flight: the refresh waits for it. */
	busy: boolean;
	afterMs?: number;
}

export function useRefreshOnReturn({ refresh, busy, afterMs = RETURN_REFRESH_AFTER_MS }: RefreshOnReturnOptions): void {
	const awaySince = useRef<number | null>(null);
	const [due, setDue] = useState(false);

	useEffect(() => {
		const leave = () => {
			if (awaySince.current === null) awaySince.current = Date.now();
		};
		const back = () => {
			if (document.visibilityState === 'hidden') return;
			const since = awaySince.current;
			awaySince.current = null;
			if (since !== null && Date.now() - since >= afterMs) setDue(true);
		};
		const onVisibility = () => (document.visibilityState === 'hidden' ? leave() : back());
		window.addEventListener('blur', leave);
		window.addEventListener('offline', leave);
		window.addEventListener('focus', back);
		window.addEventListener('online', back);
		document.addEventListener('visibilitychange', onVisibility);
		return () => {
			window.removeEventListener('blur', leave);
			window.removeEventListener('offline', leave);
			window.removeEventListener('focus', back);
			window.removeEventListener('online', back);
			document.removeEventListener('visibilitychange', onVisibility);
		};
	}, [afterMs]);

	const refreshRef = useRef(refresh);
	refreshRef.current = refresh;
	useEffect(() => {
		if (!due || busy) return;
		setDue(false);
		refreshRef.current();
	}, [due, busy]);
}

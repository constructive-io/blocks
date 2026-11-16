import { useLayoutEffect, useState } from 'react';

/**
 * The row count to show for the current view, or null until the first count for
 * that view has arrived.
 *
 * When the filter or the search changes, the data layer reports a placeholder
 * until the server answers: 0, or the count of the view before. Showing it would
 * flash "0 rows" or a wrong number. The count is ready once the view has data and
 * nothing is fetching (before its first request starts, a view has no data and is
 * not fetching either). After that, a refetch (after a save) keeps the count on screen.
 *
 * `viewKey` names what the count depends on (the table, the filter and the search),
 * so a new sort or page does not hide it.
 */
export function useViewRowCount(total: number, viewKey: string, ready: boolean): number | null {
	const [countedKey, setCountedKey] = useState<string | null>(null);
	// A layout effect: the count appears in the same frame the fetch settles.
	useLayoutEffect(() => {
		if (ready && countedKey !== viewKey) setCountedKey(viewKey);
	}, [ready, viewKey, countedKey]);
	return countedKey === viewKey ? total : null;
}

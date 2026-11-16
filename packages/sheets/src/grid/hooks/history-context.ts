// The grid's undo history, for parts that write on their own (the link editor, in a cell or the
// record panel) so their changes take a step in it too. Null outside a grid.
import { createContext, useContext } from 'react';

import type { HistoryEntry } from './use-undo-redo';

export const SheetsHistoryContext = createContext<((entry: HistoryEntry) => void) | null>(null);

/** Add a step to the grid's undo history, or null outside a grid. */
export function useRecordHistory(): ((entry: HistoryEntry) => void) | null {
	return useContext(SheetsHistoryContext);
}

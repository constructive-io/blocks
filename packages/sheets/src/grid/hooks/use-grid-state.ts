import { useCallback, useMemo, useReducer } from 'react';

import { emptySheetsSelection, moveActive, selectCell } from '../../selection/selection-model';
import type { SheetsSelection } from '../../selection/selection-model';

// Centralized grid state interface. Filter, sort and search state lives in
// `useSheetsView` (grid/view-state), which validates it against the table model.
export interface GridState {
	// Pagination state
	pageIndex: number;

	// Column state
	columnWidths: Map<string, number>;

	// Selection state (native SheetsSelection — glide is only a derived projection now).
	// Field name kept as `gridSelection` to minimize consumer churn during the port.
	gridSelection: SheetsSelection | undefined;
}

// Action types for state updates
export type GridAction =
	| { type: 'SET_PAGE_INDEX'; payload: number }
	| { type: 'RESIZE_COLUMN'; payload: { id: string; width: number } }
	| { type: 'SET_GRID_SELECTION'; payload: SheetsSelection | undefined }
	| { type: 'SET_ACTIVE_CELL'; payload: { col: number; row: number } }
	| { type: 'MOVE_ACTIVE'; payload: { dCol: number; dRow: number; colCount: number; rowCount: number } }
	| { type: 'RESET_PAGE_IF_NEEDED'; payload: { totalPages: number } };

// Initial state factory
function createInitialGridState(): GridState {
	return {
		pageIndex: 0,
		columnWidths: new Map(),
		gridSelection: undefined,
	};
}

// State reducer with type-safe action handling
function gridStateReducer(state: GridState, action: GridAction): GridState {
	switch (action.type) {
		case 'SET_PAGE_INDEX':
			return {
				...state,
				pageIndex: action.payload,
			};

		case 'RESIZE_COLUMN': {
			const newColumnWidths = new Map(state.columnWidths);
			newColumnWidths.set(action.payload.id, action.payload.width);
			return {
				...state,
				columnWidths: newColumnWidths,
			};
		}

		case 'SET_GRID_SELECTION':
			return {
				...state,
				gridSelection: action.payload,
			};

		case 'SET_ACTIVE_CELL': {
			const { col, row } = action.payload;
			return {
				...state,
				gridSelection: selectCell(state.gridSelection ?? emptySheetsSelection, col, row),
			};
		}

		case 'MOVE_ACTIVE': {
			const { dCol, dRow, colCount, rowCount } = action.payload;
			return {
				...state,
				gridSelection: moveActive(state.gridSelection ?? emptySheetsSelection, dCol, dRow, colCount, rowCount),
			};
		}

		case 'RESET_PAGE_IF_NEEDED': {
			const { totalPages } = action.payload;
			if (state.pageIndex >= totalPages) {
				return {
					...state,
					pageIndex: Math.max(0, totalPages - 1),
				};
			}
			return state;
		}

		default:
			return state;
	}
}

// Custom hook for grid state management
export function useGridState() {
	const [state, dispatch] = useReducer(gridStateReducer, undefined, createInitialGridState);

	const setPageIndex = useCallback((pageIndex: number) => {
		dispatch({ type: 'SET_PAGE_INDEX', payload: pageIndex });
	}, []);

	const resizeColumn = useCallback((id: string, width: number) => {
		dispatch({ type: 'RESIZE_COLUMN', payload: { id, width } });
	}, []);

	const setGridSelection = useCallback((selection: SheetsSelection | undefined) => {
		dispatch({ type: 'SET_GRID_SELECTION', payload: selection });
	}, []);

	const setActiveCell = useCallback((col: number, row: number) => {
		dispatch({ type: 'SET_ACTIVE_CELL', payload: { col, row } });
	}, []);

	const moveActiveCell = useCallback((dCol: number, dRow: number, colCount: number, rowCount: number) => {
		dispatch({ type: 'MOVE_ACTIVE', payload: { dCol, dRow, colCount, rowCount } });
	}, []);

	const resetPageIfNeeded = useCallback((totalPages: number) => {
		dispatch({ type: 'RESET_PAGE_IF_NEEDED', payload: { totalPages } });
	}, []);

	// Stable object identity (avoid prop/effect churn in consumers)
	const actions = useMemo(
		() => ({
			setPageIndex,
			resizeColumn,
			setGridSelection,
			setActiveCell,
			moveActiveCell,
			resetPageIfNeeded,
		}),
		[
			setPageIndex,
			resizeColumn,
			setGridSelection,
			setActiveCell,
			moveActiveCell,
			resetPageIfNeeded,
		],
	);

	return {
		state,
		actions,
	};
}

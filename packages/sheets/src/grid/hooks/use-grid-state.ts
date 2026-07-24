import { useCallback, useMemo, useReducer } from 'react';

import { emptySheetsSelection, moveActive, selectCell } from '../../selection/selection-model';
import type { SheetsSelection } from '../../selection/selection-model';
import type { FilterGroup } from '../sheets.controls';

// Centralized grid state interface
export interface GridState {
	// Sorting state
	sorting: {
		id: string | null;
		desc: boolean;
	};

	// Pagination state
	pageIndex: number;

	// Filter states
	filterTree: FilterGroup;
	filtersOpen: boolean;

	// Column state
	columnWidths: Map<string, number>;

	// Selection state (native SheetsSelection — glide is only a derived projection now).
	// Field name kept as `gridSelection` to minimize consumer churn during the port.
	gridSelection: SheetsSelection | undefined;
}

const EMPTY_FILTER_TREE: FilterGroup = { type: 'group', id: 'root', conjunction: 'and', children: [] };

// Action types for state updates
export type GridAction =
	| { type: 'SET_SORTING'; payload: GridState['sorting'] }
	| { type: 'TOGGLE_SORTING'; payload: string }
	| { type: 'SET_PAGE_INDEX'; payload: number }
	| { type: 'SET_FILTER_TREE'; payload: FilterGroup }
	| { type: 'CLEAR_ALL_FILTERS' }
	| { type: 'TOGGLE_FILTERS_PANEL' }
	| { type: 'SET_FILTERS_OPEN'; payload: boolean }
	| { type: 'RESIZE_COLUMN'; payload: { id: string; width: number } }
	| { type: 'SET_GRID_SELECTION'; payload: SheetsSelection | undefined }
	| { type: 'SET_ACTIVE_CELL'; payload: { col: number; row: number } }
	| { type: 'MOVE_ACTIVE'; payload: { dCol: number; dRow: number; colCount: number; rowCount: number } }
	| { type: 'RESET_PAGE_IF_NEEDED'; payload: { totalPages: number } };

// Initial state factory
function createInitialGridState(): GridState {
	return {
		sorting: { id: null, desc: false },
		pageIndex: 0,
		filterTree: { ...EMPTY_FILTER_TREE },
		filtersOpen: false,
		columnWidths: new Map(),
		gridSelection: undefined,
	};
}

// State reducer with type-safe action handling
function gridStateReducer(state: GridState, action: GridAction): GridState {
	switch (action.type) {
		case 'SET_SORTING':
			return {
				...state,
				sorting: action.payload,
			};

		case 'TOGGLE_SORTING': {
			const colId = action.payload;
			let newSorting: GridState['sorting'];

			if (state.sorting.id !== colId) {
				// Different column clicked: start with ASC
				newSorting = { id: colId, desc: false };
			} else if (!state.sorting.desc) {
				// Same column, currently ASC: switch to DESC
				newSorting = { id: colId, desc: true };
			} else {
				// Same column, currently DESC: reset to neutral (no sorting)
				newSorting = { id: null, desc: false };
			}

			return {
				...state,
				sorting: newSorting,
			};
		}

		case 'SET_PAGE_INDEX':
			return {
				...state,
				pageIndex: action.payload,
			};

		case 'SET_FILTER_TREE':
			return {
				...state,
				filterTree: action.payload,
			};

		case 'CLEAR_ALL_FILTERS':
			return {
				...state,
				filterTree: { ...EMPTY_FILTER_TREE },
			};

		case 'TOGGLE_FILTERS_PANEL':
			return {
				...state,
				filtersOpen: !state.filtersOpen,
			};

		case 'SET_FILTERS_OPEN':
			return {
				...state,
				filtersOpen: action.payload,
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

	const setSorting = useCallback((sorting: GridState['sorting']) => {
		dispatch({ type: 'SET_SORTING', payload: sorting });
	}, []);

	const toggleSorting = useCallback((colId: string) => {
		dispatch({ type: 'TOGGLE_SORTING', payload: colId });
	}, []);

	const setPageIndex = useCallback((pageIndex: number) => {
		dispatch({ type: 'SET_PAGE_INDEX', payload: pageIndex });
	}, []);

	const setFilterTree = useCallback((tree: FilterGroup) => {
		dispatch({ type: 'SET_FILTER_TREE', payload: tree });
	}, []);

	const clearAllFilters = useCallback(() => {
		dispatch({ type: 'CLEAR_ALL_FILTERS' });
	}, []);

	const toggleFiltersPanel = useCallback(() => {
		dispatch({ type: 'TOGGLE_FILTERS_PANEL' });
	}, []);

	const setFiltersOpen = useCallback((open: boolean) => {
		dispatch({ type: 'SET_FILTERS_OPEN', payload: open });
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
			setSorting,
			toggleSorting,
			setPageIndex,
			setFilterTree,
			clearAllFilters,
			toggleFiltersPanel,
			setFiltersOpen,
			resizeColumn,
			setGridSelection,
			setActiveCell,
			moveActiveCell,
			resetPageIfNeeded,
		}),
		[
			setSorting,
			toggleSorting,
			setPageIndex,
			setFilterTree,
			clearAllFilters,
			toggleFiltersPanel,
			setFiltersOpen,
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

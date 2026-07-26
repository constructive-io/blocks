import { useCallback, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { isValuelessOperator } from '../filter-operators';
import {
	createEmptyGroup,
	type FilterGroup,
	type FilterNode,
} from '../sheets.controls';
import { buildWhereFromFilters } from '../sheets.utils';

// Data filtering context type
export interface DataFilteringContextValue {
	filterTree: FilterGroup;
	filtersOpen: boolean;
	effectiveWhere: any;
	hasActiveFilters: boolean;
	setFilterTree: (tree: FilterGroup) => void;
	setFiltersOpen: (open: boolean) => void;
	clearAllFilters: () => void;
	applyFilters: () => void;
}

// Data filtering hook configuration
export interface UseDataFilteringConfig {
	columnKeys: string[];
	tableMeta?: {
		fields?: Array<{
			name?: string | null;
			type?: {
				gqlType?: string | null;
			} | null;
		} | null> | null;
	} | null;
	initialFilterTree?: FilterGroup;
}

function hasActiveNode(node: FilterNode): boolean {
	if (node.type === 'condition') {
		return isValuelessOperator(node.operator) ||
			(node.value !== '' && node.value !== null && node.value !== undefined);
	}
	return node.children.some(hasActiveNode);
}

// Main data filtering hook — uses local state instead of global Zustand store
export function useDataFiltering({
	columnKeys,
	tableMeta,
	initialFilterTree,
}: UseDataFilteringConfig) {
	const [filterTree, setFilterTree] = useState<FilterGroup>(initialFilterTree ?? createEmptyGroup());
	const [filtersOpen, setFiltersOpen] = useState(false);

	const clearAllFilters = useCallback(() => {
		setFilterTree(createEmptyGroup());
	}, []);

	// applyFilters is a no-op since state is already reactive
	const applyFilters = useCallback(() => {}, []);

	// Compute effective where clause from current filters
	const effectiveWhere = useMemo(
		() => buildWhereFromFilters(filterTree, tableMeta),
		[filterTree, tableMeta],
	);

	// Check if there are active filters
	const hasActiveFilters = useMemo(
		() => hasActiveNode(filterTree),
		[filterTree],
	);

	const contextValue: DataFilteringContextValue = useMemo(
		() => ({
			filterTree,
			filtersOpen,
			effectiveWhere,
			hasActiveFilters,
			setFilterTree,
			setFiltersOpen,
			clearAllFilters,
			applyFilters,
		}),
		[filterTree, filtersOpen, effectiveWhere, hasActiveFilters, clearAllFilters, applyFilters],
	);

	return {
		contextValue,
		Provider: ({ children }: { children: ReactNode }) => children,
	};
}

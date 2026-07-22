import { useCallback, useEffect, useMemo, useState } from 'react';

// Data pagination context type
export interface DataPaginationContextValue {
	// Pagination state
	pageIndex: number;
	pageSize: number;
	totalCount: number;
	totalPages: number;

	// Computed values
	hasNextPage: boolean;
	hasPreviousPage: boolean;
	startIndex: number;
	endIndex: number;

	// Actions
	setPageIndex: (index: number) => void;
	setPageSize: (size: number) => void;
	goToNextPage: () => void;
	goToPreviousPage: () => void;
	goToFirstPage: () => void;
	goToLastPage: () => void;
}

// Data pagination hook configuration
export interface UseDataPaginationConfig {
	initialPageSize?: number;
	initialPageIndex?: number;
	totalCount?: number;
	onPageChange?: (pageIndex: number, pageSize: number) => void;
}

// Main data pagination hook — uses local state instead of global Zustand store
export function useDataPagination({
	initialPageSize = 100,
	initialPageIndex = 0,
	totalCount = 0,
	onPageChange,
}: UseDataPaginationConfig) {
	const [pageIndex, setPageIndexState] = useState(initialPageIndex);
	const [pageSize, setPageSizeState] = useState(initialPageSize);

	// Compute pagination values
	const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / pageSize)), [totalCount, pageSize]);
	const hasNextPage = useMemo(() => pageIndex < totalPages - 1, [pageIndex, totalPages]);
	const hasPreviousPage = useMemo(() => pageIndex > 0, [pageIndex]);
	const startIndex = useMemo(() => pageIndex * pageSize + 1, [pageIndex, pageSize]);
	const endIndex = useMemo(() => Math.min((pageIndex + 1) * pageSize, totalCount), [pageIndex, pageSize, totalCount]);

	useEffect(() => {
		if (pageSize !== initialPageSize) {
			setPageSizeState(initialPageSize);
		}
	}, [initialPageSize]); // eslint-disable-line react-hooks/exhaustive-deps

	useEffect(() => {
		if (pageIndex !== initialPageIndex) {
			setPageIndexState(initialPageIndex);
		}
	}, [initialPageIndex]); // eslint-disable-line react-hooks/exhaustive-deps

	// Auto-adjust page index when total pages changes
	useEffect(() => {
		if (pageIndex >= totalPages && totalPages > 0) {
			setPageIndexState(Math.max(0, totalPages - 1));
		}
	}, [pageIndex, totalPages]);

	// Page index setter with callback
	const setPageIndex = useCallback(
		(index: number) => {
			const clampedIndex = Math.max(0, Math.min(index, totalPages - 1));
			setPageIndexState(clampedIndex);
			onPageChange?.(clampedIndex, pageSize);
		},
		[totalPages, pageSize, onPageChange],
	);

	// Page size setter with callback and reset to first page
	const setPageSize = useCallback(
		(size: number) => {
			setPageSizeState(size);
			setPageIndexState(0);
			onPageChange?.(0, size);
		},
		[onPageChange],
	);

	// Navigation actions
	const goToNextPage = useCallback(() => {
		if (hasNextPage) {
			setPageIndex(pageIndex + 1);
		}
	}, [hasNextPage, pageIndex, setPageIndex]);

	const goToPreviousPage = useCallback(() => {
		if (hasPreviousPage) {
			setPageIndex(pageIndex - 1);
		}
	}, [hasPreviousPage, pageIndex, setPageIndex]);

	const goToFirstPage = useCallback(() => {
		setPageIndex(0);
	}, [setPageIndex]);

	const goToLastPage = useCallback(() => {
		setPageIndex(totalPages - 1);
	}, [totalPages, setPageIndex]);

	const contextValue: DataPaginationContextValue = useMemo(
		() => ({
			pageIndex,
			pageSize,
			totalCount,
			totalPages,
			hasNextPage,
			hasPreviousPage,
			startIndex,
			endIndex,
			setPageIndex,
			setPageSize,
			goToNextPage,
			goToPreviousPage,
			goToFirstPage,
			goToLastPage,
		}),
		[
			pageIndex,
			pageSize,
			totalCount,
			totalPages,
			hasNextPage,
			hasPreviousPage,
			startIndex,
			endIndex,
			setPageIndex,
			setPageSize,
			goToNextPage,
			goToPreviousPage,
			goToFirstPage,
			goToLastPage,
		],
	);

	return {
		contextValue,
		Provider: ({ children }: { children: any }) => children,
	};
}

// Convenience hooks for accessing specific parts of the context
export function usePaginationState() {
	// Placeholder — real values come from the contextValue returned by useDataPagination
	return { pageIndex: 0, pageSize: 100 };
}

export function usePaginationActions() {
	// Placeholder — real actions come from the contextValue
	return {
		setPageIndex: (_index: number) => {},
		setPageSize: (_size: number) => {},
		goToNextPage: () => {},
		goToPreviousPage: () => {},
		goToFirstPage: () => {},
		goToLastPage: () => {},
	};
}

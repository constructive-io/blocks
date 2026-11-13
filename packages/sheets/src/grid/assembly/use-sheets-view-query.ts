// Filters, sort and search (the view state) turned into list variables, the columns
// and relations the view shows, saved views, and the page reset on a view change.
import { useEffect, useMemo, useRef } from 'react';

import { modelFieldLabel } from '../../cell-types/field-label';
import type { SheetsConfig, SheetsScopeKey } from '../../context/sheets-context';
import { useTableModel } from '../../hooks/use-table-model';
import type { useGridState } from '../hooks/use-grid-state';
import type { SheetsViewProps } from '../view-state/use-sheets-view';
import { useSheetsView } from '../view-state/use-sheets-view';
import { useSavedViews } from '../views/use-saved-views';
import { defaultViewStorage } from '../views/view-storage';

export interface UseSheetsViewQueryInput {
	tableName: string;
	props: SheetsViewProps;
	config: SheetsConfig;
	scopeKey: SheetsScopeKey;
	infiniteScroll: boolean;
	gridActions: ReturnType<typeof useGridState>['actions'];
}

export function useSheetsViewQuery({ tableName, props, config, scopeKey, infiniteScroll, gridActions }: UseSheetsViewQueryInput) {
	// ============== FILTERS / SORT / SEARCH → LIST VARIABLES ==============
	// The view state is checked against the table model before it builds the list
	// filter and sort, so the model is needed before the data hooks run (it is the
	// same cached query the data hooks read).
	const { model: viewModel } = useTableModel(tableName);
	// Fields are named with the shared readable label everywhere (toolbar, header menu, notices);
	// a relation reads as a relation (the related records and what links them).
	const columnLabel = useMemo(() => modelFieldLabel(viewModel), [viewModel]);
	const {
		view,
		where: effectiveWhere,
		orderBy: orderByClause,
		querySignature: viewSignature,
	} = useSheetsView({
		model: viewModel,
		columnLabel,
		filters: props.filters,
		onFiltersChange: props.onFiltersChange,
		sort: props.sort,
		onSortChange: props.onSortChange,
		search: props.search,
		onSearchChange: props.onSearchChange,
		columns: props.columns,
		onColumnsChange: props.onColumnsChange,
	});

	const viewQuery = useMemo(() => ({ where: effectiveWhere, orderBy: orderByClause }), [effectiveWhere, orderByClause]);

	// Only the columns the view shows are fetched (the data layer adds keys and relation keys).
	const fetchColumns = useMemo(() => {
		if (!viewModel) return undefined;
		const scalar = new Set(viewModel.columns.map((column) => column.name));
		return view.layout.visibleKeys.filter((key) => scalar.has(key));
	}, [viewModel, view.layout.visibleKeys]);
	// Likewise only the relations the view shows.
	const fetchRelations = useMemo(() => {
		if (!viewModel) return undefined;
		const relations = new Set(viewModel.relations.map((relation) => relation.fieldName));
		return view.layout.visibleKeys.filter((key) => relations.has(key));
	}, [viewModel, view.layout.visibleKeys]);

	// Saved views of this table, kept in the host's storage or this browser's.
	const viewStorage = useMemo(() => config.views ?? defaultViewStorage(), [config.views]);
	const viewScope = useMemo(
		() => (viewModel ? { ...scopeKey, tableKey: viewModel.key } : null),
		[scopeKey, viewModel],
	);
	const savedViews = useSavedViews({
		storage: viewStorage,
		scope: viewScope,
		model: viewModel,
		current: view.state,
		apply: view.applyState,
		label: columnLabel,
	});

	// Reset to page 0 when the filter, sort or search changes (paginated mode)
	const prevViewSignatureRef = useRef(viewSignature);
	useEffect(() => {
		if (prevViewSignatureRef.current !== viewSignature) {
			prevViewSignatureRef.current = viewSignature;
			if (!infiniteScroll) {
				gridActions.setPageIndex(0);
			}
		}
	}, [viewSignature, infiniteScroll, gridActions]);

	return {
		columnLabel,
		view,
		effectiveWhere,
		orderByClause,
		viewSignature,
		viewQuery,
		fetchColumns,
		fetchRelations,
		savedViews,
	};
}

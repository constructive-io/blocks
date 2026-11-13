import { useCallback, useMemo, useState } from 'react';

import type { TableKey, TableModel } from '@constructive-io/data';

import { buildViewQuery, type ConditionStatus } from '../view-state/build-view-query';
import { validateSheetsViewState } from '../view-state/validate-view-state';
import { createFilterGroup } from '../view-state/view-state';
import { SHEETS_VIEW_STATE_VERSION, type SheetsFilterGroup, type SheetsViewStateDrop } from '../view-state/view-state.types';

/** Filter bindings for a headless shell. */
export interface DataFilteringContextValue {
	/** The filters in use, valid for the model. */
	filters: SheetsFilterGroup;
	setFilters: (filters: SheetsFilterGroup) => void;
	clearFilters: () => void;
	/** The list filter for the conditions that are complete and valid, or undefined. */
	where: Record<string, unknown> | undefined;
	/** Conditions in `where`. */
	appliedCount: number;
	/** Status of every condition, by condition id. */
	conditions: ReadonlyMap<string, ConditionStatus>;
	/** Conditions of `initialFilters` the model does not support. */
	dropped: readonly SheetsViewStateDrop[];
}

export interface UseDataFilteringConfig {
	/** The table model, or null while it loads. */
	model: TableModel | null;
	/** Filters to start with, for example from a saved view. */
	initialFilters?: SheetsFilterGroup;
	/** Models of related tables, for "linked record contains" conditions. */
	relatedModel?: (key: TableKey) => TableModel | null;
}

/**
 * Headless filter state over the table model, for a custom shell. The built-in
 * grid uses the same pieces through `useSheetsView`.
 */
export function useDataFiltering({ model, initialFilters, relatedModel }: UseDataFilteringConfig): DataFilteringContextValue {
	const [raw, setRaw] = useState<SheetsFilterGroup>(() => initialFilters ?? createFilterGroup());
	const clearFilters = useCallback(() => setRaw(createFilterGroup()), []);

	return useMemo(() => {
		if (!model) {
			return { filters: raw, setFilters: setRaw, clearFilters, where: undefined, appliedCount: 0, conditions: new Map(), dropped: [] };
		}
		const { state, dropped } = validateSheetsViewState(
			{ version: SHEETS_VIEW_STATE_VERSION, filters: raw, sort: [], search: '' },
			model,
		);
		const query = buildViewQuery(state, model, relatedModel);
		return {
			filters: state.filters,
			setFilters: setRaw,
			clearFilters,
			where: query.where,
			appliedCount: query.appliedCount,
			conditions: query.conditions,
			dropped,
		};
	}, [model, raw, relatedModel, clearFilters]);
}

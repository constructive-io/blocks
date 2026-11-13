/**
 * The grid's filter, sort, search and column layout: uncontrolled by default,
 * or owned by the host through the `filters` / `sort` / `search` / `columns`
 * props. Every state is
 * validated against the table model before it builds list variables. Text
 * controls commit after a pause in typing (see `useCommittedText`), so every
 * state change here is a settled one and applies at once.
 *
 * Related tables' models (for "linked record contains") load only while the
 * filter builder is open or such a condition exists.
 */
import { useCallback, useMemo, useRef, useState } from 'react';

import type { SortSpec, TableKey, TableModel } from '@constructive-io/data';

import { useTableModels } from '../../hooks/use-table-model';
import { gridColumnKeys } from '../../relations/relation-columns';
import { createColumnLayout } from '../columns/column-layout';
import { useColumnLayout, type ColumnLayoutBindings } from '../columns/use-column-layout';
import { filterFieldsOf, newCondition } from '../filters/filter-fields';
import { buildViewQuery, type ConditionStatus } from './build-view-query';
import { searchPlanOf, type SearchPlan } from './search-plan';
import { validateSheetsViewState } from './validate-view-state';
import { createFilterGroup, cycleSort, filterConditionsOf } from './view-state';
import {
	SHEETS_VIEW_STATE_VERSION,
	type SheetsColumnLayout,
	type SheetsFilterGroup,
	type SheetsSortKey,
	type SheetsViewState,
	type SheetsViewStateDrop,
} from './view-state.types';

const NO_SORT: readonly SheetsSortKey[] = [];

export interface SheetsViewProps {
	/** Controlled filters. Omit to let the grid own them. */
	filters?: SheetsFilterGroup;
	onFiltersChange?: (filters: SheetsFilterGroup) => void;
	/** Controlled sort, first key first. Omit to let the grid own it. */
	sort?: readonly SheetsSortKey[];
	onSortChange?: (sort: readonly SheetsSortKey[]) => void;
	/** Controlled search text. Omit to let the grid own it. */
	search?: string;
	onSearchChange?: (search: string) => void;
	/** Controlled column layout (order, hidden, frozen count, widths, row height). Omit to let the grid own it. */
	columns?: SheetsColumnLayout;
	onColumnsChange?: (columns: SheetsColumnLayout) => void;
}

export interface UseSheetsViewOptions extends SheetsViewProps {
	model: TableModel | null;
	/** Column or relation title, for messages and controls. */
	columnLabel: (name: string) => string;
}

/** The view bindings the toolbar, the header and the commands use. */
export interface SheetsViewBindings {
	/** The state in use, valid for the current model. */
	state: SheetsViewState;
	model: TableModel | null;
	/** Parts of the given state the model does not support. */
	dropped: readonly SheetsViewStateDrop[];
	/** Status of every condition, by condition id. */
	conditions: ReadonlyMap<string, ConditionStatus>;
	/** Conditions that are part of the filter. */
	appliedCount: number;
	/** What the search box searches, or null when the table cannot be searched. */
	searchPlan: SearchPlan | null;
	columnLabel: (name: string) => string;
	/** A related table's model, once loaded. */
	relatedModel: (key: TableKey) => TableModel | null;
	setFilters: (filters: SheetsFilterGroup) => void;
	clearFilters: () => void;
	setSort: (sort: readonly SheetsSortKey[]) => void;
	/** Header click: cycle one column, or with `additive` add it to the sort. */
	toggleSort: (column: string, additive: boolean) => void;
	setSearch: (search: string) => void;
	setColumns: (columns: SheetsColumnLayout) => void;
	/** Replace filters, sort, search and layout at once (a saved view). */
	applyState: (state: SheetsViewState) => void;
	/** Open the filters with a new condition on a column or relation; false when no condition could be added. */
	filterBy: (column: string) => boolean;
	/** Column layout and its actions. */
	layout: ColumnLayoutBindings;
	/** Why a grid column cannot be sorted, or null when it can. Empty text for a column the grid adds itself. */
	unsortableReason: (column: string) => string | null;
	filtersOpen: boolean;
	setFiltersOpen: (open: boolean) => void;
	sortOpen: boolean;
	setSortOpen: (open: boolean) => void;
	/** Attach to the search input so `focusSearch` can reach it. */
	searchInputRef: React.MutableRefObject<HTMLInputElement | null>;
	/** Focus the search box; false when there is none. */
	focusSearch: () => boolean;
}

export interface UseSheetsViewResult {
	view: SheetsViewBindings;
	/** List filter. */
	where: Record<string, unknown> | undefined;
	/** List sort. */
	orderBy: SortSpec[] | undefined;
	/** Changes exactly when the rows the grid shows can change. */
	querySignature: string;
}

function unsortableReasonFor(model: TableModel | null, column: string): string | null {
	if (!model) return 'Sorting is available once the table has loaded.';
	const columnModel = model.columns.find((candidate) => candidate.name === column);
	if (columnModel?.sort) return null;
	if (columnModel) {
		const issue = model.issues.find((candidate) => candidate.code === 'COLUMN_UNSORTABLE' && candidate.target === column);
		return issue?.message ?? 'This column cannot be sorted.';
	}
	if (model.relations.some((relation) => relation.fieldName === column)) return 'Linked records cannot be sorted.';
	// A column the grid adds itself (the draft actions) is not sortable and needs no explanation.
	return '';
}

/** Related tables the filters need: every relation target while the builder is open, else the targets of label conditions. */
function relatedTargets(model: TableModel | null, filters: SheetsFilterGroup, builderOpen: boolean): string[] {
	if (!model) return [];
	const filterable = model.relations.filter((relation) => relation.targetKey && relation.filter?.recordFilterType);
	if (builderOpen) return [...new Set(filterable.map((relation) => relation.targetKey!))];
	const named = new Set(
		filterConditionsOf(filters).flatMap((condition) =>
			condition.kind === 'relation' && condition.test === 'labelContains' ? [condition.relation] : [],
		),
	);
	return [...new Set(filterable.filter((relation) => named.has(relation.fieldName)).map((relation) => relation.targetKey!))];
}

export function useSheetsView(options: UseSheetsViewOptions): UseSheetsViewResult {
	const { model, columnLabel } = options;

	const [ownFilters, setOwnFilters] = useState<SheetsFilterGroup>(() => createFilterGroup());
	const [ownSort, setOwnSort] = useState<readonly SheetsSortKey[]>(NO_SORT);
	const [ownSearch, setOwnSearch] = useState('');
	const [ownColumns, setOwnColumns] = useState<SheetsColumnLayout>(createColumnLayout);
	const [filtersOpen, setFiltersOpen] = useState(false);
	const [sortOpen, setSortOpen] = useState(false);
	const searchInputRef = useRef<HTMLInputElement | null>(null);

	const filters = options.filters ?? ownFilters;
	const sort = options.sort ?? ownSort;
	const search = options.search ?? ownSearch;
	const columns = options.columns ?? ownColumns;
	const available = useMemo(() => (model ? gridColumnKeys(model) : []), [model]);

	const { models: relatedModels } = useTableModels(relatedTargets(model, filters, filtersOpen));
	const relatedModel = useCallback((key: TableKey) => relatedModels.get(key) ?? null, [relatedModels]);

	// Callbacks are latched so a host passing inline functions does not churn the setters.
	const callbacks = useRef(options);
	callbacks.current = options;

	const { state, dropped } = useMemo(() => {
		const raw: SheetsViewState = { version: SHEETS_VIEW_STATE_VERSION, filters, sort, search, columns };
		return model ? validateSheetsViewState(raw, model, { label: columnLabel }) : { state: raw, dropped: [] };
	}, [filters, sort, search, columns, model, columnLabel]);

	const setFilters = useCallback((next: SheetsFilterGroup) => {
		if (callbacks.current.filters === undefined) setOwnFilters(next);
		callbacks.current.onFiltersChange?.(next);
	}, []);
	const setSort = useCallback((next: readonly SheetsSortKey[]) => {
		if (callbacks.current.sort === undefined) setOwnSort(next);
		callbacks.current.onSortChange?.(next);
	}, []);
	const setSearch = useCallback((next: string) => {
		if (callbacks.current.search === undefined) setOwnSearch(next);
		callbacks.current.onSearchChange?.(next);
	}, []);
	const setColumns = useCallback((next: SheetsColumnLayout) => {
		if (callbacks.current.columns === undefined) setOwnColumns(next);
		callbacks.current.onColumnsChange?.(next);
	}, []);
	const applyState = useCallback(
		(next: SheetsViewState) => {
			setFilters(next.filters);
			setSort(next.sort);
			setSearch(next.search);
			setColumns(next.columns);
		},
		[setFilters, setSort, setSearch, setColumns],
	);

	// Header clicks build on the state in use, so a dropped sort key is not revived.
	const stateRef = useRef(state);
	stateRef.current = state;
	const toggleSort = useCallback(
		(column: string, additive: boolean) => setSort(cycleSort(stateRef.current.sort, column, additive)),
		[setSort],
	);
	const clearFilters = useCallback(() => setFilters(createFilterGroup()), [setFilters]);
	const filterBy = useCallback(
		(column: string) => {
			const field = filterFieldsOf(model, columnLabel).find((candidate) => candidate.name === column);
			const related = field?.kind === 'relation' && field.relation.targetKey ? relatedModels.get(field.relation.targetKey) ?? null : null;
			const condition = field ? newCondition(field, related) : null;
			if (condition) {
				const current = stateRef.current.filters;
				setFilters({ ...current, children: [...current.children, condition] });
			}
			setFiltersOpen(true);
			return condition !== null;
		},
		[model, columnLabel, relatedModels, setFilters],
	);
	const layout = useColumnLayout({ layout: state.columns, setLayout: setColumns, available });

	const query = useMemo(
		() => (model ? buildViewQuery(state, model, relatedModel) : null),
		[state, model, relatedModel],
	);
	// Keyed by content, so an unchanged filter keeps its identity across renders.
	const whereKey = JSON.stringify(query?.where ?? null);
	const where = useMemo(() => (JSON.parse(whereKey) as Record<string, unknown> | null) ?? undefined, [whereKey]);
	const orderByKey = JSON.stringify(query?.orderBy ?? null);
	const orderBy = useMemo(() => (JSON.parse(orderByKey) as SortSpec[] | null) ?? undefined, [orderByKey]);

	const unsortableReason = useCallback((column: string) => unsortableReasonFor(model, column), [model]);
	const focusSearch = useCallback(() => {
		const input = searchInputRef.current;
		if (!input) return false;
		input.focus();
		input.select();
		return true;
	}, []);

	const view = useMemo<SheetsViewBindings>(
		() => ({
			state,
			model,
			dropped,
			conditions: query?.conditions ?? new Map(),
			appliedCount: query?.appliedCount ?? 0,
			searchPlan: searchPlanOf(model),
			columnLabel,
			relatedModel,
			setFilters,
			clearFilters,
			setSort,
			toggleSort,
			setSearch,
			setColumns,
			applyState,
			filterBy,
			layout,
			unsortableReason,
			filtersOpen,
			setFiltersOpen,
			sortOpen,
			setSortOpen,
			searchInputRef,
			focusSearch,
		}),
		[
			state,
			model,
			dropped,
			query,
			columnLabel,
			relatedModel,
			setFilters,
			clearFilters,
			setSort,
			toggleSort,
			setSearch,
			setColumns,
			applyState,
			filterBy,
			layout,
			unsortableReason,
			filtersOpen,
			sortOpen,
			focusSearch,
		],
	);

	return { view, where, orderBy, querySignature: `${whereKey}|${orderByKey}` };
}

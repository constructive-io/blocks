import type { GridViewCommandTarget } from '../../commands/context';
import { filterFieldsOf } from '../filters/filter-fields';
import type { SavedViewsBindings } from '../views/use-saved-views';
import type { SheetsViewBindings } from './use-sheets-view';
import { filterConditionsOf } from './view-state';

function isFilterable(view: SheetsViewBindings, colKey: string): boolean {
	return filterFieldsOf(view.model, view.columnLabel).some((field) => field.name === colKey);
}

/**
 * The view actions the grid commands run, over the latest view and saved-view
 * bindings. The getters are read on every access, so the target can be created
 * once. `hasToolbar` is false while a host toolbar slot replaces the built-in
 * one, so the commands that open its popovers do not claim their keys.
 */
export function createViewCommandTarget(
	getView: () => SheetsViewBindings,
	hasToolbar: () => boolean,
	getSavedViews: () => SavedViewsBindings,
): GridViewCommandTarget {
	return {
		// A host toolbar slot may leave out the search box; then Mod+F stays the browser's find.
		get canSearch() {
			const view = getView();
			return view.searchPlan !== null && view.searchInputRef.current !== null;
		},
		get hasSearch() {
			return getView().state.search.trim() !== '';
		},
		get canFilter() {
			const view = getView();
			return hasToolbar() && filterFieldsOf(view.model, view.columnLabel).length > 0;
		},
		get hasFilters() {
			return filterConditionsOf(getView().state.filters).length > 0;
		},
		get canSortAny() {
			return hasToolbar() && (getView().model?.columns.some((column) => column.sort) ?? false);
		},
		get hasSort() {
			return getView().state.sort.length > 0;
		},
		canSort: (colKey) => getView().unsortableReason(colKey) === null,
		focusSearch: () => getView().focusSearch(),
		clearSearch: () => getView().setSearch(''),
		openFilters: () => getView().setFiltersOpen(true),
		clearFilters: () => getView().clearFilters(),
		openSort: () => getView().setSortOpen(true),
		clearSort: () => getView().setSort([]),
		sortBy: (colKey, direction) => getView().setSort([{ column: colKey, direction }]),

		canFilterBy: (colKey) => hasToolbar() && isFilterable(getView(), colKey),
		filterBy: (colKey) => {
			getView().filterBy(colKey);
		},
		canHide: (colKey) => {
			const { layout } = getView();
			return layout.visibleKeys.includes(colKey) && layout.hideReason(colKey) === null;
		},
		hide: (colKey) => getView().layout.setHidden(colKey, true),
		canMove: (colKey, step) => {
			const { visibleKeys } = getView().layout;
			const at = visibleKeys.indexOf(colKey);
			return at !== -1 && visibleKeys[at + step] !== undefined;
		},
		move: (colKey, step) => {
			getView().layout.moveStep(colKey, step);
		},
		get frozenCount() {
			return getView().layout.frozenCount;
		},
		freezeUpTo: (colKey) => getView().layout.freezeUpTo(colKey),
		unfreeze: () => getView().layout.unfreeze(),
		openColumnMenu: (colKey) => getView().layout.setMenuColumn(colKey),
		get canOpenFields() {
			return hasToolbar() && getView().layout.orderedKeys.length > 0;
		},
		openFields: () => getView().layout.setFieldsOpen(true),
		get canOpenViews() {
			return hasToolbar() && getSavedViews().status !== 'loading';
		},
		openViews: () => getSavedViews().setOpen(true),
		get canSaveView() {
			const saved = getSavedViews();
			return saved.dirty && !saved.busy;
		},
		saveView: () => {
			void getSavedViews().save();
		},
	};
}

/**
 * Why a view or column command cannot run on a column, or null, for the menu
 * item that offers it (the context menu, the header menu).
 */
export function viewCommandReason(view: SheetsViewBindings, commandId: string, column: string | null): string | null {
	switch (commandId) {
		case 'view.sortAscending':
		case 'view.sortDescending':
			if (!column) return 'Select a cell in the column to sort by.';
			return view.unsortableReason(column) || null;
		case 'view.filterByColumn':
			return column && !isFilterable(view, column) ? 'This field cannot be filtered.' : null;
		case 'column.hide':
			return column ? view.layout.hideReason(column) : null;
		case 'column.moveLeft':
			return column && view.layout.visibleKeys[0] === column ? 'This field is already first.' : null;
		case 'column.moveRight':
			return column && view.layout.visibleKeys.at(-1) === column ? 'This field is already last.' : null;
		case 'record.new':
			if (!view.model) return 'New records are available once the table has loaded.';
			if (view.model.operations.create) return null;
			return (
				view.model.issues.find((issue) => issue.code === 'CREATE_UNAVAILABLE')?.message ?? 'Records cannot be added to this table.'
			);
		default:
			return null;
	}
}

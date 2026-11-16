/**
 * The filter, sort, search and column layout of one grid, as one serializable
 * value.
 *
 * Columns and relations are named by their field name in the table model, so a
 * host can store the value (a saved view) and load it later. Load a stored value
 * through `validateSheetsViewState`: it drops every part the current model no
 * longer supports and says what it dropped, and it upgrades a version 1 value
 * (no column layout) to the current version.
 */

/** Version of the state shape. Version 2 added `columns`. */
export const SHEETS_VIEW_STATE_VERSION = 2;

/** How the children of a filter group combine. */
export type SheetsFilterLogic = 'and' | 'or';

/**
 * A filter value as the user entered it: text (exact decimal text for big
 * numbers, ISO text for dates, times and timestamps), a boolean, a list of
 * values for list operators, field values for an operator that takes an object,
 * or null for an operator without a value.
 */
export type SheetsFilterValue = string | boolean | readonly string[] | Readonly<Record<string, string>> | null;

/** A condition on one column. */
export interface SheetsColumnCondition {
	kind: 'column';
	/** Stable id within the state. */
	id: string;
	/** Column field name. */
	column: string;
	/** Operator name the column's filter really has, for example `includesInsensitive`. */
	operator: string;
	value: SheetsFilterValue;
}

/** What a relation condition tests. */
export type SheetsRelationTest = 'any' | 'none' | 'labelContains';

/** A condition on one relation. */
export interface SheetsRelationCondition {
	kind: 'relation';
	/** Stable id within the state. */
	id: string;
	/** Relation field name. */
	relation: string;
	/** `any`: has a linked record; `none`: has no linked record; `labelContains`: a linked record's label contains `value`. */
	test: SheetsRelationTest;
	/** Text for `labelContains`, otherwise null. */
	value: string | null;
}

export type SheetsFilterCondition = SheetsColumnCondition | SheetsRelationCondition;

/** A group of conditions and groups. */
export interface SheetsFilterGroup {
	kind: 'group';
	/** Stable id within the state. */
	id: string;
	logic: SheetsFilterLogic;
	children: readonly SheetsFilterNode[];
}

export type SheetsFilterNode = SheetsFilterGroup | SheetsFilterCondition;

export type SheetsSortDirection = 'asc' | 'desc';

/** One sort key. The first key in a list sorts first. */
export interface SheetsSortKey {
	/** Column field name. */
	column: string;
	direction: SheetsSortDirection;
}

/** Row heights the grid offers. */
export type SheetsRowHeight = 'short' | 'medium' | 'tall' | 'extraTall';

/** Which columns show, in what order, how wide, how many stay in place, and how tall rows are. */
export interface SheetsColumnLayout {
	/**
	 * Grid column keys (column and relation field names) in display order. Keys
	 * the table has but this list does not name follow, in the table's order, so a
	 * new column shows up at the end.
	 */
	order: readonly string[];
	/** Grid column keys that are hidden. */
	hidden: readonly string[];
	/** How many leading visible columns stay in place while the grid scrolls sideways. */
	frozenCount: number;
	/** Column widths in pixels, by grid column key. A column without an entry keeps its default width. */
	widths: Readonly<Record<string, number>>;
	rowHeight: SheetsRowHeight;
}

/** Filter, sort, search and column layout of one grid. */
export interface SheetsViewState {
	version: typeof SHEETS_VIEW_STATE_VERSION;
	filters: SheetsFilterGroup;
	sort: readonly SheetsSortKey[];
	/** Search text; empty for no search. */
	search: string;
	columns: SheetsColumnLayout;
}

/** Why the validator dropped part of a state. */
export type SheetsViewStateDropReason =
	| 'invalid-shape'
	| 'unknown-column'
	| 'column-not-filterable'
	| 'unknown-operator'
	| 'unknown-option'
	| 'unknown-relation'
	| 'relation-test-unavailable'
	| 'column-not-sortable'
	| 'duplicate-sort'
	| 'search-unavailable';

/** One part of a state that the current model does not support. */
export interface SheetsViewStateDrop {
	/** Which part of the state. */
	part: 'filters' | 'sort' | 'search' | 'columns';
	/** Column or relation the dropped part named, or null. */
	target: string | null;
	reason: SheetsViewStateDropReason;
	/** Human-readable explanation, safe to show to the user. */
	message: string;
}

/** A state the model supports, and what was dropped to get it. */
export interface SheetsViewStateValidation {
	state: SheetsViewState;
	dropped: readonly SheetsViewStateDrop[];
}

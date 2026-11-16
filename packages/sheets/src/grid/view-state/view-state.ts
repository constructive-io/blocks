import { createColumnLayout } from '../columns/column-layout';
import {
	SHEETS_VIEW_STATE_VERSION,
	type SheetsFilterCondition,
	type SheetsFilterGroup,
	type SheetsFilterLogic,
	type SheetsFilterNode,
	type SheetsSortDirection,
	type SheetsSortKey,
	type SheetsViewState,
} from './view-state.types';

/** Deepest nesting the filter builder offers (the root group is depth 0). */
export const MAX_FILTER_DEPTH = 3;

let nextNodeId = 0;

/** A node id unique within this page. */
export function createFilterNodeId(): string {
	nextNodeId += 1;
	return `f${Date.now().toString(36)}${nextNodeId.toString(36)}`;
}

export function createFilterGroup(logic: SheetsFilterLogic = 'and', children: readonly SheetsFilterNode[] = []): SheetsFilterGroup {
	return { kind: 'group', id: createFilterNodeId(), logic, children };
}

/** The state with no filter, no sort, no search, and every column shown in the table's order. */
export function createSheetsViewState(): SheetsViewState {
	return { version: SHEETS_VIEW_STATE_VERSION, filters: createFilterGroup(), sort: [], search: '', columns: createColumnLayout() };
}

/** Every condition in a group, depth first. */
export function filterConditionsOf(node: SheetsFilterNode): SheetsFilterCondition[] {
	if (node.kind !== 'group') return [node];
	return node.children.flatMap(filterConditionsOf);
}

/** Replace the node with `id` anywhere in the tree. */
export function replaceFilterNode(group: SheetsFilterGroup, id: string, next: SheetsFilterNode): SheetsFilterGroup {
	return {
		...group,
		children: group.children.map((child) => {
			if (child.id === id) return next;
			return child.kind === 'group' ? replaceFilterNode(child, id, next) : child;
		}),
	};
}

/** Remove the node with `id` anywhere in the tree. */
export function removeFilterNode(group: SheetsFilterGroup, id: string): SheetsFilterGroup {
	return {
		...group,
		children: group.children
			.filter((child) => child.id !== id)
			.map((child) => (child.kind === 'group' ? removeFilterNode(child, id) : child)),
	};
}

/**
 * The sort after a header click. A plain click cycles that column alone
 * (ascending, descending, none) and replaces any other key. An additive click
 * (Shift) adds the column as the last key, flips it, or removes it, and keeps
 * the other keys.
 */
export function cycleSort(sort: readonly SheetsSortKey[], column: string, additive: boolean): SheetsSortKey[] {
	const current = sort.find((key) => key.column === column);
	const next: SheetsSortDirection | null = !current ? 'asc' : current.direction === 'asc' ? 'desc' : null;
	if (!additive) return next ? [{ column, direction: next }] : [];
	if (!current) return [...sort, { column, direction: 'asc' }];
	return next
		? sort.map((key) => (key.column === column ? { column, direction: next } : key))
		: sort.filter((key) => key.column !== column);
}

/** The sort with `column` set to `direction`, kept in place or added last. */
export function setSortDirection(
	sort: readonly SheetsSortKey[],
	column: string,
	direction: SheetsSortDirection,
): SheetsSortKey[] {
	return sort.some((key) => key.column === column)
		? sort.map((key) => (key.column === column ? { column, direction } : key))
		: [...sort, { column, direction }];
}

/** The sort with the key at `from` moved to `to`. */
export function moveSortKey(sort: readonly SheetsSortKey[], from: number, to: number): SheetsSortKey[] {
	if (from === to || from < 0 || to < 0 || from >= sort.length || to >= sort.length) return [...sort];
	const next = [...sort];
	const [moved] = next.splice(from, 1);
	next.splice(to, 0, moved!);
	return next;
}

function withoutIds(node: SheetsFilterNode): unknown {
	if (node.kind !== 'group') {
		const { id: _id, ...rest } = node;
		return rest;
	}
	return { kind: node.kind, logic: node.logic, children: node.children.map(withoutIds) };
}

/**
 * A text form of a state that two states with the same meaning share (filter
 * node ids, key order and width order do not count). A saved view has unsaved
 * changes exactly when this differs from the stored state's.
 */
export function viewStateSignature(state: SheetsViewState): string {
	const widths = Object.entries(state.columns.widths).sort(([left], [right]) => left.localeCompare(right));
	return JSON.stringify({
		filters: withoutIds(state.filters),
		sort: state.sort,
		search: state.search,
		columns: { ...state.columns, hidden: [...state.columns.hidden].sort(), widths },
	});
}

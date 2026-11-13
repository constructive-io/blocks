/**
 * Check a stored view state against the current table model.
 *
 * Pure: returns a state that only names columns, operators, options and
 * relations the model has, and a list of what it dropped and why. Use it to load
 * a saved view; the grid also runs it on every state it receives, so a stale
 * state never reaches the server. A version 1 state (before the column layout)
 * loads with the default layout.
 */
import type { ColumnModel, TableModel } from '@constructive-io/data';

import { gridColumnKeys } from '../../relations/relation-columns';
import { ROW_HEIGHTS, clampColumnWidth, createColumnLayout } from '../columns/column-layout';
import { filterOperatorLabel, filterOperatorOptions, findOperatorOption, humanizeOperatorName } from '../filter-operators';
import { relationFilterTests } from '../filters/relation-filters';
import { searchPlanOf } from './search-plan';
import { createFilterNodeId } from './view-state';
import {
	SHEETS_VIEW_STATE_VERSION,
	type SheetsColumnCondition,
	type SheetsColumnLayout,
	type SheetsRowHeight,
	type SheetsFilterGroup,
	type SheetsFilterNode,
	type SheetsFilterValue,
	type SheetsRelationCondition,
	type SheetsSortKey,
	type SheetsViewState,
	type SheetsViewStateDrop,
	type SheetsViewStateValidation,
} from './view-state.types';

type UnknownRecord = Record<string, unknown>;

const isRecord = (value: unknown): value is UnknownRecord => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

interface Context {
	model: TableModel;
	dropped: SheetsViewStateDrop[];
	ids: Set<string>;
	label: (name: string) => string;
}

function uniqueId(ctx: Context, candidate: unknown): string {
	let id = typeof candidate === 'string' && candidate !== '' ? candidate : createFilterNodeId();
	while (ctx.ids.has(id)) id = createFilterNodeId();
	ctx.ids.add(id);
	return id;
}

function drop(ctx: Context, entry: SheetsViewStateDrop): null {
	ctx.dropped.push(entry);
	return null;
}

function parseValue(value: unknown): SheetsFilterValue | undefined {
	if (value === null) return null;
	if (typeof value === 'string' || typeof value === 'boolean') return value;
	if (Array.isArray(value)) return value.every((item) => typeof item === 'string') ? (value as string[]) : undefined;
	if (isRecord(value)) {
		return Object.values(value).every((item) => typeof item === 'string') ? (value as Record<string, string>) : undefined;
	}
	return undefined;
}

/** Keep only the option values the column still has; null when none remain. */
function keepKnownOptions(
	ctx: Context,
	column: ColumnModel,
	options: readonly { value: string }[],
	value: SheetsFilterValue,
): SheetsFilterValue | null {
	const known = new Set(options.map((option) => option.value));
	const name = ctx.label(column.name);
	if (typeof value === 'string') {
		if (value === '' || known.has(value)) return value;
		return drop(ctx, {
			part: 'filters',
			target: column.name,
			reason: 'unknown-option',
			message: `A filter on "${name}" was removed because "${value}" is no longer one of its options.`,
		});
	}
	if (Array.isArray(value)) {
		const kept = value.filter((item) => known.has(item));
		const missing = value.filter((item) => !known.has(item));
		if (missing.length === 0) return value;
		ctx.dropped.push({
			part: 'filters',
			target: column.name,
			reason: 'unknown-option',
			message:
				kept.length > 0
					? `A filter on "${name}" no longer matches ${missing.map((item) => `"${item}"`).join(', ')}: those options were removed.`
					: `A filter on "${name}" was removed because none of its options exist any more.`,
		});
		return kept.length > 0 ? kept : null;
	}
	return value;
}

function parseColumnCondition(ctx: Context, input: UnknownRecord): SheetsColumnCondition | null {
	const name = typeof input.column === 'string' ? input.column : null;
	const operator = typeof input.operator === 'string' ? input.operator : null;
	const value = parseValue(input.value);
	if (!name || !operator || value === undefined) {
		return drop(ctx, { part: 'filters', target: name, reason: 'invalid-shape', message: 'A filter condition could not be read and was removed.' });
	}
	const column = ctx.model.columns.find((candidate) => candidate.name === name);
	if (!column) {
		return drop(ctx, {
			part: 'filters',
			target: name,
			reason: 'unknown-column',
			message: `A filter on "${ctx.label(name)}" was removed because the column no longer exists.`,
		});
	}
	if (!column.readable || !column.filter) {
		return drop(ctx, {
			part: 'filters',
			target: name,
			reason: 'column-not-filterable',
			message: `A filter on "${ctx.label(name)}" was removed because the column can no longer be filtered.`,
		});
	}
	const option = findOperatorOption(filterOperatorOptions(column), operator, value);
	if (!option || option.control.kind === 'unsupported') {
		const operatorName = column.filter.operators.some((candidate) => candidate.name === operator)
			? filterOperatorLabel(column, operator)
			: humanizeOperatorName(operator);
		return drop(ctx, {
			part: 'filters',
			target: name,
			reason: 'unknown-operator',
			message: `A filter on "${ctx.label(name)}" was removed because "${operatorName}" is no longer available for it.`,
		});
	}
	const control = option.control.kind === 'multi' ? option.control.item : option.control;
	const kept = control.kind === 'choice' ? keepKnownOptions(ctx, column, control.options, value) : value;
	if (kept === null && value !== null) return null;
	return { kind: 'column', id: uniqueId(ctx, input.id), column: name, operator, value: kept };
}

function parseRelationCondition(ctx: Context, input: UnknownRecord): SheetsRelationCondition | null {
	const name = typeof input.relation === 'string' ? input.relation : null;
	const test = input.test === 'any' || input.test === 'none' || input.test === 'labelContains' ? input.test : null;
	const value = input.value === null || input.value === undefined ? null : typeof input.value === 'string' ? input.value : undefined;
	if (!name || !test || value === undefined) {
		return drop(ctx, { part: 'filters', target: name, reason: 'invalid-shape', message: 'A filter condition could not be read and was removed.' });
	}
	const relation = ctx.model.relations.find((candidate) => candidate.fieldName === name);
	if (!relation) {
		return drop(ctx, {
			part: 'filters',
			target: name,
			reason: 'unknown-relation',
			message: `A filter on "${ctx.label(name)}" was removed because the linked field no longer exists.`,
		});
	}
	// The label test also needs the related model, which the grid checks when it builds the filter.
	const available = relationFilterTests(relation, null).find((entry) => entry.test === test);
	const unavailable = test === 'labelContains' ? !relation.filter?.recordFilterType : Boolean(available?.reason);
	if (unavailable) {
		return drop(ctx, {
			part: 'filters',
			target: name,
			reason: 'relation-test-unavailable',
			message: `A filter on "${ctx.label(name)}" was removed because that test is no longer available for it.`,
		});
	}
	return { kind: 'relation', id: uniqueId(ctx, input.id), relation: name, test, value: test === 'labelContains' ? value ?? '' : null };
}

function parseGroup(ctx: Context, input: unknown, root: boolean): SheetsFilterGroup | null {
	if (!isRecord(input) || input.kind !== 'group' || !Array.isArray(input.children)) {
		if (!root || input !== undefined) {
			drop(ctx, { part: 'filters', target: null, reason: 'invalid-shape', message: 'A group of filters could not be read and was removed.' });
		}
		return null;
	}
	const logic = input.logic === 'or' ? 'or' : 'and';
	const children = input.children
		.map((child): SheetsFilterNode | null => {
			if (!isRecord(child)) return drop(ctx, { part: 'filters', target: null, reason: 'invalid-shape', message: 'A filter condition could not be read and was removed.' });
			if (child.kind === 'group') return parseGroup(ctx, child, false);
			if (child.kind === 'relation') return parseRelationCondition(ctx, child);
			return parseColumnCondition(ctx, child);
		})
		.filter((child): child is SheetsFilterNode => child !== null);
	const operators = ctx.model.operations.list?.logicalOperators ?? [];
	if (children.length > 1 && logic === 'or' && !operators.includes('or')) {
		drop(ctx, {
			part: 'filters',
			target: null,
			reason: 'invalid-shape',
			message: 'A group matching any of its conditions was removed because this table cannot combine filters that way.',
		});
		return null;
	}
	return { kind: 'group', id: uniqueId(ctx, input.id), logic, children };
}

function parseSort(ctx: Context, input: unknown): SheetsSortKey[] {
	if (input === undefined) return [];
	if (!Array.isArray(input)) {
		drop(ctx, { part: 'sort', target: null, reason: 'invalid-shape', message: 'The sort could not be read and was removed.' });
		return [];
	}
	const keys: SheetsSortKey[] = [];
	for (const entry of input) {
		const name = isRecord(entry) && typeof entry.column === 'string' ? entry.column : null;
		const direction = isRecord(entry) && (entry.direction === 'asc' || entry.direction === 'desc') ? entry.direction : null;
		if (!name || !direction) {
			drop(ctx, { part: 'sort', target: name, reason: 'invalid-shape', message: 'A sort could not be read and was removed.' });
			continue;
		}
		const column = ctx.model.columns.find((candidate) => candidate.name === name);
		if (!column) {
			drop(ctx, { part: 'sort', target: name, reason: 'unknown-column', message: `The sort by "${ctx.label(name)}" was removed because the column no longer exists.` });
			continue;
		}
		if (!column.sort) {
			drop(ctx, { part: 'sort', target: name, reason: 'column-not-sortable', message: `The sort by "${ctx.label(name)}" was removed because the column can no longer be sorted.` });
			continue;
		}
		if (keys.some((key) => key.column === name)) {
			drop(ctx, { part: 'sort', target: name, reason: 'duplicate-sort', message: `A second sort by "${ctx.label(name)}" was removed.` });
			continue;
		}
		keys.push({ column: name, direction });
	}
	return keys;
}

function parseSearch(ctx: Context, input: unknown): string {
	if (input === undefined || input === null) return '';
	if (typeof input !== 'string') {
		drop(ctx, { part: 'search', target: null, reason: 'invalid-shape', message: 'The search could not be read and was removed.' });
		return '';
	}
	if (input.trim() !== '' && !searchPlanOf(ctx.model)) {
		drop(ctx, { part: 'search', target: null, reason: 'search-unavailable', message: 'The search was removed because this table cannot be searched.' });
		return '';
	}
	return input;
}

/** Keep the keys the grid has, reporting each missing key once. */
function knownKeys(ctx: Context, input: unknown, available: ReadonlySet<string>, reported: Set<string>): string[] {
	if (!Array.isArray(input)) return [];
	const keys: string[] = [];
	for (const entry of input) {
		if (typeof entry !== 'string' || keys.includes(entry)) continue;
		if (available.has(entry)) {
			keys.push(entry);
			continue;
		}
		if (reported.has(entry)) continue;
		reported.add(entry);
		drop(ctx, {
			part: 'columns',
			target: entry,
			reason: 'unknown-column',
			message: `"${ctx.label(entry)}" was removed from the field layout because the column no longer exists.`,
		});
	}
	return keys;
}

function parseColumns(ctx: Context, input: unknown): SheetsColumnLayout {
	const defaults = createColumnLayout();
	if (input === undefined) return defaults;
	if (!isRecord(input)) {
		drop(ctx, { part: 'columns', target: null, reason: 'invalid-shape', message: 'The field layout could not be read and was reset.' });
		return defaults;
	}
	const available = new Set(gridColumnKeys(ctx.model));
	const reported = new Set<string>();
	const order = knownKeys(ctx, input.order, available, reported);
	const hidden = knownKeys(ctx, input.hidden, available, reported);
	const widths: Record<string, number> = {};
	if (isRecord(input.widths)) {
		for (const [key, width] of Object.entries(input.widths)) {
			if (typeof width !== 'number' || !Number.isFinite(width)) continue;
			if (available.has(key)) widths[key] = clampColumnWidth(width);
			else knownKeys(ctx, [key], available, reported);
		}
	}
	const frozen = input.frozenCount;
	const frozenCount = typeof frozen === 'number' && Number.isInteger(frozen) && frozen >= 0 ? frozen : defaults.frozenCount;
	const rowHeight = ROW_HEIGHTS.includes(input.rowHeight as SheetsRowHeight) ? (input.rowHeight as SheetsRowHeight) : defaults.rowHeight;
	if ((input.frozenCount !== undefined && frozenCount !== frozen) || (input.rowHeight !== undefined && rowHeight !== input.rowHeight)) {
		drop(ctx, { part: 'columns', target: null, reason: 'invalid-shape', message: 'Part of the field layout could not be read and was reset.' });
	}
	// At least one column always shows.
	const shown = [...available].filter((key) => !hidden.includes(key));
	return { order, hidden: shown.length > 0 ? hidden : hidden.slice(1), frozenCount, widths, rowHeight };
}

export interface ValidateSheetsViewStateOptions {
	/** Column or relation title for messages; defaults to the field name. */
	label?: (name: string) => string;
}

/**
 * A state the model supports, from any stored value. Unknown columns,
 * operators, options and relations are dropped and reported; an unreadable
 * value becomes the empty state.
 */
export function validateSheetsViewState(
	input: unknown,
	model: TableModel,
	options: ValidateSheetsViewStateOptions = {},
): SheetsViewStateValidation {
	const ctx: Context = { model, dropped: [], ids: new Set(), label: options.label ?? ((name) => name) };
	const source = isRecord(input) ? input : {};
	if (input !== undefined && input !== null && !isRecord(input)) {
		drop(ctx, { part: 'filters', target: null, reason: 'invalid-shape', message: 'The saved view could not be read and was reset.' });
	}
	const filters = parseGroup(ctx, source.filters, true) ?? { kind: 'group', id: uniqueId(ctx, null), logic: 'and', children: [] };
	const state: SheetsViewState = {
		version: SHEETS_VIEW_STATE_VERSION,
		filters,
		sort: parseSort(ctx, source.sort),
		search: parseSearch(ctx, source.search),
		// Version 1 had no layout: it loads with the default one.
		columns: parseColumns(ctx, source.columns),
	};
	return { state, dropped: ctx.dropped };
}

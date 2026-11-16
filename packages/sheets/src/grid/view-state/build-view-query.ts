/**
 * The list variables for a view state: the filter (conditions and search,
 * combined with `and`) and the sort, built only from the table model.
 */
import type { SortSpec, TableKey, TableModel } from '@constructive-io/data';

import { filterOperatorOptions, findOperatorOption } from '../filter-operators';
import { encodeFilterValue, type FilterValueResult } from '../filters/filter-value';
import { relationConditionWhere } from '../filters/relation-filters';
import { searchPlanOf, searchWhere } from './search-plan';
import type { SheetsColumnCondition, SheetsFilterNode, SheetsViewState } from './view-state.types';

type Where = Record<string, unknown>;

/** A part of the filter and the conditions in it, so a part left out takes its conditions with it. */
interface Part {
	where: Where;
	ids: readonly string[];
}

const NOT_COMBINED = 'This table cannot combine this condition with the others, so it is not applied.';
const NOT_COMBINED_WITH_SEARCH = 'This table cannot combine this condition with the search, so it is not applied.';

/** Whether a condition is part of the filter, and why not. */
export type ConditionStatus =
	| { status: 'applied' }
	| { status: 'incomplete' }
	| { status: 'invalid'; message: string };

export interface ViewQuery {
	/** The filter input value, or undefined for no filter. */
	where: Where | undefined;
	/** The sort, first key first, or undefined for none. */
	orderBy: SortSpec[] | undefined;
	/** Status of every condition, by condition id. */
	conditions: ReadonlyMap<string, ConditionStatus>;
	/** Number of conditions in the filter. */
	appliedCount: number;
	/** Related tables whose models some condition still needs. */
	waitingFor: readonly TableKey[];
}

export type RelatedModelLookup = (key: TableKey) => TableModel | null;

interface BuildContext {
	model: TableModel;
	related: RelatedModelLookup;
	conditions: Map<string, ConditionStatus>;
	waitingFor: Set<TableKey>;
}

function columnConditionResult(model: TableModel, condition: SheetsColumnCondition): { result: FilterValueResult; field: string | null } {
	const column = model.columns.find((candidate) => candidate.name === condition.column);
	if (!column?.filter) return { result: { status: 'invalid', message: 'This column cannot be filtered.' }, field: null };
	const option = findOperatorOption(filterOperatorOptions(column), condition.operator, condition.value);
	if (!option) return { result: { status: 'invalid', message: 'This condition is not available for the column.' }, field: null };
	return { result: encodeFilterValue(option.control, condition.value, option.fixedValue), field: column.filter.field };
}

function record(ctx: BuildContext, id: string, result: FilterValueResult): void {
	ctx.conditions.set(id, result.status === 'ready' ? { status: 'applied' } : result);
}

/** Mark the conditions of parts the filter leaves out, so none of them counts as applied. */
function leaveOut(ctx: BuildContext, parts: readonly Part[], message: string): void {
	for (const part of parts) for (const id of part.ids) ctx.conditions.set(id, { status: 'invalid', message });
}

/** Combine filter parts with a logical operator the filter input has, or null when they cannot be combined. */
function combine(model: TableModel, logic: 'and' | 'or', parts: readonly Part[]): Part | null {
	if (parts.length === 0) return null;
	if (parts.length === 1) return parts[0]!;
	const ids = parts.flatMap((part) => part.ids);
	if (model.operations.list?.logicalOperators.includes(logic)) return { where: { [logic]: parts.map((part) => part.where) }, ids };
	// Without an `and` field the parts still combine as one object when their fields differ.
	if (logic === 'and') {
		const merged: Where = {};
		for (const part of parts) {
			for (const key of Object.keys(part.where)) if (key in merged) return null;
			Object.assign(merged, part.where);
		}
		return { where: merged, ids };
	}
	return null;
}

function nodePart(ctx: BuildContext, node: SheetsFilterNode): Part | null {
	if (node.kind === 'group') {
		const parts = node.children.map((child) => nodePart(ctx, child)).filter((part): part is Part => part !== null);
		const combined = combine(ctx.model, node.logic, parts);
		if (!combined) leaveOut(ctx, parts, NOT_COMBINED);
		return combined;
	}
	if (node.kind === 'column') {
		const { result, field } = columnConditionResult(ctx.model, node);
		record(ctx, node.id, result);
		return result.status === 'ready' && field ? { where: { [field]: { [node.operator]: result.value } }, ids: [node.id] } : null;
	}
	const relation = ctx.model.relations.find((candidate) => candidate.fieldName === node.relation);
	if (!relation) {
		record(ctx, node.id, { status: 'invalid', message: 'This relation no longer exists.' });
		return null;
	}
	const related = relation.targetKey ? ctx.related(relation.targetKey) : null;
	const { result, waitingFor } = relationConditionWhere(relation, node, related);
	if (waitingFor) ctx.waitingFor.add(waitingFor);
	record(ctx, node.id, result);
	return result.status === 'ready' ? { where: result.value as Where, ids: [node.id] } : null;
}

/**
 * The list variables for a state the model supports (see
 * `validateSheetsViewState`). Conditions that are incomplete or invalid, or
 * that the filter input cannot combine, are left out of the filter and
 * reported in `conditions`, so `appliedCount` counts only what filters.
 */
export function buildViewQuery(state: SheetsViewState, model: TableModel, related: RelatedModelLookup = () => null): ViewQuery {
	const ctx: BuildContext = { model, related, conditions: new Map(), waitingFor: new Set() };
	const filter = nodePart(ctx, state.filters);
	const plan = searchPlanOf(model);
	const searchText = plan ? searchWhere(plan, state.search) : null;
	const search: Part | null = searchText ? { where: searchText, ids: [] } : null;
	let combined = combine(model, 'and', [filter, search].filter((part): part is Part => part !== null));
	if (!combined && filter && search) {
		// The search the user typed stays; the conditions it cannot be combined with say so.
		leaveOut(ctx, [filter], NOT_COMBINED_WITH_SEARCH);
		combined = search;
	}
	const where = combined?.where;
	const orderBy = state.sort.length > 0 ? state.sort.map((key) => ({ field: key.column, direction: key.direction })) : undefined;
	let appliedCount = 0;
	for (const status of ctx.conditions.values()) if (status.status === 'applied') appliedCount += 1;
	return { where, orderBy, conditions: ctx.conditions, appliedCount, waitingFor: [...ctx.waitingFor] };
}

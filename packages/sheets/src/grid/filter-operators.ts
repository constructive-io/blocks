/**
 * Filter operators from the table model.
 *
 * A column offers exactly the operators its filter input really has
 * (`ColumnModel.filter.operators`). Each operator gets a plain label, a group,
 * and the value control its input shape and the column's kind call for. An
 * operator this file does not know still appears, named from its field name.
 */
import type { ColumnModel, ColumnOption, FilterOperatorModel, InputValueModel } from '@constructive-io/data';

export type FilterOperatorGroup = 'match' | 'text' | 'compare' | 'items' | 'empty' | 'other';

/** Group headings, in display order. */
export const FILTER_OPERATOR_GROUPS: readonly { group: FilterOperatorGroup; label: string }[] = [
	{ group: 'match', label: 'Match' },
	{ group: 'text', label: 'Text' },
	{ group: 'compare', label: 'Compare' },
	{ group: 'items', label: 'Items' },
	{ group: 'empty', label: 'Empty' },
	{ group: 'other', label: 'More' },
];

/** A control for one value. */
export type ScalarValueControl =
	| { kind: 'text' }
	/** A whole number that fits a JavaScript number; sent as a number. */
	| { kind: 'integer' }
	/** A floating-point number; sent as a number. */
	| { kind: 'number' }
	/** A whole number of any size; sent as exact text. */
	| { kind: 'exact-integer' }
	/** A decimal number of any size; sent as exact text. */
	| { kind: 'exact-decimal' }
	| { kind: 'date' }
	| { kind: 'datetime' }
	| { kind: 'time' }
	| { kind: 'boolean' }
	/** One of a fixed list. `value` is the wire value. */
	| { kind: 'choice'; options: readonly ColumnOption[] }
	| { kind: 'json' };

export interface FilterValueField {
	name: string;
	label: string;
	required: boolean;
	control: ScalarValueControl;
}

/** The control a condition shows for its operator. */
export type FilterValueControl =
	| ScalarValueControl
	/** The operator takes no value from the user. */
	| { kind: 'none' }
	/** The operator takes a list of values. */
	| { kind: 'multi'; item: ScalarValueControl }
	/** The operator takes an object: one control per field. */
	| { kind: 'fields'; fields: readonly FilterValueField[] }
	/** The editor cannot enter this operator's value. */
	| { kind: 'unsupported'; reason: string };

export interface FilterOperatorOption {
	/** Unique within a column: the operator name, or `isNull:true` / `isNull:false`. */
	id: string;
	/** Operator field name. */
	operator: string;
	label: string;
	group: FilterOperatorGroup;
	control: FilterValueControl;
	/** The operand of an operator that takes no value from the user (`isNull`). */
	fixedValue?: boolean;
}

const UNSUPPORTED_VALUE = 'This condition needs a value the filter editor cannot enter yet.';

const GENERIC_LABELS: Readonly<Record<string, string>> = {
	equalTo: 'is',
	notEqualTo: 'is not',
	in: 'is any of',
	notIn: 'is none of',
	equalToInsensitive: 'is (any case)',
	notEqualToInsensitive: 'is not (any case)',
	inInsensitive: 'is any of (any case)',
	notInInsensitive: 'is none of (any case)',
	distinctFrom: 'is not, counting empty',
	notDistinctFrom: 'is, counting empty',
	distinctFromInsensitive: 'is not (any case), counting empty',
	notDistinctFromInsensitive: 'is (any case), counting empty',
	includesInsensitive: 'contains',
	notIncludesInsensitive: 'does not contain',
	includes: 'contains (exact case)',
	notIncludes: 'does not contain (exact case)',
	startsWithInsensitive: 'starts with',
	notStartsWithInsensitive: 'does not start with',
	startsWith: 'starts with (exact case)',
	notStartsWith: 'does not start with (exact case)',
	endsWithInsensitive: 'ends with',
	notEndsWithInsensitive: 'does not end with',
	endsWith: 'ends with (exact case)',
	notEndsWith: 'does not end with (exact case)',
	likeInsensitive: 'matches pattern',
	notLikeInsensitive: 'does not match pattern',
	like: 'matches pattern (exact case)',
	notLike: 'does not match pattern (exact case)',
	matches: 'matches',
	similarTo: 'is similar to',
	wordSimilarTo: 'has a word similar to',
	lessThan: 'is less than',
	lessThanOrEqualTo: 'is at most',
	greaterThan: 'is greater than',
	greaterThanOrEqualTo: 'is at least',
	lessThanInsensitive: 'comes before (any case)',
	lessThanOrEqualToInsensitive: 'comes before or is (any case)',
	greaterThanInsensitive: 'comes after (any case)',
	greaterThanOrEqualToInsensitive: 'comes after or is (any case)',
	contains: 'contains',
	containedBy: 'is within',
	overlaps: 'overlaps',
	anyEqualTo: 'has an item that is',
	anyNotEqualTo: 'has an item that is not',
	anyLessThan: 'has an item less than',
	anyLessThanOrEqualTo: 'has an item at most',
	anyGreaterThan: 'has an item greater than',
	anyGreaterThanOrEqualTo: 'has an item at least',
	containsKey: 'has the key',
	containsAllKeys: 'has all of the keys',
	containsAnyKeys: 'has any of the keys',
	containsOrEqualTo: 'contains or is',
	containedByOrEqualTo: 'is within or is',
	containsOrContainedBy: 'contains or is within',
	containsElement: 'contains the value',
	strictlyLeftOf: 'is entirely before',
	strictlyRightOf: 'is entirely after',
	notExtendsRightOf: 'does not reach past',
	notExtendsLeftOf: 'does not start before',
	adjacentTo: 'is next to',
	within: 'is within',
};

const NUMBER_LABELS: Readonly<Record<string, string>> = {
	equalTo: '=',
	notEqualTo: '≠',
	lessThan: '<',
	lessThanOrEqualTo: '≤',
	greaterThan: '>',
	greaterThanOrEqualTo: '≥',
};

const TIME_LABELS: Readonly<Record<string, string>> = {
	lessThan: 'is before',
	lessThanOrEqualTo: 'is on or before',
	greaterThan: 'is after',
	greaterThanOrEqualTo: 'is on or after',
};

const LIST_LABELS: Readonly<Record<string, string>> = {
	equalTo: 'is exactly',
	notEqualTo: 'is not exactly',
	contains: 'has all of',
	containedBy: 'has only items from',
	overlaps: 'has any of',
};

const PATH_LABELS: Readonly<Record<string, string>> = {
	within: 'is under',
	ancestorOf: 'is above',
	glob: 'matches path pattern',
};

const GROUP_OF: Readonly<Record<string, FilterOperatorGroup>> = {
	equalTo: 'match',
	notEqualTo: 'match',
	in: 'match',
	notIn: 'match',
	equalToInsensitive: 'match',
	notEqualToInsensitive: 'match',
	inInsensitive: 'match',
	notInInsensitive: 'match',
	includesInsensitive: 'text',
	notIncludesInsensitive: 'text',
	includes: 'text',
	notIncludes: 'text',
	startsWithInsensitive: 'text',
	notStartsWithInsensitive: 'text',
	startsWith: 'text',
	notStartsWith: 'text',
	endsWithInsensitive: 'text',
	notEndsWithInsensitive: 'text',
	endsWith: 'text',
	notEndsWith: 'text',
	likeInsensitive: 'text',
	notLikeInsensitive: 'text',
	like: 'text',
	notLike: 'text',
	matches: 'text',
	similarTo: 'text',
	wordSimilarTo: 'text',
	lessThan: 'compare',
	lessThanOrEqualTo: 'compare',
	greaterThan: 'compare',
	greaterThanOrEqualTo: 'compare',
	contains: 'items',
	containedBy: 'items',
	overlaps: 'items',
	anyEqualTo: 'items',
	anyNotEqualTo: 'items',
	anyLessThan: 'items',
	anyLessThanOrEqualTo: 'items',
	anyGreaterThan: 'items',
	anyGreaterThanOrEqualTo: 'items',
	containsKey: 'items',
	containsAllKeys: 'items',
	containsAnyKeys: 'items',
	isNull: 'empty',
};

/** Display order: operators named here come first within their group, in this order. */
const PREFERRED_ORDER = Object.keys(GROUP_OF);

/** Operators whose value is compared for equality, so a column's option list applies. */
const OPTION_OPERATORS = new Set([
	'equalTo',
	'notEqualTo',
	'distinctFrom',
	'notDistinctFrom',
	'in',
	'notIn',
	'contains',
	'containedBy',
	'overlaps',
	'anyEqualTo',
	'anyNotEqualTo',
]);

/** A readable name from an operator field name: `bboxIntersects2D` -> `bbox intersects 2D`. */
export function humanizeOperatorName(name: string): string {
	const words = name
		.replace(/([a-z])([A-Z0-9])/g, '$1 $2')
		.replace(/([0-9])([A-Z][a-z])/g, '$1 $2')
		.split(/\s+/)
		.filter(Boolean)
		.map((word, index) => (index > 0 && /^[A-Z][a-z]/.test(word) ? word.toLowerCase() : word));
	return words.join(' ') || name;
}

/** A readable name from an input field name: `postalCode` -> `Postal code`. */
function humanizeFieldName(name: string): string {
	const text = humanizeOperatorName(name).replace(/_/g, ' ');
	return text.charAt(0).toUpperCase() + text.slice(1);
}

function isNumericKind(column: ColumnModel): boolean {
	const { kind } = column.value;
	return kind === 'integer' || kind === 'bigint' || kind === 'decimal' || kind === 'float';
}

function isTimeKind(column: ColumnModel): boolean {
	const { kind } = column.value;
	return kind === 'date' || kind === 'time' || kind === 'datetime';
}

/** The label of one operator on one column. */
export function filterOperatorLabel(column: ColumnModel, operator: string): string {
	if (column.value.isArray && LIST_LABELS[operator]) return LIST_LABELS[operator]!;
	if (column.value.kind === 'path' && PATH_LABELS[operator]) return PATH_LABELS[operator]!;
	if (!column.value.isArray && isNumericKind(column) && NUMBER_LABELS[operator]) return NUMBER_LABELS[operator]!;
	if (!column.value.isArray && isTimeKind(column) && TIME_LABELS[operator]) return TIME_LABELS[operator]!;
	return GENERIC_LABELS[operator] ?? humanizeOperatorName(operator);
}

function enumOptions(input: InputValueModel, column: ColumnModel | null): ColumnOption[] {
	const labels = new Map((column?.value.options ?? []).map((option) => [option.value, option.label]));
	return (input.enumValues ?? []).map((value) => ({ value, label: labels.get(value) ?? humanizeFieldName(value.toLowerCase()) }));
}

/** The control for a scalar of a known GraphQL scalar type, or null for an unknown type. */
function builtinScalarControl(typeName: string): ScalarValueControl | null {
	switch (typeName) {
		case 'Boolean':
			return { kind: 'boolean' };
		case 'Int':
			return { kind: 'integer' };
		case 'Float':
			return { kind: 'number' };
		case 'BigInt':
			return { kind: 'exact-integer' };
		case 'BigFloat':
			return { kind: 'exact-decimal' };
		case 'Date':
			return { kind: 'date' };
		case 'Datetime':
			return { kind: 'datetime' };
		case 'Time':
			return { kind: 'time' };
		case 'JSON':
		case 'GeoJSON':
			return { kind: 'json' };
		default:
			return null;
	}
}

/** The control for the column's own value kind (a domain type over a number, a date, ...). */
function kindControl(column: ColumnModel): ScalarValueControl {
	switch (column.value.kind) {
		case 'integer':
			return { kind: 'integer' };
		case 'bigint':
			return { kind: 'exact-integer' };
		case 'decimal':
			return { kind: 'exact-decimal' };
		case 'float':
			return { kind: 'number' };
		case 'date':
			return { kind: 'date' };
		case 'time':
			return { kind: 'time' };
		case 'datetime':
			return { kind: 'datetime' };
		case 'boolean':
			return { kind: 'boolean' };
		case 'json':
		case 'vector':
		case 'geometry':
			return { kind: 'json' };
		case 'file':
			// An attachment is a URL; an image or upload is a file object.
			return column.value.file?.kind === 'attachment' || column.value.semantic === 'attachment' ? { kind: 'text' } : { kind: 'json' };
		default:
			return { kind: 'text' };
	}
}

function scalarControl(input: InputValueModel, column: ColumnModel | null, operator: string): ScalarValueControl | null {
	if (input.shape === 'enum') {
		const options = enumOptions(input, column);
		return options.length > 0 ? { kind: 'choice', options } : null;
	}
	if (input.shape !== 'scalar') return null;
	if (input.typeName === 'Boolean') return { kind: 'boolean' };
	const ownType = column && (input.typeName === column.value.input?.typeName || input.typeName === column.value.typeName);
	if (column && ownType && column.value.options && column.value.options.length > 0 && OPTION_OPERATORS.has(operator)) {
		return { kind: 'choice', options: column.value.options };
	}
	if (column && ownType) return kindControl(column);
	return builtinScalarControl(input.typeName) ?? { kind: 'text' };
}

function objectControl(input: InputValueModel): FilterValueControl {
	if (!input.fields || input.fields.length === 0) return { kind: 'unsupported', reason: UNSUPPORTED_VALUE };
	const fields: FilterValueField[] = [];
	for (const field of input.fields) {
		if (field.value.isList) return { kind: 'unsupported', reason: UNSUPPORTED_VALUE };
		const control = scalarControl(field.value, null, field.name);
		if (!control) return { kind: 'unsupported', reason: UNSUPPORTED_VALUE };
		fields.push({ name: field.name, label: humanizeFieldName(field.name), required: field.required, control });
	}
	return { kind: 'fields', fields };
}

/** The value control for one operator of one column. */
export function filterValueControl(column: ColumnModel, operator: FilterOperatorModel): FilterValueControl {
	const { input } = operator;
	if (input.shape === 'object') {
		return input.isList ? { kind: 'unsupported', reason: UNSUPPORTED_VALUE } : objectControl(input);
	}
	const item = scalarControl(input, column, operator.name);
	if (!item) return { kind: 'unsupported', reason: UNSUPPORTED_VALUE };
	return input.isList ? { kind: 'multi', item } : item;
}

function orderIndex(operator: string): number {
	const index = PREFERRED_ORDER.indexOf(operator);
	return index === -1 ? PREFERRED_ORDER.length : index;
}

/**
 * Every operator a column's filter has, as the builder offers them: grouped,
 * labelled, each with its value control. `isNull` becomes two choices, "is
 * empty" and "is not empty". Empty when the column cannot be filtered.
 */
export function filterOperatorOptions(column: ColumnModel): FilterOperatorOption[] {
	const operators = column.filter?.operators ?? [];
	const options: FilterOperatorOption[] = [];
	for (const operator of operators) {
		if (operator.name === 'isNull' && operator.input.shape === 'scalar' && operator.input.typeName === 'Boolean') {
			options.push(
				{ id: 'isNull:true', operator: 'isNull', label: 'is empty', group: 'empty', control: { kind: 'none' }, fixedValue: true },
				{ id: 'isNull:false', operator: 'isNull', label: 'is not empty', group: 'empty', control: { kind: 'none' }, fixedValue: false },
			);
			continue;
		}
		options.push({
			id: operator.name,
			operator: operator.name,
			label: filterOperatorLabel(column, operator.name),
			group: GROUP_OF[operator.name] ?? 'other',
			control: filterValueControl(column, operator),
		});
	}
	const groupOrder = FILTER_OPERATOR_GROUPS.map((entry) => entry.group);
	return options
		.map((option, position) => ({ option, position }))
		.sort(
			(left, right) =>
				groupOrder.indexOf(left.option.group) - groupOrder.indexOf(right.option.group) ||
				orderIndex(left.option.operator) - orderIndex(right.option.operator) ||
				left.position - right.position,
		)
		.map((entry) => entry.option);
}

/** The option a condition uses: its operator, and for `isNull` its boolean operand. */
export function findOperatorOption(
	options: readonly FilterOperatorOption[],
	operator: string,
	value: unknown,
): FilterOperatorOption | null {
	if (operator === 'isNull') return options.find((option) => option.operator === 'isNull' && option.fixedValue === (value !== false)) ?? null;
	return options.find((option) => option.operator === operator) ?? null;
}

/** Operators a new condition prefers, by what the column holds. */
function defaultPreference(column: ColumnModel): readonly string[] {
	if (column.value.isArray) return ['contains', 'anyEqualTo', 'overlaps', 'equalTo'];
	if (column.value.options?.length || column.value.kind === 'enum') return ['in', 'equalTo'];
	if (column.value.kind === 'text') return ['includesInsensitive', 'includes', 'equalTo'];
	return ['equalTo'];
}

/** The operator a new condition on this column starts with. */
export function defaultOperatorOption(column: ColumnModel): FilterOperatorOption | null {
	const options = filterOperatorOptions(column).filter((option) => option.control.kind !== 'unsupported');
	for (const name of defaultPreference(column)) {
		const match = options.find((option) => option.operator === name);
		if (match) return match;
	}
	return options[0] ?? null;
}

/** True when the column has at least one operator the builder can use. */
export function isColumnFilterable(column: ColumnModel): boolean {
	return column.readable && defaultOperatorOption(column) !== null;
}

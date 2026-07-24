export type OperatorValueType = 'string' | 'number' | 'date' | 'datetime' | 'interval' | 'key' | 'none';

export interface FilterOperator {
	operator: string;
	label: string;
	valueType: OperatorValueType;
}

const TEXT_OPERATORS: FilterOperator[] = [
	{ operator: 'includesInsensitive', label: 'contains', valueType: 'string' },
	{ operator: 'equalTo', label: 'equals', valueType: 'string' },
	{ operator: 'notEqualTo', label: 'not equals', valueType: 'string' },
	{ operator: 'startsWithInsensitive', label: 'starts with', valueType: 'string' },
	{ operator: 'endsWithInsensitive', label: 'ends with', valueType: 'string' },
	{ operator: 'isNull', label: 'is empty', valueType: 'none' },
];

const NUMERIC_OPERATORS: FilterOperator[] = [
	{ operator: 'equalTo', label: '=', valueType: 'number' },
	{ operator: 'notEqualTo', label: '\u2260', valueType: 'number' },
	{ operator: 'greaterThan', label: '>', valueType: 'number' },
	{ operator: 'greaterThanOrEqualTo', label: '\u2265', valueType: 'number' },
	{ operator: 'lessThan', label: '<', valueType: 'number' },
	{ operator: 'lessThanOrEqualTo', label: '\u2264', valueType: 'number' },
	{ operator: 'isNull', label: 'is empty', valueType: 'none' },
];

const BOOLEAN_OPERATORS: FilterOperator[] = [
	{ operator: 'equalTo:true', label: 'is true', valueType: 'none' },
	{ operator: 'equalTo:false', label: 'is false', valueType: 'none' },
	{ operator: 'isNull', label: 'is empty', valueType: 'none' },
];

function makeDateOperators(valueType: 'date' | 'datetime'): FilterOperator[] {
	return [
		{ operator: 'equalTo', label: 'equals', valueType },
		{ operator: 'lessThan', label: 'before', valueType },
		{ operator: 'lessThanOrEqualTo', label: 'on or before', valueType },
		{ operator: 'greaterThan', label: 'after', valueType },
		{ operator: 'greaterThanOrEqualTo', label: 'on or after', valueType },
		{ operator: 'isNull', label: 'is empty', valueType: 'none' },
	];
}

const DATE_OPERATORS = makeDateOperators('date');
const DATETIME_OPERATORS = makeDateOperators('datetime');

const UUID_OPERATORS: FilterOperator[] = [
	{ operator: 'equalTo', label: 'equals', valueType: 'string' },
	{ operator: 'notEqualTo', label: 'not equals', valueType: 'string' },
	{ operator: 'isNull', label: 'is empty', valueType: 'none' },
];

const INET_OPERATORS: FilterOperator[] = [
	{ operator: 'equalTo', label: 'equals', valueType: 'string' },
	{ operator: 'notEqualTo', label: 'not equals', valueType: 'string' },
	{ operator: 'contains', label: 'contains', valueType: 'string' },
	{ operator: 'containedBy', label: 'contained by', valueType: 'string' },
	{ operator: 'isNull', label: 'is empty', valueType: 'none' },
];

const JSON_OPERATORS: FilterOperator[] = [
	{ operator: 'containsKey', label: 'has key', valueType: 'key' },
	{ operator: 'isNull', label: 'is empty', valueType: 'none' },
];

const INTERVAL_OPERATORS: FilterOperator[] = [
	{ operator: 'equalTo', label: '=', valueType: 'interval' },
	{ operator: 'notEqualTo', label: '\u2260', valueType: 'interval' },
	{ operator: 'greaterThan', label: '>', valueType: 'interval' },
	{ operator: 'greaterThanOrEqualTo', label: '\u2265', valueType: 'interval' },
	{ operator: 'lessThan', label: '<', valueType: 'interval' },
	{ operator: 'lessThanOrEqualTo', label: '\u2264', valueType: 'interval' },
	{ operator: 'isNull', label: 'is empty', valueType: 'none' },
];

const ENUM_OPERATORS: FilterOperator[] = [
	{ operator: 'equalTo', label: 'equals', valueType: 'string' },
	{ operator: 'notEqualTo', label: 'not equals', valueType: 'string' },
	{ operator: 'isNull', label: 'is empty', valueType: 'none' },
];

const GQL_TYPE_OPERATORS: Record<string, FilterOperator[]> = {
	String: TEXT_OPERATORS,
	Int: NUMERIC_OPERATORS,
	Float: NUMERIC_OPERATORS,
	BigFloat: NUMERIC_OPERATORS,
	BigInt: NUMERIC_OPERATORS,
	Boolean: BOOLEAN_OPERATORS,
	Date: DATE_OPERATORS,
	Datetime: DATETIME_OPERATORS,
	UUID: UUID_OPERATORS,
	InternetAddress: INET_OPERATORS,
	JSON: JSON_OPERATORS,
	Interval: INTERVAL_OPERATORS,
	BitString: ENUM_OPERATORS,
};

const UNFILTERABLE_TYPES = new Set(['GeoJSON', 'FullText']);

/** Get available filter operators for a given gqlType. Returns empty array for unfilterable types. */
export function getOperatorsForGqlType(gqlType: string | null | undefined, isArray: boolean): FilterOperator[] {
	if (!gqlType || isArray || UNFILTERABLE_TYPES.has(gqlType)) return [];
	return GQL_TYPE_OPERATORS[gqlType] ?? [];
}

/** Whether a field type can be filtered at all. */
export function isFilterableType(gqlType: string | null | undefined, isArray: boolean): boolean {
	if (!gqlType || isArray || UNFILTERABLE_TYPES.has(gqlType)) return false;
	return gqlType in GQL_TYPE_OPERATORS;
}

/** Get the default (first) operator for a gqlType. */
export function getDefaultOperator(gqlType: string | null | undefined, isArray: boolean): string | undefined {
	const ops = getOperatorsForGqlType(gqlType, isArray);
	return ops[0]?.operator;
}

/** Whether an operator encodes its value and needs no user input. */
export function isValuelessOperator(operator: string): boolean {
	return operator === 'isNull' || operator === 'equalTo:true' || operator === 'equalTo:false';
}

import type { MetaschemaField } from '../meta-query.types';
import {
	isRequiredInput,
	namedTypeOf,
	type IntrospectedInputValue,
	type IntrospectedType,
} from './schema-introspection';
import { canonicalName } from './names';
import { buildOutputSelection } from './selection';
import type { TypeLookup } from './type-lookup';
import type {
	ColumnFilterModel,
	ColumnModel,
	ColumnOption,
	ColumnSortModel,
	ColumnWriteModel,
	FilterOperatorModel,
	ModelIssue,
	TableOperations,
} from './types';
import { columnFile, columnSemantic, columnValueKind } from './value-kind';

export interface ColumnsContext {
	fields: readonly MetaschemaField[];
	rowType: IntrospectedType | null;
	primaryKey: readonly string[];
	operations: TableOperations;
	recordType: IntrospectedType | null;
	patchType: IntrospectedType | null;
	filterType: IntrospectedType | null;
	orderByType: IntrospectedType | null;
	lookup: TypeLookup;
	issues: ModelIssue[];
}

const UNREADABLE = 'This field cannot be shown here yet.';
const UNSUPPORTED_WRITE = 'This kind of value cannot be edited here yet.';
const COMPUTED = 'This value is calculated automatically.';


/**
 * Order-by values per column, matched against the introspected enum. A
 * column sorts only when exactly one ascending and one descending value match
 * it; anything else leaves the column unsortable instead of guessing.
 */
function sortIndex(orderByType: IntrospectedType | null): Map<string, { asc: string[]; desc: string[] }> {
	const index = new Map<string, { asc: string[]; desc: string[] }>();
	for (const { name } of orderByType?.enumValues ?? []) {
		const match = /^(.*)_(ASC|DESC)$/.exec(name);
		if (!match) continue;
		const key = canonicalName(match[1]!);
		const entry = index.get(key) ?? { asc: [], desc: [] };
		(match[2] === 'ASC' ? entry.asc : entry.desc).push(name);
		index.set(key, entry);
	}
	return index;
}

function columnSort(
	name: string,
	index: Map<string, { asc: string[]; desc: string[] }>,
): ColumnSortModel | null {
	const entry = index.get(canonicalName(name));
	return entry && entry.asc.length === 1 && entry.desc.length === 1
		? { asc: entry.asc[0]!, desc: entry.desc[0]! }
		: null;
}

function columnFilter(
	name: string,
	filterType: IntrospectedType | null,
	lookup: TypeLookup,
): ColumnFilterModel | null {
	const field = filterType?.inputFields?.find((input) => input.name === name);
	const named = namedTypeOf(field?.type);
	if (!field || named?.kind !== 'INPUT_OBJECT') return null;
	const operatorType = lookup.type(named.name);
	if (!operatorType) return null;
	const operators: FilterOperatorModel[] = [];
	for (const operator of operatorType.inputFields ?? []) {
		const input = lookup.inputValue(operator.type);
		if (input) operators.push({ name: operator.name, input });
	}
	return operators.length > 0 ? { field: field.name, typeName: named.name, operators } : null;
}

/** A readable label from a wire value: `IN_PROGRESS` -> `In progress`, `_1ST_REVIEW` -> `1st review`. */
function prettyEnumLabel(value: string): string {
	const words = value.replace(/^_+/, '').replace(/_+/g, ' ').trim().toLowerCase();
	return words ? words.charAt(0).toUpperCase() + words.slice(1) : value;
}

/**
 * Wire values from the introspected enum. Labels are the `_meta` values by
 * position, which keep the declared order, when both lists have the same
 * length; otherwise a readable form of the wire value. Labels are display
 * only: the write codec accepts a label only when it names its value.
 */
function enumOptions(field: MetaschemaField, enumType: IntrospectedType | null): ColumnOption[] | null {
	const values = (enumType?.enumValues ?? []).map((value) => value.name);
	if (values.length === 0) return null;
	const labels = field.enumValues?.values ?? [];
	const byPosition = labels.length === values.length;
	return values.map((value, position) => ({ value, label: byPosition ? labels[position]! : prettyEnumLabel(value) }));
}

function inputField(type: IntrospectedType | null, name: string): IntrospectedInputValue | null {
	return type?.inputFields?.find((field) => field.name === name) ?? null;
}

function columnWrite(
	field: MetaschemaField,
	ctx: ColumnsContext,
	readable: boolean,
	hasInputShape: boolean,
): ColumnWriteModel {
	const recordField = inputField(ctx.recordType, field.name);
	const patchField = inputField(ctx.patchType, field.name);

	const reasonFor = (
		operationExists: boolean,
		inInput: boolean,
		metaAllows: boolean | null | undefined,
		noOperation: string,
		notInInput: string,
	): string | null => {
		if (!operationExists) return noOperation;
		// A computed value is in the inputs, but the database rejects anything but its default.
		if (field.isComputed === true) return COMPUTED;
		if (!inInput || metaAllows === false) return notInInput;
		if (!readable || !hasInputShape) return UNSUPPORTED_WRITE;
		return null;
	};
	const createReason = reasonFor(
		Boolean(ctx.operations.create),
		Boolean(recordField),
		field.isWritableOnCreate,
		'This table does not allow adding records.',
		'This field is filled in automatically when a record is added.',
	);
	const updateReason = reasonFor(
		Boolean(ctx.operations.update),
		Boolean(patchField),
		field.isWritableOnUpdate,
		'This table does not allow changes.',
		'This field cannot be changed.',
	);

	const create = createReason === null;
	return {
		create,
		update: updateReason === null,
		requiredOnCreate: create && ((recordField ? isRequiredInput(recordField) : false) || field.isRequiredOnCreate === true),
		createReason,
		updateReason,
	};
}

function buildColumn(field: MetaschemaField, ctx: ColumnsContext, sorts: ReturnType<typeof sortIndex>): ColumnModel {
	const { lookup } = ctx;
	const rowField = lookup.field(ctx.rowType, field.name);
	const named = namedTypeOf(rowField?.type);
	const isObject = named?.kind === 'OBJECT' || named?.kind === 'INTERFACE';
	const outputType: IntrospectedType | null = !named
		? null
		: named.kind === 'SCALAR'
			? { kind: 'SCALAR', name: named.name, fields: null, inputFields: null, enumValues: null }
			: lookup.type(named.name);

	const file = columnFile(field);
	const kind = columnValueKind(field, outputType, file, lookup);
	const selection = isObject ? buildOutputSelection(outputType, lookup, { leavesOnly: kind === 'geometry' }) : null;

	const readReason = !rowField
		? 'This field is not available through this API.'
		: rowField.args.some(isRequiredInput) || named?.kind === 'UNION' || (isObject && !selection)
			? UNREADABLE
			: null;
	const readable = readReason === null;

	const inputRef = (inputField(ctx.patchType, field.name) ?? inputField(ctx.recordType, field.name))?.type;
	const input = inputRef ? lookup.inputValue(inputRef) : null;
	const write = columnWrite(field, ctx, readable, input !== null);

	const options = kind === 'enum'
		? enumOptions(field, outputType?.kind === 'ENUM' ? outputType : null)
		: field.allowedValues?.length
			? field.allowedValues.map((value) => ({ value, label: value }))
			: null;

	const encoding = field.type.encoding;
	return {
		name: field.name,
		description: field.description ?? null,
		value: {
			kind,
			isArray: field.type.isArray,
			typeName: named?.name ?? field.type.gqlType,
			semantic: columnSemantic(field, file),
			options,
			selection,
			input,
			maxLength: field.type.maxLength ?? null,
			precision: field.type.precision ?? null,
			scale: field.type.scale ?? null,
			dimensions: encoding?.dimensions ?? null,
			geometrySubtype: encoding?.geometrySubtype ?? field.type.subtype ?? null,
			srid: encoding?.srid ?? null,
			file,
		},
		nullable: !(field.isNotNull ?? field.type.isNotNull ?? false),
		hasDefault: Boolean(field.hasDefault ?? field.type.hasDefault),
		isPrimaryKey: ctx.primaryKey.includes(field.name) || field.isPrimaryKey === true,
		isForeignKey: field.isForeignKey === true,
		readable,
		readReason,
		write,
		sort: readable ? columnSort(field.name, sorts) : null,
		filter: readable ? columnFilter(field.name, ctx.filterType, lookup) : null,
	};
}

/** Column models for every `_meta` field, with an issue for each degraded one. */
export function buildColumns(ctx: ColumnsContext): ColumnModel[] {
	const sorts = sortIndex(ctx.orderByType);
	return ctx.fields.map((field) => {
		const column = buildColumn(field, ctx, sorts);
		if (column.readReason) {
			ctx.issues.push({ scope: 'column', target: column.name, code: 'COLUMN_UNREADABLE', message: column.readReason });
		} else if (column.write.updateReason === UNSUPPORTED_WRITE || column.write.createReason === UNSUPPORTED_WRITE) {
			ctx.issues.push({ scope: 'column', target: column.name, code: 'COLUMN_UNWRITABLE', message: UNSUPPORTED_WRITE });
		}
		return column;
	});
}

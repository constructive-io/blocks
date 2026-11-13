import type { MetaschemaTable } from '../meta-query.types';
import {
	isListTypeRef,
	isNonNullTypeRef,
	namedTypeOf,
	printTypeRef,
	type IntrospectedField,
	type IntrospectedInputValue,
	type IntrospectedType,
	type SchemaRoots,
} from './schema-introspection';
import type { TypeLookup } from './type-lookup';
import type {
	ArgumentModel,
	CreateOperationModel,
	DeleteOperationModel,
	ListOperationModel,
	ModelIssue,
	TableOperations,
	UpdateOperationModel,
} from './types';

const CLIENT_MUTATION_ID = 'clientMutationId';
const LOGICAL_OPERATORS = ['and', 'or', 'not'] as const;
/** Relay page info fields the list document selects. */
export const PAGE_INFO_FIELDS = ['hasNextPage', 'hasPreviousPage', 'startCursor', 'endCursor'] as const;

export interface OperationsBuild {
	operations: TableOperations;
	/** Input type of the create record, used for column write flags. */
	recordType: IntrospectedType | null;
	/** Input type of the update patch, used for column write flags. */
	patchType: IntrospectedType | null;
	/** The list filter input, used for column filters. */
	filterType: IntrospectedType | null;
	/** The order-by enum, used for column sorts. */
	orderByType: IntrospectedType | null;
}

interface OperationContext {
	table: MetaschemaTable;
	roots: SchemaRoots;
	lookup: TypeLookup;
	primaryKey: readonly string[];
	issues: ModelIssue[];
}

function argumentModel(value: IntrospectedInputValue): ArgumentModel | null {
	const named = namedTypeOf(value.type);
	return named ? { name: value.name, type: printTypeRef(value.type), typeName: named.name } : null;
}

function operationIssue(
	issues: ModelIssue[],
	target: 'list' | 'create' | 'update' | 'delete',
	code: ModelIssue['code'],
	message: string,
) {
	issues.push({ scope: 'operation', target, code, message });
}

/** The single argument of a mutation, or its `input` argument. */
function mutationInput(field: IntrospectedField): IntrospectedInputValue | null {
	if (field.args.length === 1) return field.args[0]!;
	return field.args.find((arg) => arg.name === 'input') ?? null;
}

/** Payload field that returns one row of the table. */
function payloadRowField(lookup: TypeLookup, field: IntrospectedField, rowTypeName: string): string | null {
	const payload = lookup.typeOf(field.type);
	const matches = (payload?.fields ?? []).filter(
		(candidate) => !isListTypeRef(candidate.type) && namedTypeOf(candidate.type)?.name === rowTypeName,
	);
	return matches.length === 1 ? matches[0]!.name : null;
}

/** Non-null input-object fields of a mutation input, other than the client mutation id. */
function recordFields(inputType: IntrospectedType | null): IntrospectedInputValue[] {
	return (inputType?.inputFields ?? []).filter(
		(field) =>
			field.name !== CLIENT_MUTATION_ID &&
			isNonNullTypeRef(field.type) &&
			namedTypeOf(field.type)?.kind === 'INPUT_OBJECT',
	);
}

/** Input fields that identify the row, ordered like the primary key; null when they are not exactly the key. */
function keyArguments(
	inputType: IntrospectedType | null,
	excluded: ReadonlySet<string>,
	primaryKey: readonly string[],
): string[] | null {
	const keys = (inputType?.inputFields ?? []).filter(
		(field) => field.name !== CLIENT_MUTATION_ID && !excluded.has(field.name) && isNonNullTypeRef(field.type),
	);
	const names = new Set(keys.map((field) => field.name));
	if (primaryKey.length === 0 || names.size !== primaryKey.length) return null;
	return primaryKey.every((name) => names.has(name)) ? [...primaryKey] : null;
}

/** The create mutation's record input of a table, for this table or a junction. */
export function createRecordOf(
	table: MetaschemaTable,
	roots: SchemaRoots,
	lookup: TypeLookup,
): { field: IntrospectedField; input: IntrospectedInputValue; recordField: IntrospectedInputValue; recordType: IntrospectedType | null } | null {
	const name = table.query?.create;
	const field = name ? lookup.field(roots.mutation, name) : null;
	const input = field ? mutationInput(field) : null;
	if (!field || !input) return null;
	const records = recordFields(lookup.typeOf(input.type));
	if (records.length !== 1) return null;
	return { field, input, recordField: records[0]!, recordType: lookup.typeOf(records[0]!.type) };
}

function buildList(ctx: OperationContext): {
	list: ListOperationModel | null;
	filterType: IntrospectedType | null;
	orderByType: IntrospectedType | null;
} {
	const { table, roots, lookup, issues } = ctx;
	const none = { list: null, filterType: null, orderByType: null };
	const field = table.query?.all ? lookup.field(roots.query, table.query.all) : null;
	if (!field) {
		operationIssue(issues, 'list', 'LIST_UNAVAILABLE', 'This table cannot be read through this API.');
		return none;
	}

	const returned = namedTypeOf(field.type);
	let shape: ListOperationModel['shape'] | null = null;
	let connection: IntrospectedType | null = null;
	if (returned?.name === table.name && isListTypeRef(field.type)) {
		shape = 'list';
	} else if (returned?.kind === 'OBJECT') {
		connection = lookup.type(returned.name);
		const nodes = lookup.field(connection, 'nodes');
		if (namedTypeOf(nodes?.type)?.name === table.name && isListTypeRef(nodes?.type)) shape = 'connection';
	}
	if (!shape) {
		operationIssue(issues, 'list', 'LIST_UNAVAILABLE', 'The list of records for this table has an unexpected shape.');
		return none;
	}

	const pageInfoType = lookup.typeOf(lookup.field(connection, 'pageInfo')?.type);
	const pageInfo = PAGE_INFO_FIELDS.every((name) => lookup.field(pageInfoType, name) !== null);

	const filterArgs = field.args.filter((arg) => {
		if (namedTypeOf(arg.type)?.kind !== 'INPUT_OBJECT') return false;
		const inputs = lookup.typeOf(arg.type)?.inputFields ?? [];
		return inputs.some((input) => (LOGICAL_OPERATORS as readonly string[]).includes(input.name));
	});
	const orderByArgs = field.args.filter(
		(arg) => isListTypeRef(arg.type) && namedTypeOf(arg.type)?.kind === 'ENUM',
	);
	const filterArg = filterArgs.length === 1 ? filterArgs[0]! : null;
	const orderByArg = orderByArgs.length === 1 ? orderByArgs[0]! : null;
	const filterType = filterArg ? lookup.typeOf(filterArg.type) : null;
	const orderByType = orderByArg ? lookup.typeOf(orderByArg.type) : null;

	const pagingArg = (name: string, typeName?: string) => {
		const arg = field.args.find((candidate) => candidate.name === name);
		if (!arg || (typeName && namedTypeOf(arg.type)?.name !== typeName)) return null;
		return argumentModel(arg);
	};

	const filterFields = new Set((filterType?.inputFields ?? []).map((input) => input.name));
	return {
		list: {
			field: field.name,
			shape,
			filter: filterArg ? argumentModel(filterArg) : null,
			orderBy: orderByArg ? argumentModel(orderByArg) : null,
			first: pagingArg('first', 'Int'),
			offset: pagingArg('offset', 'Int'),
			after: shape === 'connection' ? pagingArg('after') : null,
			totalCount: shape === 'connection' && Boolean(lookup.field(connection, 'totalCount')),
			pageInfo: shape === 'connection' && pageInfo,
			logicalOperators: LOGICAL_OPERATORS.filter((name) => filterFields.has(name)),
		},
		filterType,
		orderByType,
	};
}

function buildCreate(ctx: OperationContext): { create: CreateOperationModel | null; recordType: IntrospectedType | null } {
	const { table, roots, lookup, issues } = ctx;
	if (!table.query?.create) {
		operationIssue(issues, 'create', 'CREATE_UNAVAILABLE', 'New records cannot be added to this table.');
		return { create: null, recordType: null };
	}
	const record = createRecordOf(table, roots, lookup);
	const argument = record ? argumentModel(record.input) : null;
	const payloadField = record ? payloadRowField(lookup, record.field, table.name) : null;
	const recordTypeName = record ? namedTypeOf(record.recordField.type)?.name : null;
	if (!record || !argument || !payloadField || !recordTypeName) {
		operationIssue(
			issues,
			'create',
			'CREATE_UNAVAILABLE',
			'Adding records is turned off because the add operation for this table has an unexpected shape.',
		);
		return { create: null, recordType: null };
	}
	return {
		create: {
			field: record.field.name,
			input: argument,
			recordField: record.recordField.name,
			recordType: recordTypeName,
			payloadField,
		},
		recordType: record.recordType,
	};
}

function buildUpdate(ctx: OperationContext): { update: UpdateOperationModel | null; patchType: IntrospectedType | null } {
	const { table, roots, lookup, issues, primaryKey } = ctx;
	if (!table.query?.update || primaryKey.length === 0) {
		operationIssue(
			issues,
			'update',
			'UPDATE_UNAVAILABLE',
			primaryKey.length === 0
				? 'Records in this table cannot be changed because the table has no primary key.'
				: 'Records in this table cannot be changed.',
		);
		return { update: null, patchType: null };
	}
	const field = lookup.field(roots.mutation, table.query.update);
	const input = field ? mutationInput(field) : null;
	const inputType = input ? lookup.typeOf(input.type) : null;
	const patches = recordFields(inputType);
	const patch = patches.length === 1 ? patches[0]! : null;
	const keyArgs = patch ? keyArguments(inputType, new Set([patch.name]), primaryKey) : null;
	const argument = input ? argumentModel(input) : null;
	const payloadField = field ? payloadRowField(lookup, field, table.name) : null;
	const patchTypeName = patch ? namedTypeOf(patch.type)?.name : null;
	if (!field || !argument || !patch || !keyArgs || !payloadField || !patchTypeName) {
		operationIssue(
			issues,
			'update',
			'UPDATE_UNAVAILABLE',
			'Changing records is turned off because the update operation for this table does not match its primary key.',
		);
		return { update: null, patchType: null };
	}
	return {
		update: { field: field.name, input: argument, patchField: patch.name, patchType: patchTypeName, keyArgs, payloadField },
		patchType: lookup.typeOf(patch.type),
	};
}

function buildDelete(ctx: OperationContext): DeleteOperationModel | null {
	const { table, roots, lookup, issues, primaryKey } = ctx;
	if (!table.query?.delete || primaryKey.length === 0) {
		operationIssue(
			issues,
			'delete',
			'DELETE_UNAVAILABLE',
			primaryKey.length === 0
				? 'Records in this table cannot be deleted because the table has no primary key.'
				: 'Records in this table cannot be deleted.',
		);
		return null;
	}
	const field = lookup.field(roots.mutation, table.query.delete);
	const input = field ? mutationInput(field) : null;
	const keyArgs = input ? keyArguments(lookup.typeOf(input.type), new Set(), primaryKey) : null;
	const argument = input ? argumentModel(input) : null;
	if (!field || !argument || !keyArgs) {
		operationIssue(
			issues,
			'delete',
			'DELETE_UNAVAILABLE',
			'Deleting records is turned off because the delete operation for this table does not match its primary key.',
		);
		return null;
	}
	return { field: field.name, input: argument, keyArgs, payloadField: payloadRowField(lookup, field, table.name) };
}

/** Root operations of a table, proven against the introspected root types. */
export function buildOperations(ctx: OperationContext): OperationsBuild {
	const { list, filterType, orderByType } = buildList(ctx);
	const { create, recordType } = buildCreate(ctx);
	const { update, patchType } = buildUpdate(ctx);
	return {
		operations: { list, create, update, delete: buildDelete(ctx) },
		recordType,
		patchType,
		filterType,
		orderByType,
	};
}

// An in-memory GraphQL backend for tests and stories, driven by the table models.
//
// Every document runs through graphql-js against a real schema (a captured
// introspection or SDL), so a document the schema rejects fails the test the
// way the server would. Root fields are answered from in-memory rows: the
// table models say which root field lists, creates, updates or deletes which
// table, and how relation fields join rows. `_meta` is served from the given
// response; schema introspection is answered by graphql-js itself.
import {
	defaultFieldResolver,
	graphql,
	isAbstractType,
	parse,
	print,
	validate,
	type DocumentNode,
	type GraphQLFieldResolver,
	type GraphQLSchema,
} from 'graphql';

import {
	createError,
	createTableModelResolver,
	metaTablesOf,
	tableKeyOf,
	type ColumnModel,
	type MetaQuery,
	type RelationModel,
	type TableModel,
} from '@constructive-io/data';

import { withResponseErrors, type SheetsExecuteFn } from '../context/sheets-execute';
import { createMetaContractFixture } from './meta-contract-fixture';
import {
	createUploadService,
	type ModelBackendUploadOptions,
	type RecordedUpload,
	type UploadService,
} from './model-backend-uploads';

export type { ModelBackendUploadOptions, RecordedUpload } from './model-backend-uploads';

type Row = Record<string, unknown>;

export interface RecordedMutation {
	op: 'create' | 'update' | 'delete' | 'upload';
	tableName: string;
	variables: Record<string, unknown>;
	at: number;
}

export interface ModelBackendOptions {
	/** The schema the backend serves. */
	schema: GraphQLSchema;
	/** The `_meta` response the backend serves. */
	meta: MetaQuery;
	/** Rows per table (GraphQL type name). Changed in place by mutations. */
	rows: Record<string, Row[]>;
	/** Called after every recorded mutation. */
	onMutation?: (mutation: RecordedMutation) => void;
	/** How the storage upload mutations behave. */
	uploads?: ModelBackendUploadOptions;
	/**
	 * Rows a row rule hides from this writer. An update or a delete of such a row, like one of a
	 * row that is gone, changes nothing and answers with an empty record and no error, as the
	 * server does.
	 */
	writeHidden?: (tableName: string, row: Row) => boolean;
}

export interface ModelBackend {
	execute: SheetsExecuteFn;
	/** Every create, update, delete and upload mutation, in order. */
	mutations: RecordedMutation[];
	/** Every upload request with its input and outcome, in order. */
	uploads: RecordedUpload[];
	/** The rows, per table, as the backend holds them now. */
	rows: Record<string, Row[]>;
	/** Mark a file row live, as the confirm step does after the PUT. */
	confirmUpload(fileId: string): void;
}

const ROW_MODEL = Symbol('row-model');
type StoredRow = Row & { [ROW_MODEL]?: TableModel };

function documentSource(document: unknown): string {
	if (typeof document === 'string') return document;
	if (document instanceof String) return document.toString();
	if (document && typeof document === 'object' && 'kind' in document) return print(document as DocumentNode);
	return String(document ?? '');
}

function sameValue(left: unknown, right: unknown): boolean {
	if (left === right) return true;
	if (left == null || right == null) return false;
	return JSON.stringify(left) === JSON.stringify(right);
}

function compare(left: unknown, right: unknown): number {
	if (left == null && right == null) return 0;
	if (left == null) return -1;
	if (right == null) return 1;
	const leftNumber = typeof left === 'number' ? left : Number(left);
	const rightNumber = typeof right === 'number' ? right : Number(right);
	if (typeof left !== 'boolean' && Number.isFinite(leftNumber) && Number.isFinite(rightNumber) && String(left).trim() !== '' && String(right).trim() !== '') {
		return leftNumber - rightNumber;
	}
	return String(left).localeCompare(String(right));
}

function matchesOperator(value: unknown, operator: string, operand: unknown): boolean {
	const text = (input: unknown) => String(input ?? '').toLowerCase();
	switch (operator) {
		case 'isNull': return operand ? value == null : value != null;
		case 'equalTo': return sameValue(value, operand);
		case 'notEqualTo': return !sameValue(value, operand);
		case 'distinctFrom': return !sameValue(value, operand);
		case 'notDistinctFrom': return sameValue(value, operand);
		case 'in': return Array.isArray(operand) && operand.some((item) => sameValue(value, item));
		case 'notIn': return Array.isArray(operand) && !operand.some((item) => sameValue(value, item));
		case 'lessThan': return value != null && compare(value, operand) < 0;
		case 'lessThanOrEqualTo': return value != null && compare(value, operand) <= 0;
		case 'greaterThan': return value != null && compare(value, operand) > 0;
		case 'greaterThanOrEqualTo': return value != null && compare(value, operand) >= 0;
		case 'includes': return String(value ?? '').includes(String(operand));
		case 'notIncludes': return !String(value ?? '').includes(String(operand));
		case 'includesInsensitive': return text(value).includes(text(operand));
		case 'notIncludesInsensitive': return !text(value).includes(text(operand));
		case 'startsWith': return String(value ?? '').startsWith(String(operand));
		case 'notStartsWith': return !String(value ?? '').startsWith(String(operand));
		case 'startsWithInsensitive': return text(value).startsWith(text(operand));
		case 'notStartsWithInsensitive': return !text(value).startsWith(text(operand));
		case 'endsWith': return String(value ?? '').endsWith(String(operand));
		case 'notEndsWith': return !String(value ?? '').endsWith(String(operand));
		case 'endsWithInsensitive': return text(value).endsWith(text(operand));
		case 'notEndsWithInsensitive': return !text(value).endsWith(text(operand));
		case 'equalToInsensitive': return text(value) === text(operand);
		case 'notEqualToInsensitive': return text(value) !== text(operand);
		case 'inInsensitive': return Array.isArray(operand) && operand.some((item) => text(value) === text(item));
		case 'notInInsensitive': return Array.isArray(operand) && !operand.some((item) => text(value) === text(item));
		case 'anyEqualTo': return Array.isArray(value) && value.some((item) => sameValue(item, operand));
		case 'anyNotEqualTo': return Array.isArray(value) && value.some((item) => !sameValue(item, operand));
		case 'contains': return Array.isArray(value) && Array.isArray(operand) && operand.every((item) => value.some((entry) => sameValue(entry, item)));
		case 'containedBy': return Array.isArray(value) && Array.isArray(operand) && value.every((entry) => operand.some((item) => sameValue(entry, item)));
		case 'overlaps': return Array.isArray(value) && Array.isArray(operand) && value.some((entry) => operand.some((item) => sameValue(entry, item)));
		default:
			throw createError.badRequest(`The mock backend does not support the "${operator}" filter.`);
	}
}

/** Rows linked to a row through one relation, with the model of the linked table. */
type RelatedRows = (model: TableModel, row: Row, relation: RelationModel) => { target: TableModel | null; rows: Row[] };

function matchesFilter(
	model: TableModel,
	row: Row,
	filter: Record<string, unknown> | null | undefined,
	related: RelatedRows,
): boolean {
	if (!filter) return true;
	const matches = (target: TableModel, candidate: Row, condition: unknown) =>
		matchesFilter(target, candidate, condition as Record<string, unknown>, related);
	return Object.entries(filter).every(([key, condition]) => {
		if (condition === undefined || condition === null) return true;
		if (key === 'and') return (condition as Record<string, unknown>[]).every((part) => matches(model, row, part));
		if (key === 'or') return (condition as Record<string, unknown>[]).some((part) => matches(model, row, part));
		if (key === 'not') return !matches(model, row, condition);
		const column = model.columns.find((candidate) => candidate.filter?.field === key);
		if (column) {
			return Object.entries(condition as Record<string, unknown>).every(([operator, operand]) =>
				matchesOperator(row[column.name], operator, operand),
			);
		}
		if (key === model.search?.unifiedSearchField) {
			// Combined search, approximated as a case-insensitive substring over the text columns.
			const needle = String(condition).toLowerCase();
			return model.columns.some(
				(candidate) => candidate.value.kind === 'text' && String(row[candidate.name] ?? '').toLowerCase().includes(needle),
			);
		}
		const byExists = model.relations.find((relation) => relation.filter?.exists === key);
		if (byExists) return (related(model, row, byExists).rows.length > 0) === Boolean(condition);
		const relation = model.relations.find((candidate) => candidate.filter?.field === key);
		const filter = relation?.filter;
		if (!relation || !filter) throw createError.badRequest(`The mock backend does not filter by "${key}".`);
		const { target, rows } = related(model, row, relation);
		const nested = condition as Record<string, unknown>;
		if (!filter.many) {
			if (Object.keys(nested).length === 0) return true;
			return Boolean(target && rows[0] && matches(target, rows[0], nested));
		}
		const many = filter.many;
		return Object.entries(nested).every(([quantifier, inner]) => {
			const test = (candidate: Row) => Boolean(target) && matches(target!, candidate, inner);
			if (quantifier === many.some) return rows.some(test);
			if (quantifier === many.every) return rows.every(test);
			if (quantifier === many.none) return !rows.some(test);
			throw createError.badRequest(`The mock backend does not support the "${quantifier}" relation filter.`);
		});
	});
}

function sortRows(model: TableModel, rows: Row[], orderBy: unknown): Row[] {
	const values = Array.isArray(orderBy) ? (orderBy as string[]) : [];
	const keys = values.flatMap((value) => {
		if (value === 'NATURAL') return [];
		if (value === 'PRIMARY_KEY_ASC' || value === 'PRIMARY_KEY_DESC') {
			return model.primaryKey.map((field) => ({ field, desc: value === 'PRIMARY_KEY_DESC' }));
		}
		const column = model.columns.find((candidate) => candidate.sort?.asc === value || candidate.sort?.desc === value);
		if (!column) throw createError.badRequest(`The mock backend does not sort by "${value}".`);
		return [{ field: column.name, desc: column.sort?.desc === value }];
	});
	if (keys.length === 0) return rows;
	return [...rows].sort((left, right) => {
		for (const { field, desc } of keys) {
			const order = compare(left[field], right[field]);
			if (order !== 0) return desc ? -order : order;
		}
		return 0;
	});
}

/** A list page: `first`/`offset`/`after` over rows already filtered and sorted. Cursors are row positions. */
function page(rows: Row[], args: Record<string, unknown>) {
	const afterIndex = typeof args.after === 'string' && args.after !== '' ? Number(args.after) : Number.NaN;
	const start = Number.isFinite(afterIndex) ? afterIndex : typeof args.offset === 'number' ? args.offset : 0;
	const end = typeof args.first === 'number' ? start + args.first : rows.length;
	const nodes = rows.slice(start, end);
	return {
		nodes,
		totalCount: rows.length,
		pageInfo: {
			hasNextPage: end < rows.length,
			hasPreviousPage: start > 0,
			startCursor: nodes.length > 0 ? String(start) : null,
			endCursor: nodes.length > 0 ? String(start + nodes.length) : null,
		},
	};
}

function keyMatches(row: Row, key: Record<string, unknown>): boolean {
	return Object.entries(key).every(([field, value]) => sameValue(row[field], value));
}

let generatedIds = 0;

function generatedKey(column: ColumnModel): unknown {
	generatedIds += 1;
	if (column.value.kind === 'uuid') return `00000000-0000-4000-8000-${String(generatedIds).padStart(12, '0')}`;
	if (column.value.kind === 'integer' || column.value.kind === 'bigint') {
		return column.value.kind === 'bigint' ? String(100000 + generatedIds) : 100000 + generatedIds;
	}
	return `mock-${generatedIds}`;
}

/**
 * The stored value for a written value. Geometry is written as GeoJSON and
 * read as an object with `geojson`; everything else is stored as written.
 */
function storedValue(schema: GraphQLSchema, column: ColumnModel, written: unknown, previous: unknown): unknown {
	if (column.value.kind !== 'geometry' || written == null) return written;
	const prior = previous && typeof previous === 'object' ? (previous as Row) : {};
	const type = schema.getType(column.value.typeName);
	const concrete = prior.__typename ?? (type && isAbstractType(type) ? schema.getPossibleTypes(type)[0]?.name : undefined);
	return { ...prior, ...(concrete ? { __typename: concrete } : {}), geojson: written, srid: prior.srid ?? 0 };
}

export function createModelBackend(options: ModelBackendOptions): ModelBackend {
	const { schema, meta } = options;
	const rows = options.rows;
	const mutations: RecordedMutation[] = [];
	const uploads: RecordedUpload[] = [];
	let uploadService: UploadService | null = null;
	const hasMetaTypes = Boolean(schema.getType('MetaTable'));

	const introspect: SheetsExecuteFn = async <T>(document: unknown, variables?: Record<string, unknown>) => {
		const result = await graphql({ schema, source: documentSource(document), variableValues: variables });
		if (result.errors?.length) throw createError.graphql(result.errors[0]!.message);
		return result.data as T;
	};

	let modelsPromise: Promise<TableModel[]> | null = null;
	const models = () => {
		modelsPromise ??= (async () => {
			const resolver = createTableModelResolver(meta);
			const resolved: TableModel[] = [];
			for (const table of metaTablesOf(meta)) resolved.push(await resolver.resolve(introspect, tableKeyOf(table)));
			return resolved;
		})();
		return modelsPromise;
	};

	const tableRows = (model: TableModel) => (rows[model.name] ??= []);
	const stored = (model: TableModel, row: Row): StoredRow => Object.assign({ ...row }, { [ROW_MODEL]: model });
	const record = (op: RecordedMutation['op'], model: TableModel, variables: Record<string, unknown> | undefined) => {
		const mutation = { op, tableName: model.name, variables: variables ?? {}, at: Date.now() };
		mutations.push(mutation);
		options.onMutation?.(mutation);
	};

	function relatedRowsIn(all: TableModel[]): RelatedRows {
		return (_model, row, relation) => {
			const target = all.find((candidate) => candidate.key === relation.targetKey) ?? null;
			if (target && relation.junction) {
				const junction = all.find((candidate) => candidate.key === relation.junction!.tableKey);
				const links = junction
					? tableRows(junction).filter((link) => relation.junction!.left.every((pair) => sameValue(link[pair.junction], row[pair.local])))
					: [];
				return {
					target,
					rows: tableRows(target).filter((candidate) =>
						links.some((link) => relation.junction!.right.every((pair) => sameValue(candidate[pair.remote], link[pair.junction]))),
					),
				};
			}
			if (target && relation.keys.length > 0) {
				return {
					target,
					rows: tableRows(target).filter((candidate) =>
						relation.keys.every((pair) => sameValue(candidate[pair.remote], row[pair.local])),
					),
				};
			}
			return { target, rows: [] };
		};
	}

	function relationValue(all: TableModel[], model: TableModel, row: Row, relation: RelationModel, args: Record<string, unknown>) {
		const { target, rows: related } = relatedRowsIn(all)(model, row, relation);
		const nodes = related.map((entry) => stored(target!, entry));
		if (relation.shape === 'object') return nodes[0] ?? null;
		const limited = typeof args.first === 'number' ? nodes.slice(0, args.first) : nodes;
		return relation.shape === 'list' ? limited : { nodes: limited, totalCount: nodes.length };
	}

	function rootResolvers(all: TableModel[], variables: Record<string, unknown> | undefined, files: UploadService) {
		const related = relatedRowsIn(all);
		const root: Record<string, (args: Record<string, unknown>) => unknown> = {
			...files.rootResolvers((filesModel) => record('upload', filesModel, variables)),
		};
		for (const model of all) {
			const ops = model.operations;
			if (ops.list) {
				const list = ops.list;
				root[list.field] = (args) => {
					const filtered = tableRows(model).filter((row) =>
						matchesFilter(model, row, args[list.filter?.name ?? 'where'] as Record<string, unknown>, related),
					);
					const sorted = sortRows(model, filtered, args[list.orderBy?.name ?? 'orderBy']);
					const result = page(sorted, args);
					const nodes = result.nodes.map((row) => stored(model, row));
					return list.shape === 'list' ? nodes : { ...result, nodes };
				};
			}
			if (ops.create) {
				const create = ops.create;
				root[create.field] = (args) => {
					record('create', model, variables);
					const values = ((args[create.input.name] as Row)?.[create.recordField] ?? {}) as Row;
					files.assertFileRefsLive(model, values);
					const row: Row = {};
					for (const column of model.columns) {
						if (Object.prototype.hasOwnProperty.call(values, column.name)) {
							row[column.name] = storedValue(schema, column, values[column.name], undefined);
						} else if (column.isPrimaryKey) {
							row[column.name] = generatedKey(column);
						} else if (!column.hasDefault) {
							row[column.name] = null;
						} else {
							// Left absent: the server applies the column's real default, which neither `_meta`
							// nor the schema describes, so the mock does not invent one. Reading it back as a
							// non-null field fails, as a null would.
						}
					}
					tableRows(model).push(row);
					return { clientMutationId: null, [create.payloadField]: stored(model, row) };
				};
			}
			if (ops.update) {
				const update = ops.update;
				root[update.field] = (args) => {
					record('update', model, variables);
					const input = (args[update.input.name] ?? {}) as Row;
					const key = Object.fromEntries(update.keyArgs.map((field) => [field, input[field]]));
					const row = tableRows(model).find((candidate) => keyMatches(candidate, key));
					// No row matched (gone, or hidden by a row rule): nothing changes, no error.
					if (!row || options.writeHidden?.(model.name, row)) return { clientMutationId: null, [update.payloadField]: null };
					const patch = (input[update.patchField] ?? {}) as Row;
					files.assertFileRefsLive(model, patch);
					for (const [field, value] of Object.entries(patch)) {
						const column = model.columns.find((candidate) => candidate.name === field);
						row[field] = column ? storedValue(schema, column, value, row[field]) : value;
					}
					return { clientMutationId: null, [update.payloadField]: stored(model, row) };
				};
			}
			if (ops.delete) {
				const remove = ops.delete;
				root[remove.field] = (args) => {
					record('delete', model, variables);
					const input = (args[remove.input.name] ?? {}) as Row;
					const key = Object.fromEntries(remove.keyArgs.map((field) => [field, input[field]]));
					const list = tableRows(model);
					const found = list.findIndex((candidate) => keyMatches(candidate, key));
					const index = found !== -1 && options.writeHidden?.(model.name, list[found]!) ? -1 : found;
					const [row] = index === -1 ? [] : list.splice(index, 1);
					return { clientMutationId: null, ...(remove.payloadField ? { [remove.payloadField]: row ? stored(model, row) : null } : {}) };
				};
			}
		}
		return root;
	}

	const execute: SheetsExecuteFn = async <T>(document: unknown, variables?: Record<string, unknown>): Promise<T> => {
		const source = documentSource(document);
		if (source.includes('ConstructiveMetaContract') && !hasMetaTypes) return createMetaContractFixture() as T;
		if (/query ConstructiveMeta\b/.test(source)) {
			// A server with the Meta types rejects a `_meta` query that asks for a field it lacks.
			const errors = hasMetaTypes ? validate(schema, parse(source)) : [];
			if (errors.length > 0) throw createError.graphql(errors[0]!.message);
			return meta as T;
		}
		if (/\b__(schema|type)\b/.test(source)) return introspect<T>(source, variables);

		const all = await models();
		const files = (uploadService ??= createUploadService(all, tableRows, options.uploads, uploads));
		const fieldResolver: GraphQLFieldResolver<unknown, unknown> = (parent, args, context, info) => {
			const model = (parent as StoredRow | null)?.[ROW_MODEL];
			const computed = model ? files.resolveField(model, parent as Row, info.fieldName) : null;
			if (computed) return computed.value;
			const relation = model?.relations.find((candidate) => candidate.fieldName === info.fieldName);
			if (model && relation) return relationValue(all, model, parent as Row, relation, args);
			return defaultFieldResolver(parent, args, context, info);
		};
		const result = await graphql({
			schema,
			source,
			variableValues: variables,
			rootValue: rootResolvers(all, variables, files),
			fieldResolver,
		});
		// Like the server: field errors come with the data that could be served, and keep their code.
		if (result.errors?.length) {
			const first = result.errors[0]!;
			const code = first.extensions?.code;
			throw withResponseErrors(
				createError.graphql(first.message, typeof code === 'string' ? code : undefined),
				result.data,
				result.errors,
			);
		}
		return result.data as T;
	};

	const confirmUpload = (fileId: string) => {
		if (uploadService) {
			uploadService.confirm(fileId);
			return;
		}
		for (const list of Object.values(rows)) {
			for (const row of list) if (row.id === fileId && 'status' in row) row.status = 'uploaded';
		}
	};

	return { execute, mutations, uploads, rows, confirmUpload };
}

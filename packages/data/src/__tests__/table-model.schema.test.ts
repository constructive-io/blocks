/**
 * The table model against the captured torture schema.
 *
 * For every table the backend can create (see fixtures/torture/README.md), the
 * model is resolved through its real targeted introspection, and every
 * document it builds is validated against the real schema: list with every
 * relation, find-one, create, update, delete, and a filter and a sort on every
 * filterable and sortable column. Write variables come from the captured rows
 * through the write codec and are coerced against the real input types. The
 * same runs against the baseline server (before the `_meta` additions) and the
 * v2 server, each with its own `_meta` and introspection.
 *
 * Failure modes this covers:
 * - a document names a field, argument or type the schema does not have;
 * - an object-typed column is selected without (or with an invalid) sub-selection;
 * - a variable is declared with a type that differs from the argument's type;
 * - the codec produces a value its input type rejects (object outputs, enums,
 *   geometry, decimal strings, composite and renamed keys);
 * - a required create field is not marked required;
 * - a degraded column or relation carries no reason;
 * - the `_meta` query asks an older server for a field it does not have;
 * - the first table load needs more round trips than budgeted.
 *
 * Artifact: a readable summary of every model per server, in `__artifacts__/`.
 */
import { readFileSync } from 'node:fs';

import {
	buildClientSchema,
	getVariableValues,
	graphql,
	parse,
	validate,
	type GraphQLSchema,
	type IntrospectionQuery,
	type OperationDefinitionNode,
} from 'graphql';
import { describe, expect, it } from 'vitest';

import type { MetaQuery } from '../meta-query.types';
import {
	META_CAPABILITY_INTROSPECTION_SOURCE,
	META_OPTIONAL_CAPABILITIES,
	assessMetaCapabilities,
	buildCreateDocument,
	buildDeleteDocument,
	buildFindOneDocument,
	buildListDocument,
	buildMetaQuerySource,
	buildUpdateDocument,
	createTableModelResolver,
	emptyMetaCapabilities,
	encodeWriteValues,
	metaTablesOf,
	tableKeyOf,
	type GraphQLExecutor,
	type MetaCapabilityIntrospectionQuery,
	type ModelDocument,
	type TableModel,
} from '../table-model';

const fixture = (name: string) =>
	JSON.parse(readFileSync(new URL(`./fixtures/torture/${name}`, import.meta.url), 'utf8')) as unknown;

const baselineIntrospection = (fixture('torture-introspection.baseline.json') as { data: IntrospectionQuery }).data;
const v2Introspection = (fixture('torture-introspection.json') as { data: IntrospectionQuery }).data;
const baselineMeta = (fixture('torture-meta.baseline.json') as { data: MetaQuery }).data;
const v2Meta = (fixture('torture-meta.v2.json') as { data: MetaQuery }).data;
const capturedRows = fixture('torture-rows.json') as Array<{
	table: string;
	data: Record<string, { nodes?: Record<string, unknown>[] } | null> | null;
}>;
const schema = buildClientSchema(baselineIntrospection);
const v2Schema = buildClientSchema(v2Introspection);

const servers = [
	{ label: 'baseline', meta: baselineMeta, schema },
	{ label: 'v2', meta: v2Meta, schema: v2Schema },
] as const;

/** An executor over the real schema: validates every document, answers `_meta` from the capture. */
function schemaExecutor(target: GraphQLSchema, meta: MetaQuery, log: string[] = []): GraphQLExecutor {
	return async <T>(source: string, variables?: Record<string, unknown>): Promise<T> => {
		log.push(source);
		const errors = validate(target, parse(source));
		if (errors.length > 0) throw new Error(errors.map((error) => error.message).join('\n'));
		if (/query ConstructiveMeta\b/.test(source)) return meta as T;
		const result = await graphql({ schema: target, source, variableValues: variables });
		if (result.errors?.length) throw new Error(result.errors.map((error) => error.message).join('\n'));
		return result.data as T;
	};
}

/** Validation and variable coercion errors for one built document. */
function documentErrors(target: GraphQLSchema, built: ModelDocument<unknown, Record<string, unknown>>): string[] {
	const document = parse(built.source);
	const errors = validate(target, document).map((error) => error.message);
	if (errors.length > 0) return errors;
	const operation = document.definitions.find(
		(definition): definition is OperationDefinitionNode => definition.kind === 'OperationDefinition',
	);
	const coerced = getVariableValues(target, operation?.variableDefinitions ?? [], built.variables);
	return 'errors' in coerced && coerced.errors ? coerced.errors.map((error) => error.message) : [];
}

function capturedRowsFor(model: TableModel): Record<string, unknown>[] {
	const entry = capturedRows.find((candidate) => candidate.table === model.name);
	const list = model.operations.list?.field;
	return (list ? entry?.data?.[list]?.nodes : null) ?? [];
}

function pick(row: Record<string, unknown>, names: readonly string[]): Record<string, unknown> {
	return Object.fromEntries(names.filter((name) => name in row).map((name) => [name, row[name]]));
}

/**
 * A captured row as this server can hold it. The rows come from the newest server; an
 * older server's enum lacks the newest labels (`NEEDS_REVIEW`), so a value it does not
 * have is left out of its writes.
 */
function rowForServer(model: TableModel, row: Record<string, unknown>): Record<string, unknown> {
	const out: Record<string, unknown> = { ...row };
	for (const column of model.columns) {
		const known = column.value.input?.enumValues;
		const value = out[column.name];
		if (!known || value === null || value === undefined) continue;
		if (Array.isArray(value)) out[column.name] = value.filter((item) => item === null || known.includes(item as string));
		else if (!known.includes(value as string)) delete out[column.name];
	}
	return out;
}

/** Every document the model can build for one table, with the values taken from a captured row. */
function documentsFor(model: TableModel): Array<[string, () => ModelDocument<unknown, Record<string, unknown>>]> {
	const row = rowForServer(model, capturedRowsFor(model)[0] ?? {});
	const key = pick(row, model.primaryKey);
	const docs: Array<[string, () => ModelDocument<unknown, Record<string, unknown>>]> = [];
	const list = model.operations.list;
	if (list) {
		docs.push(['list with every relation', () => buildListDocument(model, {
			relations: 'all',
			first: list.first ? 10 : undefined,
			offset: list.offset ? 0 : undefined,
			after: list.after ? 'cursor' : undefined,
		})]);
		const shown = model.columns.find((column) => column.readable && !model.primaryKey.includes(column.name));
		if (shown) {
			docs.push(['list with one column and every relation', () => buildListDocument(model, { columns: [shown.name], relations: 'all' })]);
		}
		const sortable = model.columns.filter((column) => column.sort);
		if (sortable.length > 0) {
			docs.push(['sort on every sortable column', () => buildListDocument(model, {
				orderBy: sortable.flatMap((column) => [
					{ field: column.name, direction: 'asc' as const },
					{ field: column.name, direction: 'desc' as const },
				]),
			})]);
		}
		for (const column of model.columns) {
			if (!column.filter?.operators.some((operator) => operator.name === 'isNull')) continue;
			docs.push([`filter on ${column.name}`, () => buildListDocument(model, {
				where: { [column.filter!.field]: { isNull: false } },
			})]);
		}
		for (const relation of model.relations) {
			const filter = relation.filter;
			if (!filter) continue;
			const condition = filter.many
				? Object.fromEntries(Object.values(filter.many).flatMap((name) => (name ? [[name, {}]] : [])))
				: {};
			docs.push([`filter on relation ${relation.fieldName}`, () => buildListDocument(model, {
				where: { [filter.field]: condition, ...(filter.exists ? { [filter.exists]: true } : {}) },
			})]);
		}
	}
	if (model.primaryKey.length > 0 && Object.keys(key).length === model.primaryKey.length) {
		docs.push(['find one', () => buildFindOneDocument(model, key, { relations: 'all' })]);
		if (model.operations.update) {
			const patch = pick(row, model.columns.filter((column) => column.write.update).map((column) => column.name));
			docs.push(['update', () => buildUpdateDocument(model, key, patch)]);
		}
		if (model.operations.delete) docs.push(['delete', () => buildDeleteDocument(model, key)]);
	}
	if (model.operations.create) {
		const values = pick(row, model.columns.filter((column) => column.write.create).map((column) => column.name));
		docs.push(['create', () => buildCreateDocument(model, values)]);
	}
	return docs;
}

function summarize(model: TableModel): string {
	const flag = (value: boolean, label: string) => (value ? label : '-');
	const ops = model.operations;
	const lines = [
		`${model.key} pk=[${model.primaryKey.join(', ')}] list=${ops.list?.field ?? '-'} create=${ops.create?.field ?? '-'} update=${ops.update?.field ?? '-'} delete=${ops.delete?.field ?? '-'} display=[${model.display.fields.join(', ')}] (${model.display.source})`,
	];
	for (const column of model.columns) {
		const value = column.value;
		lines.push(
			`  column ${column.name}: ${value.kind}${value.isArray ? '[]' : ''}${value.semantic ? ` (${value.semantic})` : ''}` +
				` ${flag(column.readable, 'read')} ${flag(column.write.create, 'create')}${column.write.requiredOnCreate ? '!' : ''} ${flag(column.write.update, 'update')}` +
				` sort=${column.sort ? 'yes' : '-'} filter=${column.filter ? column.filter.operators.length : '-'}` +
				`${value.input ? ` input=${value.input.shape}:${value.input.typeName}` : ''}` +
				`${value.options ? ` options=${value.options.map((option) => `${option.value}=${option.label}`).join('|')}` : ''}` +
				`${value.selection ? ` select=${value.selection}` : ''}`,
		);
	}
	for (const relation of model.relations) {
		const pairs = relation.junction
			? `junction ${relation.junction.tableName} left=${relation.junction.left.map((pair) => `${pair.junction}->${pair.local}`).join(',')} right=${relation.junction.right.map((pair) => `${pair.junction}->${pair.remote}`).join(',')} pure=${relation.junction.pure}`
			: `keys=${relation.keys.map((pair) => `${pair.local}->${pair.remote}`).join(',')}`;
		lines.push(
			`  relation ${relation.kind} ${relation.fieldName} -> ${relation.targetKey ?? '?'} (${relation.shape}) ${pairs}` +
				` target=[${relation.target.primaryKey.join(',')}|${relation.target.labelFields.join(',')}]` +
				` filter=${relation.filter ? `${relation.filter.many ? 'many' : 'record'}:${relation.filter.recordFilterType ?? '?'}${relation.filter.many ? `[${Object.values(relation.filter.many).filter(Boolean).join(',')}]` : ''}${relation.filter.exists ? `+${relation.filter.exists}` : ''}` : '-'}` +
				` ${flag(relation.readable, 'read')} ${flag(relation.editable, 'edit')} ${flag(relation.unlinkable, 'unlink')}${relation.reason ? ` "${relation.reason}"` : ''}`,
		);
	}
	for (const issue of model.issues) lines.push(`  issue ${issue.scope}:${issue.target ?? '-'} ${issue.code} "${issue.message}"`);
	return lines.join('\n');
}

async function resolveAll(meta: MetaQuery, target: GraphQLSchema = schema) {
	const resolver = createTableModelResolver(meta);
	const execute = schemaExecutor(target, meta);
	const models: TableModel[] = [];
	for (const table of metaTablesOf(meta)) models.push(await resolver.resolve(execute, tableKeyOf(table)));
	return models;
}

/** The oldest supported server: the schema without any optional Meta field. */
function minimalServerIntrospection(): IntrospectionQuery {
	const optional = new Map<string, Set<string>>();
	for (const { typeName, fields } of Object.values(META_OPTIONAL_CAPABILITIES)) {
		optional.set(typeName, new Set([...(optional.get(typeName) ?? []), ...fields]));
	}
	const dropped = new Set(['MetaFileField', 'MetaStorageUpload']);
	const types = v2Introspection.__schema.types
		.filter((type) => !dropped.has(type.name))
		.map((type) => {
			const removed = optional.get(type.name);
			if (!removed || type.kind !== 'OBJECT') return type;
			return { ...type, fields: type.fields.filter((field) => !removed.has(field.name)) };
		});
	return { __schema: { ...v2Introspection.__schema, types } };
}

describe('table model over the captured torture schema', () => {
	it('builds the _meta query from what each server has', async () => {
		const minimal = buildClientSchema(minimalServerIntrospection());
		const queries = new Map<GraphQLSchema, string>();
		for (const target of [minimal, schema, v2Schema]) {
			const result = await graphql({ schema: target, source: META_CAPABILITY_INTROSPECTION_SOURCE });
			expect(result.errors).toBeUndefined();
			const { compatibility, capabilities } = assessMetaCapabilities(result.data as MetaCapabilityIntrospectionQuery);
			expect(compatibility.status).toBe('compatible');
			const query = buildMetaQuerySource(capabilities);
			expect(validate(target, parse(query)).map((error) => error.message)).toEqual([]);
			queries.set(target, query);
		}
		expect(queries.get(minimal)).toBe(buildMetaQuerySource(emptyMetaCapabilities()));
		expect(queries.get(schema)).not.toContain('remoteKeys');
		expect(queries.get(v2Schema)).toContain('remoteKeys');
		expect(queries.get(v2Schema)).toContain('isComputed');
	});

	it.each(servers)('validates every document of every table against the $label schema', async ({ label, meta, schema: target }) => {
		const models = await resolveAll(meta, target);
		expect(models).toHaveLength(metaTablesOf(meta).length);

		const failures: string[] = [];
		for (const model of models) {
			for (const [label, build] of documentsFor(model)) {
				let errors: string[];
				try {
					errors = documentErrors(target, build());
				} catch (error) {
					errors = [error instanceof Error ? error.message : String(error)];
				}
				if (errors.length > 0) failures.push(`${model.name} ${label}: ${errors.join('; ')}`);
			}
			for (const column of model.columns) {
				if (!column.readable && !column.readReason) failures.push(`${model.name}.${column.name}: unreadable without a reason`);
				if (!column.write.create && !column.write.createReason) failures.push(`${model.name}.${column.name}: create blocked without a reason`);
				if (!column.write.update && !column.write.updateReason) failures.push(`${model.name}.${column.name}: update blocked without a reason`);
			}
			for (const relation of model.relations) {
				if ((!relation.readable || !relation.editable || !relation.unlinkable) && !relation.reason) {
					failures.push(`${model.name}.${relation.fieldName}: degraded relation without a reason`);
				}
			}
		}
		expect(failures).toEqual([]);

		await expect(models.map(summarize).join('\n\n') + '\n').toMatchFileSnapshot(
			`./__artifacts__/torture-model.${label}.txt`,
		);
	});

	it('proves keys, relations and write rules the grid depends on', async () => {
		const models = await resolveAll(baselineMeta);
		const model = (name: string) => models.find((candidate) => candidate.name === name)!;
		const relation = (table: string, field: string) => model(table).relations.find((candidate) => candidate.fieldName === field)!;
		const column = (table: string, field: string) => model(table).columns.find((candidate) => candidate.name === field)!;

		expect(model('WarehouseItem').operations.update?.keyArgs).toEqual(['warehouseCode', 'sku']);
		expect(relation('Task', 'warehouseItem').keys).toEqual([
			{ local: 'warehouseCode', remote: 'warehouseCode' },
			{ local: 'sku', remote: 'sku' },
		]);
		expect(relation('Task', 'personByAssigneeEmail')).toMatchObject({
			keys: [{ local: 'assigneeEmail', remote: 'email' }],
			editable: true,
		});
		expect(relation('Person', 'peopleByManagerId')).toMatchObject({ keys: [{ local: 'id', remote: 'managerId' }], editable: true });
		expect(relation('Person', 'ownedProjects')).toMatchObject({ editable: false });
		expect(relation('Person', 'ownedProjects').reason).toBeTruthy();
		expect(relation('Task', 'labels')).toMatchObject({ editable: true, unlinkable: true });
		expect(relation('Task', 'labels').junction?.pure).toBe(true);
		expect(relation('Project', 'peopleByProjectMemberProjectIdAndPersonId').junction?.extraRequiredFields).toEqual(['role', 'joinedOn']);
		expect(relation('Project', 'peopleByProjectMemberProjectIdAndPersonId').editable).toBe(false);
		expect(relation('Project', 'owner').unlinkable).toBe(false);
		expect(relation('Project', 'reviewer').unlinkable).toBe(true);

		expect(column('Country', 'isoCode').write).toMatchObject({ create: true, requiredOnCreate: true });
		expect(column('GeneratedValue', 'id').write.create).toBe(false);
		expect(column('GeneratedValue', 'frozenCode').write).toMatchObject({ create: true, update: false });
		expect(column('ScalarKind', 'numericBounded').value.kind).toBe('decimal');
		expect(column('ScalarKind', 'bigintValue').value.kind).toBe('bigint');
		expect(column('ArrayKind', 'statusList').value.options?.map((option) => option.value)).toEqual([
			'TODO', 'IN_PROGRESS', 'DONE_ISH', '_1ST_REVIEW', 'BLOCKED', 'DONE',
		]);
		expect(model('AuditEvent')).toMatchObject({ primaryKey: [], operations: { update: null, delete: null } });
		expect(model('AuditEvent').issues.map((issue) => issue.code)).toContain('NO_PRIMARY_KEY');

		expect(relation('Project', 'country').filter).toEqual({
			field: 'country', typeName: 'CountryFilter', exists: 'countryExists', many: null, recordFilterType: 'CountryFilter',
		});
		expect(relation('Task', 'project').filter).toMatchObject({ exists: null, many: null, recordFilterType: 'ProjectFilter' });
		expect(relation('Task', 'personByAssigneeEmail').filter).toMatchObject({ exists: 'personByAssigneeEmailExists' });
		expect(relation('Task', 'taskLabels').filter).toEqual({
			field: 'taskLabels',
			typeName: 'TaskToManyTaskLabelFilter',
			exists: 'taskLabelsExist',
			many: { some: 'some', every: 'every', none: 'none' },
			recordFilterType: 'TaskLabelFilter',
		});
		expect(relation('Person', 'personProfile').filter).toMatchObject({ exists: 'personProfileExists', many: null });
		expect(relation('Task', 'labels').filter).toBeNull();

		const narrow = buildListDocument(model('Task'), { columns: ['title'], relations: ['warehouseItem'] }).source;
		const selected = /nodes \{ (.*?) warehouseItem/.exec(narrow)?.[1]?.split(' ');
		expect(selected).toEqual(['id', 'title', 'warehouseCode', 'sku']);
		expect(() => buildListDocument(model('Task'), { columns: ['nope'] })).toThrow('"nope" is not a column');
	});

	it('names enum labels with a space or a dash by their wire values, and keeps both tree path forms as text', async () => {
		const models = await resolveAll(v2Meta, v2Schema);
		const model = (name: string) => models.find((candidate) => candidate.name === name)!;
		const column = (table: string, field: string) => model(table).columns.find((candidate) => candidate.name === field)!;

		// The labels people read map to the names the API takes.
		expect(column('Task', 'status').value.options).toEqual(
			expect.arrayContaining([
				{ value: 'ON_HOLD', label: 'on hold' },
				{ value: 'NEEDS_REVIEW', label: 'needs-review' },
			]),
		);
		expect(encodeWriteValues(model('Task'), { status: 'on hold', reviewStatus: 'needs-review' }, 'update')).toEqual({
			status: 'ON_HOLD',
			reviewStatus: 'NEEDS_REVIEW',
		});
		expect(encodeWriteValues(model('ArrayKind'), { statusList: ['on hold', 'NEEDS_REVIEW'] }, 'update')).toEqual({
			statusList: ['ON_HOLD', 'NEEDS_REVIEW'],
		});

		// Filters on those values are valid documents for the server.
		for (const where of [
			{ status: { equalTo: 'ON_HOLD' } },
			{ reviewStatus: { in: ['NEEDS_REVIEW'] } },
		]) {
			expect(documentErrors(v2Schema, buildListDocument(model('Task'), { where }))).toEqual([]);
		}
		expect(documentErrors(v2Schema, buildListDocument(model('ArrayKind'), { where: { statusList: { contains: ['NEEDS_REVIEW'] } } }))).toEqual([]);

		// A plain path (served with slashes) and a list of paths (served dotted) are both kept as text, unchanged.
		expect(column('ScalarKind', 'ltreeValue').value).toMatchObject({ kind: 'path', isArray: false });
		expect(column('ArrayKind', 'pathList').value).toMatchObject({ kind: 'path', isArray: true });
		expect(encodeWriteValues(model('ScalarKind'), { ltreeValue: '/top/science/astronomy' }, 'update')).toEqual({ ltreeValue: '/top/science/astronomy' });
		expect(encodeWriteValues(model('ArrayKind'), { pathList: ['top.science', 'a'] }, 'update')).toEqual({ pathList: ['top.science', 'a'] });
	});

	it('uses the v2 additions to prove what the baseline leaves read-only', async () => {
		const models = await resolveAll(v2Meta, v2Schema);
		const model = (name: string) => models.find((candidate) => candidate.name === name)!;
		const relation = (table: string, field: string) => model(table).relations.find((candidate) => candidate.fieldName === field)!;
		const column = (table: string, field: string) => model(table).columns.find((candidate) => candidate.name === field)!;

		expect(relation('Person', 'ownedProjects')).toMatchObject({ keys: [{ local: 'id', remote: 'ownerId' }], editable: true });
		expect(relation('Person', 'reviewedProjects')).toMatchObject({ keys: [{ local: 'id', remote: 'reviewerId' }], editable: true });
		expect(column('GeneratedValue', 'total').write).toMatchObject({ create: false, update: false });
		expect(column('GeneratedValue', 'total').write.updateReason).toBeTruthy();
		expect(column('GeneratedValue', 'serialNo').write).toMatchObject({ create: true, update: true });
		expect(model('OpenTask').kind).toBe('view');
		expect(column('DomainKind', 'gallery').value.file).toEqual({ kind: 'upload', multiple: true, filesType: 'AppFile' });
		expect(column('ScalarKind', 'varcharValue').value.maxLength).toBe(40);
		expect(column('ScalarKind', 'numericBounded').value).toMatchObject({ precision: 12, scale: 4 });
		expect(column('StructuredKind', 'pin').value.srid).toBe(4326);
		expect(column('StructuredKind', 'embedding').value.dimensions).toBe(3);
	});

	it('loads the first table in a bounded number of requests and reuses types for the next', async () => {
		const log: string[] = [];
		const resolver = createTableModelResolver(baselineMeta);
		const execute = schemaExecutor(schema, baselineMeta, log);
		await resolver.resolve(execute, 'Task');
		const firstTable = log.length;
		await resolver.resolve(execute, 'Project');
		const secondTable = log.length - firstTable;

		expect(log.some((source) => source.includes('IntrospectionQuery') || /__schema\s*{\s*types/.test(source))).toBe(false);
		expect(firstTable).toBeLessThanOrEqual(5);
		expect(secondTable).toBeLessThanOrEqual(3);
	});
});

describe('a write that changes no row', () => {
	// A row rule that hides a row, or a row that is gone, makes the server answer an update or a
	// delete with an empty payload record and no error. The document must say so, or a refused
	// write reads as saved.
	it('reports an empty payload record as not applied, a returned record as applied', async () => {
		const models = await resolveAll(v2Meta, v2Schema);
		let checked = 0;
		for (const model of models) {
			const update = model.operations.update;
			if (update?.payloadField) {
				const document = buildUpdateDocument(model, pick(capturedRowsFor(model)[0] ?? {}, model.primaryKey), {});
				expect(document.applied?.({ [update.field]: { [update.payloadField]: null } }), `${model.name} update, empty`).toBe(false);
				expect(document.applied?.({ [update.field]: null }), `${model.name} update, no payload`).toBe(false);
				expect(document.applied?.({ [update.field]: { [update.payloadField]: { __typename: model.name } } }), `${model.name} update, returned`).toBe(true);
				checked++;
			}
			const remove = model.operations.delete;
			if (remove?.payloadField && model.primaryKey.length > 0) {
				const document = buildDeleteDocument(model, pick(capturedRowsFor(model)[0] ?? {}, model.primaryKey));
				// A delete that selects the deleted record can tell; one that selects only `__typename` cannot.
				const selectsRecord = document.source.includes(`${remove.payloadField} {`);
				expect(document.applied?.({ [remove.field]: { [remove.payloadField]: null } }), `${model.name} delete, empty`).toBe(selectsRecord ? false : null);
				checked++;
			}
		}
		expect(checked).toBeGreaterThan(10);
	});
});

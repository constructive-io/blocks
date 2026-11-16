// A PostGraphile-shaped schema (SDL) synthesized from `_meta` tables.
//
// For mock backends whose tables are described only by `_meta` (the `/testing`
// MockTable list, the Storybook fixtures). Names come from `_meta.query`; the
// shapes follow PostGraphile: a connection per table, a filter input with
// per-scalar operator inputs and `and`/`or`/`not`, an order-by enum, and
// create/update/delete mutations whose input carries the record, the patch and
// the primary key. Captured schemas do not need this.
import {
	getRowIdentityDefinition,
	toCamelCaseSingular,
	type MetaschemaField,
	type MetaschemaTable,
} from '@constructive-io/data';

const BUILT_IN_SCALARS = new Set(['String', 'Int', 'Float', 'Boolean', 'ID']);
const ORDERED_SCALARS = new Set(['Int', 'Float', 'BigInt', 'BigFloat', 'Date', 'Datetime', 'Time', 'String', 'UUID']);

function constantCase(name: string): string {
	return name
		.replace(/([a-z0-9])([A-Z])/g, '$1_$2')
		.replace(/[^A-Za-z0-9]+/g, '_')
		.toUpperCase();
}

function fieldsOf(table: MetaschemaTable): MetaschemaField[] {
	return (table.fields ?? []).filter((field): field is MetaschemaField => Boolean(field?.name));
}

function typeRef(field: MetaschemaField): string {
	return field.type.isArray ? `[${field.type.gqlType}]` : field.type.gqlType;
}

function operatorType(field: MetaschemaField): string {
	return field.type.isArray ? `${field.type.gqlType}ListFilter` : `${field.type.gqlType}Filter`;
}

function scalarFilter(scalar: string): string {
	const ordered = ORDERED_SCALARS.has(scalar)
		? `lessThan: ${scalar} lessThanOrEqualTo: ${scalar} greaterThan: ${scalar} greaterThanOrEqualTo: ${scalar}`
		: '';
	const text = scalar === 'String'
		? 'includes: String notIncludes: String includesInsensitive: String notIncludesInsensitive: String startsWith: String startsWithInsensitive: String endsWith: String endsWithInsensitive: String equalToInsensitive: String'
		: '';
	return `input ${scalar}Filter { isNull: Boolean equalTo: ${scalar} notEqualTo: ${scalar} distinctFrom: ${scalar} notDistinctFrom: ${scalar} in: [${scalar}!] notIn: [${scalar}!] ${ordered} ${text} }`;
}

function listFilter(scalar: string): string {
	return `input ${scalar}ListFilter { isNull: Boolean equalTo: [${scalar}] notEqualTo: [${scalar}] contains: [${scalar}] anyEqualTo: ${scalar} }`;
}

/** Relation fields on the row type. A relation named like a column is left out: the column wins. */
function relationFields(table: MetaschemaTable, names: ReadonlySet<string>): string[] {
	const relations = table.relations;
	const columns = new Set(fieldsOf(table).map((field) => field.name));
	const fields: string[] = [];
	const add = (fieldName: string, definition: string) => {
		if (!columns.has(fieldName)) fields.push(definition);
	};
	for (const relation of relations?.belongsTo ?? []) {
		if (relation?.fieldName && names.has(relation.references.name)) add(relation.fieldName, `${relation.fieldName}: ${relation.references.name}`);
	}
	for (const relation of relations?.hasOne ?? []) {
		if (relation?.fieldName && names.has(relation.referencedBy.name)) add(relation.fieldName, `${relation.fieldName}: ${relation.referencedBy.name}`);
	}
	for (const relation of relations?.hasMany ?? []) {
		if (relation?.fieldName && names.has(relation.referencedBy.name)) {
			add(relation.fieldName, `${relation.fieldName}(first: Int): ${relation.referencedBy.name}Connection!`);
		}
	}
	for (const relation of relations?.manyToMany ?? []) {
		if (relation?.fieldName && names.has(relation.rightTable.name)) {
			add(relation.fieldName, `${relation.fieldName}(first: Int): ${relation.rightTable.name}Connection!`);
		}
	}
	return fields;
}

function tableTypes(table: MetaschemaTable, names: ReadonlySet<string>): string[] {
	const name = table.name;
	const fields = fieldsOf(table);
	const identity = getRowIdentityDefinition(table);
	const primaryKey = identity.status === 'keyed' ? identity.fields.map((field) => field.fieldName) : [];
	const record = toCamelCaseSingular(name);
	const requiredOnCreate = (field: MetaschemaField) =>
		!primaryKey.includes(field.name) && Boolean(field.isNotNull) && !field.hasDefault;
	const columns = fields.map((field) => `${field.name}: ${typeRef(field)}`).join(' ');
	const keyFields = primaryKey
		.map((key) => fields.find((field) => field.name === key))
		.filter((field): field is MetaschemaField => Boolean(field))
		.map((field) => `${field.name}: ${typeRef(field)}!`)
		.join(' ');

	const sdl = [
		`type ${name} { ${[columns, ...relationFields(table, names)].join(' ')} }`,
		`type ${name}Connection { nodes: [${name}]! totalCount: Int! pageInfo: PageInfo! }`,
		`input ${name}Filter { ${fields.map((field) => `${field.name}: ${operatorType(field)}`).join(' ')} and: [${name}Filter!] or: [${name}Filter!] not: ${name}Filter }`,
		`enum ${name}OrderBy { NATURAL ${primaryKey.length > 0 ? 'PRIMARY_KEY_ASC PRIMARY_KEY_DESC' : ''} ${fields.map((field) => `${constantCase(field.name)}_ASC ${constantCase(field.name)}_DESC`).join(' ')} }`,
	];
	if (table.query?.create) {
		sdl.push(
			`input ${name}Input { ${fields.map((field) => `${field.name}: ${typeRef(field)}${requiredOnCreate(field) ? '!' : ''}`).join(' ')} }`,
			`input Create${name}Input { clientMutationId: String ${record}: ${name}Input! }`,
			`type Create${name}Payload { clientMutationId: String ${record}: ${name} }`,
		);
	}
	if (table.query?.update && keyFields) {
		sdl.push(
			`input ${name}Patch { ${columns} }`,
			`input Update${name}Input { clientMutationId: String ${keyFields} ${record}Patch: ${name}Patch! }`,
			`type Update${name}Payload { clientMutationId: String ${record}: ${name} }`,
		);
	}
	if (table.query?.delete && keyFields) {
		sdl.push(
			`input Delete${name}Input { clientMutationId: String ${keyFields} }`,
			`type Delete${name}Payload { clientMutationId: String ${record}: ${name} }`,
		);
	}
	return sdl;
}

/** Root query and mutation fields, named by `_meta.query`. */
function rootFields(tables: readonly MetaschemaTable[]) {
	const query: string[] = [];
	const mutation: string[] = [];
	for (const table of tables) {
		const name = table.name;
		const ops = table.query;
		if (ops?.all) {
			query.push(`${ops.all}(first: Int, offset: Int, after: Cursor, where: ${name}Filter, orderBy: [${name}OrderBy!]): ${name}Connection`);
		}
		const keyed = getRowIdentityDefinition(table).status === 'keyed';
		if (ops?.create) mutation.push(`${ops.create}(input: Create${name}Input!): Create${name}Payload`);
		if (ops?.update && keyed) mutation.push(`${ops.update}(input: Update${name}Input!): Update${name}Payload`);
		if (ops?.delete && keyed) mutation.push(`${ops.delete}(input: Delete${name}Input!): Delete${name}Payload`);
	}
	return { query, mutation };
}

/** SDL for the tables, with every scalar, operator input and root field they need. */
export function buildMetaSchemaSdl(tables: readonly MetaschemaTable[]): string {
	const names = new Set(tables.map((table) => table.name));
	const fields = tables.flatMap(fieldsOf);
	const scalars = new Set(fields.map((field) => field.type.gqlType));
	const listScalars = new Set(fields.filter((field) => field.type.isArray).map((field) => field.type.gqlType));
	const { query, mutation } = rootFields(tables);

	return [
		'scalar Cursor',
		...[...scalars].filter((scalar) => !BUILT_IN_SCALARS.has(scalar) && scalar !== 'Cursor').map((scalar) => `scalar ${scalar}`),
		'type PageInfo { hasNextPage: Boolean! hasPreviousPage: Boolean! startCursor: Cursor endCursor: Cursor }',
		'input BooleanFilter { isNull: Boolean equalTo: Boolean notEqualTo: Boolean }',
		...[...scalars].filter((scalar) => scalar !== 'Boolean').map(scalarFilter),
		...[...listScalars].map(listFilter),
		...tables.flatMap((table) => tableTypes(table, names)),
		`type Query { ${query.join(' ') || 'noop: Boolean'} }`,
		mutation.length > 0 ? `type Mutation { ${mutation.join(' ')} }` : '',
	].filter(Boolean).join('\n');
}

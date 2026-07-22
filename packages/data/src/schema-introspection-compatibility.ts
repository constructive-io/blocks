import type { IntrospectionQueryResponse } from '@constructive-io/graphql-query/introspect/schema-query';

import { pgFieldToCamelCase } from './data.types';
import { META_CONTRACT_VERSION, assertMetaQuery } from './meta-query';
import type {
	MetaQuery,
	MetaschemaField,
	MetaschemaTable,
	MetaschemaTableInflection,
} from './meta-query.types';

type Schema = IntrospectionQueryResponse['__schema'];
type IntrospectionType = Schema['types'][number];
type IntrospectionField = NonNullable<IntrospectionType['fields']>[number];
type IntrospectionInputValue = IntrospectionField['args'][number];
type IntrospectionTypeKind = IntrospectionType['kind'];

export type SchemaIntrospectionCompatibilityStatus = 'compatible' | 'incompatible';

export interface SchemaIntrospectionCompatibility {
	contractVersion: typeof META_CONTRACT_VERSION;
	status: SchemaIntrospectionCompatibilityStatus;
	/** GraphQL introspection paths required by the validated `_meta` response. */
	missingPaths: string[];
}

type ExpectedArgument = {
	names: readonly string[];
	typeName?: string | null;
};

type OperationExpectation = {
	name: string | null | undefined;
	returnType?: string | null;
	arguments?: readonly ExpectedArgument[];
	requireAnyArgument?: boolean;
};

function nonEmptyName(value: string | null | undefined): string | null {
	if (typeof value !== 'string') return null;
	const name = value.trim();
	return name.length > 0 ? name : null;
}

function baseTypeName(
	type: IntrospectionInputValue['type'] | IntrospectionField['type'] | null | undefined,
): string | null {
	if (!type) return null;
	let current = type;
	while (current.ofType) current = current.ofType;
	return current.name;
}

function typePath(name: string): string {
	return `__schema.types.${name}`;
}

function fieldPath(rootName: string, fieldName: string): string {
	return `${typePath(rootName)}.fields.${fieldName}`;
}

function primaryKeyFieldNames(table: MetaschemaTable): string[] {
	const names = new Set<string>();
	const constraints = table.constraints;

	if (constraints && !Array.isArray(constraints)) {
		for (const field of constraints.primaryKey?.fields ?? []) {
			if (field?.name) names.add(pgFieldToCamelCase(field.name));
		}
	}

	for (const constraint of table.primaryKeyConstraints ?? []) {
		for (const field of constraint?.fields ?? []) {
			if (field?.name) names.add(pgFieldToCamelCase(field.name));
		}
	}

	return [...names];
}

function relevantTypes(
	inflection: MetaschemaTableInflection | null | undefined,
): Array<[string, IntrospectionTypeKind]> {
	if (!inflection) return [];
	return [
		[inflection.tableType, 'OBJECT'],
		[inflection.connection, 'OBJECT'],
		[inflection.edge, 'OBJECT'],
		[inflection.createPayloadType, 'OBJECT'],
		[inflection.updatePayloadType, 'OBJECT'],
		[inflection.deletePayloadType, 'OBJECT'],
		[inflection.createInputType, 'INPUT_OBJECT'],
		[inflection.patchType, 'INPUT_OBJECT'],
		[inflection.filterType, 'INPUT_OBJECT'],
		[inflection.conditionType, 'INPUT_OBJECT'],
		[inflection.orderByType, 'ENUM'],
	].filter((entry): entry is [string, IntrospectionTypeKind] => nonEmptyName(entry[0]) !== null);
}

function enumFields(table: MetaschemaTable): MetaschemaField[] {
	return (table.fields ?? []).filter(
		(field): field is MetaschemaField => Boolean(field?.enumValues?.name),
	);
}

/**
 * Cross-check a July `_meta` response against the endpoint's standard GraphQL
 * introspection result. This uses the schema's declared root type names rather
 * than assuming `Query` and `Mutation`.
 *
 * The `_meta` value must first pass the strict contract signature preflight;
 * this function still calls `assertMetaQuery` so malformed runtime data cannot
 * be mistaken for an incompatible GraphQL schema.
 */
export function assessSchemaIntrospectionCompatibility(
	introspection: IntrospectionQueryResponse | null | undefined,
	metaQuery: MetaQuery,
): SchemaIntrospectionCompatibility {
	assertMetaQuery(metaQuery);

	const missing = new Set<string>();
	const schema = introspection?.__schema;
	if (!schema) {
		return {
			contractVersion: META_CONTRACT_VERSION,
			status: 'incompatible',
			missingPaths: ['__schema'],
		};
	}

	const types = new Map((schema.types ?? []).map((type) => [type.name, type] as const));
	const requireType = (rawName: string | null | undefined, expectedKind?: IntrospectionTypeKind) => {
		const name = nonEmptyName(rawName);
		if (!name) return undefined;

		const type = types.get(name);
		if (!type) {
			missing.add(typePath(name));
			return undefined;
		}
		if (expectedKind && type.kind !== expectedKind) {
			missing.add(`${typePath(name)}.kind.${expectedKind}`);
		}
		return type;
	};

	const queryRootName = nonEmptyName(schema.queryType?.name);
	const queryRoot = queryRootName ? requireType(queryRootName, 'OBJECT') : undefined;
	if (!queryRootName) missing.add('__schema.queryType');

	const tables = metaQuery._meta!.tables!.filter(
		(table): table is MetaschemaTable => Boolean(table?.name),
	);
	const hasMutations = tables.some((table) =>
		[table.query?.create, table.query?.update, table.query?.delete].some(
			(operation) => nonEmptyName(operation) !== null,
		),
	);
	const mutationRootName = nonEmptyName(schema.mutationType?.name);
	const mutationRoot = mutationRootName ? requireType(mutationRootName, 'OBJECT') : undefined;
	if (hasMutations && !mutationRootName) missing.add('__schema.mutationType');

	const checkArgument = (
		rootName: string,
		operation: IntrospectionField,
		expectation: ExpectedArgument,
	) => {
		const argument = operation.args.find((candidate) => expectation.names.includes(candidate.name));
		const path = `${fieldPath(rootName, operation.name)}.args.${expectation.names.join('|')}`;
		if (!argument) {
			missing.add(path);
			return;
		}

		const expectedTypeName = nonEmptyName(expectation.typeName);
		const actualTypeName = baseTypeName(argument.type);
		if (expectedTypeName && actualTypeName !== expectedTypeName) {
			missing.add(`${path}.type.${expectedTypeName}`);
		}
		if (actualTypeName) requireType(actualTypeName);
	};

	const checkOperation = (
		rootName: string | null,
		root: IntrospectionType | undefined,
		expectation: OperationExpectation,
	): IntrospectionField | undefined => {
		const operationName = nonEmptyName(expectation.name);
		if (!operationName || !rootName || !root) return undefined;

		const operation = root.fields?.find((field) => field.name === operationName);
		if (!operation) {
			missing.add(fieldPath(rootName, operationName));
			return undefined;
		}

		const expectedReturnType = nonEmptyName(expectation.returnType);
		if (expectedReturnType && baseTypeName(operation.type) !== expectedReturnType) {
			missing.add(`${fieldPath(rootName, operationName)}.type.${expectedReturnType}`);
		}
		if (expectedReturnType) requireType(expectedReturnType, 'OBJECT');

		if (expectation.requireAnyArgument && operation.args.length === 0) {
			missing.add(`${fieldPath(rootName, operationName)}.args`);
		}
		for (const argument of expectation.arguments ?? []) {
			checkArgument(rootName, operation, argument);
		}
		return operation;
	};

	for (const table of tables) {
		const inflection = table.inflection;
		for (const [typeName, kind] of relevantTypes(inflection)) requireType(typeName, kind);

		const tableType = requireType(inflection?.tableType, 'OBJECT');
		for (const field of table.fields ?? []) {
			if (!field?.name || !tableType) continue;
			const graphQLFieldName = pgFieldToCamelCase(field.name);
			const graphQLField = tableType.fields?.find((candidate) => candidate.name === graphQLFieldName);
			if (!graphQLField) {
				missing.add(`${typePath(tableType.name)}.fields.${graphQLFieldName}`);
				continue;
			}

			const enumName = nonEmptyName(field.enumValues?.name);
			if (enumName && baseTypeName(graphQLField.type) !== enumName) {
				missing.add(`${typePath(tableType.name)}.fields.${graphQLFieldName}.type.${enumName}`);
			}
		}

		for (const field of enumFields(table)) {
			const enumName = field.enumValues!.name;
			const enumType = requireType(enumName, 'ENUM');
			const values = new Set(enumType?.enumValues?.map((value) => value.name) ?? []);
			for (const value of field.enumValues!.values ?? []) {
				if (!values.has(value)) missing.add(`${typePath(enumName)}.enumValues.${value}`);
			}
		}

		const allArguments: ExpectedArgument[] = [
			{ names: ['first'], typeName: 'Int' },
			{ names: ['last'], typeName: 'Int' },
			{ names: ['offset'], typeName: 'Int' },
			{ names: ['before'], typeName: 'Cursor' },
			{ names: ['after'], typeName: 'Cursor' },
		];
		if (nonEmptyName(inflection?.orderByType)) {
			allArguments.push({ names: ['orderBy'], typeName: inflection?.orderByType });
		}
		if (nonEmptyName(inflection?.conditionType)) {
			allArguments.push({ names: ['condition'], typeName: inflection?.conditionType });
		}
		if (nonEmptyName(inflection?.filterType)) {
			allArguments.push({ names: ['filter', 'where'], typeName: inflection?.filterType });
		}

		checkOperation(queryRootName, queryRoot, {
			name: table.query?.all,
			returnType: inflection?.connection,
			arguments: allArguments,
		});

		const primaryKeyArguments = primaryKeyFieldNames(table).map((name) => ({ names: [name] }));
		checkOperation(queryRootName, queryRoot, {
			name: table.query?.one,
			returnType: inflection?.tableType,
			arguments: primaryKeyArguments,
			requireAnyArgument: primaryKeyArguments.length === 0,
		});

		const createOperation = checkOperation(mutationRootName, mutationRoot, {
			name: table.query?.create,
			returnType: inflection?.createPayloadType,
			arguments: [{ names: ['input'], typeName: inflection?.createInputType }],
		});
		const updateOperation = checkOperation(mutationRootName, mutationRoot, {
			name: table.query?.update,
			returnType: inflection?.updatePayloadType,
			arguments: [{ names: ['input'] }],
		});
		const deleteOperation = checkOperation(mutationRootName, mutationRoot, {
			name: table.query?.delete,
			returnType: inflection?.deletePayloadType,
			arguments: [{ names: ['input'] }],
		});

		for (const operation of [createOperation, updateOperation, deleteOperation]) {
			const inputTypeName = operation
				? baseTypeName(operation.args.find(({ name }) => name === 'input')?.type)
				: null;
			if (inputTypeName) requireType(inputTypeName, 'INPUT_OBJECT');
		}

		const patchTypeName = nonEmptyName(inflection?.patchType);
		const updateInputName = updateOperation
			? baseTypeName(updateOperation.args.find(({ name }) => name === 'input')?.type)
			: null;
		const updateInput = updateInputName ? requireType(updateInputName, 'INPUT_OBJECT') : undefined;
		if (
			patchTypeName &&
			updateInput &&
			!updateInput.inputFields?.some((field) => baseTypeName(field.type) === patchTypeName)
		) {
			missing.add(`${typePath(updateInput.name)}.inputFields.type.${patchTypeName}`);
		}
	}

	const missingPaths = [...missing];
	return {
		contractVersion: META_CONTRACT_VERSION,
		status: missingPaths.length === 0 ? 'compatible' : 'incompatible',
		missingPaths,
	};
}

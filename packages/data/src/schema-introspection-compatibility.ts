import type { IntrospectionQueryResponse } from '@constructive-io/graphql-query/introspect/schema-query';
import {
	toCamelCasePlural,
	toCamelCaseSingular,
} from '@constructive-io/graphql-query/generators';

import { cleanTable, pgFieldToCamelCase, type CleanTable } from './data.types';
import { META_CONTRACT_VERSION, assertMetaQuery } from './meta-query';
import type {
	MetaQuery,
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

export interface SchemaEnumValueToken {
	/** Exact value returned by the Constructive `_meta` contract. */
	metaValue: string;
	/** Exact token accepted by GraphQL variables for this enum field. */
	graphQLValue: string;
}

export interface SchemaEnumFieldMapping {
	tableName: string;
	schemaName: string | null;
	fieldName: string;
	graphQLTypeName: string;
	values: SchemaEnumValueToken[];
}

export interface SchemaIntrospectionAnalysis extends SchemaIntrospectionCompatibility {
	/** Exact, field-scoped mappings from `_meta` enum labels to GraphQL tokens. */
	enumMappings: SchemaEnumFieldMapping[];
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

function canonicalEnumIdentifier(value: string): string {
	return value.replace(/[^A-Za-z0-9]/gu, '').toLowerCase();
}

function enumIdentifiersByCanonical(values: readonly string[]): Map<string, string[]> {
	const grouped = new Map<string, Set<string>>();
	for (const value of values) {
		const canonical = canonicalEnumIdentifier(value);
		const identifiers = grouped.get(canonical) ?? new Set<string>();
		identifiers.add(value);
		grouped.set(canonical, identifiers);
	}
	return new Map(
		[...grouped].map(([canonical, identifiers]) => [canonical, [...identifiers]]),
	);
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
		[inflection.orderByType, 'ENUM'],
	].filter((entry): entry is [string, IntrospectionTypeKind] => nonEmptyName(entry[0]) !== null);
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
export function analyzeSchemaIntrospectionCompatibility(
	introspection: IntrospectionQueryResponse | null | undefined,
	metaQuery: MetaQuery,
): SchemaIntrospectionAnalysis {
	assertMetaQuery(metaQuery);

	const missing = new Set<string>();
	const enumMappings: SchemaEnumFieldMapping[] = [];
	const schema = introspection?.__schema;
	if (!schema) {
		return {
			contractVersion: META_CONTRACT_VERSION,
			status: 'incompatible',
			missingPaths: ['__schema'],
			enumMappings,
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

	const checkEnumInputField = (
		inputType: IntrospectionType | undefined,
		fieldName: string,
		enumTypeName: string,
		fallbackPath: string,
	): boolean => {
		if (!inputType || inputType.kind !== 'INPUT_OBJECT') {
			missing.add(fallbackPath);
			return false;
		}

		const inputField = inputType.inputFields?.find((field) => field.name === fieldName);
		if (!inputField) {
			missing.add(`${typePath(inputType.name)}.inputFields.${fieldName}`);
			return false;
		}

		if (baseTypeName(inputField.type) !== enumTypeName) {
			missing.add(`${typePath(inputType.name)}.inputFields.${fieldName}.type.${enumTypeName}`);
			return false;
		}
		return true;
	};

	for (const table of tables) {
		const inflection = table.inflection;
		for (const [typeName, kind] of relevantTypes(inflection)) requireType(typeName, kind);
		const cleanedTable = cleanTable(table);

		// The current PostGraphile schema does not guarantee the legacy
		// `condition` argument or single-row query even when metaschema can
		// derive their historical names. Console Kit only requires the list
		// operation for reads, so validate the arguments the actual list root
		// advertises and keep CRUD mutations strict below.
		const allQueryName = toCamelCasePlural(table.name, cleanedTable);
		const allOperation = queryRoot?.fields?.find((field) => field.name === allQueryName);
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
		if (
			nonEmptyName(inflection?.conditionType) &&
			allOperation?.args.some((argument) => argument.name === 'condition')
		) {
			allArguments.push({ names: ['condition'], typeName: inflection?.conditionType });
		}
		if (nonEmptyName(inflection?.filterType)) {
			allArguments.push({ names: ['filter', 'where'], typeName: inflection?.filterType });
		}

		checkOperation(queryRootName, queryRoot, {
			name: allQueryName,
			returnType: inflection?.connection,
			arguments: allArguments,
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

		const createInputName = createOperation
			? baseTypeName(createOperation.args.find(({ name }) => name === 'input')?.type)
			: null;
		const createInput = createInputName
			? requireType(createInputName, 'INPUT_OBJECT')
			: undefined;
		const createObjectFieldName = toCamelCaseSingular(table.name, cleanedTable);
		const createObjectField = createInput?.inputFields?.find(
			(field) => field.name === createObjectFieldName,
		);
		if (createOperation && createInput && !createObjectField) {
			missing.add(`${typePath(createInput.name)}.inputFields.${createObjectFieldName}`);
		}
		const createObjectInputName = baseTypeName(createObjectField?.type);
		const createObjectInput = createObjectInputName
			? requireType(createObjectInputName, 'INPUT_OBJECT')
			: undefined;

		const patchTypeName = nonEmptyName(inflection?.patchType);
		const patchInput = patchTypeName
			? requireType(patchTypeName, 'INPUT_OBJECT')
			: undefined;
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

		const tableType = requireType(inflection?.tableType, 'OBJECT');
		for (const field of table.fields ?? []) {
			if (!field?.name || !tableType) continue;
			const graphQLFieldName = pgFieldToCamelCase(field.name);
			const graphQLField = tableType.fields?.find((candidate) => candidate.name === graphQLFieldName);
			if (!graphQLField) {
				missing.add(`${typePath(tableType.name)}.fields.${graphQLFieldName}`);
			}

			const declaredEnumName = nonEmptyName(field.enumValues?.name);
			if (!declaredEnumName) continue;
			let fieldMappingValid = Boolean(graphQLField);
			const fieldEnumTypeName = graphQLField
				? baseTypeName(graphQLField.type)
				: null;
			if (
				fieldEnumTypeName &&
				canonicalEnumIdentifier(fieldEnumTypeName) !==
					canonicalEnumIdentifier(declaredEnumName)
			) {
				fieldMappingValid = false;
				missing.add(
					`${typePath(tableType.name)}.fields.${graphQLFieldName}.type.${declaredEnumName}`,
				);
			}
			const canonicalMatches = [...types.values()].filter(
				(type) =>
					type.kind === 'ENUM' &&
					canonicalEnumIdentifier(type.name) === canonicalEnumIdentifier(declaredEnumName),
			);
			const enumTypeName = fieldEnumTypeName ??
				(canonicalMatches.length === 1 ? canonicalMatches[0]!.name : null);
			if (!enumTypeName) {
				fieldMappingValid = false;
				missing.add(typePath(declaredEnumName));
				continue;
			}
			const enumType = requireType(enumTypeName, 'ENUM');
			if (enumType?.kind !== 'ENUM') fieldMappingValid = false;
			if (
				nonEmptyName(table.query?.create) &&
				!checkEnumInputField(
					createObjectInput,
					graphQLFieldName,
					enumTypeName,
					`${typePath(tableType.name)}.fields.${graphQLFieldName}.createInput`,
				)
			) {
				fieldMappingValid = false;
			}
			if (
				nonEmptyName(table.query?.update) &&
				!checkEnumInputField(
					patchInput,
					graphQLFieldName,
					enumTypeName,
					`${typePath(tableType.name)}.fields.${graphQLFieldName}.patchInput`,
				)
			) {
				fieldMappingValid = false;
			}
			const graphQLValues = enumType?.enumValues?.map((value) => value.name) ?? [];
			const metaValues = field.enumValues?.values ?? [];
			const graphQLByCanonical = enumIdentifiersByCanonical(graphQLValues);
			const metaByCanonical = enumIdentifiersByCanonical(metaValues);
			const mappedValues: SchemaEnumValueToken[] = [];

			for (const metaValue of metaValues) {
				const canonical = canonicalEnumIdentifier(metaValue);
				const graphQLCandidates = graphQLByCanonical.get(canonical) ?? [];
				const metaCandidates = metaByCanonical.get(canonical) ?? [];
				if (graphQLCandidates.length === 0) {
					fieldMappingValid = false;
					missing.add(`${typePath(enumTypeName)}.enumValues.${metaValue}`);
					continue;
				}
				if (graphQLCandidates.length !== 1 || metaCandidates.length !== 1) {
					fieldMappingValid = false;
					missing.add(`${typePath(enumTypeName)}.enumValues.${metaValue}.exactMapping`);
					continue;
				}
				mappedValues.push({
					metaValue,
					graphQLValue: graphQLCandidates[0]!,
				});
			}

			if (fieldMappingValid) {
				enumMappings.push({
					tableName: table.name,
					schemaName: table.schemaName ?? null,
					fieldName: graphQLFieldName,
					graphQLTypeName: enumTypeName,
					values: mappedValues,
				});
			}
		}

	}

	const missingPaths = [...missing];
	const status = missingPaths.length === 0 ? 'compatible' : 'incompatible';
	return {
		contractVersion: META_CONTRACT_VERSION,
		status,
		missingPaths,
		enumMappings: status === 'compatible' ? enumMappings : [],
	};
}

export function assessSchemaIntrospectionCompatibility(
	introspection: IntrospectionQueryResponse | null | undefined,
	metaQuery: MetaQuery,
): SchemaIntrospectionCompatibility {
	const { enumMappings: _enumMappings, ...compatibility } =
		analyzeSchemaIntrospectionCompatibility(introspection, metaQuery);
	return compatibility;
}

function normalizeEnumValue(value: unknown, mapping: SchemaEnumFieldMapping): unknown {
	const normalizeOne = (candidate: unknown): unknown => {
		if (typeof candidate !== 'string') return candidate;
		const token = mapping.values.find(
			(entry) => entry.metaValue === candidate || entry.graphQLValue === candidate,
		);
		return token?.graphQLValue ?? candidate;
	};

	return Array.isArray(value) ? value.map(normalizeOne) : normalizeOne(value);
}

/**
 * Translate `_meta` enum labels to the exact tokens accepted by GraphQL.
 * Unknown values are preserved so GraphQL remains the final input validator.
 */
export function normalizeSchemaEnumInputValues(
	input: Record<string, unknown>,
	table: Pick<CleanTable, 'name' | 'schemaName'>,
	mappings: readonly SchemaEnumFieldMapping[],
): Record<string, unknown> {
	let normalized = input;
	for (const mapping of mappings) {
		if (
			mapping.tableName !== table.name ||
			mapping.schemaName !== (table.schemaName ?? null) ||
			!Object.prototype.hasOwnProperty.call(input, mapping.fieldName)
		) {
			continue;
		}

		const value = normalizeEnumValue(input[mapping.fieldName], mapping);
		if (value === input[mapping.fieldName]) continue;
		if (normalized === input) normalized = { ...input };
		normalized[mapping.fieldName] = value;
	}
	return normalized;
}

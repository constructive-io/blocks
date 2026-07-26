import type { QueryClient } from '@tanstack/react-query';
import { toCamelCase, toPascalCase, pluralize, singularize } from 'inflekt';

import { TypedDocumentString } from '@constructive-io/data';

import type { CleanTable } from '@constructive-io/data';
import type { FieldSelection, SimpleFieldSelection } from '@constructive-io/data';
import type { SheetsExecuteFn } from '../context/sheets-execute';
import type { SheetsScopeKey } from '../context/sheets-context';
import { sheetsQueryKeys } from './query-keys';

interface TypeFieldsQuery {
	__type: {
		fields: Array<{ name: string } | null> | null;
	} | null;
}

interface TypeFieldsQueryVariables {
	typeName: string;
}

const TypeFieldsDoc = new TypedDocumentString<TypeFieldsQuery, TypeFieldsQueryVariables>(`
	query TypeFields($typeName: String!) {
		__type(name: $typeName) {
			fields {
				name
			}
		}
	}
`);

type RelationDescriptor = {
	fieldName: string;
	kind: 'belongsTo' | 'hasOne' | 'hasMany' | 'manyToMany';
	referencedTableName?: string;
	keyNames: string[];
};

type ResolveRelationFieldMapArgs = {
	table: CleanTable;
	fieldSelection?: FieldSelection;
	scopeKey: SheetsScopeKey;
	queryClient: QueryClient;
	execute: SheetsExecuteFn;
};

export async function resolveRelationFieldMap({
	table,
	fieldSelection,
	scopeKey,
	queryClient,
	execute,
}: ResolveRelationFieldMapArgs): Promise<Record<string, string | null>> {
	const requestedRelationFields = getRequestedRelationFields(fieldSelection);
	if (requestedRelationFields.length === 0) {
		return {};
	}

	const relations = collectRelationDescriptors(table);
	if (relations.length === 0) {
		return {};
	}

	const relationByFieldName = new Map(relations.map((relation) => [relation.fieldName, relation] as const));
	const relationFieldsSet = new Set(relations.map((relation) => relation.fieldName));
	const candidateFields = requestedRelationFields.filter((fieldName) => relationFieldsSet.has(fieldName));

	if (candidateFields.length === 0) {
		return {};
	}

	const availableFields = await getTypeFieldSet(table, scopeKey, queryClient, execute);

	const relationFieldMap: Record<string, string | null> = {};

	// Best effort fallback if introspection fields are unavailable.
	if (!availableFields || availableFields.size === 0) {
		candidateFields.forEach((fieldName) => {
			if (fieldName.includes('ByMy')) {
				relationFieldMap[fieldName] = fieldName.replace('ByMy', 'By');
			}
		});
		return relationFieldMap;
	}

	candidateFields.forEach((fieldName) => {
		if (availableFields.has(fieldName)) {
			return;
		}

		const relation = relationByFieldName.get(fieldName);
		const candidates = buildRelationFieldCandidates(fieldName, relation);
		const match = candidates.find((candidate) => availableFields.has(candidate));

		// Null means "omit this field from selection" to avoid query failure.
		relationFieldMap[fieldName] = match ?? null;
	});

	return relationFieldMap;
}

function getRequestedRelationFields(fieldSelection?: FieldSelection): string[] {
	if (!fieldSelection || typeof fieldSelection === 'string') {
		return [];
	}

	const requested = new Set<string>();
	const selection = fieldSelection as SimpleFieldSelection;

	(selection.includeRelations ?? []).forEach((fieldName) => requested.add(fieldName));

	if (selection.include) {
		Object.entries(selection.include).forEach(([fieldName, value]) => {
			if (value) {
				requested.add(fieldName);
			}
		});
	}

	return Array.from(requested);
}

function collectRelationDescriptors(table: CleanTable): RelationDescriptor[] {
	const descriptors: RelationDescriptor[] = [];

	table.relations.belongsTo.forEach((relation) => {
		if (!relation.fieldName) return;
		descriptors.push({
			fieldName: relation.fieldName,
			kind: 'belongsTo',
			referencedTableName: relation.referencesTable || undefined,
			keyNames: relation.keys.map((key) => key.name).filter(Boolean),
		});
	});

	table.relations.hasOne.forEach((relation) => {
		if (!relation.fieldName) return;
		descriptors.push({
			fieldName: relation.fieldName,
			kind: 'hasOne',
			referencedTableName: relation.referencedByTable || undefined,
			keyNames: relation.keys.map((key) => key.name).filter(Boolean),
		});
	});

	table.relations.hasMany.forEach((relation) => {
		if (!relation.fieldName) return;
		descriptors.push({
			fieldName: relation.fieldName,
			kind: 'hasMany',
			referencedTableName: relation.referencedByTable || undefined,
			keyNames: relation.keys.map((key) => key.name).filter(Boolean),
		});
	});

	table.relations.manyToMany.forEach((relation) => {
		if (!relation.fieldName) return;
		descriptors.push({
			fieldName: relation.fieldName,
			kind: 'manyToMany',
			referencedTableName: relation.rightTable || undefined,
			keyNames: [],
		});
	});

	return descriptors;
}

function buildRelationFieldCandidates(fieldName: string, relation?: RelationDescriptor): string[] {
	const candidates = new Set<string>();
	const add = (value: string | null | undefined) => {
		if (!value) return;
		candidates.add(value);
	};

	add(fieldName);
	add(fieldName.replace(/ByMy([A-Z])/g, 'By$1'));
	add(fieldName.replace(/My([A-Z])/g, '$1'));

	const byMatch = /^(.*)By(.+)$/.exec(fieldName);
	if (byMatch) {
		const [, prefixRaw, suffixRaw] = byMatch;
		const cleanedSuffix = suffixRaw.replace(/^My/, '');
		const prefixSingular = singularize(prefixRaw);
		const prefixPlural = pluralize(prefixSingular);

		add(`${prefixRaw}By${cleanedSuffix}`);
		add(`${prefixSingular}By${cleanedSuffix}`);
		add(`${prefixPlural}By${cleanedSuffix}`);
	}

	if (!relation) {
		return Array.from(candidates);
	}

	const firstKey = relation.keyNames[0];
	const keyPascalCase = firstKey ? toPascalCase(firstKey) : null;
	const relationTable = relation.referencedTableName;

	if (relationTable) {
		const singularRef = toCamelCase(relationTable);
		const pluralRef = pluralize(singularRef);

		add(singularRef);
		add(pluralRef);

		if (keyPascalCase) {
			add(`${singularRef}By${keyPascalCase}`);
			add(`${pluralRef}By${keyPascalCase}`);
		}
	}

	if (relation.kind === 'hasMany' || relation.kind === 'manyToMany') {
		const fieldPrefix = fieldName.split('By')[0];
		add(pluralize(singularize(fieldPrefix)));
	}

	return Array.from(candidates);
}

async function getTypeFieldSet(
	table: CleanTable,
	scopeKey: SheetsScopeKey,
	queryClient: QueryClient,
	execute: SheetsExecuteFn,
): Promise<Set<string> | null> {
	const typeNames = [table.inflection?.tableType, table.name]
		.filter((candidate): candidate is string => typeof candidate === 'string' && candidate.trim().length > 0)
		.filter((candidate, index, values) => values.indexOf(candidate) === index);

	for (const typeName of typeNames) {
		const fields = await queryClient.fetchQuery<string[]>({
			queryKey: sheetsQueryKeys.typeFields(scopeKey, typeName),
			queryFn: async () => {
				const response = await execute<TypeFieldsQuery>(TypeFieldsDoc, { typeName });

				return (response.__type?.fields ?? [])
					.map((field) => field?.name)
					.filter((name): name is string => typeof name === 'string' && name.length > 0);
			},
			staleTime: 5 * 60 * 1000,
			gcTime: 30 * 60 * 1000,
		});

		if (fields.length > 0) {
			return new Set(fields);
		}
	}

	return null;
}

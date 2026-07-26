import type { QueryClient } from '@tanstack/react-query';

import { TypedDocumentString } from '@constructive-io/data';
import type { CleanTable } from '@constructive-io/data';

import type { SheetsExecuteFn } from '../context/sheets-execute';
import type { SheetsScopeKey } from '../context/sheets-context';
import { sheetsQueryKeys } from './query-keys';

interface EnumValuesQuery {
	__type: {
		enumValues: Array<{ name: string } | null> | null;
	} | null;
}

interface EnumValuesQueryVariables {
	typeName: string;
}

const EnumValuesDoc = new TypedDocumentString<EnumValuesQuery, EnumValuesQueryVariables>(`
	query EnumValues($typeName: String!) {
		__type(name: $typeName) {
			enumValues {
				name
			}
		}
	}
`);

/**
 * Fetch and cache the valid orderBy enum values for a table.
 * Returns a Set of valid enum strings (e.g. "NOTES_ASC", "ID_DESC"),
 * or null if the type cannot be resolved.
 */
async function getOrderByEnumValues(
	orderByTypeName: string,
	scopeKey: SheetsScopeKey,
	queryClient: QueryClient,
	execute: SheetsExecuteFn,
): Promise<Set<string> | null> {
	const values = await queryClient.fetchQuery<Set<string>>({
		queryKey: sheetsQueryKeys.enumValues(scopeKey, orderByTypeName),
		queryFn: async () => {
			const response = await execute<EnumValuesQuery>(EnumValuesDoc, { typeName: orderByTypeName });

			const names = (response.__type?.enumValues ?? [])
				.map((v) => v?.name)
				.filter((name): name is string => typeof name === 'string' && name.length > 0);

			return new Set(names);
		},
		staleTime: 5 * 60 * 1000,
		gcTime: 30 * 60 * 1000,
	});

	return values.size > 0 ? values : null;
}

/**
 * Filter orderBy variables to only include values that exist in the schema.
 * Mutates the variables object in place — removes invalid values and deletes
 * the orderBy key entirely if no valid values remain.
 */
export async function validateOrderByVariables(
	variables: Record<string, unknown>,
	table: CleanTable,
	scopeKey: SheetsScopeKey,
	queryClient: QueryClient,
	execute: SheetsExecuteFn,
): Promise<void> {
	if (!variables.orderBy || !Array.isArray(variables.orderBy) || !table.inflection?.orderByType) {
		return;
	}

	const validValues = await getOrderByEnumValues(table.inflection.orderByType, scopeKey, queryClient, execute);
	if (!validValues) return;

	variables.orderBy = (variables.orderBy as string[]).filter((v) => validValues.has(v));
	if ((variables.orderBy as string[]).length === 0) {
		delete variables.orderBy;
	}
}

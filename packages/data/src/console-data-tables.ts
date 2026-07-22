import { codecNameToTableName, pgFieldToCamelCase, type MetaTable } from './data.types';

export const DEFAULT_CONSOLE_APPLICATION_SCOPES = ['app'] as const;

export interface SelectConsoleDataTablesOptions {
	/** Exact semantic scopes that identify application-owned tables. */
	applicationScopes?: readonly string[];
	/** Exact table names or `schema.table` identifiers allowed by the host. */
	includeTables?: readonly string[];
	/** Table names or `schema.table` identifiers the host wants hidden. */
	excludeTables?: readonly string[];
}

type MetaTableInput = MetaTable | null | undefined;

function tableIdentifier(table: MetaTable): string {
	return table.schemaName ? `${table.schemaName}.${table.name}` : table.name;
}

function includedTableNames(values: readonly string[] | undefined): Set<string> | null {
	if (!values) return null;
	const names = new Set<string>();
	for (const value of values) {
		names.add(value);
		const separator = value.lastIndexOf('.');
		const schemaName = separator >= 0 ? value.slice(0, separator) : null;
		const physicalName = separator >= 0 ? value.slice(separator + 1) : value;
		const graphqlName = codecNameToTableName(pgFieldToCamelCase(physicalName));
		names.add(graphqlName);
		if (schemaName) names.add(`${schemaName}.${graphqlName}`);
	}
	return names;
}

function collectJunctionTableNames(tables: readonly MetaTable[]): Set<string> {
	const junctions = new Set<string>();

	for (const table of tables) {
		for (const relation of table.relations?.manyToMany ?? []) {
			if (!relation?.junctionTable?.name) continue;
			junctions.add(codecNameToTableName(relation.junctionTable.name));
		}
	}

	return junctions;
}

/**
 * Select tables for Console Kit's generic Data area. Application ownership is
 * determined exclusively from the July `_meta` semantic scope smart tag. The
 * physical schema name is retained only for identifiers and deduplication.
 */
export function selectConsoleDataTables(
	metaTables: readonly MetaTableInput[],
	options: SelectConsoleDataTablesOptions = {},
): MetaTable[] {
	const tables = metaTables.filter((table): table is MetaTable => Boolean(table?.name));
	if (tables.length === 0) return [];

	const applicationScopes = options.applicationScopes ?? DEFAULT_CONSOLE_APPLICATION_SCOPES;
	const scopeOrder = new Map(applicationScopes.map((scope, index) => [scope, index] as const));
	const included = includedTableNames(options.includeTables);
	const excluded = new Set(options.excludeTables ?? []);
	const junctions = collectJunctionTableNames(tables);
	const seenTables = new Set<string>();

	return tables
		.filter((table) => {
			const identifier = tableIdentifier(table);
			if (included && !included.has(table.name) && !included.has(identifier)) return false;
			if (excluded.has(table.name) || excluded.has(identifier)) return false;
			if (!included && junctions.has(table.name)) return false;
			if (table.storage?.isBucketsTable || table.storage?.isFilesTable) return false;
			if (!included && (table.scope?.source !== 'smartTag' || !scopeOrder.has(table.scope.scope))) return false;
			if (seenTables.has(identifier)) return false;
			seenTables.add(identifier);
			return true;
		})
		.sort((left, right) => {
			const leftOrder = left.scope ? scopeOrder.get(left.scope.scope) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
			const rightOrder = right.scope ? scopeOrder.get(right.scope.scope) ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER;
			return (
				leftOrder - rightOrder ||
				left.name.localeCompare(right.name) ||
				(left.schemaName ?? '').localeCompare(right.schemaName ?? '')
			);
		});
}

import { codecNameToTableName, type MetaTable } from './data.types';

export const DEFAULT_CONSOLE_APPLICATION_SCOPES = ['app'] as const;

export interface SelectConsoleDataTablesOptions {
	/** Exact semantic scopes that identify application-owned tables. */
	applicationScopes?: readonly string[];
	/** Table names or `schema.table` identifiers the host wants hidden. */
	excludeTables?: readonly string[];
}

type MetaTableInput = MetaTable | null | undefined;

function tableIdentifier(table: MetaTable): string {
	return table.schemaName ? `${table.schemaName}.${table.name}` : table.name;
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
	const excluded = new Set(options.excludeTables ?? []);
	const junctions = collectJunctionTableNames(tables);
	const seenTables = new Set<string>();

	return tables
		.filter((table) => {
			const identifier = tableIdentifier(table);
			if (excluded.has(table.name) || excluded.has(identifier)) return false;
			if (junctions.has(table.name)) return false;
			if (table.storage?.isBucketsTable || table.storage?.isFilesTable) return false;
			if (table.scope?.source !== 'smartTag' || !scopeOrder.has(table.scope.scope)) return false;
			if (seenTables.has(identifier)) return false;
			seenTables.add(identifier);
			return true;
		})
		.sort((left, right) => {
			const leftOrder = scopeOrder.get(left.scope!.scope) ?? Number.MAX_SAFE_INTEGER;
			const rightOrder = scopeOrder.get(right.scope!.scope) ?? Number.MAX_SAFE_INTEGER;
			return (
				leftOrder - rightOrder ||
				left.name.localeCompare(right.name) ||
				(left.schemaName ?? '').localeCompare(right.schemaName ?? '')
			);
		});
}

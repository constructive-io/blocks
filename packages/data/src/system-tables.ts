// Which tables are the database owner's, and which a platform module made and keeps (sessions,
// memberships, limits, billing, storage). The platform's table catalog says so with each table's
// `category`: `APP` for a table the owner made, anything else (`CORE`, `MODULE`, `AUTH`,
// `MEMBERSHIPS`, `CAPABILITIES`) for a module's. `_meta` does not carry the category, so a host
// that can read the platform API passes it in. The `_meta` facts that mark module tables count
// too: some module tables sit in the app schema filed as `APP` (storage, generated search tables),
// and some are not in the catalog at all (a platform table another plane puts on the API).
import type { MetaTable } from './meta-query.types';

/** One table from the platform API: `tables { name category schema { schemaName } }`. */
export interface PlatformTableCategory {
	name?: string | null;
	category?: string | null;
	schema?: { schemaName?: string | null } | null;
}

export type TableRole = 'app' | 'system';

/** Each catalog table's role, by physical schema and SQL table name. */
export type TableRoles = ReadonlyMap<string, TableRole>;

/** The physical schema plus the SQL table name: the same for a platform table and its `_meta` table. */
function physicalKey(schemaName: string, tableName: string): string {
	return `${schemaName}.${tableName}`;
}

/** The role of each table the platform catalog lists, for {@link isSystemTable}. */
export function tableRolesFromCatalog(tables: readonly PlatformTableCategory[]): TableRoles {
	const roles = new Map<string, TableRole>();
	for (const table of tables) {
		const schemaName = table.schema?.schemaName;
		if (!schemaName || !table.name || !table.category) continue;
		roles.set(physicalKey(schemaName, table.name), table.category.toUpperCase() === 'APP' ? 'app' : 'system');
	}
	return roles;
}

/**
 * Whether a `_meta` table belongs to a platform module: the catalog files it as a module's, or a
 * `_meta` fact says so (storage's files and buckets tables, a table scoped to the database itself).
 * The catalog only adds system tables; without it (or on a server that does not send `tableName`),
 * the facts alone decide.
 */
export function isSystemTable(
	table: Pick<MetaTable, 'schemaName' | 'tableName' | 'storage' | 'scope'>,
	roles?: TableRoles | null,
): boolean {
	const role = roles && table.schemaName && table.tableName ? roles.get(physicalKey(table.schemaName, table.tableName)) : undefined;
	if (role === 'system') return true;
	return Boolean(table.storage?.isFilesTable || table.storage?.isBucketsTable || table.scope?.scope === 'database');
}

// A module's table is told from the owner's by the platform catalog's category, joined to `_meta`
// by physical schema and SQL table name; `_meta`'s own facts mark system tables too, and decide
// alone without the catalog.
import { describe, expect, it } from 'vitest';

import { isSystemTable, tableRolesFromCatalog } from '../system-tables';

const SCHEMA = 'pool-e5e40f09-app-public';
const catalog = tableRolesFromCatalog([
	{ name: 'tasks', category: 'APP', schema: { schemaName: SCHEMA } },
	{ name: 'users', category: 'APP', schema: { schemaName: 'pool-e5e40f09-users-public' } },
	{ name: 'role_types', category: 'MODULE', schema: { schemaName: 'pool-e5e40f09-users-public' } },
	{ name: 'app_memberships', category: 'MEMBERSHIPS', schema: { schemaName: 'pool-e5e40f09-memberships-public' } },
	{ name: 'app_files', category: 'core', schema: { schemaName: 'pool-e5e40f09-storage-public' } },
	{ name: 'no_schema', category: 'CORE', schema: null },
]);
const meta = (schemaName: string, tableName: string | null, extra: object = {}) => ({ schemaName, tableName, ...extra });

describe('system tables', () => {
	it('marks every table the catalog files as anything but APP, and keeps what the facts say', () => {
		expect(catalog.size).toBe(5);
		expect(isSystemTable(meta(SCHEMA, 'tasks'), catalog)).toBe(false);
		expect(isSystemTable(meta('pool-e5e40f09-users-public', 'users'), catalog)).toBe(false);
		expect(isSystemTable(meta('pool-e5e40f09-users-public', 'role_types'), catalog)).toBe(true);
		expect(isSystemTable(meta('pool-e5e40f09-memberships-public', 'app_memberships'), catalog)).toBe(true);
		expect(isSystemTable(meta('pool-e5e40f09-storage-public', 'app_files'), catalog)).toBe(true);
		// The catalog only adds system tables: a module table filed as APP is still told by its facts.
		expect(isSystemTable(meta(SCHEMA, 'tasks', { storage: { isFilesTable: true } }), catalog)).toBe(true);
	});

	it('lets the _meta facts decide for an unlisted table, without the catalog, and without a table name', () => {
		// A view the catalog does not list stays the owner's; a platform table another plane adds does not.
		expect(isSystemTable(meta(SCHEMA, 'task_overview'), catalog)).toBe(false);
		expect(isSystemTable(meta('pool-e5e40f09-services-public', 'sites', { scope: { scope: 'database' } }), catalog)).toBe(true);
		expect(isSystemTable(meta(SCHEMA, 'files', { storage: { isFilesTable: true } }))).toBe(true);
		expect(isSystemTable(meta(SCHEMA, 'buckets', { storage: { isBucketsTable: true } }), null)).toBe(true);
		expect(isSystemTable(meta(SCHEMA, 'tasks'))).toBe(false);
		expect(isSystemTable(meta('pool-e5e40f09-users-public', null), catalog)).toBe(false);
	});
});

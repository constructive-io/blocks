import type { SheetsScopeKey } from '../context/sheets-context';

export function isSheetsScopeKey(value: unknown): value is SheetsScopeKey {
	if (!value || typeof value !== 'object') return false;
	const candidate = value as Record<string, unknown>;
	return 'databaseId' in candidate && 'endpoint' in candidate && 'identityKey' in candidate;
}

export const sheetsQueryKeys = {
	root: ['sheets'] as const,
	scope: (scope: SheetsScopeKey) => ['sheets', scope] as const,
	meta: (scope: SheetsScopeKey) => [...sheetsQueryKeys.scope(scope), 'meta'] as const,
	typeFields: (scope: SheetsScopeKey, typeName: string) =>
		[...sheetsQueryKeys.scope(scope), 'type-fields', typeName] as const,
	enumValues: (scope: SheetsScopeKey, typeName: string) =>
		[...sheetsQueryKeys.scope(scope), 'enum-values', typeName] as const,
	relations: (scope: SheetsScopeKey, tableName: string) =>
		[...sheetsQueryKeys.scope(scope), 'relations', tableName] as const,
	table: (scope: SheetsScopeKey, tableName: string) => [...sheetsQueryKeys.scope(scope), 'table', tableName] as const,
	tableRows: (scope: SheetsScopeKey, tableName: string, options?: unknown) =>
		[...sheetsQueryKeys.table(scope, tableName), 'rows', options] as const,
	tableRow: (scope: SheetsScopeKey, tableName: string, id: unknown) =>
		[...sheetsQueryKeys.table(scope, tableName), 'row', id] as const,
	tableCount: (scope: SheetsScopeKey, tableName: string, where?: Record<string, unknown> | null) =>
		[...sheetsQueryKeys.table(scope, tableName), 'count', where] as const,
	infiniteTable: (scope: SheetsScopeKey, tableName: string) =>
		[...sheetsQueryKeys.scope(scope), 'infinite-table', tableName] as const,
	infiniteTablePage: (scope: SheetsScopeKey, tableName: string, pageIndex: number, options: unknown) =>
		[...sheetsQueryKeys.infiniteTable(scope, tableName), 'page', pageIndex, options] as const,
	infiniteTableTotalCount: (scope: SheetsScopeKey, tableName: string, where?: Record<string, unknown>) =>
		[...sheetsQueryKeys.infiniteTable(scope, tableName), 'totalCount', where] as const,
	cursorTable: (scope: SheetsScopeKey, tableName: string, options?: unknown) =>
		[...sheetsQueryKeys.scope(scope), 'cursor-table', tableName, options] as const,
} as const;

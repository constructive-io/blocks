import type { SheetsScopeKey } from '../context/sheets-context';

export function isSheetsScopeKey(value: unknown): value is SheetsScopeKey {
	if (!value || typeof value !== 'object') return false;
	const candidate = value as Record<string, unknown>;
	return 'databaseId' in candidate && 'endpoint' in candidate && 'identityKey' in candidate;
}

export function reuseSheetsPlaceholderData<T>(
	previousData: T | undefined,
	previousQueryKey: readonly unknown[] | undefined,
	currentScope: SheetsScopeKey,
): T | undefined {
	const previousScope = previousQueryKey?.[1];
	if (!isSheetsScopeKey(previousScope)) return undefined;
	if (previousScope.databaseId !== currentScope.databaseId) return undefined;
	if (previousScope.endpoint !== currentScope.endpoint) return undefined;
	if (previousScope.identityKey !== currentScope.identityKey) return undefined;
	return previousData;
}

/**
 * Cache-key segments for a table reference. A `TableModel.key`
 * (`schema.Name`) becomes `[Name, schema]`, a bare name `[Name]`. Tables in
 * different schemas get different entries, and a key built from a bare name is
 * a prefix of every schema's entry, so invalidating by name still reaches them.
 */
export function tableKeySegments(tableRef: string): readonly string[] {
	const dot = tableRef.lastIndexOf('.');
	return dot === -1 ? [tableRef] : [tableRef.slice(dot + 1), tableRef.slice(0, dot)];
}

export const sheetsQueryKeys = {
	root: ['sheets'] as const,
	scope: (scope: SheetsScopeKey) => ['sheets', scope] as const,
	meta: (scope: SheetsScopeKey) => [...sheetsQueryKeys.scope(scope), 'meta'] as const,
	/** One table model, per `_meta` version and display override. */
	tableModel: (scope: SheetsScopeKey, tableKey: string, metaVersion: number, displayKey: string | null) =>
		[...sheetsQueryKeys.scope(scope), 'table-model', ...tableKeySegments(tableKey), metaVersion, displayKey] as const,
	mediaUrl: (scope: SheetsScopeKey, endpoint: string | undefined, id: string | null) =>
		[...sheetsQueryKeys.scope(scope), 'media-url', endpoint, id] as const,
	relations: (scope: SheetsScopeKey, tableName: string) =>
		[...sheetsQueryKeys.scope(scope), 'relations', ...tableKeySegments(tableName)] as const,
	table: (scope: SheetsScopeKey, tableRef: string) =>
		[...sheetsQueryKeys.scope(scope), 'table', ...tableKeySegments(tableRef)] as const,
	tableRows: (scope: SheetsScopeKey, tableRef: string, options?: unknown) =>
		[...sheetsQueryKeys.table(scope, tableRef), 'rows', options] as const,
	tableRow: (scope: SheetsScopeKey, tableRef: string, id: unknown) =>
		[...sheetsQueryKeys.table(scope, tableRef), 'row', id] as const,
	tableCount: (scope: SheetsScopeKey, tableRef: string, where?: Readonly<Record<string, unknown>> | null) =>
		[...sheetsQueryKeys.table(scope, tableRef), 'count', where] as const,
	infiniteTable: (scope: SheetsScopeKey, tableRef: string) =>
		[...sheetsQueryKeys.scope(scope), 'infinite-table', ...tableKeySegments(tableRef)] as const,
	infiniteTablePage: (scope: SheetsScopeKey, tableRef: string, pageIndex: number, options: unknown) =>
		[...sheetsQueryKeys.infiniteTable(scope, tableRef), 'page', pageIndex, options] as const,
	infiniteTableTotalCount: (scope: SheetsScopeKey, tableRef: string, where?: Readonly<Record<string, unknown>>) =>
		[...sheetsQueryKeys.infiniteTable(scope, tableRef), 'totalCount', where] as const,
	cursorTable: (scope: SheetsScopeKey, tableRef: string, options?: unknown) =>
		[...sheetsQueryKeys.scope(scope), 'cursor-table', ...tableKeySegments(tableRef), options] as const,
} as const;

/**
 * Mutation keys. Every mutation a Sheets hook creates sits under its table's
 * query key, `[...table(scope, tableRef), 'mutation', operation, ...detail]`, so
 * `useIsMutating({ mutationKey: sheetsMutationKeys.table(scope, ref) })` counts
 * every write in flight on that table.
 */
export const sheetsMutationKeys = {
	/** Every mutation of a table, or one operation of it when `operation` is given. */
	table: (scope: SheetsScopeKey, tableRef: string, operation?: string, ...detail: readonly unknown[]) =>
		operation === undefined
			? ([...sheetsQueryKeys.table(scope, tableRef), 'mutation'] as const)
			: ([...sheetsQueryKeys.table(scope, tableRef), 'mutation', operation, ...detail] as const),
} as const;

import {
	assessTableWriteCapability,
	resolveRowIdentity,
	rowIdentityToPrimaryKey,
	serializeRowIdentity,
	type MetaTable,
	type RowIdentityValue,
	type TableWriteCapability,
} from '@constructive-io/data';

/** A row locator accepted by Sheets CRUD operations. */
export type SheetsRowIdentifier =
	| string
	| number
	| Readonly<Record<string, RowIdentityValue>>;

export type SheetsMutationOperation = 'create' | 'update' | 'delete';

export type SheetsRowIdentityResolution =
	| Readonly<{
			status: 'identified';
			/** Backwards-compatible scalar for an ordinary `id` PK; otherwise the PK object. */
			identifier: SheetsRowIdentifier;
			/** GraphQL primary-key input, including renamed and composite keys. */
			primaryKey: Readonly<Record<string, RowIdentityValue>>;
			/** Stable, schema-qualified key used by caches, selection, and editors. */
			key: string;
	  }>
	| Readonly<{
			status: 'unavailable';
			reason: 'no-primary-key' | 'invalid-row';
	  }>;

function isLegacyScalarId(
	primaryKey: Readonly<Record<string, RowIdentityValue>>,
): primaryKey is Readonly<{ id: string | number }> {
	const entries = Object.entries(primaryKey);
	return (
		entries.length === 1 &&
		entries[0][0] === 'id' &&
		(typeof entries[0][1] === 'string' || typeof entries[0][1] === 'number')
	);
}

/**
 * Resolve one server row from `_meta`. The familiar scalar `id` contract is kept
 * for existing adapters, while renamed and composite keys use the full PK input.
 */
export function resolveSheetsRowIdentity(
	table: MetaTable,
	row: Readonly<Record<string, unknown>>,
): SheetsRowIdentityResolution {
	const resolution = resolveRowIdentity(table, row);
	if (resolution.status === 'read-only') {
		return { status: 'unavailable', reason: 'no-primary-key' };
	}
	if (resolution.status === 'invalid-row') {
		return { status: 'unavailable', reason: 'invalid-row' };
	}

	const primaryKey = rowIdentityToPrimaryKey(resolution.identity);
	return {
		status: 'identified',
		identifier: isLegacyScalarId(primaryKey) ? primaryKey.id : primaryKey,
		primaryKey,
		key: serializeRowIdentity(resolution.identity),
	};
}

/** Resolve a public CRUD identifier through the same `_meta` identity contract. */
export function resolveSheetsIdentifier(
	table: MetaTable,
	identifier: SheetsRowIdentifier,
): SheetsRowIdentityResolution {
	const row =
		typeof identifier === 'object' && identifier !== null
			? identifier
			: { id: identifier };
	return resolveSheetsRowIdentity(table, row);
}

/** Build the PostGraphile connection filter used by `findOne`. */
export function sheetsIdentifierToWhere(
	table: MetaTable,
	identifier: SheetsRowIdentifier,
): Record<string, { equalTo: RowIdentityValue }> | null {
	const resolution = resolveSheetsIdentifier(table, identifier);
	if (resolution.status !== 'identified') return null;
	return Object.fromEntries(
		Object.entries(resolution.primaryKey).map(([field, value]) => [field, { equalTo: value }]),
	);
}

/** Use scalar IDs as cache keys for compatibility; use serialized identities otherwise. */
export function sheetsIdentifierCacheKey(
	table: MetaTable,
	identifier: SheetsRowIdentifier,
): string | number | null {
	const resolution = resolveSheetsIdentifier(table, identifier);
	if (resolution.status !== 'identified') return null;
	return typeof resolution.identifier === 'object'
		? resolution.key
		: resolution.identifier;
}

/** Stable TanStack/selection/editor key with an index fallback only for non-writable rows. */
export function sheetsRowKey(
	table: MetaTable,
	row: Readonly<Record<string, unknown>>,
	index: number,
): string {
	const resolution = resolveSheetsRowIdentity(table, row);
	if (resolution.status === 'identified') {
		return typeof resolution.identifier === 'object'
			? resolution.key
			: String(resolution.identifier);
	}
	return `${table.schemaName ?? ''}:${table.name}:row:${index}`;
}

export function getSheetsWriteCapability(table: MetaTable | null): TableWriteCapability | null {
	return table ? assessTableWriteCapability(table) : null;
}

export function canRunSheetsMutation(
	capability: TableWriteCapability | null,
	operation: SheetsMutationOperation,
): boolean {
	if (!capability || capability.status !== 'mutable') return false;
	return capability.operations[operation];
}

export function assertSheetsMutationAllowed(
	table: MetaTable,
	operation: SheetsMutationOperation,
): void {
	const capability = assessTableWriteCapability(table);
	if (capability.status === 'read-only') {
		throw new Error(`Table '${table.name}' is read-only because it has no primary key.`);
	}
	if (!capability.operations[operation]) {
		const article = operation === 'update' ? 'an' : 'a';
		throw new Error(`Table '${table.name}' does not expose ${article} ${operation} mutation.`);
	}
}

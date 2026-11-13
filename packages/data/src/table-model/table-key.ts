import type { MetaQuery, MetaschemaTable } from '../meta-query.types';
import type { TableKey } from './types';

export type TableModelErrorCode =
	| 'TABLE_NOT_FOUND'
	| 'TABLE_AMBIGUOUS'
	| 'SCHEMA_UNAVAILABLE'
	| 'OPERATION_UNAVAILABLE'
	| 'UNKNOWN_FIELD'
	| 'FIELD_NOT_WRITABLE'
	| 'INVALID_VALUE'
	| 'KEY_INCOMPLETE'
	| 'SORT_UNAVAILABLE'
	| 'FILTER_UNAVAILABLE'
	| 'PAGING_UNAVAILABLE'
	| 'READ_FAILED'
	/** An update or delete changed no row: the writer may not change it, or it is gone. */
	| 'WRITE_NOT_APPLIED';

/** A table could not be resolved, or a document or write could not be proven valid. The message is safe to show. */
export class TableModelError extends Error {
	readonly code: TableModelErrorCode;
	/** The table the error concerns, when known. */
	readonly tableKey: TableKey | null;
	/** Table keys that matched an ambiguous name. */
	readonly candidates: readonly TableKey[];

	constructor(
		code: TableModelErrorCode,
		message: string,
		options: { tableKey?: TableKey | null; candidates?: readonly TableKey[] } = {},
	) {
		super(message);
		this.name = 'TableModelError';
		this.code = code;
		this.tableKey = options.tableKey ?? null;
		this.candidates = options.candidates ?? [];
	}
}

/** Stable identity of a `_meta` table. */
export function tableKeyOf(table: Pick<MetaschemaTable, 'name' | 'schemaName'>): TableKey {
	return `${table.schemaName ?? ''}.${table.name}`;
}

/** The non-null tables of a `_meta` response. */
export function metaTablesOf(meta: MetaQuery | null | undefined): MetaschemaTable[] {
	return (meta?._meta?.tables ?? []).filter((table): table is MetaschemaTable => Boolean(table?.name));
}

/**
 * Find a table by `TableModel.key`, or by bare name as hosts pass it. A name
 * shared by tables in several schemas is an explicit error listing the keys.
 */
export function findMetaTable(tables: readonly MetaschemaTable[], ref: string): MetaschemaTable {
	const byKey = tables.find((table) => tableKeyOf(table) === ref);
	if (byKey) return byKey;

	const byName = tables.filter((table) => table.name === ref);
	if (byName.length === 1) return byName[0]!;
	if (byName.length > 1) {
		const candidates = byName.map(tableKeyOf);
		throw new TableModelError(
			'TABLE_AMBIGUOUS',
			`More than one table is called "${ref}". Choose one of: ${candidates.join(', ')}.`,
			{ candidates },
		);
	}
	throw new TableModelError('TABLE_NOT_FOUND', `There is no table called "${ref}".`);
}

/** Resolve a type name to a table key, or null when no single table has that name. */
export function tableKeyForName(tables: readonly MetaschemaTable[], name: string | null | undefined): TableKey | null {
	if (!name) return null;
	const matches = tables.filter((table) => table.name === name);
	return matches.length === 1 ? tableKeyOf(matches[0]!) : null;
}

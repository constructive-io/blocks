import { useMemo } from 'react';
import type { ReactNode } from 'react';

import { assessTableWriteCapability, findMetaTable, getRowIdentityDefinition, metaTablesOf } from '@constructive-io/data';
import type {
	FieldSelection,
	MetaField,
	MetaQuery,
	TableModel,
	TableWriteCapability,
} from '@constructive-io/data';

import { useSheetsMeta } from '../../hooks/use-sheets-meta';
import { useSheetsTable, type UseTableResult } from '../../hooks/use-sheets-table';
import { useTableModel } from '../../hooks/use-table-model';
import { gridRelationSelection } from '../../hooks/list-query';
import { gridRelationFieldNames } from '../../relations/relation-columns';
import { createColumnSchemaFromMeta } from '../../cell-types/type-mapping';
import type { TableSchema, ColumnSchema } from '../../cell-types/types';
import { resolveSheetsRowIdentity } from '../../row-identity';

type MetaTable = NonNullable<NonNullable<NonNullable<MetaQuery['_meta']>['tables']>[number]>;
type RowRecord = Record<string, unknown>;
type TableOperations = Pick<UseTableResult<RowRecord>, 'update' | 'delete'>;
type CreatedRow = Record<string, unknown>;

// Data loading context type
export interface DataLoadingContextValue {
	// Table data
	data: RowRecord[];
	totalCount: number;
	// Loading states
	isLoading: boolean;
	/** True while a rows request for the current options is in flight, also while the previous rows are still shown. */
	isFetching: boolean;
	isError: boolean;
	error: Error | null;
	// CRUD operations
	update: TableOperations['update'];
	create: (data: Record<string, unknown>) => Promise<{ createdRow?: CreatedRow | null }>;
	delete: TableOperations['delete'];
	// Refetch the table query (used by the error-state retry)
	refetch: () => Promise<unknown>;
	// Meta information
	meta: MetaQuery | undefined;
	tableMeta: MetaTable | null;
	/** The table model: kinds, options, write flags, relations, sort and filter names. Null while it loads. */
	tableModel: TableModel | null;
	writeCapability: TableWriteCapability | null;
	tableSchema: TableSchema | null;
	fieldMetaMap: Map<string, MetaField>;
	allRelationFields: string[];
}

// Data loading hook configuration
export interface UseDataLoadingConfig {
	tableName: string;
	enabled?: boolean;
	queryOptions: {
		limit?: number;
		offset?: number;
		orderBy?: Array<{ field: string; direction: 'asc' | 'desc' }>;
		/** A filter in the server's filter input shape (any operator the model reports, relation and search fields included). */
		where?: Readonly<Record<string, unknown>>;
		/** Columns to fetch (the primary key and relation keys are always added). Omitted: every readable column. */
		columns?: readonly string[];
		/** Relation fields to fetch, for example the ones the view shows. Omitted: every relation the grid shows. */
		relations?: readonly string[];
	};
}

/**
 * `_meta` fields by name. Cell routing reads the column model; this map stays for
 * consumer cell-type `match()` (`pgType`, `subtype`), legacy relation routing and
 * draft column order.
 */
export function buildFieldMetaMap(fields: readonly (MetaField | null)[] | null | undefined): Map<string, MetaField> {
	const map = new Map<string, MetaField>();
	for (const field of fields ?? []) {
		if (field?.name) map.set(field.name, field);
	}
	return map;
}

// Main data loading hook
export function useDataLoading({
	tableName,
	enabled = true,
	queryOptions,
}: UseDataLoadingConfig) {
	// Meta data for table information
	const { data: meta, isLoading: isMetaLoading, error: metaError } = useSheetsMeta({ enabled });

	const tableMeta = useMemo<MetaTable | null>(() => findTableMeta(meta, tableName), [meta, tableName]);

	// Table schema for form integration
	const tableSchema = useMemo<TableSchema | null>(() => buildTableSchema(tableMeta), [tableMeta]);
	const writeCapability = useMemo<TableWriteCapability | null>(
		() => tableMeta ? assessTableWriteCapability(tableMeta) : null,
		[tableMeta],
	);

	// `_meta` fields by name, for quick lookup
	const fieldMetaMap = useMemo(() => {
		const fields = (tableMeta?.fields as MetaField[]) || [];
		return buildFieldMetaMap(fields);
	}, [tableMeta]);

	// The relations the grid shows, from the table model (the same cache entry the rows query uses).
	const { model: relationModel } = useTableModel(tableName);
	const allRelationFields = useMemo(() => gridRelationFieldNames(relationModel), [relationModel]);

	// Query keys compare options by content, so a new `relations` array with the same fields reuses the cache.
	const { relations: requestedRelations, ...listOptions } = queryOptions;
	const relationSelection = useMemo<FieldSelection>(
		() => gridRelationSelection(allRelationFields, requestedRelations),
		[allRelationFields, requestedRelations],
	);

	const tableData = useSheetsTable<RowRecord>(tableName, {
		...listOptions,
		// Leverage field selection to include relation fields when requested
		select: relationSelection,
		enabled,
	});
	const {
		data = [],
		totalCount,
		update: updateRow,
		create: createRow,
		delete: deleteRow,
		isLoading: isTableLoading,
		isFetching,
		error: tableError,
		refetch,
		model: tableModel,
	} = tableData;

	const create: DataLoadingContextValue['create'] = async (payload) => {
		const result = await createRow(payload);
		const createdRow = result?.createdRow;
		if (!createdRow || typeof createdRow !== 'object' || !tableMeta) {
			throw new Error(`Create mutation for '${tableName}' did not return a row identity.`);
		}
		const identity = resolveSheetsRowIdentity(tableMeta, createdRow);
		if (identity.status !== 'identified') {
			throw new Error(`Create mutation for '${tableName}' returned an incomplete primary-key identity.`);
		}

		return { createdRow: createdRow as CreatedRow };
	};

	// Combined loading and error states
	const isLoading = isMetaLoading || isTableLoading;
	const isError = !!metaError || !!tableError;
	const error = (metaError as Error | null) || (tableError as Error | null) || null;

	const contextValue: DataLoadingContextValue = useMemo(
		() => ({
			data,
			totalCount,
			isLoading,
			isFetching,
			isError,
			error,
			update: updateRow,
			create,
			delete: deleteRow,
			refetch,
			meta,
			tableMeta,
			tableModel,
			writeCapability,
			tableSchema,
			fieldMetaMap,
			allRelationFields,
		}),
		[
			data,
			totalCount,
			isLoading,
			isFetching,
			isError,
			error,
			updateRow,
			create,
			deleteRow,
			refetch,
			meta,
			tableMeta,
			tableModel,
			writeCapability,
			tableSchema,
			fieldMetaMap,
			allRelationFields,
		],
	);

	return {
		contextValue,
		Provider: ({ children }: { children: ReactNode }) => children,
	};
}

/** The `_meta` entry for a host table reference (name or `TableModel.key`), or null when unknown or ambiguous. */
export function findTableMeta(meta: MetaQuery | undefined, tableRef: string): MetaTable | null {
	if (!meta) return null;
	try {
		return findMetaTable(metaTablesOf(meta), tableRef);
	} catch {
		return null;
	}
}

function buildTableSchema(metaTable: MetaTable | null): TableSchema | null {
	if (!metaTable) return null;

	const columns: ColumnSchema[] = [];
	for (const field of metaTable.fields ?? []) {
		if (!field) continue;
		columns.push(createColumnSchemaFromMeta(field));
	}

	const identity = getRowIdentityDefinition(metaTable);
	const primaryKeyFields = identity.status === 'keyed'
		? identity.fields.map((field) => field.fieldName)
		: [];

	const inflection = metaTable.inflection;

	const metadata: TableSchema['metadata'] = {
		label: metaTable.name ?? undefined,
		description: inflection?.tableType ?? inflection?.allRows ?? undefined,
		primaryKey: primaryKeyFields.length > 0 ? primaryKeyFields : undefined,
	};

	return {
		id: metaTable.name ?? 'unknown-table',
		name: metaTable.name ?? 'unknown-table',
		columns,
		metadata,
	};
}

// Convenience hooks for accessing specific parts of the context
export function useTableData(): null {
	return null;
}
export function useTableOperations(): null {
	return null;
}
export function useTableMeta(): null {
	return null;
}

import { useMemo } from 'react';
import type { ReactNode } from 'react';

import type { FieldSelection, MetaField, MetaQuery, QueryOptions } from '@constructive-io/data';

import { useSheetsContext } from '../../context/sheets-context';
import { useSheetsMeta } from '../../hooks/use-sheets-meta';
import { useSheetsTable, type UseTableResult } from '../../hooks/use-sheets-table';
import { getAllRelationFields } from '../../utils/relation-utils';
import { createColumnSchemaFromMeta } from '../../cell-types/type-mapping';
import type { TableSchema, ColumnSchema } from '../../cell-types/types';

type MetaTable = NonNullable<NonNullable<NonNullable<MetaQuery['_meta']>['tables']>[number]>;
type RowRecord = Record<string, unknown>;
type TableOperations = Pick<UseTableResult<RowRecord>, 'update' | 'delete'>;
type CreatedRow = { id: string | number; [key: string]: unknown };

// Data loading context type
export interface DataLoadingContextValue {
	// Table data
	data: RowRecord[];
	totalCount: number;
	// Loading states
	isLoading: boolean;
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
		where?: QueryOptions['where'];
	};
}

/**
 * Apply field type overrides from SheetsConfig to field metadata.
 *
 * In the admin app, this was handled by `buildEnhancedFieldMetaMap` which
 * merged smartTags.pgAlias from schema-builder. In sheets, the consumer
 * passes `config.fieldTypeOverrides` as a Record<string, string> where
 * key is "tableName.fieldName" and value is the cell type override (pgAlias).
 */
function buildFieldMetaMap(
	fields: MetaField[],
	tableName: string,
	fieldTypeOverrides?: Record<string, string>,
): Map<string, MetaField> {
	const map = new Map<string, MetaField>();

	if (!fields || fields.length === 0) return map;

	for (const field of fields) {
		if (!field?.name) continue;

		// Check for field type override
		const overrideKey = `${tableName}.${field.name}`;
		const overridePgAlias = fieldTypeOverrides?.[overrideKey];

		if (overridePgAlias && field.type?.pgAlias !== overridePgAlias) {
			// Apply override
			map.set(field.name, {
				...field,
				type: {
					...field.type,
					pgAlias: overridePgAlias,
				},
			} as MetaField);
		} else {
			map.set(field.name, field);
		}
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
	const { config } = useSheetsContext();

	const tableMeta = useMemo<MetaTable | null>(() => {
		const candidate = meta?._meta?.tables?.find((t) => t?.name === tableName) as MetaTable | undefined;
		return candidate ?? null;
	}, [meta, tableName]);

	// Table schema for form integration
	const tableSchema = useMemo<TableSchema | null>(() => buildTableSchema(tableMeta), [tableMeta]);

	// Field metadata map for quick lookup, enhanced with field type overrides
	const fieldMetaMap = useMemo(() => {
		const candidate = meta?._meta?.tables?.find((t) => t?.name === tableName) as MetaTable | undefined;
		const fields = (candidate?.fields as MetaField[]) || [];
		return buildFieldMetaMap(fields, tableName, config.fieldTypeOverrides);
	}, [meta, tableName, config.fieldTypeOverrides]);

	const metaTables = meta?._meta?.tables;
	const allRelationFields = useMemo(
		() => {
			const rawTables = metaTables?.filter((t): t is NonNullable<typeof t> => t != null);
			return getAllRelationFields(tableMeta?.relations, rawTables);
		},
		[tableMeta, metaTables],
	);

	const relationSelection = useMemo<FieldSelection>(() => {
		return allRelationFields.length > 0 ? { includeRelations: allRelationFields } : 'all';
	}, [allRelationFields]);

	const tableData = useSheetsTable<RowRecord>(tableName, {
		...queryOptions,
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
		error: tableError,
		refetch,
	} = tableData;

	const create: DataLoadingContextValue['create'] = async (payload) => {
		const result = await createRow(payload);
		const createdRow = result?.createdRow;
		if (
			!createdRow ||
			(typeof createdRow.id !== 'string' && typeof createdRow.id !== 'number')
		) {
			return { createdRow: null };
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
			isError,
			error,
			update: updateRow,
			create,
			delete: deleteRow,
			refetch,
			meta,
			tableMeta,
			tableSchema,
			fieldMetaMap,
			allRelationFields,
		}),
		[
			data,
			totalCount,
			isLoading,
			isError,
			error,
			updateRow,
			create,
			deleteRow,
			refetch,
			meta,
			tableMeta,
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

function buildTableSchema(metaTable: MetaTable | null): TableSchema | null {
	if (!metaTable) return null;

	const columns: ColumnSchema[] = [];
	for (const field of metaTable.fields ?? []) {
		if (!field) continue;
		columns.push(createColumnSchemaFromMeta(field));
	}

	const primaryKeyFields = (metaTable.primaryKeyConstraints ?? [])
		.flatMap((constraint) => constraint?.fields ?? [])
		.map((field) => field?.name)
		.filter((name): name is string => Boolean(name));

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
export function useTableData() {
	return null;
}
export function useTableOperations() {
	return null;
}
export function useTableMeta() {
	return null;
}

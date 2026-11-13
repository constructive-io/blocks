import { parseMetaSearchWeights } from '../meta-query';
import type { MetaschemaField, MetaschemaTable } from '../meta-query.types';
import { getRowIdentityDefinition } from '../row-identity';
import { buildColumns } from './build-columns';
import { buildOperations } from './build-operations';
import { buildRelations } from './build-relations';
import { resolveDisplayFieldsFromCandidates } from './display-fields';
import type { SchemaTypeIndex } from './schema-introspection';
import { tableKeyOf } from './table-key';
import { createTypeLookup } from './type-lookup';
import type {
	ColumnModel,
	DisplayFieldOverrides,
	ModelIssue,
	TableModel,
	TableSearchModel,
	TableStorageModel,
} from './types';

export interface BuildTableModelInput {
	/** The `_meta` table to model. */
	table: MetaschemaTable;
	/** Every `_meta` table: related tables and junctions are read from here. */
	tables: readonly MetaschemaTable[];
	/** Introspected types loaded so far, with the root types. */
	schema: SchemaTypeIndex;
	/** Host override for the display rule. */
	displayOverrides?: DisplayFieldOverrides;
}

export interface TableModelBuild {
	/** The model, degraded where a type was missing or not loaded yet. */
	model: TableModel;
	/** Types the build needed but that are not loaded yet. Empty when the model is final. */
	missingTypes: readonly string[];
}

function storageModel(table: MetaschemaTable): TableStorageModel | null {
	const storage = table.storage;
	if (!storage || (!storage.isFilesTable && !storage.isBucketsTable)) return null;
	return {
		role: storage.isFilesTable ? 'files' : 'buckets',
		filesType: storage.filesType ?? null,
		bucketsType: storage.bucketsType ?? null,
		downloadUrlField: storage.downloadUrlField ?? null,
		upload: storage.upload
			? {
				mutation: storage.upload.mutation ?? null,
				inputType: storage.upload.inputType ?? null,
				payloadType: storage.upload.payloadType ?? null,
				bulkMutation: storage.upload.bulkMutation ?? null,
				requiresOwnerId: storage.upload.requiresOwnerId ?? null,
			}
			: null,
	};
}

/** The combined search filter, when `_meta` reports one and the filter input really has it. */
const UNIFIED_SEARCH_FIELD = 'unifiedSearch';

function searchModel(table: MetaschemaTable, filterFields: ReadonlySet<string>): TableSearchModel | null {
	const search = table.search;
	if (!search) return null;
	return {
		algorithms: [...search.algorithms],
		columns: search.columns.flatMap((column) => (column ? [{ name: column.name, algorithm: column.algorithm }] : [])),
		unifiedSearchField: search.hasUnifiedSearch && filterFields.has(UNIFIED_SEARCH_FIELD) ? UNIFIED_SEARCH_FIELD : null,
		weights: parseMetaSearchWeights(search.config),
	};
}

function tableKind(table: MetaschemaTable): TableModel['kind'] {
	return table.kind === 'table' || table.kind === 'view' ? table.kind : 'unknown';
}

function displayModel(
	table: MetaschemaTable,
	columns: readonly ColumnModel[],
	primaryKey: readonly string[],
	overrides: DisplayFieldOverrides | undefined,
) {
	return resolveDisplayFieldsFromCandidates(
		{ key: tableKeyOf(table), name: table.name },
		columns.map((column) => ({
			name: column.name,
			kind: column.value.kind,
			isArray: column.value.isArray,
			isLeaf: column.readable && column.value.selection === null,
			isPrimaryKey: column.isPrimaryKey,
			isForeignKey: column.isForeignKey,
		})),
		primaryKey,
		overrides,
	);
}

/**
 * Build one table model from `_meta` and the introspected types loaded so far.
 * Pure: it never fetches. When `missingTypes` is not empty the caller loads
 * them and builds again; a model built with types still missing is degraded,
 * never wrong.
 */
export function buildTableModel(input: BuildTableModelInput): TableModelBuild {
	const { table, tables, schema, displayOverrides } = input;
	const lookup = createTypeLookup(schema);
	const issues: ModelIssue[] = [];
	const key = tableKeyOf(table);
	const roots = schema.roots ?? { query: null, mutation: null };

	const identity = getRowIdentityDefinition(table);
	const primaryKey = identity.status === 'keyed' ? identity.fields.map((field) => field.fieldName) : [];
	if (primaryKey.length === 0) {
		issues.push({
			scope: 'table',
			target: null,
			code: 'NO_PRIMARY_KEY',
			message: 'This table has no primary key, so its records are read-only.',
		});
	}

	const rowType = lookup.type(table.name);
	if (schema.get(table.name) === null || (rowType && rowType.kind !== 'OBJECT')) {
		issues.push({
			scope: 'table',
			target: null,
			code: 'TABLE_NOT_IN_SCHEMA',
			message: 'This table is not available through this API.',
		});
	}

	const built = buildOperations({ table, roots, lookup, primaryKey, issues });
	const fields = (table.fields ?? []).filter((field): field is MetaschemaField => Boolean(field?.name));
	const columns = buildColumns({ ...built, fields, rowType, primaryKey, lookup, issues });
	const relations = buildRelations({
		table,
		tables,
		rowType,
		filterType: built.filterType,
		roots,
		lookup,
		issues,
		displayOverrides,
	});
	const filterFields = new Set((built.filterType?.inputFields ?? []).map((field) => field.name));

	const model: TableModel = {
		key,
		name: table.name,
		schemaName: table.schemaName ?? null,
		kind: tableKind(table),
		description: table.description ?? null,
		columns,
		primaryKey,
		relations,
		operations: built.operations,
		display: displayModel(table, columns, primaryKey, displayOverrides),
		storage: storageModel(table),
		search: searchModel(table, filterFields),
		isJunction: table.isJunction ?? null,
		issues,
	};
	return { model, missingTypes: [...lookup.missing] };
}

import type { MetaQuery, MetaschemaTable } from '../meta-query.types';
import { buildTableModel } from './build-table-model';
import { createSchemaTypeLoader, type GraphQLExecutor, type SchemaTypeIndex } from './schema-introspection';
import { TableModelError, findMetaTable, metaTablesOf } from './table-key';
import type { DisplayFieldOverrides, TableModel } from './types';

/** Upper bound on introspection rounds per table. Each round is one batched request. */
const MAX_ROUNDS = 6;

export interface ResolveTableModelOptions {
	/** Host override for the display rule. */
	displayOverrides?: DisplayFieldOverrides;
}

export interface TableModelResolver {
	/** The `_meta` tables this resolver models. */
	readonly tables: readonly MetaschemaTable[];
	/** Introspected types loaded so far. */
	readonly schema: SchemaTypeIndex;
	/**
	 * Model one table, by `TableModel.key` or by bare name. Types are fetched
	 * lazily and shared across tables. Throws `TableModelError` for an unknown or
	 * ambiguous name, or when the schema cannot be introspected.
	 */
	resolve(execute: GraphQLExecutor, ref: string, options?: ResolveTableModelOptions): Promise<TableModel>;
	/** Start loading the root types early, for example alongside the `_meta` request. */
	prefetch(execute: GraphQLExecutor): Promise<void>;
}

/** Type names `_meta` already names for a table: fetched with the row type to save a round. */
function initialTypeNames(table: MetaschemaTable): string[] {
	const inflection = table.inflection;
	const relations = table.relations;
	return [
		table.name,
		inflection?.connection,
		inflection?.filterType,
		inflection?.orderByType,
		inflection?.patchType,
		inflection?.createInputType,
		inflection?.createPayloadType,
		inflection?.updatePayloadType,
		inflection?.deletePayloadType,
		...(relations?.belongsTo ?? []).flatMap((relation) => [relation?.references?.name, relation?.type]),
		...(relations?.hasOne ?? []).flatMap((relation) => [relation?.referencedBy?.name, relation?.type]),
		...(relations?.hasMany ?? []).flatMap((relation) => [relation?.referencedBy?.name, relation?.type]),
		...(relations?.manyToMany ?? []).flatMap((relation) => [
			relation?.rightTable?.name,
			relation?.junctionTable?.name,
			relation?.type,
		]),
	].filter((name): name is string => typeof name === 'string' && name.length > 0);
}

/**
 * One resolver per `_meta` result. Its type cache lives as long as that
 * result, so a schema change (a new `_meta`) starts from fresh types.
 */
export function createTableModelResolver(meta: MetaQuery | readonly MetaschemaTable[]): TableModelResolver {
	const tables = Array.isArray(meta) ? (meta as readonly MetaschemaTable[]) : metaTablesOf(meta as MetaQuery);
	const loader = createSchemaTypeLoader();

	async function loadRoots(execute: GraphQLExecutor) {
		try {
			return await loader.loadRoots(execute);
		} catch (error) {
			const detail = error instanceof Error && error.message ? ` ${error.message}` : '';
			throw new TableModelError('SCHEMA_UNAVAILABLE', `The API schema could not be read.${detail}`);
		}
	}

	return {
		tables,
		schema: loader.index,
		async prefetch(execute) {
			await loadRoots(execute);
		},
		async resolve(execute, ref, options = {}) {
			const table = findMetaTable(tables, ref);
			const roots = await Promise.all([
				loadRoots(execute),
				loader.loadTypes(execute, initialTypeNames(table)),
			]).then(([loaded]) => loaded);
			if (!roots.query) {
				throw new TableModelError('SCHEMA_UNAVAILABLE', 'The API schema has no query type.', {
					tableKey: `${table.schemaName ?? ''}.${table.name}`,
				});
			}

			const build = () =>
				buildTableModel({ table, tables, schema: loader.index, displayOverrides: options.displayOverrides });
			let result = build();
			let previous = '';
			for (let round = 0; round < MAX_ROUNDS && result.missingTypes.length > 0; round += 1) {
				const missing = [...result.missingTypes].sort().join(',');
				if (missing === previous) break;
				previous = missing;
				await loader.loadTypes(execute, result.missingTypes);
				result = build();
			}
			return result.model;
		},
	};
}

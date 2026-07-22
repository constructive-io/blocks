import {
	META_CONTRACT_INTROSPECTION_DOCUMENT,
	META_DOCUMENT,
	assertMetaContract,
	assertMetaQuery,
	buildPostGraphileCreate,
	buildPostGraphileDelete,
	buildPostGraphileUpdate,
	buildSelect,
	prepareCreateInput,
	prepareUpdateInput,
	toCamelCasePlural,
	toCamelCaseSingular,
	toCreateMutationName,
	toPatchFieldName,
	toUpdateMutationName,
} from '@constructive-io/data';
import type {
	MetaContractIntrospectionQuery,
	MetaQuery,
	MutationOptions,
	QueryOptions,
} from '@constructive-io/data';

import type { SheetsExecuteFn } from '../context/sheets-execute';
import { transformRelationData, transformToPostGraphileVariables } from '../hooks/use-sheets-table';
import type {
	AdapterListQuery,
	AdapterListResult,
	AdapterTableContext,
	SheetsBackendAdapter,
} from './sheets-adapter';

const compatibilityChecks = new WeakMap<SheetsExecuteFn, Promise<void>>();

async function ensureCurrentMetaContract(execute: SheetsExecuteFn): Promise<void> {
	const cached = compatibilityChecks.get(execute);
	if (cached) return cached;

	const check = execute<MetaContractIntrospectionQuery>(META_CONTRACT_INTROSPECTION_DOCUMENT).then(
		(result) => {
			assertMetaContract(result);
		},
	);
	compatibilityChecks.set(execute, check);

	try {
		await check;
	} catch (error) {
		// Contract mismatches remain deterministic, while transport failures can
		// recover on a later call instead of poisoning this executor forever.
		if (compatibilityChecks.get(execute) === check) compatibilityChecks.delete(execute);
		throw error;
	}
}

/**
 * Create the default PostGraphile-backed adapter. The metadata preflight makes
 * an outdated endpoint distinguishable from an ordinary transport failure,
 * while the WeakMap deduplicates that introspection for each executor/session.
 */
export function createPostGraphileAdapter(): SheetsBackendAdapter {
	return {
		async fetchMeta(execute: SheetsExecuteFn): Promise<MetaQuery> {
			await ensureCurrentMetaContract(execute);
			const meta = await execute<MetaQuery>(META_DOCUMENT);
			assertMetaQuery(meta);
			return meta;
		},

		async listRows<T = Record<string, unknown>>(
			ctx: AdapterTableContext,
			query: AdapterListQuery,
			execute: SheetsExecuteFn,
		): Promise<AdapterListResult<T>> {
			const { table, allTables, tableName } = ctx;
			const { relationFieldMap, ...queryOptions } = query;
			const variables = transformToPostGraphileVariables(table, queryOptions as QueryOptions);
			const doc = buildSelect(table, allTables, {
				...(queryOptions as QueryOptions),
				relationFieldMap,
			});
			const result = (await execute(doc, variables)) as Record<string, unknown>;
			const queryTableName = toCamelCasePlural(tableName, table);
			const connection = result[queryTableName];

			if (connection && typeof connection === 'object' && 'nodes' in connection) {
				const nodes = (connection as { nodes: unknown[] }).nodes || [];
				return {
					rows: transformRelationData<T & Record<string, unknown>>(nodes, table),
					totalCount: ((connection as { totalCount?: unknown }).totalCount as number) ?? 0,
					pageInfo: (connection as { pageInfo?: AdapterListResult<T>['pageInfo'] }).pageInfo,
				};
			}

			const directData = (connection as unknown[]) || [];
			return {
				rows: transformRelationData<T & Record<string, unknown>>(directData, table),
				totalCount: directData.length,
			};
		},

		async createRow<T = Record<string, unknown>>(
			ctx: AdapterTableContext,
			data: Record<string, unknown>,
			execute: SheetsExecuteFn,
			options: MutationOptions = {},
		): Promise<T | null> {
			const { table, allTables, tableName } = ctx;
			const doc = buildPostGraphileCreate(table, allTables, {
				...options,
				fieldSelection: options.fieldSelection || 'display',
			});
			const singularName = toCamelCaseSingular(tableName, table);
			const sanitizedData = prepareCreateInput(data);
			const variables = {
				input: {
					[singularName]: sanitizedData,
				},
			};
			const result = (await execute(doc, variables)) as Record<string, unknown>;
			const mutationName = toCreateMutationName(tableName, table);
			const createdRow = (result[mutationName] as Record<string, unknown>)?.[singularName] ?? null;
			return createdRow as T | null;
		},

		async updateRow<T = Record<string, unknown>>(
			ctx: AdapterTableContext,
			id: string | number | Record<string, unknown>,
			patch: Record<string, unknown>,
			execute: SheetsExecuteFn,
			options: MutationOptions = {},
		): Promise<T | null> {
			const { table, allTables, tableName } = ctx;
			const doc = buildPostGraphileUpdate(table, allTables, {
				...options,
				fieldSelection: options.fieldSelection || 'display',
			});
			const patchFieldName = toPatchFieldName(tableName, table);
			const sanitizedPatch = prepareUpdateInput(patch);
			if (Object.keys(sanitizedPatch).length === 0) return null;

			const variables = {
				input: {
					...(typeof id === 'object' ? id : { id }),
					[patchFieldName]: sanitizedPatch,
				},
			};
			const result = (await execute(doc, variables)) as Record<string, unknown>;
			const mutationName = toUpdateMutationName(tableName, table);
			const singularName = toCamelCaseSingular(tableName, table);
			const updatedRow = (result[mutationName] as Record<string, unknown>)?.[singularName] ?? null;
			return updatedRow as T | null;
		},

		async deleteRow(
			ctx: AdapterTableContext,
			id: string | number | Record<string, unknown>,
			execute: SheetsExecuteFn,
			options: MutationOptions = {},
		): Promise<void> {
			const { table, allTables } = ctx;
			const doc = buildPostGraphileDelete(table, allTables, options);
			const variables = {
				input: typeof id === 'object' ? id : { id },
			};
			await execute(doc, variables);
		},
	};
}

import {
	TableModelError,
	META_CAPABILITY_INTROSPECTION_DOCUMENT,
	MetaContractError,
	assessMetaCapabilities,
	assertMetaQuery,
	buildCreateDocument,
	buildDeleteDocument,
	buildListDocument,
	buildMetaDocument,
	buildUpdateDocument,
	createTableModelResolver,
} from '@constructive-io/data';
import type {
	ListResult,
	MetaCapabilities,
	MetaCapabilityIntrospectionQuery,
	MetaQuery,
	MutationOptions,
	TableModel,
	TableModelResolver,
} from '@constructive-io/data';

import { partialResultOf, type SheetsExecuteFn } from '../context/sheets-execute';
import { sheetsIdentifierToRowKey, type SheetsRowIdentifier } from '../row-identity';
import type {
	AdapterListQuery,
	AdapterListResult,
	AdapterTableContext,
	AdapterTableModelOptions,
	SheetsBackendAdapter,
} from './sheets-adapter';

/** Capability preflight, once per executor. */
const capabilityChecks = new WeakMap<SheetsExecuteFn, Promise<MetaCapabilities>>();
/** One model resolver per `_meta` result, so each schema version keeps its own type cache. */
const resolvers = new WeakMap<MetaQuery, TableModelResolver>();

async function ensureMetaCapabilities(execute: SheetsExecuteFn): Promise<MetaCapabilities> {
	const cached = capabilityChecks.get(execute);
	if (cached) return cached;

	const check = execute<MetaCapabilityIntrospectionQuery>(META_CAPABILITY_INTROSPECTION_DOCUMENT).then((result) => {
		const { compatibility, capabilities } = assessMetaCapabilities(result);
		if (compatibility.status !== 'compatible') throw new MetaContractError(compatibility);
		return capabilities;
	});
	capabilityChecks.set(execute, check);

	try {
		return await check;
	} catch (error) {
		// Contract mismatches remain deterministic, while transport failures can
		// recover on a later call instead of poisoning this executor forever.
		if (capabilityChecks.get(execute) === check) capabilityChecks.delete(execute);
		throw error;
	}
}

function resolverFor(meta: MetaQuery): TableModelResolver {
	let resolver = resolvers.get(meta);
	if (!resolver) {
		resolver = createTableModelResolver(meta);
		resolvers.set(meta, resolver);
	}
	return resolver;
}


/**
 * Create the default PostGraphile-backed adapter. The metadata preflight makes
 * an outdated endpoint distinguishable from an ordinary transport failure and
 * tells which optional `_meta` fields the server has. Table models resolve
 * lazily, one table at a time, from targeted introspection.
 */
/**
 * An update or delete the server answered without changing a row: no row matched, because a
 * row rule hides it from this user or it is gone. The server reports that without an error,
 * so without this check a refused write would read as saved.
 */
function writeNotApplied(model: TableModel, action: 'update' | 'delete'): TableModelError {
	const message = action === 'update'
		? 'This record was not changed. You may not be allowed to change it, or it no longer exists.'
		: 'This record was not deleted. You may not be allowed to delete it, or it no longer exists.';
	return new TableModelError('WRITE_NOT_APPLIED', message, { tableKey: model.key });
}

export function createPostGraphileAdapter(): SheetsBackendAdapter {
	return {
		async fetchMeta(execute: SheetsExecuteFn): Promise<MetaQuery> {
			const capabilities = await ensureMetaCapabilities(execute);
			const meta = await execute<MetaQuery>(buildMetaDocument(capabilities));
			assertMetaQuery(meta);
			return meta;
		},

		async fetchTableModel(
			execute: SheetsExecuteFn,
			meta: MetaQuery,
			tableRef: string,
			options: AdapterTableModelOptions = {},
		): Promise<TableModel> {
			return resolverFor(meta).resolve(execute, tableRef, { displayOverrides: options.displayOverrides });
		},

		async listRows<T = Record<string, unknown>>(
			ctx: AdapterTableContext,
			query: AdapterListQuery,
			execute: SheetsExecuteFn,
		): Promise<AdapterListResult<T>> {
			const { model } = ctx;
			const document = buildListDocument(model, {
				first: query.limit,
				offset: query.offset ? query.offset : undefined,
				after: query.after,
				where: query.where,
				orderBy: query.orderBy,
				relations: query.relations,
				relationPageSize: query.relationPageSize,
				columns: query.columns,
				totalCount: query.includeTotalCount !== false,
			});
			let result: ListResult;
			try {
				result = document.read(await execute(document.document, document.variables, { signal: query.signal }));
			} catch (error) {
				// Rows with cells the API could not serve (a float NaN) still load; each such
				// cell carries its error. Any other failure fails the read as before.
				const partial = partialResultOf(error);
				if (!partial) throw error;
				try {
					result = document.read(partial.data, partial.errors);
				} catch {
					throw error;
				}
			}
			return {
				rows: result.rows as T[],
				totalCount: result.totalCount ?? result.rows.length,
				pageInfo: result.pageInfo ?? undefined,
			};
		},

		async createRow<T = Record<string, unknown>>(
			ctx: AdapterTableContext,
			data: Record<string, unknown>,
			execute: SheetsExecuteFn,
			options: MutationOptions = {},
		): Promise<T | null> {
			// The caller decides which fields a new row gets: an empty string or a null is sent
			// as given, and a field that is left out is simply absent (the codec skips undefined).
			const { model } = ctx;
			const document = buildCreateDocument(model, data, { returning: options.returning });
			return document.read(await execute(document.document, document.variables)) as T | null;
		},

		async updateRow<T = Record<string, unknown>>(
			ctx: AdapterTableContext,
			id: SheetsRowIdentifier,
			patch: Record<string, unknown>,
			execute: SheetsExecuteFn,
			options: MutationOptions = {},
		): Promise<T | null> {
			// Clearing a field to null or '' is a real change and reaches the server.
			if (!Object.values(patch).some((value) => value !== undefined)) return null;
			const { model } = ctx;
			const document = buildUpdateDocument(model, sheetsIdentifierToRowKey(model, id), patch, {
				returning: options.returning,
			});
			const data = await execute(document.document, document.variables);
			if (document.applied?.(data) === false) throw writeNotApplied(model, 'update');
			return document.read(data) as T | null;
		},

		async deleteRow(ctx: AdapterTableContext, id: SheetsRowIdentifier, execute: SheetsExecuteFn): Promise<void> {
			const { model } = ctx;
			const document = buildDeleteDocument(model, sheetsIdentifierToRowKey(model, id));
			const data = await execute(document.document, document.variables);
			if (document.applied?.(data) === false) throw writeNotApplied(model, 'delete');
		},
	};
}

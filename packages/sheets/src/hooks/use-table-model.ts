/**
 * The table model of one table: the single source of keys, column kinds and
 * options, write flags, relations, labels, sort and filter names for the grid.
 *
 * Accepts the host's bare table name or a `TableModel.key`. A name shared by
 * tables in several schemas is an error listing the keys. Each table resolves
 * lazily and fails alone: one table's error never blocks another table.
 *
 * Inside a read-only grid (`<Sheets readOnly>`), every model comes back without
 * create, update and delete, each refusal carrying the host's reason.
 */
import { useCallback, useMemo } from 'react';
import { useQueries, useQuery, type UseQueryOptions } from '@tanstack/react-query';

import {
	TableModelError,
	findMetaTable,
	metaTablesOf,
	tableKeyOf,
	type MetaQuery,
	type MetaschemaTable,
	type TableKey,
	type TableModel,
} from '@constructive-io/data';

import type { SheetsBackendAdapter } from '../adapter/sheets-adapter';
import { useSheetsAdapter } from '../adapter/use-sheets-adapter';
import type { SheetsExecuteFn } from '../context/sheets-execute';
import { useSheetsContext, type SheetsConfig, type SheetsScopeKey } from '../context/sheets-context';
import { readOnlyTableModel, useSheetsReadOnlyReason } from '../context/sheets-read-only';
import { sheetsQueryKeys } from './query-keys';
import { useSheetsMeta } from './use-sheets-meta';

export interface UseTableModelOptions {
	/** Resolve the model. Default true. */
	enabled?: boolean;
}

export interface UseTableModelResult {
	/** The model, or null while it loads or when it failed. */
	model: TableModel | null;
	/** `TableModel.key` of the requested table, or null until `_meta` has loaded or when the name is unknown. */
	tableKey: TableKey | null;
	/** The `_meta` entry of the table, or null. */
	metaTable: MetaschemaTable | null;
	/** True until the model is ready (or failed). */
	isLoading: boolean;
	/** Why the model is unavailable: `_meta` failed, the name is unknown or ambiguous, or this table failed. */
	error: Error | null;
	/** Load again what failed: `_meta` when it failed (the model follows), otherwise this table's model. */
	refetch: () => Promise<void>;
}

const metaVersions = new WeakMap<MetaQuery, number>();
let nextMetaVersion = 1;

/** A number per `_meta` result. An unchanged refetch keeps its object, so it keeps its version. */
function metaVersionOf(meta: MetaQuery): number {
	let version = metaVersions.get(meta);
	if (version === undefined) {
		version = nextMetaVersion;
		nextMetaVersion += 1;
		metaVersions.set(meta, version);
	}
	return version;
}

/** A model error is deterministic for this `_meta`; only a failed schema read is worth a retry. */
function isDeterministicModelError(error: Error): boolean {
	const code = (error as { code?: unknown }).code;
	return error instanceof TableModelError && code !== 'SCHEMA_UNAVAILABLE';
}

function locate(meta: MetaQuery | undefined, tableRef: string | null | undefined): { metaTable: ReturnType<typeof findMetaTable> | null; error: Error | null } {
	if (!meta || !tableRef) return { metaTable: null, error: null };
	try {
		return { metaTable: findMetaTable(metaTablesOf(meta), tableRef), error: null };
	} catch (error) {
		return { metaTable: null, error: error as Error };
	}
}

interface ModelQueryContext {
	scopeKey: SheetsScopeKey;
	meta: MetaQuery | undefined;
	adapter: SheetsBackendAdapter;
	execute: SheetsExecuteFn;
	displayFields: SheetsConfig['displayFields'];
	displayKey: string | null;
}

/** One table model query. `useTableModel` and `useTableModels` share it, so nothing is fetched twice. */
function tableModelQuery(
	context: ModelQueryContext,
	tableKey: TableKey | null,
	enabled: boolean,
): UseQueryOptions<TableModel, Error> {
	const { scopeKey, meta, adapter, execute, displayFields, displayKey } = context;
	return {
		queryKey: sheetsQueryKeys.tableModel(scopeKey, tableKey ?? '', meta ? metaVersionOf(meta) : 0, displayKey),
		queryFn: () => adapter.fetchTableModel(execute, meta!, tableKey!, { displayOverrides: displayFields }),
		enabled: enabled && Boolean(meta && tableKey),
		staleTime: Number.POSITIVE_INFINITY,
		gcTime: 30 * 60 * 1000,
		retry: (failureCount, error) => failureCount < 1 && !isDeterministicModelError(error),
	};
}

function useModelQueryContext(enabled: boolean) {
	const { execute, scopeKey, config } = useSheetsContext();
	const adapter = useSheetsAdapter();
	const metaQuery = useSheetsMeta({ enabled });
	const readOnlyReason = useSheetsReadOnlyReason();
	const displayFields = config.displayFields;
	const displayKey = useMemo(() => (displayFields ? JSON.stringify(displayFields) : null), [displayFields]);
	const context: ModelQueryContext = { scopeKey, meta: metaQuery.data, adapter, execute, displayFields, displayKey };
	return { context, metaQuery, readOnlyReason };
}

/** The model as this grid may use it: read-only with the host's reason inside a read-only grid. */
function asSeen(model: TableModel, readOnlyReason: string | null): TableModel {
	return readOnlyReason ? readOnlyTableModel(model, readOnlyReason) : model;
}

export function useTableModel(
	tableRef: string | null | undefined,
	options: UseTableModelOptions = {},
): UseTableModelResult {
	const { enabled = true } = options;
	const active = enabled && Boolean(tableRef);
	const { context, metaQuery, readOnlyReason } = useModelQueryContext(active);
	const meta = metaQuery.data;

	const { metaTable, error: locateError } = useMemo(() => locate(meta, tableRef), [meta, tableRef]);
	const tableKey = metaTable ? tableKeyOf(metaTable) : null;
	const modelEnabled = active && Boolean(meta && tableKey);

	const query = useQuery<TableModel, Error>(tableModelQuery(context, tableKey, active));
	const { refetch: refetchMeta } = metaQuery;
	const { refetch: refetchModel } = query;
	const metaFailed = Boolean(metaQuery.error || locateError);
	const refetch = useCallback(async () => {
		if (metaFailed) await refetchMeta();
		else if (modelEnabled) await refetchModel();
	}, [metaFailed, modelEnabled, refetchMeta, refetchModel]);

	return {
		model: modelEnabled && query.data ? asSeen(query.data, readOnlyReason) : null,
		tableKey,
		metaTable,
		isLoading: active && (metaQuery.isPending || (modelEnabled && query.isPending)) && !metaQuery.error && !locateError,
		error: metaQuery.error ?? locateError ?? (modelEnabled ? query.error : null) ?? null,
		refetch,
	};
}

export interface UseTableModelsResult {
	/** The models that have loaded, by `TableModel.key`. A table that failed or is unknown is absent. */
	models: ReadonlyMap<TableKey, TableModel>;
	/** True while `_meta` or any of the models still loads. */
	isLoading: boolean;
}

/**
 * The models of a variable set of tables (names or keys), with the same cache
 * entries as `useTableModel`. Unknown or ambiguous names are skipped; use
 * `useTableModel` for one table's error.
 */
export function useTableModels(refs: readonly string[], options: UseTableModelOptions = {}): UseTableModelsResult {
	const { enabled = true } = options;
	const active = enabled && refs.length > 0;
	const { context, metaQuery, readOnlyReason } = useModelQueryContext(active);
	const meta = metaQuery.data;
	const refsKey = refs.join('\u0000');

	const tableKeys = useMemo(() => {
		const keys = new Set<TableKey>();
		for (const ref of refsKey ? refsKey.split('\u0000') : []) {
			const { metaTable } = locate(meta, ref);
			if (metaTable) keys.add(tableKeyOf(metaTable));
		}
		return [...keys];
	}, [meta, refsKey]);

	const results = useQueries({ queries: tableKeys.map((tableKey) => tableModelQuery(context, tableKey, active)) });
	// The map keeps its identity until a model changes, so effects that depend on it do not re-run each render.
	const signature = results.map((result) => result.dataUpdatedAt).join(',');
	const models = useMemo(
		() =>
			new Map(
				results.flatMap((result, position) =>
					result.data ? [[tableKeys[position]!, asSeen(result.data, readOnlyReason)] as const] : [],
				),
			),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[signature, tableKeys, readOnlyReason],
	);
	const isLoading = active && (metaQuery.isPending || results.some((result) => result.isPending)) && !metaQuery.error;
	return { models, isLoading };
}

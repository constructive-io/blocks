// Load one record for the panel and write its fields.
//
// The record is read through the adapter's list read filtered by its primary key
// (with every readable relation), so a cell the API could not serve still loads and
// carries its error, as in the grid. It is cached under the table's query key, so
// every create, update or delete of that table (from the grid, the panel or a
// relation editor) refetches it.
//
// A field write follows the grid's write path: the value is parsed by the column's
// rules first (a value that does not fit is refused with its reason and nothing is
// sent), shown at once (optimistic), sent through the table's update mutation (the
// write codec encodes it), and on failure put back, with the server's message kept
// on that field until the next edit. Nothing is dropped without a message.

import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { TableModelError, type ColumnModel, type RowKey, type TableModel } from '@constructive-io/data';

import { useSheetsAdapter } from '../adapter/use-sheets-adapter';

import { parseColumnInput } from '../cell-types/column-value';
import { useSheetsContext } from '../context/sheets-context';
import { useOptionalFeedback } from '../grid/feedback/feedback-context';
import { writeErrorMessages } from '../grid/feedback/write-errors';
import { sheetsTableQueryKeys, useSheetsTable, type UseTableResult } from '../hooks/use-sheets-table';
import { useTableModel } from '../hooks/use-table-model';
import { equalityFilter } from '../relations/relation-keys';
import { identifierOfKey } from './record-target';

type RowRecord = Record<string, unknown>;

export interface RecordFieldWriteState {
	/** Values sent and not answered yet, by field. */
	pending: Readonly<Record<string, unknown>>;
	/** The last problem per field: a value that did not fit, or what the server said. */
	errors: Readonly<Record<string, string>>;
}

export interface UseRecordResult extends RecordFieldWriteState {
	model: TableModel | null;
	/** The record with pending values applied, or null while it loads or when it does not exist. */
	record: RowRecord | null;
	isLoading: boolean;
	/** Why the record could not be loaded, or null. */
	error: Error | null;
	/** True when the read succeeded but no record has this key (deleted elsewhere). */
	isMissing: boolean;
	/** The table's operations (create, update, delete) for this record's table. */
	table: UseTableResult<RowRecord>;
	/**
	 * Parse and save one field. `fromText` is true for typed text (JSON and lists are read
	 * from it). Resolves true when the value was saved.
	 */
	saveField: (column: ColumnModel, value: unknown, options?: { fromText?: boolean }) => Promise<boolean>;
	/** Note a problem on a field without writing (for example an editor that refused the value). */
	setFieldError: (field: string, message: string | null) => void;
	/** Refetch the record. */
	refetch: () => void;
}

function serializeKey(key: RowKey | null): string {
	if (!key) return '';
	return JSON.stringify(Object.keys(key).sort().map((field) => [field, key[field]]));
}

export function useRecord(tableName: string, key: RowKey | null, options: { enabled?: boolean } = {}): UseRecordResult {
	const enabled = options.enabled !== false && key !== null;
	const { scopeKey, execute } = useSheetsContext();
	const adapter = useSheetsAdapter();
	const { model, tableKey, isLoading: isModelLoading, error: modelError } = useTableModel(tableName);
	const table = useSheetsTable<RowRecord>(tableName, { enabled: false, select: 'full' });
	const cacheRef = tableKey ?? tableName;
	const keyText = serializeKey(key);

	const query = useQuery<RowRecord | null>({
		queryKey: [...sheetsTableQueryKeys.table(scopeKey, cacheRef), 'record', keyText],
		queryFn: async ({ signal }) => {
			const where = model && key ? equalityFilter(model, key) : null;
			if (!model || !where) {
				throw new TableModelError('FILTER_UNAVAILABLE', 'This record cannot be looked up on its own.', { tableKey: model?.key });
			}
			const result = await adapter.listRows<RowRecord>(
				{ model, tableName },
				{ where, limit: model.operations.list?.first ? 1 : undefined, relations: 'all', includeTotalCount: false, signal },
				execute,
			);
			return result.rows[0] ?? null;
		},
		enabled: enabled && model !== null,
	});

	const [pending, setPending] = useState<Record<string, unknown>>({});
	const [errors, setErrors] = useState<Record<string, string>>({});

	const setFieldError = useCallback((field: string, message: string | null) => {
		setErrors((current) => {
			if (message === null) {
				if (!(field in current)) return current;
				const { [field]: _removed, ...rest } = current;
				return rest;
			}
			return { ...current, [field]: message };
		});
	}, []);

	const update = table.update;
	const refetchQuery = query.refetch;
	// Inside a grid, a field save reports to the grid's save status with every other write.
	const feedback = useOptionalFeedback();
	const trackWrite = feedback?.trackWrite;
	const saveField = useCallback(
		async (column: ColumnModel, value: unknown, saveOptions: { fromText?: boolean } = {}): Promise<boolean> => {
			if (!key) return false;
			const parsed = parseColumnInput(column, value, { fromText: saveOptions.fromText ?? false });
			if (parsed.ok === false) {
				setFieldError(column.name, parsed.reason);
				return false;
			}
			setFieldError(column.name, null);
			setPending((current) => ({ ...current, [column.name]: parsed.value }));
			try {
				const write = () => update(identifierOfKey(key), { [column.name]: parsed.value });
				await (trackWrite ? trackWrite('update', 1, write, { saved: 'Saved', failed: 'Not saved' }) : write());
				await refetchQuery();
				return true;
			} catch (error) {
				setFieldError(column.name, writeErrorMessages(error, 'update').join('\n'));
				return false;
			} finally {
				setPending((current) => {
					const { [column.name]: _sent, ...rest } = current;
					return rest;
				});
			}
		},
		[key, update, refetchQuery, setFieldError, trackWrite],
	);

	const record = useMemo<RowRecord | null>(() => {
		const base = query.data ?? null;
		if (!base) return null;
		return Object.keys(pending).length > 0 ? { ...base, ...pending } : base;
	}, [query.data, pending]);

	const refetch = useCallback(() => {
		void refetchQuery();
	}, [refetchQuery]);

	return {
		model,
		record,
		isLoading: enabled && (isModelLoading || query.isLoading),
		error: (modelError as Error | null) ?? (query.error as Error | null) ?? null,
		isMissing: enabled && query.isSuccess && query.data === null,
		table,
		pending,
		errors,
		saveField,
		setFieldError,
		refetch,
	};
}

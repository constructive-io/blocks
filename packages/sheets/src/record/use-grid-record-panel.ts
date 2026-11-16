// The record panel's link to the grid: which row's record to open, previous/next
// through the grid's rows (saved rows only; drafts and unloaded rows are skipped),
// and the open/new entry points the commands and the host handle call.

import { useCallback, useMemo } from 'react';

import type { TableModel } from '@constructive-io/data';

import { getDraftMeta, type SheetsRow } from '../grid/row-model';
import type { SheetsOpenRecordRequest } from '../relations/relation-navigation';
import type { SheetsRowIdentifier } from '../row-identity';
import { keyOfIdentifier, recordKeyOf, recordTitle, sameRecord, type RecordPanelRecordEntry } from './record-target';
import type { RecordNavigation } from './record-view';
import { useRecordPanelState, type RecordPanelController } from './use-record-panel-state';

export interface UseGridRecordPanelArgs {
	tableModel: TableModel | null;
	/** The grid's rows (server rows, then drafts); an unloaded row reads as null. */
	rows: readonly (SheetsRow | null | undefined)[];
	/** Number of server rows at the start of `rows`. */
	serverRowCount: number;
	recordId?: SheetsRowIdentifier | null;
	onRecordOpenChange?: (recordId: SheetsRowIdentifier | null) => void;
}

export interface GridRecordPanel {
	controller: RecordPanelController;
	/** Open the record of a grid row. False for a draft, an unloaded row or a row without a key. */
	openRecordAt: (rowIndex: number) => boolean;
	/** Why a row's record cannot be opened, or null when it can. */
	openRecordReason: (rowIndex: number) => string | null;
	/** Open a record of the grid's table by its identifier. False when the identifier does not name a record. */
	openRecordById: (recordId: SheetsRowIdentifier) => boolean;
	/** Open the new-record form. False when the table does not allow new records. */
	openNewRecord: () => boolean;
	/** Open a linked record (from a relation chip or editor in the grid) above the current one. */
	openLinkedRecord: (request: SheetsOpenRecordRequest) => void;
	/** Previous/next for a record of the grid's table. */
	navigationFor: (entry: RecordPanelRecordEntry) => RecordNavigation;
}

export function useGridRecordPanel({ tableModel, rows, serverRowCount, recordId, onRecordOpenChange }: UseGridRecordPanelArgs): GridRecordPanel {
	const controller = useRecordPanelState({ table: tableModel, recordId, onRecordOpenChange });
	const { openRecord, openNew, pushRecord } = controller;

	const entryAt = useCallback(
		(rowIndex: number): RecordPanelRecordEntry | null => {
			if (!tableModel || rowIndex < 0 || rowIndex >= serverRowCount) return null;
			const row = rows[rowIndex];
			if (!row || getDraftMeta(row)) return null;
			const key = recordKeyOf(tableModel, row);
			if (!key) return null;
			return { kind: 'record', tableKey: tableModel.key, tableName: tableModel.name, key, label: recordTitle(tableModel, row), rowIndex };
		},
		[tableModel, rows, serverRowCount],
	);

	const openRecordReason = useCallback(
		(rowIndex: number): string | null => {
			if (!tableModel) return 'The table is still loading.';
			if (tableModel.primaryKey.length === 0) return 'This table has no primary key, so its records cannot be opened one by one.';
			const row = rows[rowIndex];
			if (row && getDraftMeta(row)) return 'Save this row first, then open it as a record.';
			if (!row) return 'This row is still loading.';
			return entryAt(rowIndex) ? null : 'This row has no key value, so it cannot be opened as a record.';
		},
		[tableModel, rows, entryAt],
	);

	const openRecordAt = useCallback(
		(rowIndex: number) => {
			const entry = entryAt(rowIndex);
			if (!entry) return false;
			openRecord(entry);
			return true;
		},
		[entryAt, openRecord],
	);

	const openRecordById = useCallback(
		(id: SheetsRowIdentifier) => {
			const key = tableModel ? keyOfIdentifier(tableModel, id) : null;
			if (!tableModel || !key) return false;
			openRecord({ kind: 'record', tableKey: tableModel.key, tableName: tableModel.name, key, label: '' });
			return true;
		},
		[tableModel, openRecord],
	);

	const openNewRecord = useCallback(() => {
		if (!tableModel?.operations.create) return false;
		openNew();
		return true;
	}, [tableModel, openNew]);

	const openLinkedRecord = useCallback(
		(request: SheetsOpenRecordRequest) =>
			pushRecord({ kind: 'record', tableKey: request.tableKey, tableName: request.tableName, key: request.key, label: request.label }),
		[pushRecord],
	);

	const navigationFor = useCallback(
		(entry: RecordPanelRecordEntry): RecordNavigation => {
			let index = -1;
			if (entry.rowIndex !== undefined && sameRecord(entryAt(entry.rowIndex), entry)) index = entry.rowIndex;
			else for (let i = 0; i < serverRowCount && index < 0; i++) if (sameRecord(entryAt(i), entry)) index = i;
			if (index < 0) return { previous: null, next: null };
			const neighbour = (step: -1 | 1): RecordPanelRecordEntry | null => {
				for (let i = index + step; i >= 0 && i < serverRowCount; i += step) {
					const candidate = entryAt(i);
					if (candidate) return candidate;
				}
				return null;
			};
			const previous = neighbour(-1);
			const next = neighbour(1);
			return {
				previous: previous ? () => openRecord(previous) : null,
				next: next ? () => openRecord(next) : null,
			};
		},
		[entryAt, serverRowCount, openRecord],
	);

	return useMemo(
		() => ({ controller, openRecordAt, openRecordReason, openRecordById, openNewRecord, openLinkedRecord, navigationFor }),
		[controller, openRecordAt, openRecordReason, openRecordById, openNewRecord, openLinkedRecord, navigationFor],
	);
}

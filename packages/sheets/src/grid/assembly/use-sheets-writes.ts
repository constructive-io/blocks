// Every write the grid makes to saved rows and drafts: the batched cell commit (paste,
// fill, bulk and the single cell, undoable), patches from self-committing editors, deletes,
// optimistic infinite-cache patches, and the error cards a refused write leaves.
import { useCallback, useMemo } from 'react';

import type { MetaField, TableModel } from '@constructive-io/data';

import type { SheetsConfig } from '../../context/sheets-context';
import type { SheetsCellResolution } from '../../grid-dom/use-sheets-content';
import type { SheetsRowIdentifier } from '../../row-identity';
import type { RelationInfo } from '../../store/relation-info-slice';
import { sheetsLogger } from '../../utils/sheets-logger';
import { recordLabel, writeErrorMessages, type WriteAction } from '../feedback';
import type { useFeedback } from '../feedback';
import { useBatchCommit } from '../hooks/use-batch-commit';
import { useCellEditing } from '../hooks/use-cell-editing';
import type { useDraftRows } from '../hooks/use-draft-rows';
import { useGridOperations } from '../hooks/use-grid-operations';
import type { useGridState } from '../hooks/use-grid-state';
import type { useInfiniteGridData } from '../hooks/use-infinite-grid-data';
import type { useDataLoading } from '../hooks/use-load-grid';
import { useUndoRedo } from '../hooks/use-undo-redo';
import { getDraftMeta, type SheetsRow } from '../row-model';
import type { DataGridProps } from '../sheets.types';
import type { SheetsEmit } from './use-sheets-events';

type DataContext = ReturnType<typeof useDataLoading>['contextValue'];

export interface UseSheetsWritesInput {
	tableName: string;
	tableKey: string;
	config: SheetsConfig;
	feedback: ReturnType<typeof useFeedback>;
	emit: SheetsEmit;
	infiniteScroll: boolean;
	infiniteGridData: ReturnType<typeof useInfiniteGridData>;
	tableModel: TableModel | null;
	combinedRows: SheetsRow[];
	fieldMetaMap: Map<string, MetaField>;
	relationInfoByField: Map<string, RelationInfo>;
	getSheetsCellContent: (rowIndex: number, colKey: string) => SheetsCellResolution;
	getRowIdentifier: (row: Readonly<Record<string, unknown>>) => SheetsRowIdentifier | null;
	primaryKeyFields: ReadonlySet<string>;
	canUpdate: boolean;
	canDelete: boolean;
	update: DataContext['update'];
	deleteRow: DataContext['delete'];
	updateDraftCell: ReturnType<typeof useDraftRows>['updateDraftCell'];
	removeDraftRow: ReturnType<typeof useDraftRows>['removeDraftRow'];
	gridState: ReturnType<typeof useGridState>['state'];
	gridActions: ReturnType<typeof useGridState>['actions'];
	columnLabel: (name: string) => string;
	onCellEdit: DataGridProps['onCellEdit'];
}

export function useSheetsWrites({
	tableName,
	tableKey,
	config,
	feedback,
	emit,
	infiniteScroll,
	infiniteGridData,
	tableModel,
	combinedRows,
	fieldMetaMap,
	relationInfoByField,
	getSheetsCellContent,
	getRowIdentifier,
	primaryKeyFields,
	canUpdate,
	canDelete,
	update,
	deleteRow,
	updateDraftCell,
	removeDraftRow,
	gridState,
	gridActions,
	columnLabel,
	onCellEdit,
}: UseSheetsWritesInput) {
	const { startOperation, updateOperationProgress, completeOperation, reportWriteError } = feedback;

	/**
	 * Unified optimistic update handler for overlay editors. Editors that handle
	 * mutations internally (RelationEditor, ImageEditor, etc.) call this callback with
	 * a patch to update the grid cache without full refetch. The DOM grid re-renders
	 * reactively off `combinedRows`, so no surgical per-cell repaint is needed.
	 */
	const handleEditorSaveComplete = useCallback(
		(colKey: string, rowIndex: number, patch: Record<string, unknown>) => {
			void colKey;
			const rowData = combinedRows[rowIndex];

			// Draft row: update draft store directly
			const dm = getDraftMeta(rowData);
			if (dm) {
				for (const [key, value] of Object.entries(patch)) {
					updateDraftCell({ tableKey, draftRowId: dm.draftRowId, columnKey: key, value });
				}
				return;
			}

			// Server row: update infinite scroll cache (paginated handled by React Query)
			if (!infiniteScroll) return;

			// Apply optimistic update to infinite scroll cache; self-heal on a cache
			// miss (patch targeted a not-yet-cached page) by falling back to a refetch.
			const ok = infiniteGridData.updateRowAtIndex(rowIndex, patch);
			if (!ok) infiniteGridData.invalidate();
		},
		[combinedRows, infiniteScroll, infiniteGridData, updateDraftCell, tableKey],
	);

	// Memoize feedback callbacks for grid operations
	const operationFeedback = useMemo(
		() => ({
			onStart: startOperation,
			onProgress: updateOperationProgress,
			onComplete: completeOperation,
		}),
		[startOperation, updateOperationProgress, completeOperation],
	);

	const gridOpsOptions = useMemo(
		() => ({
			onRemoveDraftRow: (draftRowId: string) => removeDraftRow(tableKey, draftRowId),
			getRowIdentifier,
			canDeleteServerRows: canDelete,
			feedback: operationFeedback,
			onDeleteErrors: (errors: readonly unknown[]) => {
				const messages = [...new Set(errors.flatMap((error) => writeErrorMessages(error, 'delete')))];
				reportWriteError(`${errors.length} ${errors.length === 1 ? 'row was' : 'rows were'} not deleted`, messages);
				for (const error of errors) config.onError?.(error, { source: 'mutation', tableName });
			},
		}),
		[removeDraftRow, tableKey, getRowIdentifier, canDelete, operationFeedback, reportWriteError, config, tableName],
	);

	const { deleteSelected: baseDeleteSelected } = useGridOperations(
		combinedRows,
		deleteRow,
		gridState.gridSelection,
		() => gridActions.setGridSelection(undefined),
		{
			...gridOpsOptions,
			onAfterServerDeletes: infiniteScroll ? infiniteGridData.invalidate : undefined,
		},
	);

	// Wrap the delete handler to emit an observational row:delete event with the
	// selected-row count, then delegate to the real deletion logic.
	const deleteSelected = useCallback(async () => {
		const count = gridState.gridSelection?.rows.length ?? 0;
		emit('row:delete', { count });
		await baseDeleteSelected();
	}, [baseDeleteSelected, emit, gridState.gridSelection]);

	// Infinite-mode optimistic cache patch, handed to `useCellEditing` so a server-row
	// edit flips the cell BEFORE the `update` round-trip. Snapshots the prior values for
	// the patched keys and returns a revert thunk replayed only if the mutation rejects.
	// A cache miss (unloaded page) self-heals via `invalidate()`. Paginated mode returns
	// undefined here — its optimism lives in the update mutation's onMutate (use-table.ts).
	const applyOptimisticCellPatch = useCallback(
		(rowIndex: number, patch: Record<string, unknown>): (() => void) | void => {
			if (!infiniteScroll) return;
			const current = infiniteGridData.getRowAtIndex(rowIndex) as Record<string, unknown> | null;
			const ok = infiniteGridData.updateRowAtIndex(rowIndex, patch);
			if (!ok) {
				infiniteGridData.invalidate();
				return;
			}
			const snapshot: Record<string, unknown> = {};
			for (const key of Object.keys(patch)) snapshot[key] = current ? current[key] : undefined;
			return () => {
				const reverted = infiniteGridData.updateRowAtIndex(rowIndex, snapshot);
				if (!reverted) infiniteGridData.invalidate();
			};
		},
		[infiniteScroll, infiniteGridData],
	);

	const editCell = useCellEditing({
		combinedRows,
		fieldMetaMap,
		relationInfoByField,
		updateDraftCell,
		tableKey,
		update,
		getRowIdentifier,
		readOnlyFields: primaryKeyFields,
		canUpdate,
		onCellEdit,
		applyOptimisticPatch: applyOptimisticCellPatch,
	});

	// History (undo/redo) for server-row value writes. Draft edits are NOT recorded.
	const history = useUndoRedo();

	// Re-sync a canonical server row over the optimistic patch after the mutation
	// resolves (infinite mode only; paginated reconciles via React Query).
	const resyncRow = useCallback(
		(rowIndex: number, updatedRow: Record<string, unknown>) => {
			if (!infiniteScroll) return;
			const ok = infiniteGridData.updateRowAtIndex(rowIndex, updatedRow);
			if (!ok) infiniteGridData.invalidate();
		},
		[infiniteScroll, infiniteGridData],
	);

	// BATCHED commit primitive — the single server-row value-write path (paste / fill /
	// bulk AND, routed below, the single cell). Coalesces optimistic patches + server
	// mutations per row and records an undoable HistoryEntry (unless opts.record===false).
	// A refused write lists every message the server returned, titled by the cell or row
	// when the write names one. It stays until dismissed.
	const reportServerWrite = useCallback(
		(error: unknown, action: WriteAction, title: string) => {
			reportWriteError(title, writeErrorMessages(error, action));
			config.onError?.(error, { source: 'mutation', tableName });
		},
		[reportWriteError, config, tableName],
	);
	const handleWriteFailure = useCallback(
		(error: unknown, cellCount: number, target?: { rowIndex: number; fields: readonly string[] }) => {
			let title = cellCount > 1 ? `${cellCount} changes were not saved` : 'The change was not saved';
			if (target) {
				const record = recordLabel(tableModel, combinedRows[target.rowIndex], target.rowIndex);
				title =
					target.fields.length === 1
						? `${columnLabel(target.fields[0]!)} was not saved for ${record}`
						: `${target.fields.length} changes were not saved for ${record}`;
			}
			reportServerWrite(error, 'update', title);
		},
		[reportServerWrite, tableModel, combinedRows, columnLabel],
	);
	const commitCells = useBatchCommit({
		combinedRows,
		fieldMetaMap,
		relationInfoByField,
		update,
		getRowIdentifier,
		readOnlyFields: primaryKeyFields,
		resolveCell: getSheetsCellContent,
		tableModel,
		onServerError: handleWriteFailure,
		canUpdate,
		applyOptimisticPatch: applyOptimisticCellPatch,
		resyncRow,
		editCell,
		onCellEdit,
		record: history.record,
		feedback: operationFeedback,
	});

	// @internal NATIVE value-commit for the TanStack DOM grid's portal editors.
	// Maps a (rowIndex, colKey, rawValue) commit straight onto the native `editCell`
	// (draft `updateDraftCell` / server mutation) — the raw value flows through with
	// NO glide cell round-trip (this is what keeps a boolean `false` as `false`). For
	// server edits `editCell` already applied the OPTIMISTIC infinite-cache patch before
	// awaiting the mutation (and reverted it on failure); here we only re-sync the
	// canonical server row when it comes back, then emit the observational `cell:edit`.
	// The DOM grid re-renders reactively from `combinedRows`.
	const commitCellValue = useCallback(
		(rowIndex: number, colKey: string, nextValue: unknown): void => {
			void (async () => {
				try {
					// Single-cell edits route through the SAME batched primitive so a normal cell
					// edit becomes undoable (server rows) — coercion / readonly / optimistic patch
					// / re-sync all live inside commitCells (draft rows take its per-cell branch).
					const isDraft = !!getDraftMeta(combinedRows[rowIndex]);
					// An editor hands over a value, not text to parse (a JSON string stays a string).
					const { applied } = await commitCells([{ rowIndex, colKey, value: nextValue, fromText: false }]);

					// Observational: a real cell edit landed — skip no-ops (applied 0 + non-draft).
					if (applied > 0 || isDraft) {
						emit('cell:edit', { field: colKey, rowIndex, target: isDraft ? 'draft' : 'server' });
					}
				} catch (e) {
					// A failure the commit did not report itself: it gets an error card like any refused save.
					reportWriteError('The change was not saved', writeErrorMessages(e, 'update'));
					sheetsLogger().error('Cell edit error:', e);
					config.onError?.(e, { source: 'mutation', tableName });
				}
			})();
		},
		[commitCells, combinedRows, config, tableName, emit, reportWriteError],
	);

	// @internal NATIVE patch-commit for self-committing DOM portal editors (relation/
	// image). These editors mutate server-side themselves, then push a MULTI-field
	// patch — routes straight through the EXISTING `handleEditorSaveComplete` (draft
	// store update / infinite-cache patch), using the FIRST patch key as the primary colKey.
	const commitCellPatch = useCallback(
		(rowIndex: number, patch: Record<string, unknown>): void => {
			const primaryColKey = Object.keys(patch)[0];
			if (!primaryColKey) return;
			handleEditorSaveComplete(primaryColKey, rowIndex, patch);
		},
		[handleEditorSaveComplete],
	);

	// @internal NATIVE data-invalidate for self-committing DOM portal editors. Mirrors
	// the canvas wiring: infinite mode refetches via the React Query cache; paginated
	// invalidation is already handled by React Query in use-table, so this is a no-op there.
	const invalidateData = useCallback(() => {
		if (infiniteScroll) infiniteGridData.invalidate();
	}, [infiniteScroll, infiniteGridData]);

	return { operationFeedback, deleteSelected, commitCells, commitCellValue, commitCellPatch, invalidateData, history };
}

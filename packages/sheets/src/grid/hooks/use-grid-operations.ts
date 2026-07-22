import { useCallback } from 'react';

import type { SheetsSelection } from '../../selection/selection-model';
import { SHEETS_CONCURRENCY } from '../../config/sheets-concurrency';
import { sheetsLogger } from '../../utils/sheets-logger';
import { getDraftMeta } from '../row-model';

interface OperationFeedbackCallbacks {
	onStart?: (type: 'delete', total: number) => string;
	onProgress?: (id: string, completed: number, failed: number) => void;
	onComplete?: (id: string, status: 'success' | 'partial' | 'error', message: string) => void;
}

type DeleteOutcome = { status: 'success' | 'partial' | 'error'; message: string } | null;

/**
 * Build the completion toast for a bulk delete, distinguishing UNSAVED draft rows
 * (discarded client-side, nothing hit the server) from real server-row deletes.
 *
 * `drafts` = draft rows discarded, `deleted` = server rows deleted, `failed` =
 * server deletes that errored. All-success wording reflects reality:
 *   - only drafts  -> "Discarded N draft(s)"
 *   - only server  -> "Deleted N row(s)"  (unchanged)
 *   - mixed        -> "Deleted N rows, discarded M drafts"
 * The partial/error (failure) wording is unchanged from prior behavior.
 */
export function summarizeDeleteResult(drafts: number, deleted: number, failed: number): DeleteOutcome {
	const successes = drafts + deleted;

	if (failed === 0 && successes > 0) {
		let message: string;
		if (deleted === 0) {
			message = `Discarded ${drafts} draft${drafts === 1 ? '' : 's'}`;
		} else if (drafts === 0) {
			message = `Deleted ${deleted} ${deleted === 1 ? 'row' : 'rows'}`;
		} else {
			message = `Deleted ${deleted} ${deleted === 1 ? 'row' : 'rows'}, discarded ${drafts} draft${drafts === 1 ? '' : 's'}`;
		}
		return { status: 'success', message };
	}

	if (successes > 0 && failed > 0) {
		return { status: 'partial', message: `Deleted ${successes}, ${failed} failed` };
	}

	if (failed > 0) {
		return { status: 'error', message: `Failed to delete ${failed} ${failed === 1 ? 'row' : 'rows'}` };
	}

	return null;
}

export function useGridOperations(
	data: any[],
	deleteRow: (id: string | number) => Promise<any>,
	gridSelection: SheetsSelection | undefined,
	clearSelection: () => void,
	options?: {
		onRemoveDraftRow?: (draftRowId: string) => void;
		onAfterServerDeletes?: () => void;
		feedback?: OperationFeedbackCallbacks;
	},
) {
	const deleteSelected = useCallback(async () => {
		if (!gridSelection) return;

		const rows = gridSelection.rows.toArray();
		if (rows.length === 0) return;

			// Start operation feedback
			const operationId = options?.feedback?.onStart?.('delete', rows.length);

			let successes = 0;
			let failures = 0;
			let serverSuccesses = 0;
			let draftDiscards = 0;
			const records = rows.map((idx) => data[idx]);
			let nextRecordIndex = 0;
			const workerCount = Math.min(SHEETS_CONCURRENCY.bulkDelete, records.length);

			const runDeleteWorker = async () => {
				while (nextRecordIndex < records.length) {
					const currentIndex = nextRecordIndex;
					nextRecordIndex += 1;
					const record = records[currentIndex];

					const draftMeta = getDraftMeta(record);
					if (draftMeta?.isDraft && options?.onRemoveDraftRow) {
						const draftRowId = draftMeta.draftRowId;
						if (draftRowId) {
							options.onRemoveDraftRow(draftRowId);
							successes += 1;
							draftDiscards += 1;
						} else {
							failures += 1;
						}
					} else if (record?.id) {
						try {
							await deleteRow(record.id);
							successes += 1;
							serverSuccesses += 1;
						} catch (error) {
							sheetsLogger().error(`Failed to delete record ${record.id}:`, error);
							failures += 1;
						}
					} else {
						failures += 1;
					}

					if (operationId) {
						options?.feedback?.onProgress?.(operationId, successes, failures);
					}
				}
			};

			await Promise.all(Array.from({ length: workerCount }, () => runDeleteWorker()));

			// Complete operation feedback — distinguish discarded drafts from server deletes.
			if (operationId) {
				const outcome = summarizeDeleteResult(draftDiscards, serverSuccesses, failures);
				if (outcome) {
					options?.feedback?.onComplete?.(operationId, outcome.status, outcome.message);
				}
			}

		if (serverSuccesses > 0) {
			options?.onAfterServerDeletes?.();
		}

		// Always clear selection so indices don't point to new rows after deletion
		clearSelection();
	}, [gridSelection, data, deleteRow, clearSelection, options]);

	return {
		deleteSelected,
	};
}

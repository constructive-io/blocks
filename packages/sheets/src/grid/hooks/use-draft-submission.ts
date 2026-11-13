import { useCallback, useMemo, useState } from 'react';

import type { TableModel } from '@constructive-io/data';

import type { RelationInfo } from '../../store/relation-info-slice';
import type { DraftRow } from '../../store/draft-rows-slice';
import { SHEETS_CONCURRENCY } from '../../config/sheets-concurrency';

import { prepareDraftSubmissionPayload, validateDraftRowRequiredFields } from '../sheets.utils';
import type { DraftSubmitResult } from '../draft-types';
import type { DraftRowEntry } from './use-grid-selection';
import { sheetsLogger } from '../../utils/sheets-logger';

interface DraftRowsTableState {
	order: string[];
	map: Record<string, DraftRow>;
	template: Record<string, unknown>;
	metaVersion: string;
	columnOrder: string[];
}

interface OperationFeedbackCallbacks {
	onStart?: (type: 'submit', total: number) => string;
	onProgress?: (id: string, completed: number, failed: number) => void;
	onComplete?: (id: string, status: 'success' | 'partial' | 'error', message: string) => void;
}

function rows(count: number): string {
	return `${count.toLocaleString()} ${count === 1 ? 'row' : 'rows'}`;
}

/** The save status after rows were submitted; null when nothing was submitted. */
export function submitOutcome(success: number, failed: number): { status: 'success' | 'partial' | 'error'; message: string } | null {
	if (failed === 0 && success > 0) return { status: 'success', message: success === 1 ? 'Row created' : `${rows(success)} created` };
	if (success > 0 && failed > 0) return { status: 'partial', message: `${rows(success)} created, ${failed.toLocaleString()} not created` };
	if (failed > 0) return { status: 'error', message: failed === 1 ? 'Row not created' : `${rows(failed)} not created` };
	return null;
}

interface UseDraftSubmissionParams {
	tableKey: string;
	draftRowsTable?: DraftRowsTableState;
	selectedDraftRowEntries: DraftRowEntry[];
	hasDraftSelection: boolean;
	create: (data: Record<string, unknown>) => Promise<{ createdRow?: Record<string, unknown> | null }>;
	removeDraftRow: (tableKey: string, draftRowId: string) => void;
	setDraftRowStatus: (args: {
		tableKey: string;
		draftRowId: string;
		status: DraftRow['status'];
		errors?: Record<string, string> | null;
	}) => void;
	clearSelection: () => void;
	/** The table model: which columns a create accepts and which it requires. Drafts cannot be submitted without it. */
	tableModel: TableModel | null;
	relationInfoByKey?: Record<string, RelationInfo | undefined>;
	onSubmittedSuccessfully?: (result: { success: number; failed: number }) => void;
	/** Feedback callbacks for inline status indicators */
	feedback?: OperationFeedbackCallbacks;
}

export function useDraftSubmission({
	tableKey,
	draftRowsTable,
	selectedDraftRowEntries,
	hasDraftSelection,
	create,
	removeDraftRow,
	setDraftRowStatus,
	clearSelection,
	tableModel,
	relationInfoByKey,
	onSubmittedSuccessfully,
	feedback,
}: UseDraftSubmissionParams) {
	const [isSubmittingDrafts, setIsSubmittingDrafts] = useState(false);

	const submitDraftEntries = useCallback(
		async (entries: DraftRowEntry[], operationId?: string): Promise<{ success: number; failed: number }> => {
			if (!entries.length) {
				return { success: 0, failed: 0 };
			}

			setIsSubmittingDrafts(true);

			const submissionResults = {
				success: 0,
				failed: 0,
			};

			try {
				let nextEntryIndex = 0;
				const workerCount = Math.min(SHEETS_CONCURRENCY.draftSubmit, entries.length);

				const runSubmitWorker = async () => {
					while (nextEntryIndex < entries.length) {
						const currentIndex = nextEntryIndex;
						nextEntryIndex += 1;
						const { draftRowId, draftRow } = entries[currentIndex];

						// Without a table model nothing proves which columns a create accepts.
						if (!tableModel) {
							submissionResults.failed += 1;
							setDraftRowStatus({ tableKey, draftRowId, status: 'error', errors: { submit: 'The table is still loading.' } });
							continue;
						}
						// Pre-validate required fields before sending to server
						const validationErrors = validateDraftRowRequiredFields(draftRow.values, tableModel);
						if (Object.keys(validationErrors).length > 0) {
							submissionResults.failed += 1;
							setDraftRowStatus({ tableKey, draftRowId, status: 'error', errors: validationErrors });
							if (operationId) {
								feedback?.onProgress?.(operationId, submissionResults.success, submissionResults.failed);
							}
							continue;
						}

						setDraftRowStatus({ tableKey, draftRowId, status: 'saving', errors: null });
						const payload = prepareDraftSubmissionPayload(draftRow.values, tableModel, relationInfoByKey);

						try {
							await create(payload);
							removeDraftRow(tableKey, draftRowId);
							submissionResults.success += 1;
						} catch (error) {
							submissionResults.failed += 1;
							const message = error instanceof Error ? error.message : 'Failed to submit draft row';
							sheetsLogger().error('submitDraftRow failed', error);
							setDraftRowStatus({ tableKey, draftRowId, status: 'error', errors: { submit: message } });
						}

						if (operationId) {
							feedback?.onProgress?.(
								operationId,
								submissionResults.success,
								submissionResults.failed,
							);
						}
					}
				};

				await Promise.all(Array.from({ length: workerCount }, () => runSubmitWorker()));
			} finally {
				setIsSubmittingDrafts(false);
			}

			if (submissionResults.success > 0) {
				onSubmittedSuccessfully?.(submissionResults);
			}

			return submissionResults;
		},
		[
			tableModel,
			relationInfoByKey,
			create,
			removeDraftRow,
			setDraftRowStatus,
			tableKey,
			feedback,
			onSubmittedSuccessfully,
		],
	);

	const handleSubmitDraftRows = useCallback(async () => {
		if (!draftRowsTable || !hasDraftSelection) {
			return;
		}

		const total = selectedDraftRowEntries.length;
		const operationId = feedback?.onStart?.('submit', total);

		const submissionResults = await submitDraftEntries(selectedDraftRowEntries, operationId);

		if (operationId) {
			const outcome = submitOutcome(submissionResults.success, submissionResults.failed);
			if (outcome) feedback?.onComplete?.(operationId, outcome.status, outcome.message);
		}

		if (submissionResults.success > 0) {
			clearSelection();
		}
	}, [draftRowsTable, hasDraftSelection, selectedDraftRowEntries, submitDraftEntries, clearSelection, feedback]);

	const handleSubmitSingleDraftRow = useCallback(
		async (draftRowId: string) => {
			if (!draftRowsTable) {
				return;
			}

			const draftRow = draftRowsTable.map[draftRowId];
			if (!draftRow) {
				return;
			}

			// The row shows its own state; the save status reports the outcome with every other write.
			const operationId = feedback?.onStart?.('submit', 1);
			const { success, failed } = await submitDraftEntries([{ draftRowId, draftRow }], operationId);
			const outcome = submitOutcome(success, failed);
			if (operationId && outcome) feedback?.onComplete?.(operationId, outcome.status, outcome.message);
		},
		[draftRowsTable, submitDraftEntries, feedback],
	);

	const submitDraftLabel = useMemo(() => {
		if (!hasDraftSelection) {
			return 'Submit draft rows';
		}
		const count = selectedDraftRowEntries.length;
		return `Submit ${count} draft ${count === 1 ? 'row' : 'rows'}`;
	}, [hasDraftSelection, selectedDraftRowEntries.length]);

	const submitDraftButtonDisabled = isSubmittingDrafts || !hasDraftSelection;

	/**
	 * Submit a single draft row for editor workflows (e.g., ImageEditor upload).
	 * Returns the created row with real database ID for subsequent operations.
	 *
	 * NOTE: This does NOT call onSingleRowSubmitted - the editor is responsible
	 * for triggering data refresh after any follow-up operations (like upload)
	 * are complete. This prevents premature cache invalidation.
	 */
	const submitDraftRowForEditor = useCallback(
		async (draftRowId: string): Promise<DraftSubmitResult> => {
			if (!draftRowsTable) {
				return { createdRow: null };
			}

			const draftRow = draftRowsTable.map[draftRowId];
			if (!draftRow || !tableModel) {
				return { createdRow: null };
			}

			// Required fields are checked here too, so the row's own Save never sends an incomplete record.
			const validationErrors = validateDraftRowRequiredFields(draftRow.values, tableModel);
			if (Object.keys(validationErrors).length > 0) {
				setDraftRowStatus({ tableKey, draftRowId, status: 'error', errors: validationErrors });
				return { createdRow: null };
			}

			const operationId = feedback?.onStart?.('submit', 1);
			try {
				setDraftRowStatus({ tableKey, draftRowId, status: 'saving', errors: null });

				const payload = prepareDraftSubmissionPayload(draftRow.values, tableModel, relationInfoByKey);

				const result = await create(payload);
				const createdRow = result?.createdRow ?? null;

				if (createdRow) {
					removeDraftRow(tableKey, draftRowId);
					// NOTE: Don't call onSingleRowSubmitted here - let the editor
					// trigger refresh after follow-up operations complete
				}
				if (operationId) feedback?.onComplete?.(operationId, 'success', 'Row created');

				return { createdRow };
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Failed to create row';
				setDraftRowStatus({ tableKey, draftRowId, status: 'error', errors: { submit: message } });
				if (operationId) feedback?.onComplete?.(operationId, 'error', 'Row not created');
				throw error;
			}
		},
		[draftRowsTable, setDraftRowStatus, tableKey, tableModel, relationInfoByKey, create, removeDraftRow, feedback],
	);

	return {
		isSubmittingDrafts,
		submitDraftButtonDisabled,
		submitDraftLabel,
		handleSubmitDraftRows,
		handleSubmitSingleDraftRow,
		submitDraftRowForEditor,
	};
}

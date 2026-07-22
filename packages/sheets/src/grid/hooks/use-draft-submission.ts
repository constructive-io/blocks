import { useCallback, useMemo, useState } from 'react';

import type { RelationInfo } from '../../store/relation-info-slice';
import type { DraftRow } from '../../store/draft-rows-slice';
import { SHEETS_CONCURRENCY } from '../../config/sheets-concurrency';

import { prepareDraftSubmissionPayload, validateDraftRowRequiredFields, type DraftValidationFieldMeta } from '../sheets.utils';
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
	allowedColumns?: ReadonlySet<string>;
	relationInfoByKey?: Record<string, RelationInfo | undefined>;
	fieldMetaByKey?: Record<string, DraftValidationFieldMeta | undefined>;
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
	allowedColumns,
	relationInfoByKey,
	fieldMetaByKey,
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

						// Pre-validate required fields before sending to server
						if (fieldMetaByKey) {
							const validationErrors = validateDraftRowRequiredFields(
								draftRow.values,
								fieldMetaByKey,
								{ allowedColumns, relationInfoByKey },
							);
							if (Object.keys(validationErrors).length > 0) {
								submissionResults.failed += 1;
								setDraftRowStatus({ tableKey, draftRowId, status: 'error', errors: validationErrors });
								if (operationId) {
									feedback?.onProgress?.(operationId, submissionResults.success, submissionResults.failed);
								}
								continue;
							}
						}

						setDraftRowStatus({ tableKey, draftRowId, status: 'saving', errors: null });
						const payload = prepareDraftSubmissionPayload(draftRow.values, {
							allowedColumns,
							relationInfoByKey,
						});

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
			allowedColumns,
			relationInfoByKey,
			fieldMetaByKey,
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
			const { success, failed } = submissionResults;
			if (failed === 0 && success > 0) {
				feedback?.onComplete?.(
					operationId,
					'success',
					`Submitted ${success} ${success === 1 ? 'row' : 'rows'}`,
				);
			} else if (success > 0 && failed > 0) {
				feedback?.onComplete?.(
					operationId,
					'partial',
					`Submitted ${success}, ${failed} failed`,
				);
			} else if (failed > 0) {
				feedback?.onComplete?.(
					operationId,
					'error',
					`Failed to submit ${failed} ${failed === 1 ? 'row' : 'rows'}`,
				);
			}
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

			// Single row submission - no operation feedback, rely on row status indicator
			await submitDraftEntries([{ draftRowId, draftRow }]);
		},
		[draftRowsTable, submitDraftEntries],
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
			if (!draftRow) {
				return { createdRow: null };
			}

			try {
				setDraftRowStatus({ tableKey, draftRowId, status: 'saving', errors: null });

				const payload = prepareDraftSubmissionPayload(draftRow.values, {
					allowedColumns,
					relationInfoByKey,
				});

				const result = await create(payload);
				const createdRow = result?.createdRow ?? null;

				if (createdRow) {
					removeDraftRow(tableKey, draftRowId);
					// NOTE: Don't call onSingleRowSubmitted here - let the editor
					// trigger refresh after follow-up operations complete
				}

				return { createdRow };
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Failed to create row';
				setDraftRowStatus({ tableKey, draftRowId, status: 'error', errors: { submit: message } });
				throw error;
			}
		},
		[draftRowsTable, setDraftRowStatus, tableKey, allowedColumns, relationInfoByKey, create, removeDraftRow],
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

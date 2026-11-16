// Writing a file cell, including the wait for the server's file confirmation.
//
// A managed file column checks every new file document as it is written: the
// files row must be live (`uploaded` or `processed`). The upload mutation
// creates the row as `requested`, and a background job confirms the PUT later
// (by default about 30 seconds after the request). Until then the write is
// refused with the error code FILE_REF_FILE_NOT_LIVE and the context
// `{ field, file_id, status }` (constructive-db
// `ast_plpgsql_helpers.file_ref_guard_body`, raised through
// `errors.raise_error`; the GraphQL error carries the code as its message and
// in `extensions.code`). So the write is retried with backoff for a bounded
// time. A row the job `rejected` never becomes live, so that answer stops at once.

import { getErrorCode, toError, type ColumnModel, type TableModel } from '@constructive-io/data';

import type { SheetsBackendAdapter } from '../adapter/sheets-adapter';
import { responseErrorsOf, type SheetsExecuteFn } from '../context/sheets-execute';
import type { SheetsRowIdentifier } from '../row-identity';
import type { ProcessingPolicy } from './upload-config';

export const FILE_NOT_LIVE_CODE = 'FILE_REF_FILE_NOT_LIVE';

/** The write is waiting for the server to confirm the file. */
export class FileProcessingTimeoutError extends Error {
	constructor() {
		super('The file is still being processed, so it was not saved to this cell yet.');
		this.name = 'FileProcessingTimeoutError';
	}
}

/** Friendlier text for the file-reference refusals a managed file column raises. */
const FILE_REF_MESSAGES: Record<string, string> = {
	FILE_REF_FILE_NOT_LIVE: 'The storage service has not accepted this file.',
	FILE_REF_FILE_NOT_FOUND: 'This file could not be found, or you cannot see it.',
	FILE_REF_BUCKET_MISMATCH: 'This column keeps its files in a different bucket.',
	FILE_REF_ID_INVALID: 'This file reference is not valid.',
};

/** The status the server reported for a file that is not live, when it said. */
function notLiveStatus(error: unknown): string | null {
	const fromContext = toError(error).context?.status;
	if (typeof fromContext === 'string') return fromContext;
	const response = responseErrorsOf(error)?.find((candidate) => candidate.extensions?.code === FILE_NOT_LIVE_CODE);
	const status = response?.extensions?.context?.status;
	return typeof status === 'string' ? status : null;
}

function isNotLive(error: unknown): boolean {
	if (getErrorCode(error) === FILE_NOT_LIVE_CODE) return true;
	return Boolean(responseErrorsOf(error)?.some((candidate) =>
		candidate.extensions?.code === FILE_NOT_LIVE_CODE || candidate.message === FILE_NOT_LIVE_CODE));
}

/** A user-facing message for a failed file write. */
export function fileWriteMessage(error: unknown): string {
	if (error instanceof FileProcessingTimeoutError) return error.message;
	const code = getErrorCode(error);
	if (code === FILE_NOT_LIVE_CODE && notLiveStatus(error) === 'rejected') {
		return 'The storage service rejected this file (its contents did not match what was uploaded).';
	}
	if (code && FILE_REF_MESSAGES[code]) return FILE_REF_MESSAGES[code]!;
	return error instanceof Error && error.message ? error.message : 'The file could not be saved.';
}

function wait(ms: number, signal?: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		if (signal?.aborted) {
			reject(signal.reason ?? new Error('Cancelled'));
			return;
		}
		const timer = setTimeout(() => {
			signal?.removeEventListener('abort', onAbort);
			resolve();
		}, ms);
		const onAbort = () => {
			clearTimeout(timer);
			reject(signal?.reason ?? new Error('Cancelled'));
		};
		signal?.addEventListener('abort', onAbort, { once: true });
	});
}

export interface FileCellWrite {
	adapter: Pick<SheetsBackendAdapter, 'updateRow'>;
	execute: SheetsExecuteFn;
	model: TableModel;
	column: ColumnModel;
	rowKey: SheetsRowIdentifier;
	/** The value to store: a projection, a link, a list, or null to clear. */
	value: unknown;
	policy: ProcessingPolicy;
	/** Called once when the first write is refused because the file is still processing. */
	onProcessing?: () => void;
	signal?: AbortSignal;
}

/** Write the cell and return the stored value. Waits out FILE_REF_FILE_NOT_LIVE within the policy. */
export async function writeFileCell(write: FileCellWrite): Promise<unknown> {
	const { adapter, execute, model, column, rowKey, value, policy, signal } = write;
	const started = Date.now();
	let delay = policy.initialDelayMs;
	let announced = false;
	for (;;) {
		try {
			const row = await adapter.updateRow<Record<string, unknown>>(
				{ model, tableName: model.key },
				rowKey,
				{ [column.name]: value },
				execute,
				{ returning: [column.name] },
			);
			if (!row || !Object.prototype.hasOwnProperty.call(row, column.name)) {
				throw new Error(`The update did not return "${column.name}".`);
			}
			return row[column.name];
		} catch (error) {
			if (!isNotLive(error) || notLiveStatus(error) === 'rejected') throw error;
			if (Date.now() - started + delay > policy.timeoutMs) throw new FileProcessingTimeoutError();
			if (!announced) {
				announced = true;
				write.onProcessing?.();
			}
			await wait(delay, signal);
			delay = Math.min(delay * 2, policy.maxDelayMs);
		}
	}
}

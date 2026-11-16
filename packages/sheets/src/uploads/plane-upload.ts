// Upload into one storage plane through the model: the plane's upload mutation
// as the storage schema declares it, the bucket's limits checked first, then the
// shared transfer (hash, request, PUT with the returned headers, one renewal of
// an expired URL). Both the grid's file columns and `uploadToFilesTable` use it.
// A file row an unfinished upload leaves is never deleted here; the error names
// it and its files table (`unfinishedUploadOf`), and the storage service expires it.

import { createError } from '@constructive-io/data';

import type { SheetsBackendAdapter } from '../adapter/sheets-adapter';
import type { SheetsStorageTransport } from '../context/sheets-context';
import { transferFile, withUnfinishedUpload, type TransferOptions, type UploadPayload } from '../context/sheets-upload-presigned';
import { bucketLimitsFor, bucketRefusal, rememberLandedBucket } from './bucket-limits';
import type { PlaneDetails } from './storage-catalog';
import { createUploadRequester, uploadOperationProblem, type UploadRequestContext } from './upload-request';

export type PlaneUpload =
	| { status: 'ready'; send: (file: File, options?: TransferOptions) => Promise<UploadPayload> }
	| { status: 'unavailable'; reason: string };

const NOT_ENABLED_REASON = 'Uploads are not enabled for this storage service.';

/** The plane's uploader with these choices, or why it cannot upload. Never throws. */
export function planeUpload(
	storage: SheetsStorageTransport,
	adapter: Pick<SheetsBackendAdapter, 'listRows'>,
	details: PlaneDetails,
	context: UploadRequestContext,
): PlaneUpload {
	const op = details.upload;
	if (!op) return { status: 'unavailable', reason: details.uploadReason ?? NOT_ENABLED_REASON };
	const problem = uploadOperationProblem(op, context);
	if (problem) return { status: 'unavailable', reason: problem };

	const request = createUploadRequester(storage.execute, op, context);
	const requiresOwner = op.inputFields.some((field) => field.name === 'ownerId');
	const send = async (file: File, options?: TransferOptions): Promise<UploadPayload> => {
		const refusal = bucketRefusal(file, await bucketLimitsFor(storage, adapter, details, context.choices, requiresOwner));
		if (refusal) throw createError.badRequest(refusal);
		let payload: UploadPayload;
		try {
			payload = await transferFile(file, request, options);
		} catch (error) {
			// Name the files table beside the file id the error may carry.
			throw withUnfinishedUpload(error, { filesType: details.plane.filesType, filesTableKey: details.plane.filesTableKey });
		}
		rememberLandedBucket(storage, details, context.choices, payload.file.bucket_id);
		return payload;
	};
	return { status: 'ready', send };
}

// The upload mutation for one file, built from the operation the storage
// schema declares. Only input fields the mutation really has are sent, and a
// required field the grid cannot fill (an owner id nobody configured) stops the
// upload before any request with a reason.

import { createError, isRequiredInput } from '@constructive-io/data';

import type { SheetsExecuteFn } from '../context/sheets-execute';
import {
	UPLOAD_PAYLOAD_FIELDS,
	readUploadPayload,
	type UploadPayload,
	type UploadRequestInput,
	type UploadRequester,
} from '../context/sheets-upload-presigned';
import type { UploadOperation } from './storage-catalog';
import type { ResolvedUploadChoices } from './upload-config';

/** Values the host or the session supplies beside the file itself. */
export interface UploadRequestContext {
	choices: ResolvedUploadChoices;
	/** `SheetsConfig.databaseId`, sent when the input has `databaseId`. */
	databaseId: string | null;
}

/** Payload fields the grid needs to complete an upload. */
const REQUIRED_PAYLOAD_FIELDS = ['deduplicated', 'file'] as const;

/** Why an upload operation cannot be called with this context, or null when it can. */
export function uploadOperationProblem(op: UploadOperation, context: UploadRequestContext): string | null {
	if (!REQUIRED_PAYLOAD_FIELDS.every((name) => op.payloadFields.has(name))) {
		return 'The storage service does not return the file details an upload needs.';
	}
	const ownerId = op.inputFields.find((field) => field.name === 'ownerId');
	if (ownerId && isRequiredInput(ownerId) && !context.choices.ownerId) {
		return 'Uploads to this file store need an owner, and none is set.';
	}
	return null;
}

function inputValues(op: UploadOperation, file: UploadRequestInput, context: UploadRequestContext): Record<string, unknown> {
	const accepted = new Set(op.inputFields.map((field) => field.name));
	const { choices } = context;
	const values: Record<string, unknown> = {
		contentHash: file.contentHash,
		contentType: file.contentType,
		size: file.size,
		filename: file.filename,
		// A bucket key names the bucket; without one, `isPublic` picks the default bucket.
		...(choices.bucketKey ? { bucketKey: choices.bucketKey } : { isPublic: choices.isPublic }),
		...(choices.ownerId ? { ownerId: choices.ownerId } : {}),
		...(context.databaseId ? { databaseId: context.databaseId } : {}),
	};
	const input = Object.fromEntries(Object.entries(values).filter(([name]) => accepted.has(name)));
	const missing = op.inputFields.find((field) => isRequiredInput(field) && !(field.name in input));
	if (missing) {
		throw createError.badRequest(`The upload cannot be sent: the storage service needs "${missing.name}".`);
	}
	return input;
}

/** A requester that sends the operation's mutation on the storage executor. */
export function createUploadRequester(
	execute: SheetsExecuteFn,
	op: UploadOperation,
	context: UploadRequestContext,
): UploadRequester {
	const selection = UPLOAD_PAYLOAD_FIELDS.filter((name) => op.payloadFields.has(name)).join(' ');
	const source = `mutation SheetsUploadFile($input: ${op.argType}) { ${op.field}(${op.argName}: $input) { ${selection} } }`;
	return async (file, signal): Promise<UploadPayload> => {
		const data = await execute<Record<string, unknown>>(source, { input: inputValues(op, file, context) }, { signal });
		return readUploadPayload(data?.[op.field]);
	};
}

'use client';

// Native file editor: a thin EditorProps adapter over the self-committing
// `ImageEditor` (image, upload, upload lists, attachment links). The contract
// maps onto EditorProps:
//   • value          -> the raw row value, read directly by the editor.
//   • column / table -> the table model (kind, list or single, write rules).
//   • recordId       -> typed EditorProps.rowIdentifier; rowId keys the cell's pending state.
//   • isDraftRow     -> no server identity and a draft rowId.
//   • onSaveComplete -> onCommitPatch({ [colKey]: saveData.imageData })  (single field).
//   • onSubmitDraft  -> onSubmitDraftRow(draftRowId).
//   • onDraftUploadComplete -> onInvalidateData.
//   • onFinishedEditing(next?) -> onCancel() (a CLOSE; the editor self-commits).
// Suspense is preserved (the source editor is lazy-loaded under <Suspense fallback={null}>).

import { Suspense } from 'react';

import { ImageEditor, type ImageSaveData } from '../../grid/editors/image-editor';
import type { EditorProps } from './editor-props';

const DRAFT_PREFIX = 'draft:';

export function ImageEditorDom({
	value,
	cell,
	colKey,
	rowId,
	rowIdentifier,
	tableName,
	column,
	table,
	readOnlyReason,
	onCommitPatch,
	onCancel,
	onSubmitDraftRow,
	onInvalidateData,
}: EditorProps) {
	const isDraftRow = rowIdentifier == null && rowId.startsWith(DRAFT_PREFIX);
	// Without a column model, only the `image` cell type is image-only; every other
	// media type accepts any file. A missing cellType defaults to image-only.
	const cellType = cell.meta?.cellType;
	const acceptAnyFile = cellType != null && cellType !== 'image';

	// Self-commit: the editor uploads and writes the cell, then hands back the saved
	// value as a single-field optimistic patch.
	const handleSaveComplete = onCommitPatch
		? (saveData: ImageSaveData) => onCommitPatch({ [colKey]: saveData.imageData })
		: undefined;

	const handleSubmitDraft = isDraftRow && onSubmitDraftRow
		? () => onSubmitDraftRow(rowId)
		: undefined;

	return (
		<div data-slot="image-editor">
			<Suspense fallback={<div className='h-64 w-full min-w-[480px] animate-pulse rounded-lg bg-muted' />}>
				<ImageEditor
					value={value}
					acceptAnyFile={acceptAnyFile}
					onFinishedEditing={() => onCancel()}
					tableName={tableName}
					fieldName={colKey}
					recordId={rowIdentifier ?? null}
					rowId={rowId}
					column={column ?? null}
					table={table ?? null}
					readOnlyReason={readOnlyReason ?? null}
					onSaveComplete={handleSaveComplete}
					isDraftRow={isDraftRow}
					onSubmitDraft={handleSubmitDraft}
					onDraftUploadComplete={onInvalidateData}
				/>
			</Suspense>
		</div>
	);
}

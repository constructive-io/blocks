'use client';

// Native image editor — a thin EditorProps adapter that RE-HOSTS the (now value-
// native) SELF-COMMITTING `ImageEditor` verbatim. The UI (dropzone, upload flow,
// OVERLAY_LG width, own EditorFocusTrap, motion crossfade) is reused as-is; the
// contract maps directly onto EditorProps:
//   • value          -> the raw row value, read directly by the source (getImageUrl).
//   • recordId       -> EditorProps.rowId.
//   • isDraftRow     -> rowId startsWith 'draft:'.
//   • onSaveComplete -> onCommitPatch({ [colKey]: saveData.imageData })  (single field).
//   • onSubmitDraft  -> onSubmitDraftRow(draftRowId) (mapped to a DraftSubmitResult).
//   • onDraftUploadComplete -> onInvalidateData.
//   • onFinishedEditing(next?) -> onCancel() (a CLOSE; the upload self-commits via
//     onSaveComplete, so the value path is never used for image).
// Suspense is preserved (the source editor is lazy-loaded under <Suspense fallback={null}>).

import { Suspense } from 'react';

import { ImageEditor, type ImageSaveData } from '../../grid/editors/image-editor';
import type { DraftSubmitResult } from '../../grid/draft-types';
import type { EditorProps } from './editor-props';

const DRAFT_PREFIX = 'draft:';

export function ImageEditorDom({
	value,
	cell,
	colKey,
	rowId,
	tableName,
	onCommitPatch,
	onCancel,
	onSubmitDraftRow,
	onInvalidateData,
}: EditorProps) {
	const isDraftRow = rowId.startsWith(DRAFT_PREFIX);
	// The whole MEDIA family routes here (image/file/video/audio/upload). Only `image`
	// stays image-only; every other media type accepts ANY file (no image guard/cap),
	// so e.g. an `upload` column can take a PDF. The upload transport is already
	// content-agnostic — this only relaxes the editor's UI guards + preview.
	// A missing cellType (only reachable via a custom consumer cell whose toSheetsCell
	// drops `meta`) defaults to image-only — the safe direction, never regressing `image`.
	const cellType = cell.meta?.cellType;
	const acceptAnyFile = cellType != null && cellType !== 'image';

	// Self-commit: the editor uploads server-side, then hands back the saved image
	// data — route it as a single-field optimistic patch.
	const handleSaveComplete = onCommitPatch
		? (saveData: ImageSaveData) => onCommitPatch({ [colKey]: saveData.imageData })
		: undefined;

	// Draft rows: persist first to obtain a real id. The editor expects a
	// DraftSubmitResult ({ createdRow }); EditorProps.onSubmitDraftRow resolves to
	// the raw server row, so wrap it into that shape.
	const handleSubmitDraft = isDraftRow && onSubmitDraftRow
		? async (): Promise<DraftSubmitResult> => {
				const createdRow = (await onSubmitDraftRow(rowId)) as DraftSubmitResult['createdRow'];
				return { createdRow };
			}
		: undefined;

	return (
		<div data-slot='image-editor'>
			<Suspense fallback={<div className='h-64 w-full min-w-[480px] animate-pulse rounded-lg bg-muted' />}>
				<ImageEditor
					value={value}
					acceptAnyFile={acceptAnyFile}
					onFinishedEditing={() => onCancel()}
					tableName={tableName}
					fieldName={colKey}
					recordId={rowId}
					onSaveComplete={handleSaveComplete}
					isDraftRow={isDraftRow}
					onSubmitDraft={handleSubmitDraft}
					onDraftUploadComplete={onInvalidateData}
				/>
			</Suspense>
		</div>
	);
}

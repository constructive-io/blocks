// The file editor for image, upload, upload-list and attachment cells.
//
// It reads the column from the table model (`column.value.file`: kind and
// whether the cell holds several files) and saves through the model-driven
// upload path: pick, drop or paste files; replace or remove them; reorder a
// list; open or download a stored file; watch each upload and cancel it. A
// draft row is created first. The cell write waits out the server's file
// confirmation and, if the editor closes, keeps going on the cell.
//
// State and the save sequence live in `uploads/editor/use-file-editor.ts`.

import React, { useCallback, useContext, useMemo, useRef } from 'react';
import { Loader2, LockIcon } from 'lucide-react';
import { Button } from '@constructive-io/ui/button';
import { toast } from '@constructive-io/ui/toast';

import type { ColumnModel, TableModel } from '@constructive-io/data';

import { fieldLabel } from '../../cell-types/field-label';
import { useTableModel } from '../../hooks/use-table-model';
import {
	fileWriteReason,
	rowKeyOfRow,
	useColumnMediaResolver,
	useFileCellWriter,
	useFileUploadState,
	type UploadResponse,
} from '../../hooks/use-sheets-upload';
import { sheetsRowKey, type SheetsRowIdentifier } from '../../row-identity';
import { FileDropzone } from '../../uploads/editor/file-dropzone';
import { FileEntryRow } from '../../uploads/editor/file-entry-row';
import { ADD_CONTROL, CLOSE_CONTROL, useEditorFocus } from '../../uploads/editor/use-editor-focus';
import { useFileEditor, type FileEditorPhase, type SaveTarget } from '../../uploads/editor/use-file-editor';
import { useOptionalFeedback } from '../feedback/feedback-context';
import { EditorHeader, modifierKeyLabel } from './editor-frame';
import { EditorFocusTrap } from './editor-focus-trap';
import { OVERLAY } from './overlay-presets';
import { OverlayMeasureContext } from './overlay-viewport-guard';
import type { DraftSubmitResult } from '../draft-types';

/** Data passed to onSaveComplete for the optimistic cell update. */
export interface ImageSaveData {
	imageData: UploadResponse;
}

interface ImageEditorProps {
	value: unknown;
	onFinishedEditing: (next?: unknown) => void;
	tableName?: string;
	fieldName?: string;
	recordId?: SheetsRowIdentifier | null;
	/** Grid row id of the cell (keys its pending state). Defaults to the record id. */
	rowId?: string;
	onSaveComplete?: (data: ImageSaveData) => void;
	isDraftRow?: boolean;
	onSubmitDraft?: () => Promise<DraftSubmitResult>;
	onDraftUploadComplete?: () => void;
	/** Without a column model: accept any file (true) or images only (false). */
	acceptAnyFile?: boolean;
	/** The column model; resolved from `tableName` and `fieldName` when absent. */
	column?: ColumnModel | null;
	/** The table model; resolved from `tableName` when absent. */
	table?: TableModel | null;
	/** Why the cell cannot be written, from the grid; null when it can. */
	readOnlyReason?: string | null;
}

function phaseText(phase: FileEditorPhase, noun: string): string | null {
	switch (phase.name) {
		case 'creating-row': return 'Creating row…';
		case 'uploading': return `Uploading ${noun}…`;
		case 'saving': return 'Saving…';
		case 'processing': return 'Processing file… The cell is saved as soon as the storage service accepts the file. You can close this.';
		case 'failed': return phase.message;
		default: return null;
	}
}

export const ImageEditor: React.FC<ImageEditorProps> = ({
	value,
	onFinishedEditing,
	tableName,
	fieldName,
	recordId,
	rowId,
	onSaveComplete,
	isDraftRow = false,
	onSubmitDraft,
	onDraftUploadComplete,
	acceptAnyFile = false,
	column: columnProp,
	table: tableProp,
	readOnlyReason,
}) => {
	const { maxHeight: overlayMaxHeight } = useContext(OverlayMeasureContext);
	const inputRef = useRef<HTMLInputElement>(null);
	const editorRef = useRef<HTMLDivElement>(null);

	const resolved = useTableModel(tableName ?? null);
	const table = tableProp ?? resolved.model;
	const column = columnProp ?? table?.columns.find((candidate) => candidate.name === fieldName) ?? null;
	const fileModel = column?.value.file ?? null;
	const kind = fileModel?.kind ?? (acceptAnyFile ? 'upload' : 'image');
	const multiple = Boolean(fileModel?.multiple);
	const noun = multiple ? 'files' : kind === 'image' ? 'image' : 'file';
	const Noun = kind === 'attachment' ? 'Link' : multiple ? 'Files' : kind === 'image' ? 'Image' : 'File';
	// The shared frame's title: the field's readable name (the raw name in the tooltip), the kind as its chip.
	const rawName = column?.name ?? fieldName ?? '';

	const writeReason = readOnlyReason ?? fileWriteReason(table, column);
	const upload = useFileUploadState(table, column, writeReason);
	const media = useColumnMediaResolver(table, column);
	const write = useFileCellWriter();

	const target = useMemo<SaveTarget | null>(
		() => (recordId != null && !isDraftRow ? { rowKey: recordId, rowId: rowId ?? String(recordId) } : null),
		[isDraftRow, recordId, rowId],
	);
	const metaTable = resolved.metaTable;
	const targetOfCreatedRow = useCallback((row: Record<string, unknown>): SaveTarget | null => {
		if (!table) return null;
		const rowKey = rowKeyOfRow(table, row);
		if (rowKey == null) return null;
		return { rowKey, rowId: metaTable ? sheetsRowKey(metaTable, row, 0) : typeof rowKey === 'object' ? JSON.stringify(rowKey) : String(rowKey) };
	}, [metaTable, table]);

	// The grid's save status reports the save once the editor closes; outside a grid, a toast does.
	const noteWrite = useOptionalFeedback()?.noteWrite;
	const onSaved = useCallback((saved: unknown, info: { createdRow: boolean }) => {
		if (info.createdRow) onDraftUploadComplete?.();
		else onSaveComplete?.({ imageData: saved });
		const message = saved == null || (Array.isArray(saved) && saved.length === 0) ? `${Noun} cleared` : `${Noun} saved`;
		if (noteWrite) noteWrite('update', 'success', message);
		else toast.success({ message });
		onFinishedEditing();
	}, [Noun, noteWrite, onDraftUploadComplete, onFinishedEditing, onSaveComplete]);

	const editor = useFileEditor({
		value,
		table,
		column,
		multiple,
		upload,
		write,
		target,
		submitDraft: isDraftRow ? onSubmitDraft : undefined,
		targetOfCreatedRow,
		onUploadError: (message) => toast.error({ message }),
		onRowCreated: onDraftUploadComplete,
		onSaved,
	});
	const { entries, phase, busy, dirty, addFiles } = editor;

	const writeBlocked = writeReason != null;
	const uploadBlocked = upload.status !== 'ready';
	const uploadReason = upload.status === 'unavailable' ? upload.reason : null;
	const canAdd = !writeBlocked && !uploadBlocked && !busy;
	useEditorFocus(editorRef, canAdd);

	const takeFiles = useCallback((files: readonly File[]) => {
		if (!canAdd || files.length === 0) return;
		if (kind === 'image') {
			const images = files.filter((file) => file.type.startsWith('image/'));
			if (images.length < files.length) toast.error({ message: 'Please select an image file' });
			addFiles(images);
			return;
		}
		addFiles(files);
	}, [addFiles, canAdd, kind]);

	const openPicker = useCallback(() => inputRef.current?.click(), []);
	const hasNewFiles = entries.some((entry) => entry.file && entry.status !== 'uploaded');
	const save = editor.save;
	const close = useCallback(() => {
		// A write already sent keeps going on the cell; only uploads in flight stop.
		editor.cancelUploads();
		onFinishedEditing();
	}, [editor, onFinishedEditing]);

	const primaryLabel = phase.name === 'creating-row' ? 'Creating…'
		: phase.name === 'uploading' ? 'Uploading…'
		: phase.name === 'saving' ? 'Saving…'
		: phase.name === 'processing' ? 'Processing file…'
		: hasNewFiles ? (editor.needsRowCreation ? 'Create Row & Upload' : 'Upload & Save')
		: phase.name === 'failed' ? 'Retry saving'
		: dirty ? 'Save' : 'Done';
	const primaryAction = () => (hasNewFiles || dirty || phase.name === 'failed' ? void save() : onFinishedEditing());

	const status = phaseText(phase, noun);
	// While storage is still resolving the dropzone shows, disabled; a reason hides it.
	const showDropzone = !writeBlocked && upload.status !== 'unavailable' && (multiple || entries.length === 0);
	const hint = upload.status === 'loading'
		? 'Checking storage…'
		: kind === 'image' ? 'Images only' : kind === 'attachment' ? 'Any file; the cell keeps a link to it' : 'Any file type';

	return (
		<EditorFocusTrap
			onEscape={close}
			className={`bg-popover flex ${OVERLAY.lg} flex-col gap-0 overflow-hidden rounded-lg border p-0 shadow-lg`}
			style={overlayMaxHeight > 0 ? { maxHeight: overlayMaxHeight } : undefined}
		>
			<div
				ref={editorRef}
				className="flex min-h-0 flex-1 flex-col"
				data-upload-state={upload.status}
				onKeyDown={(event) => {
					if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
						event.preventDefault();
						primaryAction();
					}
				}}
				onPaste={(event) => {
					const files = Array.from(event.clipboardData?.files ?? []);
					if (files.length === 0) return;
					event.preventDefault();
					takeFiles(files);
				}}
			>
				<EditorHeader
					title={rawName ? fieldLabel(rawName) : Noun}
					titleHint={rawName || undefined}
					chip={Noun}
					className="shrink-0 px-3 pt-3 pb-2"
				/>

				<input
					ref={inputRef}
					type="file"
					multiple={multiple}
					accept={kind === 'image' ? 'image/*' : undefined}
					className="hidden"
					aria-label={`Upload ${noun}`}
					tabIndex={-1}
					onChange={(event) => {
						takeFiles(Array.from(event.target.files ?? []));
						event.target.value = '';
					}}
				/>

				<div className="min-h-0 flex-1 overflow-y-auto border-t">
					<div className="flex flex-col gap-3 p-3">
						{writeReason || uploadReason ? (
							<p role="note" className="flex items-start gap-2 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
								<LockIcon className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
								<span>{writeReason ?? uploadReason}</span>
							</p>
						) : null}

						{entries.length > 0 ? (
							<ul className="flex flex-col gap-1.5" aria-label={Noun}>
								{entries.map((entry, index) => (
									<FileEntryRow
										key={entry.key}
										entry={entry}
										kind={kind}
										resolver={media.resolver}
										reorder={multiple ? { index, count: entries.length } : null}
										disabled={busy}
										readOnly={writeBlocked}
										onMove={(delta) => editor.move(entry.key, delta)}
										onRemove={() => editor.remove(entry.key)}
									/>
								))}
							</ul>
						) : !showDropzone ? (
							<p className="py-6 text-center text-sm text-muted-foreground">No {noun}</p>
						) : null}

						{showDropzone ? (
							<FileDropzone
								noun={noun}
								hint={hint}
								disabled={!canAdd}
								compact={entries.length > 0}
								onPick={openPicker}
								onFiles={takeFiles}
							/>
						) : canAdd && !multiple && entries.length > 0 ? (
							<Button type="button" variant="outline" size="sm" className="self-start" onClick={openPicker} data-initial-focus={ADD_CONTROL}>
								Replace {noun}
							</Button>
						) : null}

						{status ? (
							<p
								role={phase.name === 'failed' ? 'alert' : 'status'}
								className={phase.name === 'failed' ? 'text-xs text-destructive' : 'flex items-center gap-1.5 text-xs text-muted-foreground'}
							>
								{phase.name !== 'failed' ? <Loader2 className="size-3 shrink-0 animate-spin" aria-hidden="true" /> : null}
								<span>{status}</span>
							</p>
						) : null}
					</div>
				</div>

				<div className="flex shrink-0 justify-end gap-2 border-t px-3 py-2">
					<Button type="button" variant="outline" size="xs" onClick={close} data-initial-focus={CLOSE_CONTROL}>
						{writeBlocked || phase.name === 'processing' || phase.name === 'saving' ? 'Close' : 'Cancel'}
					</Button>
					{!writeBlocked ? (
						<Button
							type="button"
							size="xs"
							onClick={primaryAction}
							disabled={busy || (hasNewFiles && uploadBlocked)}
							title={busy ? undefined : `${primaryLabel} (${modifierKeyLabel()} Enter)`}
						>
							{busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : null}
							{primaryLabel}
						</Button>
					) : null}
				</div>
			</div>
		</EditorFocusTrap>
	);
};

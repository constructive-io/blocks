// Native DOM view for file cells: image, upload, lists of uploads, attachment links.
//
//   image file      a square thumbnail (object-fit: cover) over a muted box; a
//                   public URL from the projection, otherwise a signed URL
//                   resolved in batches through the column's files table.
//   other file      a chip: icon and name; type and size in the title.
//   list            up to three small previews and the file count.
//   link            a chip with the link's last path segment.
//
// A file whose preview cannot be resolved still shows its name. While a new
// file waits for the server's confirmation the cell shows "Processing file…";
// a write that did not land shows "Not saved" with a retry.
//
// Virtualization destroys off-screen rows, so durable URLs are kept warm in a
// module LRU (`warmImage`); signed URLs live in the query cache and are never warmed.
//
// The cell host is the `gridcell` and carries the read-only reason for assistive
// technology; these views add no role. A reason the host cannot know (uploads
// unavailable for this column) is in the view's title and in the editor's note.

import { AlertCircleIcon, FileIcon, LinkIcon, Loader2, LockIcon, RotateCcwIcon, XIcon } from 'lucide-react';
import type React from 'react';

import type { ColumnFileModel } from '@constructive-io/data';

import { useSheetsContext } from '../../context/sheets-context';
import { useSheetsMediaUrl } from '../../hooks/use-sheets-media-url';
import { useColumnMediaResolver, useFileUploadState, type ColumnMediaResolver } from '../../hooks/use-sheets-upload';
import { pendingWriteKey, usePendingFileWrite, type PendingFileWrite } from '../../uploads/pending-file-writes';
import { cn } from '../../utils/cn';
import { fileDetails, fileLabel, isImageFile, storedFilesOf, type StoredFile } from '../../utils/file.utils';
import type { CellProps } from '../cell-props';
import { fileCellMetaOf } from '../factories/image';
import { warmImage } from '../image-cache';

type FileKind = ColumnFileModel['kind'];

const LIST_PREVIEW_LIMIT = 3;

function kindOf(model: ColumnFileModel | null, cellType: string): FileKind {
	if (model) return model.kind;
	if (cellType === 'image' || cellType === 'attachment') return cellType;
	return 'upload';
}

function stop(event: React.SyntheticEvent) {
	event.stopPropagation();
}

function FileChip({ file, kind, reason }: { file: StoredFile; kind: FileKind; reason?: string }) {
	const Icon = kind === 'attachment' ? LinkIcon : FileIcon;
	const details = kind === 'attachment' && file.url ? `${fileLabel(file)}\n${file.url}` : fileDetails(file);
	return (
		<div
			data-slot="file-cell"
			className="flex h-full w-full items-center gap-1.5 overflow-hidden px-3"
		>
			<Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
			<span className="truncate text-sm" title={reason ? `${details}\n${reason}` : details}>
				{fileLabel(file)}
			</span>
		</div>
	);
}

/** One file's preview: a thumbnail when it is an image and a URL resolves, else null. */
function usePreview(file: StoredFile, kind: FileKind, media: ColumnMediaResolver) {
	const previewImage = kind !== 'attachment' && isImageFile(file, kind);
	const preview = useSheetsMediaUrl(file.raw, { previewImage, resolver: media.resolver });
	const isLoading = previewImage && !preview.durableUrl && (preview.isLoading || media.isLoading);
	return { ...preview, previewImage, isLoading };
}

function Thumbnail({ preview, className }: { preview: ReturnType<typeof usePreview>; className?: string }) {
	const { url, durableUrl, onImageError, onImageLoad } = preview;
	return (
		<div className={cn('relative aspect-square h-full max-h-full shrink-0 overflow-hidden rounded-sm bg-muted', className)}>
			{url ? (
				<img
					key={url}
					src={url}
					decoding="async"
					alt=""
					onError={onImageError}
					onLoad={() => {
						onImageLoad();
						if (durableUrl) warmImage(durableUrl);
					}}
					className="absolute inset-0 h-full w-full rounded-sm object-cover outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
				/>
			) : null}
		</div>
	);
}

function SingleFile({ file, kind, media, reason }: { file: StoredFile; kind: FileKind; media: ColumnMediaResolver; reason?: string }) {
	const preview = usePreview(file, kind, media);
	if (!preview.previewImage || (!preview.url && !preview.isLoading)) return <FileChip file={file} kind={kind} reason={reason} />;
	return (
		<div
			data-slot="image-cell"
			title={reason ? `${fileDetails(file)}\n${reason}` : fileDetails(file)}
			className="flex h-full w-full items-center overflow-hidden px-3 py-1"
		>
			<Thumbnail preview={preview} />
		</div>
	);
}

function ListItemPreview({ file, kind, media }: { file: StoredFile; kind: FileKind; media: ColumnMediaResolver }) {
	const preview = usePreview(file, kind, media);
	if (preview.previewImage && (preview.url || preview.isLoading)) return <Thumbnail preview={preview} className="h-6" />;
	return (
		<span className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-muted" aria-hidden="true">
			<FileIcon className="size-3.5 text-muted-foreground" />
		</span>
	);
}

function FileList({ files, kind, media, reason }: { files: StoredFile[]; kind: FileKind; media: ColumnMediaResolver; reason?: string }) {
	const count = `${files.length} ${files.length === 1 ? 'file' : 'files'}`;
	const title = [...files.map(fileLabel), reason].filter(Boolean).join('\n');
	return (
		<div
			data-slot="file-list-cell"
			title={title}
			className="flex h-full w-full items-center gap-1 overflow-hidden px-3"
		>
			{files.slice(0, LIST_PREVIEW_LIMIT).map((file, index) => (
				<ListItemPreview key={`${file.id ?? file.url ?? file.key ?? 'file'}-${index}`} file={file} kind={kind} media={media} />
			))}
			<span className="ms-0.5 truncate text-xs text-muted-foreground tabular-nums">{count}</span>
		</div>
	);
}

const PENDING_ACTION =
	'flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground outline-hidden hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50';

function PendingWrite({ pending }: { pending: PendingFileWrite }) {
	if (pending.status === 'processing') {
		return (
			<div data-slot="file-cell-pending" className="flex h-full w-full items-center gap-1.5 overflow-hidden px-3">
				<Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" aria-hidden="true" />
				<span role="status" className="truncate text-sm text-muted-foreground">Processing file…</span>
			</div>
		);
	}
	return (
		// The two actions sit side by side with no gap, and the icon side keeps a smaller
		// inset, so "Not saved" fits a default-width column.
		<div data-slot="file-cell-failed" className="flex h-full w-full items-center gap-1 overflow-hidden ps-3 pe-1">
			<AlertCircleIcon className="size-3.5 shrink-0 text-destructive" aria-hidden="true" />
			<span className="truncate text-sm" title={pending.message}>Not saved</span>
			<div className="ms-auto flex shrink-0 items-center">
				<button
					type="button"
					className={PENDING_ACTION}
					aria-label="Retry saving the file"
					title={`${pending.message}\nRetry`}
					onMouseDown={stop}
					onDoubleClick={stop}
					onClick={(event) => {
						event.stopPropagation();
						pending.retry();
					}}
				>
					<RotateCcwIcon className="size-3.5" aria-hidden="true" />
				</button>
				<button
					type="button"
					className={PENDING_ACTION}
					aria-label="Discard the unsaved file"
					onMouseDown={stop}
					onDoubleClick={stop}
					onClick={(event) => {
						event.stopPropagation();
						pending.dismiss();
					}}
				>
					<XIcon className="size-3.5" aria-hidden="true" />
				</button>
			</div>
		</div>
	);
}

function EmptyFileCell({ kind, reason }: { kind: FileKind; reason?: string }) {
	return (
		<div
			data-slot="image-cell"
			data-empty=""
			title={reason}
			className="flex h-full w-full items-center gap-1.5 overflow-hidden px-3 py-1"
		>
			{kind === 'image' ? <div className="aspect-square h-full max-h-full rounded-sm bg-muted/60" aria-hidden="true" /> : null}
			{reason ? <LockIcon className="size-3 shrink-0 text-muted-foreground/60" aria-hidden="true" /> : null}
		</div>
	);
}

export function ImageCellView(props: CellProps) {
	const meta = fileCellMetaOf(props.cell);
	const column = meta?.column ?? null;
	const table = meta?.table ?? null;
	const fileModel = column?.value.file ?? null;
	const kind = kindOf(fileModel, props.column.cellType);
	const files = storedFilesOf(props.value, fileModel);
	const { scopeKey } = useSheetsContext();
	const pending = usePendingFileWrite(scopeKey, table ? pendingWriteKey(table.key, props.rowId, props.colKey) : null);
	const media = useColumnMediaResolver(table, column);
	const upload = useFileUploadState(table, column);
	const reason = props.readOnlyReason ?? (upload.status === 'unavailable' ? upload.reason : undefined);

	if (pending) return <PendingWrite pending={pending} />;
	if (files.length === 0) return <EmptyFileCell kind={kind} reason={reason} />;
	if (fileModel?.multiple || files.length > 1) return <FileList files={files} kind={kind} media={media} reason={reason} />;
	return <SingleFile file={files[0]!} kind={kind} media={media} reason={reason} />;
}

// One file in the file editor: preview, name, type and size, upload progress,
// and its actions (open, move, remove or cancel). Every action is a button or
// a link, so it works with Tab, Enter and Space.

import { AlertCircleIcon, ArrowDownIcon, ArrowUpIcon, ExternalLinkIcon, FileIcon, LinkIcon, XIcon } from 'lucide-react';

import type { ColumnFileModel } from '@constructive-io/data';

import { useSheetsMediaUrl, type MediaUrlResolver } from '../../hooks/use-sheets-media-url';
import { cn } from '../../utils/cn';
import { fileDetails, fileLabel, fileTypeLabel, formatFileSize, isImageFile } from '../../utils/file.utils';
import type { FileEntry } from './use-file-editor';

interface FileEntryRowProps {
	entry: FileEntry;
	kind: ColumnFileModel['kind'];
	resolver: MediaUrlResolver | null | undefined;
	/** List columns can reorder; a single-file column has no position. */
	reorder: { index: number; count: number } | null;
	disabled: boolean;
	readOnly: boolean;
	onMove: (delta: -1 | 1) => void;
	onRemove: () => void;
}

const ICON_BUTTON = cn(
	// Hover is instant: no transition on the highlight.
	'flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground outline-hidden',
	'hover:bg-muted hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50',
	'disabled:pointer-events-none disabled:opacity-40',
);

function details(entry: FileEntry): string {
	if (entry.file) {
		return [fileTypeLabel(entry.file.type || null, entry.file.name), formatFileSize(entry.file.size)].filter(Boolean).join(' • ');
	}
	if (!entry.stored) return '';
	return [fileTypeLabel(entry.stored.mime, fileLabel(entry.stored)), entry.stored.size != null ? formatFileSize(entry.stored.size) : null]
		.filter(Boolean)
		.join(' • ');
}

export function FileEntryRow({ entry, kind, resolver, reorder, disabled, readOnly, onMove, onRemove }: FileEntryRowProps) {
	const stored = entry.stored;
	const name = entry.file?.name ?? (stored ? fileLabel(stored) : 'File');
	const showsImage = entry.file ? entry.file.type.startsWith('image/') : stored ? kind !== 'attachment' && isImageFile(stored, kind) : false;
	// A stored file resolves its URL for opening even when it is not an image.
	const media = useSheetsMediaUrl(stored?.raw ?? null, { previewImage: Boolean(stored), resolver });
	const openUrl = stored ? media.url : null;
	const previewUrl = entry.previewUrl ?? (showsImage ? media.url : null);
	const Icon = kind === 'attachment' ? LinkIcon : FileIcon;
	const uploading = entry.status === 'uploading';
	// A single-file cell keeps the short labels; a list names each file.
	const removeLabel = uploading
		? `Cancel upload of ${name}`
		: reorder ? `Remove ${name}` : previewUrl ? 'Remove image' : 'Remove file';

	return (
		<li
			data-slot="file-entry"
			data-status={entry.status}
			className="flex items-center gap-3 rounded-md border border-border/60 bg-background py-1 ps-1 pe-2"
		>
			{/* The preview sits 5px inside the row (4px padding and the border), so its corner is the row's 8px less 5px. */}
			<div className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[3px] bg-muted" aria-hidden="true">
				{previewUrl ? (
					<img
						src={previewUrl}
						alt=""
						className="absolute inset-0 size-full rounded-[3px] object-cover outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
						onError={entry.previewUrl ? undefined : media.onImageError}
						onLoad={entry.previewUrl ? undefined : media.onImageLoad}
					/>
				) : (
					<Icon className="size-4 text-muted-foreground" />
				)}
			</div>
			<div className="min-w-0 flex-1">
				<p className="truncate text-sm font-medium" title={stored ? fileDetails(stored) : name}>{name}</p>
				{entry.status === 'failed' ? (
					<p className="mt-0.5 flex items-center gap-1 text-xs text-destructive" role="alert">
						<AlertCircleIcon className="size-3 shrink-0" aria-hidden="true" />
						<span className="truncate" title={entry.error ?? undefined}>{entry.error ?? 'Upload failed'}</span>
					</p>
				) : uploading ? (
					<div
						role="progressbar"
						aria-label={`Uploading ${name}`}
						aria-valuemin={0}
						aria-valuemax={100}
						aria-valuenow={entry.progress ?? 0}
						className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted"
					>
						<div
							className="h-1 rounded-full bg-primary transition-[width] duration-(--duration-slow)"
							style={{ width: `${entry.progress ?? 0}%` }}
						/>
					</div>
				) : (
					<p className="mt-0.5 truncate text-xs text-muted-foreground tabular-nums">
						{entry.status === 'selected' ? `${details(entry)} • Not uploaded yet` : details(entry)}
					</p>
				)}
			</div>
			<div className="flex shrink-0 items-center gap-0.5">
				{openUrl ? (
					<a
						href={openUrl}
						target="_blank"
						rel="noreferrer"
						download={stored?.filename ?? undefined}
						className={ICON_BUTTON}
						aria-label={`Open ${name}`}
						title="Open or download"
					>
						<ExternalLinkIcon className="size-3.5" aria-hidden="true" />
					</a>
				) : null}
				{reorder && !readOnly ? (
					<>
						<button
							type="button"
							className={ICON_BUTTON}
							aria-label={`Move ${name} up`}
							disabled={disabled || reorder.index === 0}
							onClick={() => onMove(-1)}
						>
							<ArrowUpIcon className="size-3.5" aria-hidden="true" />
						</button>
						<button
							type="button"
							className={ICON_BUTTON}
							aria-label={`Move ${name} down`}
							disabled={disabled || reorder.index === reorder.count - 1}
							onClick={() => onMove(1)}
						>
							<ArrowDownIcon className="size-3.5" aria-hidden="true" />
						</button>
					</>
				) : null}
				{!readOnly ? (
					<button
						type="button"
						className={ICON_BUTTON}
						aria-label={removeLabel}
						title={uploading ? 'Cancel upload' : 'Remove'}
						disabled={disabled && !uploading}
						onClick={onRemove}
					>
						<XIcon className="size-3.5" aria-hidden="true" />
					</button>
				) : null}
			</div>
		</li>
	);
}

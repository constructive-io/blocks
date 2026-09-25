'use client';

import * as React from 'react';
import { AlertCircleIcon, CheckIcon, UploadCloudIcon, XIcon } from 'lucide-react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { TooltipIconButton } from '../workspace-kit/primitives';
import { FileGlyph } from './file-type-icon';
import type { UploadItem } from './types';
import { humanizeBytes } from './utils';

interface UploadDropzoneProps {
	/** Called with the chosen files (from drop or the browse input). */
	onFiles: (files: FileList) => void;
	/** Current uploads to display under the dropzone. */
	uploads?: UploadItem[];
	/** Cancel an in-flight or queued upload. */
	onCancel?: (id: string) => void;
	/** `accept` attribute forwarded to the file input. */
	accept?: string;
	/** Max file size in bytes — shown as a hint only (no enforcement here). */
	maxSize?: number | null;
	className?: string;
}

/**
 * `UploadDropzone` — a dashed drop target with a Browse button over a hidden
 * file input. Drag-over tints the zone and lifts the icon; the only local
 * state is that highlight. Upload behaviour belongs to the parent through
 * `onFiles`; `uploads` render below as a progress list.
 */
export function UploadDropzone({ onFiles, uploads, onCancel, accept, maxSize, className }: UploadDropzoneProps) {
	const inputRef = React.useRef<HTMLInputElement>(null);
	const [isDragging, setIsDragging] = React.useState(false);

	return (
		<div className={cn('flex flex-col gap-3', className)}>
			<div
				onDragOver={(event) => {
					event.preventDefault();
					setIsDragging(true);
				}}
				onDragLeave={(event) => {
					if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false);
				}}
				onDrop={(event) => {
					event.preventDefault();
					setIsDragging(false);
					if (event.dataTransfer.files.length > 0) onFiles(event.dataTransfer.files);
				}}
				className={cn(
					'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-8 text-center transition-colors duration-(--duration-moderate)',
					isDragging ? 'border-primary/60 bg-primary/[0.06]' : 'border-foreground/15 bg-muted/40',
				)}
			>
				<span
					aria-hidden="true"
					className={cn(
						'grid size-10 place-items-center rounded-[11px] bg-card text-muted-foreground shadow-card transition-transform duration-(--duration-moderate) ease-out motion-reduce:transition-none',
						isDragging && '-translate-y-0.5 text-primary',
					)}
				>
					<UploadCloudIcon className="size-4" />
				</span>
				<div className="flex flex-col gap-0.5">
					<p className="text-pretty text-sm font-medium text-foreground">{isDragging ? 'Drop to upload' : 'Drag files here'}</p>
					<p className="text-[13px] text-muted-foreground">{maxSize ? `Up to ${humanizeBytes(maxSize)} each` : 'Any size the bucket allows'}</p>
				</div>
				<Button type="button" size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
					Browse files
				</Button>
				<input
					ref={inputRef}
					type="file"
					multiple
					accept={accept}
					className="sr-only"
					tabIndex={-1}
					onChange={(event) => {
						if (event.target.files && event.target.files.length > 0) onFiles(event.target.files);
						// Reset so selecting the same file again re-triggers change.
						event.target.value = '';
					}}
				/>
			</div>

			{uploads && uploads.length > 0 ? <UploadProgressList uploads={uploads} onCancel={onCancel} /> : null}
		</div>
	);
}

interface UploadProgressListProps {
	uploads: UploadItem[];
	onCancel?: (id: string) => void;
	className?: string;
}

/**
 * `UploadProgressList` — one row per upload: its glyph, name, size and
 * percentage, a hairline progress bar, and cancel while it is active.
 * Finished rows show a check; failed rows say why.
 */
export function UploadProgressList({ uploads, onCancel, className }: UploadProgressListProps) {
	return (
		<ul className={cn('flex flex-col gap-1.5', className)}>
			{uploads.map((item) => {
				const active = item.status === 'queued' || item.status === 'uploading';
				const failed = item.status === 'error';
				const done = item.status === 'done';
				const percent = done ? 100 : Math.round(item.progress);
				return (
					<li key={item.id} className="flex items-center gap-2.5 rounded-lg bg-card px-2.5 py-2 shadow-card">
						<FileGlyph mimeType={guessMimeFromName(item.filename)} />
						<div className="flex min-w-0 flex-1 flex-col gap-1.5">
							<div className="flex items-baseline justify-between gap-2 text-[13px]">
								<span className="truncate font-medium text-foreground">{item.filename}</span>
								<span className="shrink-0 text-xs text-muted-foreground tabular-nums">
									{humanizeBytes(item.size)}
									{active ? ` · ${item.status === 'queued' ? 'Queued' : `${percent}%`}` : null}
								</span>
							</div>
							{failed ? (
								<span className="flex items-center gap-1 text-xs text-destructive">
									<AlertCircleIcon className="size-3.5 shrink-0" aria-hidden="true" />
									<span className="truncate">{item.error ?? 'Upload failed'}</span>
								</span>
							) : (
								<div
									role="progressbar"
									aria-label={`${item.filename} upload`}
									aria-valuemin={0}
									aria-valuemax={100}
									aria-valuenow={percent}
									className="h-1 overflow-hidden rounded-full bg-muted"
								>
									<div
										className={cn('h-full rounded-full transition-[width] duration-(--duration-slow) ease-out motion-reduce:transition-none', done ? 'bg-success' : 'bg-primary')}
										style={{ width: `${percent}%` }}
									/>
								</div>
							)}
						</div>
						{done ? (
							<span className="grid size-6 place-items-center text-success">
								<CheckIcon aria-label="Uploaded" className="size-3.5" />
							</span>
						) : active && onCancel ? (
							<TooltipIconButton label={`Cancel upload of ${item.filename}`} size="sm" onClick={() => onCancel(item.id)}>
								<XIcon aria-hidden="true" className="size-3.5" />
							</TooltipIconButton>
						) : null}
					</li>
				);
			})}
		</ul>
	);
}

const MIME_BY_EXTENSION: Record<string, string> = {
	png: 'image/png',
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	gif: 'image/gif',
	webp: 'image/webp',
	svg: 'image/svg+xml',
	pdf: 'application/pdf',
	zip: 'application/zip',
	csv: 'text/csv',
	txt: 'text/plain',
	md: 'text/markdown',
	doc: 'application/msword',
	docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
	xls: 'application/vnd.ms-excel',
	xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	mp4: 'video/mp4',
	mp3: 'audio/mpeg',
};

/** Tiny extension→MIME guess, only to pick a glyph for an upload row. */
function guessMimeFromName(filename: string): string {
	const ext = filename.includes('.') ? (filename.split('.').pop()?.toLowerCase() ?? '') : '';
	return MIME_BY_EXTENSION[ext] ?? '';
}

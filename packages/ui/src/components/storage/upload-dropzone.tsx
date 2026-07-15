'use client';

import * as React from 'react';
import { AlertCircleIcon, UploadCloudIcon, XIcon } from 'lucide-react';

import { Button } from '../button';
import { Progress } from '../progress';
import { cn } from '../../lib/utils';
import { FileTypeIcon } from './file-type-icon';
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
 * `UploadDropzone` — a presentational drag-target plus a hidden file input
 * triggered by a "Browse" button. Drag-over highlight is the only local state;
 * all upload behavior is delegated to the parent via `onFiles`. Never blocks
 * paste. Renders `uploads` via `UploadProgressList`.
 */
export function UploadDropzone({ onFiles, uploads, onCancel, accept, maxSize, className }: UploadDropzoneProps) {
	const inputRef = React.useRef<HTMLInputElement>(null);
	const [isDragging, setIsDragging] = React.useState(false);

	const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
		event.preventDefault();
		setIsDragging(false);
		if (event.dataTransfer.files.length > 0) {
			onFiles(event.dataTransfer.files);
		}
	};

	return (
		<div className={cn('flex flex-col gap-3', className)}>
			<div
				onDragOver={(event) => {
					event.preventDefault();
					setIsDragging(true);
				}}
				onDragLeave={() => setIsDragging(false)}
				onDrop={handleDrop}
				className={cn(
					`flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-8 text-center
					transition-colors`,
					isDragging ? 'border-primary bg-primary/5' : 'border-input bg-muted/30',
				)}
			>
				<div className='flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground'>
					<UploadCloudIcon className='size-5' aria-hidden />
				</div>
				<div className='flex flex-col gap-0.5'>
					<p className='text-pretty text-sm font-medium'>Drag & drop files here</p>
					<p className='text-xs text-muted-foreground'>
						or browse{maxSize ? ` — up to ${humanizeBytes(maxSize)} each` : ''}
					</p>
				</div>
				<Button type='button' size='sm' variant='outline' onClick={() => inputRef.current?.click()}>
					Browse files
				</Button>
				<input
					ref={inputRef}
					type='file'
					multiple
					accept={accept}
					className='sr-only'
					onChange={(event) => {
						if (event.target.files && event.target.files.length > 0) {
							onFiles(event.target.files);
						}
						// Reset so selecting the same file again re-triggers change.
						event.target.value = '';
					}}
				/>
			</div>

			{uploads && uploads.length > 0 && <UploadProgressList uploads={uploads} onCancel={onCancel} />}
		</div>
	);
}

interface UploadProgressListProps {
	uploads: UploadItem[];
	onCancel?: (id: string) => void;
	className?: string;
}

/**
 * `UploadProgressList` — rows of in-flight/queued/finished uploads with a
 * progress bar, status, and a per-item cancel for active uploads. Pure render.
 */
export function UploadProgressList({ uploads, onCancel, className }: UploadProgressListProps) {
	return (
		<ul className={cn('flex flex-col gap-2', className)}>
			{uploads.map((item) => {
				const isActive = item.status === 'queued' || item.status === 'uploading';
				const isError = item.status === 'error';
				return (
					<li
						key={item.id}
						className='flex items-center gap-3 rounded-lg border bg-background px-3 py-2'
					>
						<FileTypeIcon
							mimeType={item.filename.includes('.') ? guessMimeFromName(item.filename) : ''}
							className={cn(isError && 'text-destructive')}
						/>
						<div className='flex min-w-0 flex-1 flex-col gap-1'>
							<div className='flex items-center justify-between gap-2'>
								<span className='truncate text-sm font-medium'>{item.filename}</span>
								<span className='shrink-0 text-xs tabular-nums text-muted-foreground'>
									{humanizeBytes(item.size)}
								</span>
							</div>
							{isError ? (
								<span className='flex items-center gap-1 text-xs text-destructive'>
									<AlertCircleIcon className='size-3.5' aria-hidden />
									<span className='truncate'>{item.error ?? 'Upload failed'}</span>
								</span>
							) : (
								<Progress
									value={item.status === 'done' ? 100 : item.progress}
									aria-label={`${item.filename} ${item.progress}%`}
									className='h-1.5'
								/>
							)}
						</div>
						{isActive && onCancel && (
							<Button
								size='icon-sm'
								variant='ghost'
								aria-label={`Cancel upload of ${item.filename}`}
								onClick={() => onCancel(item.id)}
							>
								<XIcon aria-hidden />
							</Button>
						)}
					</li>
				);
			})}
		</ul>
	);
}

/** Tiny extension→mime guess, only to pick a list icon for an upload row. */
function guessMimeFromName(filename: string): string {
	const ext = filename.split('.').pop()?.toLowerCase() ?? '';
	const map: Record<string, string> = {
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
	return map[ext] ?? '';
}

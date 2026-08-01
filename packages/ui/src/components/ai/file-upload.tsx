'use client';

import { Paperclip, Upload, X } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';

type FileUploadProps = {
	files?: File[];
	onFilesChange?: (files: File[]) => void;
	multiple?: boolean;
	accept?: string;
	disabled?: boolean;
	className?: string;
	/** Compact trigger only (no dropzone chrome). */
	variant?: 'dropzone' | 'button';
	children?: React.ReactNode;
};

/**
 * Drag-and-drop / file picker for chat attachments.
 */
function FileUpload({
	files: filesProp,
	onFilesChange,
	multiple = true,
	accept,
	disabled,
	className,
	variant = 'dropzone',
	children,
}: FileUploadProps) {
	const [internal, setInternal] = React.useState<File[]>([]);
	const [dragging, setDragging] = React.useState(false);
	const inputRef = React.useRef<HTMLInputElement>(null);
	const files = filesProp ?? internal;

	const setFiles = (next: File[]) => {
		setInternal(next);
		onFilesChange?.(next);
	};

	const addFiles = (list: FileList | File[]) => {
		const incoming = Array.from(list);
		setFiles(multiple ? [...files, ...incoming] : incoming.slice(0, 1));
	};

	const removeAt = (index: number) => {
		setFiles(files.filter((_, i) => i !== index));
	};

	const onDrop = (event: React.DragEvent) => {
		event.preventDefault();
		setDragging(false);
		if (disabled || !event.dataTransfer.files?.length) return;
		addFiles(event.dataTransfer.files);
	};

	if (variant === 'button') {
		return (
			<div data-slot="file-upload" className={cn('inline-flex', className)}>
				<input
					ref={inputRef}
					type="file"
					className="sr-only"
					multiple={multiple}
					accept={accept}
					disabled={disabled}
					onChange={(e) => {
						if (e.target.files) addFiles(e.target.files);
						e.target.value = '';
					}}
				/>
				{children ?? (
					<Button
						type="button"
						variant="ghost"
						size="icon-sm"
						aria-label="Attach files"
						disabled={disabled}
						onClick={() => inputRef.current?.click()}
					>
						<Paperclip className="size-4" />
					</Button>
				)}
			</div>
		);
	}

	return (
		<div data-slot="file-upload" className={cn('w-full space-y-2', className)}>
			<input
				ref={inputRef}
				type="file"
				className="sr-only"
				multiple={multiple}
				accept={accept}
				disabled={disabled}
				onChange={(e) => {
					if (e.target.files) addFiles(e.target.files);
					e.target.value = '';
				}}
			/>
			<div
				role="button"
				tabIndex={disabled ? -1 : 0}
				onKeyDown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						inputRef.current?.click();
					}
				}}
				onClick={() => !disabled && inputRef.current?.click()}
				onDragEnter={(e) => {
					e.preventDefault();
					setDragging(true);
				}}
				onDragOver={(e) => e.preventDefault()}
				onDragLeave={() => setDragging(false)}
				onDrop={onDrop}
				className={cn(
					'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center',
					'transition-colors duration-150',
					dragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/30 hover:bg-muted/50',
					disabled && 'pointer-events-none opacity-60',
				)}
			>
				<Upload className="size-5 text-muted-foreground" />
				<div className="text-[13px] font-medium text-foreground">Drop files or click to upload</div>
				<div className="text-xs text-muted-foreground">
					{multiple ? 'Multiple files supported' : 'Single file'}
				</div>
			</div>
			{files.length > 0 ? (
				<ul className="flex flex-col gap-1">
					{files.map((file, i) => (
						<li
							key={`${file.name}-${i}`}
							className="flex items-center gap-2 rounded-md border border-border bg-card px-2 py-1.5 text-[12.5px]"
						>
							<Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
							<span className="min-w-0 flex-1 truncate font-medium">{file.name}</span>
							<span className="shrink-0 tabular-nums text-muted-foreground">
								{formatBytes(file.size)}
							</span>
							<Button
								type="button"
								variant="ghost"
								size="icon-xs"
								aria-label={`Remove ${file.name}`}
								onClick={() => removeAt(i)}
							>
								<X className="size-3.5" />
							</Button>
						</li>
					))}
				</ul>
			) : null}
		</div>
	);
}

function formatBytes(n: number): string {
	if (n < 1024) return `${n} B`;
	if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
	return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export { FileUpload };
export type { FileUploadProps };

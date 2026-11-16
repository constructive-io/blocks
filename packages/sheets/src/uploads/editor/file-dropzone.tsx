// The drop target of the file editor: drop files, or press Enter or Space (or
// click) to pick them. Paste is handled by the editor around it.

import { useState } from 'react';
import type React from 'react';
import { UploadIcon } from 'lucide-react';

import { cn } from '../../utils/cn';
import { ADD_CONTROL } from './use-editor-focus';

interface FileDropzoneProps {
	/** What to call the files: "image", "file", "files". */
	noun: string;
	hint: string;
	disabled: boolean;
	onPick: () => void;
	onFiles: (files: File[]) => void;
	compact: boolean;
}

export function FileDropzone({ noun, hint, disabled, onPick, onFiles, compact }: FileDropzoneProps) {
	const [dragging, setDragging] = useState(false);

	const onDrag = (event: React.DragEvent, active: boolean) => {
		event.preventDefault();
		event.stopPropagation();
		if (!disabled) setDragging(active);
	};

	return (
		<div
			role="button"
			tabIndex={disabled ? -1 : 0}
			aria-disabled={disabled || undefined}
			aria-label={`Drop ${noun} here or press Enter to browse`}
			data-slot="file-dropzone"
			data-initial-focus={ADD_CONTROL}
			data-dragging={dragging || undefined}
			className={cn(
				// Same corner as the file rows above it; the full border token keeps the dashed edge visible in dark mode.
				'flex w-full cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-border',
				// Hover is instant: no transition on the highlight.
				'bg-muted/20 text-center outline-hidden hover:bg-muted/30',
				'focus-visible:ring-[3px] focus-visible:ring-ring/50',
				'data-[dragging=true]:border-primary/40 data-[dragging=true]:bg-accent/50',
				compact ? 'gap-1 px-4 py-3' : 'gap-2 px-4 py-6',
				disabled && 'pointer-events-none opacity-50',
			)}
			onClick={disabled ? undefined : onPick}
			onKeyDown={(event) => {
				if (disabled || (event.key !== 'Enter' && event.key !== ' ')) return;
				if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) return;
				event.preventDefault();
				onPick();
			}}
			onDragEnter={(event) => onDrag(event, true)}
			onDragOver={(event) => onDrag(event, true)}
			onDragLeave={(event) => onDrag(event, false)}
			onDrop={(event) => {
				onDrag(event, false);
				if (disabled) return;
				const files = Array.from(event.dataTransfer.files);
				if (files.length > 0) onFiles(files);
			}}
		>
			{!compact ? (
				<span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted/60" aria-hidden="true">
					<UploadIcon className="size-4 text-muted-foreground" />
				</span>
			) : null}
			<span className="text-sm font-medium">Drop {noun} here or browse</span>
			<span className="text-xs text-muted-foreground">{hint}</span>
		</div>
	);
}

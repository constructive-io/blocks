'use client';

import { CircleAlert, FileText, X } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Spinner } from '../spinner';
import { MarkTile } from './mark-tile';

type PromptInputAttachmentStatus = 'uploading' | 'ready' | 'error';

type PromptInputAttachmentProps = Omit<React.ComponentProps<'div'>, 'children'> & {
	name: string;
	/** Secondary line, e.g. "PDF · 2.4 MB" or an error reason. */
	meta?: React.ReactNode;
	/** Image preview URL. Falls back to `icon`, then a document glyph. */
	previewUrl?: string;
	icon?: React.ReactNode;
	status?: PromptInputAttachmentStatus;
	onRemove?: () => void;
};

/**
 * Staged file chip shown inside a composer before sending: thumbnail or icon,
 * name, meta, upload state, and remove.
 */
function PromptInputAttachment({
	name,
	meta,
	previewUrl,
	icon,
	status = 'ready',
	onRemove,
	className,
	...props
}: PromptInputAttachmentProps) {
	return (
		<div
			data-slot="prompt-input-attachment"
			data-status={status}
			className={cn(
				'relative flex h-10 max-w-56 min-w-0 items-center gap-2 rounded-lg bg-muted/70 pr-1.5 pl-1 text-left dark:bg-muted',
				status === 'error' && 'bg-destructive/8 dark:bg-destructive/16',
				className,
			)}
			{...props}
		>
			<MarkTile size="md" className={cn('rounded-md', status === 'error' && 'text-destructive')}>
				{status === 'uploading' ? (
					<Spinner aria-hidden="true" role={undefined} className="size-4" strokeWidth={1.5} />
				) : status === 'error' ? (
					<CircleAlert />
				) : previewUrl ? (
					<img src={previewUrl} alt="" className="size-full object-cover" />
				) : (
					(icon ?? <FileText />)
				)}
			</MarkTile>
			<div className="min-w-0 flex-1 leading-tight">
				<p className="truncate text-[13px] text-foreground">{name}</p>
				{meta ? (
					<p className={cn('truncate text-xs', status === 'error' ? 'text-destructive' : 'text-muted-foreground')}>{meta}</p>
				) : null}
			</div>
			{status === 'uploading' ? <span className="sr-only">Uploading</span> : null}
			{onRemove ? (
				<button
					type="button"
					aria-label={`Remove ${name}`}
					onClick={onRemove}
					className="relative grid size-5 shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground outline-none before:absolute before:-inset-2 hover:bg-overlay-active hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 pointer-coarse:before:-inset-3"
				>
					<X aria-hidden="true" className="size-3" />
				</button>
			) : null}
		</div>
	);
}

type PromptInputAttachmentsProps = React.ComponentProps<'div'>;

/** Wrapping row of attachment chips, placed above the textarea. */
function PromptInputAttachments({ className, ...props }: PromptInputAttachmentsProps) {
	return (
		<div
			role="group"
			aria-label="Attachments"
			data-slot="prompt-input-attachments"
			className={cn('flex flex-wrap gap-1.5 px-1 pt-0.5 pb-1 [&>*]:shrink-0', className)}
			{...props}
		/>
	);
}

export { PromptInputAttachment, PromptInputAttachments };
export type { PromptInputAttachmentProps, PromptInputAttachmentsProps, PromptInputAttachmentStatus };

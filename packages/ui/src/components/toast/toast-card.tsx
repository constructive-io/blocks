'use client';

import { useState } from 'react';
import { CheckIcon, CopyIcon, XIcon } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import {
	Dialog,
	DialogClose,
	DialogFooter,
	DialogHeader,
	DialogPanel,
	DialogPopup,
	DialogTitle,
} from '../dialog';

const LONG_DESCRIPTION_THRESHOLD = 140;

function isLongDescription(description?: string) {
	if (!description) return false;
	return description.length > LONG_DESCRIPTION_THRESHOLD || description.includes('\n');
}

export interface ToastTone {
	/** Border colour classes. */
	border: string;
	/** Colour classes for the leading icon. */
	icon: string;
	/** Colour classes for the message. */
	message: string;
	/** Colour classes for the action button. */
	action: string;
}

export interface ToastCardProps {
	toastId: string | number;
	message: string;
	description?: string;
	action?: {
		label: string;
		onClick: () => void;
	};
	onDismiss?: () => void;
	icon: React.ComponentType<{ className?: string; size?: number; 'aria-hidden'?: boolean | 'true' | 'false' }>;
	closeLabel: string;
	tone: ToastTone;
}

/**
 * Shared body of every toast variant. The description clamps to three lines; a long or
 * multi-line one (an error trace, a pasted message) gets a "View details" dialog with the
 * full text and a copy button, so no toast can grow past the viewport.
 */
export function ToastCard({ toastId, message, description, action, onDismiss, icon: Icon, closeLabel, tone }: ToastCardProps) {
	const [detailsOpen, setDetailsOpen] = useState(false);
	const [copied, setCopied] = useState(false);
	const showDetails = isLongDescription(description);

	const handleCopy = async () => {
		if (!description) return;
		try {
			await navigator.clipboard.writeText(description);
			setCopied(true);
			setTimeout(() => setCopied(false), 1500);
		} catch {
			// Clipboard may be unavailable (e.g., insecure context) — silently ignore.
		}
	};

	return (
		<>
			<div
				className={cn(
					'bg-background text-foreground w-full rounded-lg border px-4 py-3 shadow-lg sm:w-[var(--width)]',
					tone.border,
				)}
			>
				<div className='flex gap-2'>
					<div className='flex min-w-0 grow gap-3'>
						<Icon className={cn('mt-0.5 shrink-0', tone.icon)} size={16} aria-hidden='true' />
						<div className='flex min-w-0 grow flex-col gap-1'>
							<p className={cn('text-sm font-medium break-words', tone.message)}>{message}</p>
							{description && (
								<p className='text-muted-foreground line-clamp-3 text-sm break-words'>{description}</p>
							)}
							{(showDetails || action) && (
								<div className='flex flex-wrap gap-x-4 gap-y-1'>
									{showDetails && (
										<button
											className='text-muted-foreground hover:text-foreground text-xs font-medium underline underline-offset-2 decoration-dotted'
											onClick={() => setDetailsOpen(true)}
										>
											View details
										</button>
									)}
									{action && (
										<button
											className={cn('text-start text-sm font-medium hover:underline', tone.action)}
											onClick={action.onClick}
										>
											{action.label}
										</button>
									)}
								</div>
							)}
						</div>
					</div>
					<Button
						variant='ghost'
						className='group -my-1.5 -me-2 size-8 shrink-0 p-0 hover:bg-transparent'
						onClick={() => {
							toast.dismiss(toastId);
							onDismiss?.();
						}}
						aria-label={closeLabel}
					>
						<XIcon size={16} className='opacity-60 transition-opacity group-hover:opacity-100' aria-hidden='true' />
					</Button>
				</div>
			</div>

			{showDetails && description && (
				<Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
					<DialogPopup className='max-w-2xl'>
						<DialogHeader>
							<DialogTitle>{message}</DialogTitle>
						</DialogHeader>
						<DialogPanel>
							<pre className='bg-muted text-foreground rounded-md p-3 text-xs break-words whitespace-pre-wrap'>
								{description}
							</pre>
						</DialogPanel>
						<DialogFooter>
							<Button variant='outline' size='sm' onClick={handleCopy}>
								{copied ? <CheckIcon size={14} aria-hidden='true' /> : <CopyIcon size={14} aria-hidden='true' />}
								{copied ? 'Copied' : 'Copy'}
							</Button>
							<DialogClose asChild>
								<Button size='sm'>Close</Button>
							</DialogClose>
						</DialogFooter>
					</DialogPopup>
				</Dialog>
			)}
		</>
	);
}

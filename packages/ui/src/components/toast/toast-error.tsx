'use client';

import { useState } from 'react';
import { AlertCircleIcon, CheckIcon, CopyIcon, XIcon } from 'lucide-react';
import { toast } from 'sonner';

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

export interface ToastErrorProps {
	message: string;
	description?: string;
	action?: {
		label: string;
		onClick: () => void;
	};
	onDismiss?: () => void;
}

const LONG_DESCRIPTION_THRESHOLD = 140;

function isLongDescription(description?: string) {
	if (!description) return false;
	return description.length > LONG_DESCRIPTION_THRESHOLD || description.includes('\n');
}

function ToastErrorContent({
	toastId,
	message,
	description,
	action,
	onDismiss,
}: ToastErrorProps & { toastId: string | number }) {
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
				className='bg-background text-foreground border-destructive/20 w-full rounded-md border px-4 py-3 shadow-lg
					sm:w-[var(--width)]'
			>
				<div className='flex gap-2'>
					<div className='flex min-w-0 grow gap-3'>
						<AlertCircleIcon className='text-destructive mt-0.5 shrink-0' size={16} aria-hidden='true' />
						<div className='flex min-w-0 grow flex-col gap-1'>
							<p className='text-destructive text-sm font-medium break-words'>{message}</p>
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
											className='text-destructive text-sm font-medium hover:underline'
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
						aria-label='Close error notification'
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

export function showErrorToast(props: ToastErrorProps) {
	return toast.custom((t) => <ToastErrorContent toastId={t} {...props} />, {
		duration: Infinity,
	});
}

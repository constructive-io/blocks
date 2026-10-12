'use client';

import { XIcon } from 'lucide-react';
import { toast } from 'sonner';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { openToastDetails } from './toast-details';

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
	const showDetails = isLongDescription(description);

	return (
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
								{showDetails && description && (
									<button
										type='button'
										className='text-muted-foreground hover:text-foreground text-xs font-medium underline underline-offset-2 decoration-dotted'
										onClick={(event) => openToastDetails({ title: message, description, trigger: event.currentTarget })}
									>
										View details
									</button>
								)}
								{action && (
									<button
										type='button'
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
	);
}

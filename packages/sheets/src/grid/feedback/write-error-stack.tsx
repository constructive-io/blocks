'use client';

import { RiCloseLine, RiErrorWarningLine } from '@remixicon/react';

import { cn } from '../../utils/cn';
import { useFeedback } from './feedback-context';

/**
 * Failed writes, each with every message the server returned. They stay until
 * the user dismisses them, so a message is never lost to a timeout.
 */
export function WriteErrorStack({ className }: { className?: string }) {
	const { state, dismissWriteError } = useFeedback();
	if (state.writeErrors.length === 0) return null;
	return (
		<div className={cn('pointer-events-auto flex w-[min(28rem,calc(100vw-2rem))] flex-col gap-2', className)} data-part-id='sheets-write-errors'>
			{state.writeErrors.map((report) => (
				<div
					key={report.id}
					role='alert'
					data-part-id='sheets-write-error'
					className='border-destructive/30 bg-background flex items-start gap-2 rounded-lg border px-3 py-2 shadow-lg'
				>
					<RiErrorWarningLine className='text-destructive mt-0.5 size-4 shrink-0' aria-hidden='true' />
					<div className='min-w-0 flex-1'>
						<p className='text-foreground text-sm font-medium [overflow-wrap:anywhere]'>{report.title}</p>
						{report.messages.length === 1 ? (
							<p className='text-muted-foreground text-sm [overflow-wrap:anywhere]'>{report.messages[0]}</p>
						) : (
							<ul className='text-muted-foreground list-disc ps-4 text-sm'>
								{report.messages.map((message) => (
									<li key={message} className='[overflow-wrap:anywhere]'>
										{message}
									</li>
								))}
							</ul>
						)}
					</div>
					<button
						type='button'
						className='text-muted-foreground hover:text-foreground -mr-1 rounded p-0.5'
						aria-label='Dismiss'
						onClick={() => dismissWriteError(report.id)}
					>
						<RiCloseLine className='size-4' aria-hidden='true' />
					</button>
				</div>
			))}
		</div>
	);
}

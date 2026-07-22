'use client';

import { useCallback } from 'react';
import { RiCheckLine, RiCloseLine, RiErrorWarningLine, RiLoader4Line } from '@remixicon/react';
import { AnimatePresence, motion } from 'motion/react';

import { springs } from '../../utils/motion-config';
import { cn } from '../../utils/cn';
import { Button } from '@constructive-io/ui/button';

import { useOperationFeedback, useFeedback } from './feedback-context';
import type { OperationFeedback } from './feedback-reducer';

interface DockStatusBarProps {
	className?: string;
	/** Called when user clicks retry on a failed/partial operation */
	onRetry?: () => void;
}

/**
 * Inline status bar that appears in the floating dock during bulk operations.
 * Replaces toast notifications for delete, submit, and batch update operations.
 *
 * Shows:
 * - Progress spinner + message during pending operations
 * - Success checkmark + message (auto-dismisses)
 * - Error/partial warning + message with optional retry
 */
export function DockStatusBar({ className, onRetry }: DockStatusBarProps) {
	const operation = useOperationFeedback();
	const { clearOperationFeedback } = useFeedback();

	const handleDismiss = useCallback(() => {
		clearOperationFeedback();
	}, [clearOperationFeedback]);

	if (!operation) {
		return null;
	}

	return (
		<AnimatePresence mode='wait'>
			<motion.div
				key={operation.id}
				initial={{ opacity: 0, x: 20 }}
				animate={{ opacity: 1, x: 0 }}
				exit={{ opacity: 0, x: -20 }}
				transition={springs.snappy}
				className={cn('flex items-center gap-2', className)}
			>
				<StatusIcon status={operation.status} />
				<span className='text-sm font-medium'>{operation.message}</span>

				{/* Retry button for errors/partial failures */}
				{(operation.status === 'error' || operation.status === 'partial') && onRetry && (
					<Button variant='ghost' size='sm' className='h-7 px-2 text-xs' onClick={onRetry}>
						Retry
					</Button>
				)}

				{/* Dismiss button for completed operations */}
				{operation.status !== 'pending' && (
					<Button
						variant='ghost'
						size='sm'
						className='text-muted-foreground hover:text-foreground h-7 w-7 p-0'
						onClick={handleDismiss}
						aria-label='Dismiss'
					>
						<RiCloseLine className='h-4 w-4' />
					</Button>
				)}
			</motion.div>
		</AnimatePresence>
	);
}

function StatusIcon({ status }: { status: OperationFeedback['status'] }) {
	switch (status) {
		case 'pending':
			return <RiLoader4Line className='text-muted-foreground h-4 w-4 animate-spin' />;
		case 'success':
			return <RiCheckLine className='h-4 w-4 text-emerald-500' />;
		case 'partial':
			return <RiErrorWarningLine className='h-4 w-4 text-amber-500' />;
		case 'error':
			return <RiErrorWarningLine className='h-4 w-4 text-red-500' />;
		default:
			return null;
	}
}

/**
 * Compact variant for space-constrained layouts.
 * Shows only icon + abbreviated message.
 */
export function DockStatusBarCompact({ className }: { className?: string }) {
	const operation = useOperationFeedback();
	const { clearOperationFeedback } = useFeedback();

	if (!operation) {
		return null;
	}

	const shortMessage = getShortMessage(operation);

	return (
		<AnimatePresence mode='wait'>
			<motion.button
				key={operation.id}
				initial={{ opacity: 0, scale: 0.9 }}
				animate={{ opacity: 1, scale: 1 }}
				exit={{ opacity: 0, scale: 0.9 }}
				transition={springs.snappy}
				className={cn(
					'flex items-center gap-1.5 rounded-full px-2.5 py-1',
					operation.status === 'pending' && 'bg-muted',
					operation.status === 'success' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
					operation.status === 'partial' && 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
					operation.status === 'error' && 'bg-red-500/10 text-red-600 dark:text-red-400',
					className,
				)}
				onClick={operation.status !== 'pending' ? clearOperationFeedback : undefined}
				disabled={operation.status === 'pending'}
			>
				<StatusIcon status={operation.status} />
				<span className='text-xs font-medium'>{shortMessage}</span>
			</motion.button>
		</AnimatePresence>
	);
}

function getShortMessage(operation: OperationFeedback): string {
	if (operation.status === 'pending') {
		return `${operation.completed}/${operation.total}`;
	}
	if (operation.status === 'success') {
		return `${operation.total} done`;
	}
	if (operation.status === 'partial') {
		return `${operation.failed} failed`;
	}
	return 'Failed';
}

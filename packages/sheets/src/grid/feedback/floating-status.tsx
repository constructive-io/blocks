'use client';

import { useCallback } from 'react';
import { RiCheckLine, RiCloseLine, RiErrorWarningLine, RiLoader4Line } from '@remixicon/react';
import { AnimatePresence, motion } from 'motion/react';

import { springs } from '../../utils/motion-config';
import { cn } from '../../utils/cn';

import { useOperationFeedback, useFeedback } from './feedback-context';
import type { OperationFeedback } from './feedback-reducer';

interface FloatingStatusProps {
	className?: string;
}

/**
 * Standalone floating status indicator for bulk operations.
 * Shows independently of row selection, positioned at bottom-center of grid.
 */
export function FloatingStatus({ className }: FloatingStatusProps) {
	const operation = useOperationFeedback();
	const { clearOperationFeedback } = useFeedback();

	const handleDismiss = useCallback(() => {
		clearOperationFeedback();
	}, [clearOperationFeedback]);

	return (
		<AnimatePresence>
			{operation && (
				<motion.div
					key={operation.id}
					initial={{ opacity: 0, y: 20, scale: 0.95 }}
					animate={{ opacity: 1, y: 0, scale: 1 }}
					exit={{ opacity: 0, y: 10, scale: 0.95 }}
					transition={springs.snappy}
					className={cn(
						'bg-background pointer-events-auto flex items-center gap-3 rounded-full border px-4 py-2 shadow-lg',
						className,
					)}
				>
					<StatusIcon status={operation.status} />
					<span className='text-sm font-medium'>{operation.message}</span>

					{/* Dismiss button for completed operations */}
					{operation.status !== 'pending' && (
						<button
							type='button'
							className='text-muted-foreground hover:text-foreground -mr-1 rounded-full p-1 transition-colors'
							onClick={handleDismiss}
							aria-label='Dismiss'
						>
							<RiCloseLine className='h-4 w-4' />
						</button>
					)}
				</motion.div>
			)}
		</AnimatePresence>
	);
}

function StatusIcon({ status }: { status: OperationFeedback['status'] }) {
	const baseClass = 'h-4 w-4';

	switch (status) {
		case 'pending':
			return <RiLoader4Line className={cn(baseClass, 'text-muted-foreground animate-spin')} />;
		case 'success':
			return <RiCheckLine className={cn(baseClass, 'text-emerald-500')} />;
		case 'partial':
			return <RiErrorWarningLine className={cn(baseClass, 'text-amber-500')} />;
		case 'error':
			return <RiErrorWarningLine className={cn(baseClass, 'text-red-500')} />;
		default:
			return null;
	}
}

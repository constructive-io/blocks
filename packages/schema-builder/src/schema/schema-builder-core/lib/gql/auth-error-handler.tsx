'use client';

import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RiLockLine } from '@remixicon/react';

import { cn } from '@/lib/utils';

import { DataError, DataErrorType, Errors, parseError } from '../data';

// ============================================================================
// Auth Error Detection
// ============================================================================

/**
 * Check if an error is an authentication error (expired/missing session).
 */
export function isAuthError(error: unknown): boolean {
	return Errors.match(error, DataErrorType.UNAUTHORIZED);
}

// ============================================================================
// Auth Error Banner Component
// ============================================================================

interface AuthErrorBannerProps {
	error: Error | DataError;
	/** Custom message override; defaults to the parsed error's user message. */
	message?: string;
	className?: string;
}

/**
 * Inline banner shown when a request fails auth. The block owns no router, so
 * it cannot redirect — it clears the stale (authenticated) query cache once and
 * tells the viewer to sign in again. The host is responsible for re-auth.
 */
export function AuthErrorBanner({ error, message, className }: AuthErrorBannerProps) {
	const queryClient = useQueryClient();

	useEffect(() => {
		queryClient.clear();
	}, [queryClient]);

	const dataError = error instanceof DataError ? error : parseError(error);
	const displayMessage = message || dataError.getUserMessage();

	return (
		<div
			className={cn(
				'rounded-lg border overflow-hidden',
				'bg-amber-50 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-900/50',
				className
			)}
		>
			<div className='flex items-center gap-4 px-4 py-3'>
				<div className='flex h-9 w-9 items-center justify-center rounded-md shrink-0 bg-amber-100 dark:bg-amber-900/50 border border-amber-200/60 dark:border-amber-800/50'>
					<RiLockLine className='h-4.5 w-4.5 text-amber-600 dark:text-amber-400' />
				</div>

				<div className='flex-1 min-w-0'>
					<p className='text-sm font-medium text-foreground'>Session Expired</p>
					<p className='text-xs text-muted-foreground'>{displayMessage}</p>
				</div>

				<span className='text-xs text-amber-700 dark:text-amber-300 font-medium shrink-0'>
					Sign in again
				</span>
			</div>
		</div>
	);
}

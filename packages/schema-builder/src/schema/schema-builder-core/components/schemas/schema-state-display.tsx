'use client';

import { memo } from 'react';
import { RiDatabase2Line } from '@remixicon/react';

import { cn } from '@/lib/utils';
import type { DataError } from '../../lib/data';
import { type BaseStateConfig, ErrorBanner, InfoBanner } from '../shared/base-state-display';
import {
	SchemaBuilderSkeleton,
	SchemaBuilderSidebarSkeletonFaded,
	SchemaBuilderEditorSkeletonFaded,
} from '../skeletons';

// ============================================================================
// Types
// ============================================================================

export type SchemaStateType = 'loading' | 'error' | 'syncing';

export interface SchemaStateConfig {
	type: SchemaStateType;
	message?: string;
	onRetry?: () => void;
	/** Original error object for auth error detection */
	error?: Error | DataError | null;
}

// ============================================================================
// State Display Components
// ============================================================================

/**
 * Syncing banner - shows at top while syncing in background
 */
export function SyncingBanner() {
	return (
		<div className='flex items-center gap-2 border-b px-4 py-2 text-sm bg-zinc-100 dark:bg-zinc-900 border-zinc-200/60 dark:border-zinc-800/50 text-zinc-600 dark:text-zinc-400'>
			<span className='h-2 w-2 animate-pulse rounded-full bg-blue-500' aria-hidden />
			Syncing your database schemas...
		</div>
	);
}

/**
 * Empty state - no databases available
 */
export function EmptyState() {
	return (
		<div className='flex flex-1 min-h-0 overflow-hidden'>
			{/* Skeleton sidebar */}
			<SchemaBuilderSidebarSkeletonFaded />

			{/* Main content */}
			<div className='flex-1 flex flex-col'>
				{/* Info banner */}
				<div className='mx-3 mt-3'>
					<InfoBanner
						icon={RiDatabase2Line}
						title='No databases'
						description='Create a database to start building your schema'
					/>
				</div>

				{/* Faded editor skeleton */}
				<SchemaBuilderEditorSkeletonFaded />
			</div>
		</div>
	);
}

// ============================================================================
// Main Component
// ============================================================================

interface SchemaStateDisplayProps {
	config: SchemaStateConfig;
	className?: string;
}

/**
 * Schema builder state display component
 *
 * Features:
 * - Loading states show skeleton UI mimicking schema builder layout
 * - Error states display as horizontal banners with auth error detection
 * - Syncing state shows a subtle top banner
 * - Works in both light and dark modes
 */
export const SchemaStateDisplay = memo(function SchemaStateDisplay({
	config,
	className,
}: SchemaStateDisplayProps) {
	// Loading state - show full skeleton
	if (config.type === 'loading') {
		return (
			<div className={cn('flex flex-1 min-h-0', className)}>
				<SchemaBuilderSkeleton />
			</div>
		);
	}

	// Error state - horizontal banner with skeleton background
	if (config.type === 'error') {
		return (
			<div className={cn('flex flex-1 min-h-0', className)}>
				<div className='flex flex-1 min-h-0 overflow-hidden'>
					{/* Skeleton sidebar for context */}
					<SchemaBuilderSidebarSkeletonFaded />

					{/* Main content with error */}
					<div className='flex-1 flex flex-col'>
						{/* Error banner */}
						<div className='mx-3 mt-3'>
							<ErrorBanner
								config={config as BaseStateConfig}
								title='Failed to load databases'
							/>
						</div>

						{/* Faded editor skeleton */}
						<SchemaBuilderEditorSkeletonFaded />
					</div>
				</div>
			</div>
		);
	}

	// Shouldn't reach here for 'syncing' - use SyncingBanner directly
	return null;
});

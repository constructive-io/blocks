'use client';

import { RiAddLine, RiErrorWarningLine, RiInboxLine } from '@remixicon/react';

import { Button } from '@constructive-io/ui/button';
import { cn } from '../../utils/cn';

function getErrorMessage(error: unknown): string {
	if (error instanceof Error) return error.message;
	if (typeof error === 'string') return error;
	return 'Something went wrong while loading this table.';
}

interface SheetsStateShellProps {
	className?: string;
	children: React.ReactNode;
}

/** Centered, full-size container shared by the error/empty/loading states. */
function SheetsStateShell({ className, children }: SheetsStateShellProps) {
	return (
		<div
			className={cn(
				'bg-background flex h-full min-h-0 flex-1 flex-col items-center justify-center gap-3 rounded-lg border p-8 text-center',
				className,
			)}
		>
			{children}
		</div>
	);
}

interface SheetsErrorStateProps {
	error: unknown;
	onRetry?: () => void;
}

/** Shown when the table data (or its metadata) fails to load. */
export function SheetsErrorState({ error, onRetry }: SheetsErrorStateProps) {
	return (
		<SheetsStateShell>
			<RiErrorWarningLine className='text-destructive h-8 w-8' />
			<div className='space-y-1'>
				<p className='text-foreground text-sm font-medium'>Failed to load data</p>
				<p className='text-muted-foreground max-w-md text-sm'>{getErrorMessage(error)}</p>
			</div>
			{onRetry && (
				<Button variant='outline' size='sm' onClick={onRetry}>
					Retry
				</Button>
			)}
		</SheetsStateShell>
	);
}

interface SheetsEmptyStateProps {
	tableName?: string;
	onAddRow?: () => void;
	readOnlyReason?: string | null;
}

/** Shown when the table loaded successfully but has no rows. */
export function SheetsEmptyState({ tableName, onAddRow, readOnlyReason }: SheetsEmptyStateProps) {
	return (
		<SheetsStateShell>
			<RiInboxLine className='text-muted-foreground h-8 w-8' />
			<div className='space-y-1'>
				<p className='text-foreground text-sm font-medium'>No rows yet</p>
				<p className='text-muted-foreground max-w-md text-sm'>
					{readOnlyReason ?? (tableName ? `The "${tableName}" table is empty.` : 'This table is empty.')}
				</p>
			</div>
			{onAddRow && (
				<Button variant='outline' size='sm' onClick={onAddRow}>
					<RiAddLine className='h-4 w-4' />
					<span className='ms-1'>Add row</span>
				</Button>
			)}
		</SheetsStateShell>
	);
}

/** Column-width hints (px) for the skeleton bars — varied so it reads as a real table. */
const SKELETON_COLS = [120, 88, 152, 64, 108, 132, 80];
const SKELETON_ROWS = 12;

/**
 * Shown during the initial data load. A STRUCTURAL skeleton of the grid (baseline-ui:
 * prefer skeletons over spinners) — mirrors the real grid's 40px header + 44px rows +
 * horizontal hairlines so the load→loaded swap doesn't jump. Pulse is motion-safe only.
 */
export function SheetsLoadingState() {
	return (
		<div
			className='bg-background flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-lg border'
			role='status'
			aria-busy='true'
			aria-label='Loading data'
		>
			<div className='flex shrink-0 items-center gap-6 border-b px-3' style={{ height: 40 }}>
				{SKELETON_COLS.map((w, i) => (
					<div key={i} className='bg-muted h-2.5 shrink-0 rounded-sm' style={{ width: Math.round(w * 0.7) }} />
				))}
			</div>
			{Array.from({ length: SKELETON_ROWS }).map((_, r) => (
				<div key={r} className='flex shrink-0 items-center gap-6 border-b px-3' style={{ height: 44 }}>
					{SKELETON_COLS.map((w, i) => (
						<div key={i} className='bg-muted/60 h-3 shrink-0 rounded-sm motion-safe:animate-pulse' style={{ width: w }} />
					))}
				</div>
			))}
		</div>
	);
}

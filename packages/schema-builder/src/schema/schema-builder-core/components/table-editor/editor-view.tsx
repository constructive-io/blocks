'use client';

import type { ReactNode } from 'react';
import { focusRingClass, TooltipIconButton } from '@constructive-io/ui/workspace-kit';
import { Table2, Trash2, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Shared frame for the table-scoped views (Relationships, Indexes, Policies):
 * a scrolling column, a compact header with a count line and one action, and
 * the list below. Keeps the three views on one scale.
 */
export function EditorView({
	title,
	description,
	actions,
	children,
	className,
	...data
}: {
	title: string;
	description?: ReactNode;
	actions?: ReactNode;
	children: ReactNode;
	className?: string;
} & Record<`data-${string}`, string | undefined>) {
	return (
		<div className={cn('flex min-h-0 flex-1 flex-col overflow-auto', className)} {...data}>
			<div className='mx-auto flex w-full max-w-3xl min-w-0 flex-col gap-4 px-4 py-5 sm:px-6'>
				<header className='flex items-center justify-between gap-3'>
					<div className='min-w-0'>
						<h2 className='text-foreground text-base font-medium tracking-tight'>{title}</h2>
						{description ? <p className='text-muted-foreground mt-0.5 text-[13px]'>{description}</p> : null}
					</div>
					{actions ? <div className='flex shrink-0 items-center gap-1.5'>{actions}</div> : null}
				</header>
				{children}
			</div>
		</div>
	);
}

/** An identifier inside running text, such as the table a view is scoped to. */
export function InlineCode({ children }: { children: ReactNode }) {
	return <code className='bg-muted/70 text-foreground/85 rounded px-1 py-px font-mono text-xs'>{children}</code>;
}

/** A clickable list card: a quiet surface that opens its editor; actions inside reveal on hover or focus. */
export const editorCardClass = cn(
	'group/card relative cursor-pointer rounded-xl bg-card px-4 py-3 shadow-card',
	'hover:bg-[color-mix(in_oklab,var(--card),var(--foreground)_2.5%)]',
	focusRingClass,
);

/** A trailing destructive icon button for a list card, visible on hover, focus, and touch. */
export function CardDeleteButton({ label, onDelete }: { label: string; onDelete: () => void }) {
	return (
		<TooltipIconButton
			className={cn(
				'hover:bg-destructive/10 hover:text-destructive',
				'opacity-0 group-hover/card:opacity-100 group-focus-within/card:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100',
			)}
			extendHitArea={false}
			label={label}
			onClick={(event) => {
				event.stopPropagation();
				onDelete();
			}}
		>
			<Trash2 aria-hidden='true' className='size-3.5' />
		</TooltipIconButton>
	);
}

/** A small tinted label naming a kind: relationship type, index method, uniqueness. */
export function KindBadge({ className, children }: { className?: string; children: ReactNode }) {
	return (
		<span className={cn('inline-flex h-5 shrink-0 items-center rounded-md px-1.5 text-[11px] font-medium whitespace-nowrap', className)}>
			{children}
		</span>
	);
}

/** Chip styling for an identifier that can light up when its counterpart is hovered. */
export function linkedChipClass(state: 'idle' | 'source' | 'linked') {
	return cn(
		'inline-flex h-7 min-w-0 items-center rounded-md px-2 font-mono text-xs ring-1 ring-inset',
		state === 'idle' && 'bg-muted/50 ring-foreground/[0.07]',
		// The hovered chip firms up; its counterparts take the Constructive blue.
		state === 'source' && 'bg-muted/70 ring-primary/40',
		state === 'linked' && 'bg-primary/[0.08] ring-primary/35',
	);
}

/** Centered prompt shown when a table-scoped view has no table to show. */
export function NoTableSelectedState({ subject, icon: Icon = Table2 }: { subject: string; icon?: LucideIcon }) {
	return (
		<div className='flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center'>
			<span className='bg-muted text-muted-foreground grid size-10 place-items-center rounded-xl'>
				<Icon aria-hidden='true' className='size-4' />
			</span>
			<div>
				<h3 className='text-foreground text-sm font-medium'>No table selected</h3>
				<p className='text-muted-foreground mt-0.5 max-w-xs text-[13px]'>Choose a table in the sidebar to see its {subject}.</p>
			</div>
		</div>
	);
}

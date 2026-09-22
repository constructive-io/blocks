import type { ReactNode } from 'react';

import { cn } from '../../lib/utils';

/** Section shell for the kitchen sink — numbered, anchored, evenly spaced. */
export function Section({
	id,
	index,
	title,
	description,
	children,
}: {
	id: string;
	index: string;
	title: string;
	description?: string;
	children: ReactNode;
}) {
	return (
		<section id={id} className='scroll-mt-24'>
			<header className='mb-4 flex items-baseline gap-3 border-b border-border/60 pb-3'>
				<span className='font-mono text-[11px] text-muted-foreground'>{index}</span>
				<h2 className='text-base font-semibold tracking-tight'>{title}</h2>
				{description ? <p className='text-sm text-muted-foreground'>{description}</p> : null}
			</header>
			<div className='grid grid-cols-1 gap-3 md:grid-cols-2'>{children}</div>
		</section>
	);
}

/** A labeled specimen cell. Use `wide` to span the full grid width. */
export function Specimen({
	label,
	hint,
	wide,
	center,
	className,
	children,
}: {
	label: string;
	hint?: string;
	wide?: boolean;
	/** Center the demo content (default for small controls). */
	center?: boolean;
	className?: string;
	children: ReactNode;
}) {
	return (
		<div
			className={cn(
				'flex min-w-0 flex-col rounded-lg bg-card shadow-card',
				wide && 'md:col-span-2',
				className,
			)}
		>
			<div className='flex items-baseline justify-between gap-2 border-b border-border/60 px-4 py-2'>
				<span className='text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground'>
					{label}
				</span>
				{hint ? <span className='text-[11px] text-muted-foreground/70'>{hint}</span> : null}
			</div>
			<div className={cn('flex-1 p-4', center && 'flex items-center justify-center')}>{children}</div>
		</div>
	);
}

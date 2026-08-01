'use client';

import { Check, ChevronDown, Loader2, RotateCcw, X } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from '../collapsible';

type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

type TaskDetail = {
	label: React.ReactNode;
	meta?: React.ReactNode;
};

type TaskRowProps = {
	label: React.ReactNode;
	meta?: React.ReactNode;
	status: TaskStatus;
	/** 0–100 while running. */
	progress?: number;
	details?: TaskDetail[];
	onRetry?: () => void;
	className?: string;
	defaultOpen?: boolean;
	/** Stagger index for enter animation. */
	index?: number;
};

function TaskRow({
	label,
	meta,
	status,
	progress,
	details,
	onRetry,
	className,
	defaultOpen = false,
	index = 0,
}: TaskRowProps) {
	const hasDetails = Boolean(details?.length);

	const badge = (
		<span className="relative flex size-6 shrink-0 items-center justify-center">
			{status === 'running' ? (
				<>
					<svg width="24" height="24" className="absolute inset-0 animate-spin motion-reduce:animate-none" style={{ animationDuration: '1.1s' }}>
						<circle cx="12" cy="12" r="10" fill="none" stroke="var(--border)" strokeWidth="2" />
						<circle
							cx="12"
							cy="12"
							r="10"
							fill="none"
							stroke="var(--muted-foreground)"
							strokeWidth="2"
							strokeLinecap="round"
							strokeDasharray={`${2 * Math.PI * 10 * 0.28} ${2 * Math.PI * 10 * 0.72}`}
						/>
					</svg>
					{progress != null ? (
						<span className="relative text-[10px] font-semibold tabular-nums text-foreground">
							{Math.round(progress)}
						</span>
					) : (
						<Loader2 className="relative size-3 animate-spin text-muted-foreground motion-reduce:animate-none" />
					)}
				</>
			) : status === 'completed' ? (
				<span className="flex size-5 items-center justify-center rounded-full bg-success text-white">
					<Check className="size-3" strokeWidth={3} />
				</span>
			) : status === 'failed' ? (
				<span className="flex size-5 items-center justify-center rounded-full bg-destructive text-white">
					<X className="size-3" strokeWidth={3} />
				</span>
			) : (
				<span className="size-5 rounded-full border border-border" />
			)}
		</span>
	);

	const pill =
		status === 'completed' ? (
			<span className="inline-flex h-5 items-center rounded-full bg-success/10 px-2 text-[11.5px] font-medium text-success">
				Completed
			</span>
		) : status === 'failed' ? (
			<span className="inline-flex items-center gap-1">
				<span className="inline-flex h-5 items-center rounded-full bg-destructive/10 px-2 text-[11.5px] font-medium text-destructive">
					Failed
				</span>
				{onRetry ? (
					<Button type="button" variant="ghost" size="icon-xs" aria-label="Retry" onClick={onRetry}>
						<RotateCcw className="size-3" />
					</Button>
				) : null}
			</span>
		) : null;

	const header = (
		<div className="flex min-w-0 flex-1 items-center gap-2.5">
			{badge}
			<div className="min-w-0 flex-1">
				<div className="truncate text-[13px] font-medium text-foreground">{label}</div>
				{meta ? <div className="truncate text-[12px] text-muted-foreground">{meta}</div> : null}
			</div>
			{pill}
			{hasDetails ? (
				<ChevronDown data-slot="collapsible-icon" className="size-3.5 shrink-0 text-muted-foreground/60" />
			) : null}
		</div>
	);

	return (
		<div
			data-slot="task-row"
			data-status={status}
			className={cn(
				'rounded-lg border border-border/80 bg-card px-2.5 py-2 shadow-xs',
				'animate-[ai-fade-up_300ms_cubic-bezier(0.23,1,0.32,1)_both] motion-reduce:animate-none',
				className,
			)}
			style={{ animationDelay: `${index * 80}ms` }}
		>
			{hasDetails ? (
				<Collapsible defaultOpen={defaultOpen} className="group/collapsible">
					<CollapsibleTrigger className="w-full text-left">{header}</CollapsibleTrigger>
					<CollapsiblePanel innerClassName="py-1.5 pl-8">
						<ul className="space-y-1">
							{details!.map((d, i) => (
								<li key={i} className="flex items-center justify-between gap-2 text-[12px]">
									<span className="text-muted-foreground">{d.label}</span>
									{d.meta ? (
										<span className="font-mono tabular-nums text-muted-foreground/80">{d.meta}</span>
									) : null}
								</li>
							))}
						</ul>
					</CollapsiblePanel>
				</Collapsible>
			) : (
				header
			)}
		</div>
	);
}

type TaskListProps = {
	children: React.ReactNode;
	className?: string;
};

function TaskList({ children, className }: TaskListProps) {
	return (
		<div data-slot="task-list" className={cn('flex flex-col gap-2', className)}>
			{children}
		</div>
	);
}

export { TaskRow, TaskList };
export type { TaskRowProps, TaskStatus, TaskDetail, TaskListProps };

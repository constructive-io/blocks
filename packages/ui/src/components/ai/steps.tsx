'use client';

import { Check, ChevronDown, Circle, Loader2 } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from '../collapsible';

type StepsProps = {
	children: React.ReactNode;
	className?: string;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	defaultOpen?: boolean;
	/** Header label when collapsed/expanded. */
	title?: React.ReactNode;
};

function Steps({
	children,
	className,
	open,
	onOpenChange,
	defaultOpen = true,
	title = 'Steps',
}: StepsProps) {
	return (
		<Collapsible
			open={open}
			defaultOpen={defaultOpen}
			onOpenChange={onOpenChange}
			className={cn('w-full', className)}
			data-slot="steps"
		>
			<CollapsibleTrigger
				className={cn(
					'group flex w-fit items-center gap-1.5 rounded-md px-1.5 py-1 text-[13px]',
					'text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground',
				)}
			>
				<span className="font-medium">{title}</span>
				<ChevronDown data-slot="collapsible-icon" className="size-3.5 opacity-60" />
			</CollapsibleTrigger>
			<CollapsiblePanel innerClassName="py-1">
				<ol className="flex flex-col">{children}</ol>
			</CollapsiblePanel>
		</Collapsible>
	);
}

type StepStatus = 'pending' | 'running' | 'done' | 'error';

type StepProps = {
	children?: React.ReactNode;
	title: React.ReactNode;
	description?: React.ReactNode;
	status?: StepStatus;
	className?: string;
};

/**
 * Timeline step: icon sits in a fixed-width rail, connector is centered under the icon.
 * Avoid absolute -left offsets against border-l (they drift by icon size).
 */
function Step({ children, title, description, status = 'pending', className }: StepProps) {
	return (
		<li
			data-slot="step"
			data-status={status}
			className={cn('group/step relative flex gap-3', className)}
		>
			{/* Rail: fixed width, icon + vertical connector share the same center axis */}
			<div className="relative flex w-3.5 shrink-0 flex-col items-center">
				<span
					aria-hidden
					className={cn(
						'absolute top-3.5 bottom-0 left-1/2 w-px -translate-x-1/2 bg-border/70',
						// Hide connector under the last step
						'group-last/step:hidden',
					)}
				/>
				<span className="relative z-10 flex size-3.5 shrink-0 items-center justify-center bg-background">
					{status === 'running' ? (
						<Loader2 className="size-3 animate-spin text-primary motion-reduce:animate-none" />
					) : status === 'done' ? (
						<Check className="size-3 text-success" strokeWidth={2.5} />
					) : status === 'error' ? (
						<Circle className="size-2.5 fill-destructive text-destructive" />
					) : (
						<Circle className="size-2.5 text-muted-foreground/50" />
					)}
				</span>
			</div>

			<div className="min-w-0 flex-1 pb-3 text-[13px] group-last/step:pb-0">
				{/* Match first-line cap height to the 14px rail icon for optical vertical align */}
				<div
					className={cn(
						'flex min-h-3.5 items-center font-medium leading-none',
						status === 'done' && 'text-muted-foreground',
						status === 'pending' && 'text-muted-foreground',
						status === 'running' && 'text-foreground',
						status === 'error' && 'text-destructive',
					)}
				>
					{title}
				</div>
				{description ? (
					<div className="mt-1 text-xs leading-snug text-muted-foreground">{description}</div>
				) : null}
				{children ? <div className="mt-1.5 text-muted-foreground">{children}</div> : null}
			</div>
		</li>
	);
}

/** Alias for prompt-kit chain-of-thought naming. */
const ChainOfThought = Steps;
const ChainOfThoughtStep = Step;

export { Steps, Step, ChainOfThought, ChainOfThoughtStep };
export type { StepsProps, StepProps, StepStatus };

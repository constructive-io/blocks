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
				<ol className="relative ml-2 space-y-0 border-l border-border/70 pl-4">{children}</ol>
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

function Step({ children, title, description, status = 'pending', className }: StepProps) {
	return (
		<li
			data-slot="step"
			data-status={status}
			className={cn('relative pb-3 last:pb-0', className)}
		>
			<span className="absolute -left-[1.35rem] top-0.5 flex size-3.5 items-center justify-center bg-background">
				{status === 'running' ? (
					<Loader2 className="size-3 animate-spin text-primary motion-reduce:animate-none" />
				) : status === 'done' ? (
					<Check className="size-3 text-success" />
				) : status === 'error' ? (
					<Circle className="size-2.5 fill-destructive text-destructive" />
				) : (
					<Circle className="size-2.5 text-muted-foreground/50" />
				)}
			</span>
			<div className="min-w-0 text-[13px]">
				<div
					className={cn(
						'font-medium leading-snug',
						status === 'done' && 'text-muted-foreground',
						status === 'pending' && 'text-muted-foreground',
						status === 'running' && 'text-foreground',
						status === 'error' && 'text-destructive',
					)}
				>
					{title}
				</div>
				{description ? (
					<div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
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

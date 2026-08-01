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
			<CollapsiblePanel innerClassName="py-1.5">
				<ol className="flex flex-col" data-slot="steps-list">
					{children}
				</ol>
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
 * Timeline step with a flex-column rail:
 *   [ marker ]
 *   [  | line flex-1  ]  ← always centered under marker via items-center
 * No absolute -left offsets against border-l (those drift by icon size).
 */
function Step({ children, title, description, status = 'pending', className }: StepProps) {
	return (
		<li
			data-slot="step"
			data-status={status}
			className={cn('group/step flex items-stretch gap-3', className)}
		>
			{/* Rail column stretches to the full step height; line fills below the marker */}
			<div
				className="flex w-4 shrink-0 flex-col items-center"
				data-slot="step-rail"
			>
				<span
					data-slot="step-marker"
					className={cn(
						'relative z-10 flex size-4 shrink-0 items-center justify-center rounded-full',
						'bg-background',
						// Soft ring so the marker sits cleanly on top of the connector
						'ring-2 ring-background',
					)}
				>
					{status === 'running' ? (
						<Loader2 className="size-3.5 animate-spin text-primary motion-reduce:animate-none" />
					) : status === 'done' ? (
						<Check className="size-3.5 text-success" strokeWidth={2.5} />
					) : status === 'error' ? (
						<span className="size-2 rounded-full bg-destructive" />
					) : (
						<span className="size-2 rounded-full border-2 border-muted-foreground/45 bg-background" />
					)}
				</span>
				{/* Connector: flex-1 under the marker → perfectly centered by parent items-center */}
				<span
					aria-hidden
					data-slot="step-connector"
					className={cn(
						'w-px flex-1 bg-border',
						// Keep a little line under the last marker? No — stop at last icon.
						'group-last/step:hidden',
					)}
				/>
			</div>

			<div
				className={cn(
					'min-w-0 flex-1 text-[13px]',
					// Spacing between steps lives on content so the rail can stretch full height
					'pb-4 group-last/step:pb-0',
				)}
			>
				{/* Cap-height matches 16px marker for optical vertical alignment */}
				<div
					className={cn(
						'flex min-h-4 items-center font-medium leading-none',
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

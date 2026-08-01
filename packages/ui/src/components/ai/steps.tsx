'use client';

import { Check, ChevronDown, Circle, Loader2 } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from '../collapsible';

/** Rail width (px). Marker and line both center on left: 50% of this. */
const RAIL_W = 16;

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
 * Timeline step — continuous vertical line + marker share one center axis:
 *
 *   absolute left-1/2 -translate-x-1/2  on BOTH the line and the marker
 *   line runs the full row height (through the marker); marker bg covers it
 *   last step: line only reaches the marker center
 */
function Step({ children, title, description, status = 'pending', className }: StepProps) {
	return (
		<li
			data-slot="step"
			data-status={status}
			className={cn('group/step relative flex', className)}
		>
			{/* Rail: establishes width; line + marker are absolutely centered on it */}
			<div
				data-slot="step-rail"
				className="relative shrink-0 self-stretch"
				style={{ width: RAIL_W }}
			>
				{/* Continuous connector through the marker center */}
				<span
					aria-hidden
					data-slot="step-connector"
					className={cn(
						'pointer-events-none absolute left-1/2 w-px -translate-x-1/2 bg-border',
						// Full height of the step row…
						'top-0 bottom-0',
						// …except on the last step, stop at the marker midpoint (8px of 16px)
						'group-last/step:bottom-auto group-last/step:h-2',
					)}
				/>
				{/* Marker sits on the same left-1/2 axis; background punches the line */}
				<span
					data-slot="step-marker"
					className={cn(
						'absolute left-1/2 top-0 z-10 flex size-4 -translate-x-1/2 items-center justify-center',
						'rounded-full bg-background',
					)}
				>
					{status === 'running' ? (
						<Loader2 className="size-3.5 animate-spin text-primary motion-reduce:animate-none" />
					) : status === 'done' ? (
						<Check className="size-3.5 text-success" strokeWidth={2.5} />
					) : status === 'error' ? (
						<span className="size-2 rounded-full bg-destructive" />
					) : (
						// Hollow ring — border centers cleanly on the axis
						<span className="size-2 rounded-full border-2 border-muted-foreground/50 bg-background" />
					)}
				</span>
			</div>

			{/* Gutter between rail and copy */}
			<div
				className={cn(
					'min-w-0 flex-1 pl-3 text-[13px]',
					'pb-4 group-last/step:pb-0',
				)}
			>
				<div
					className={cn(
						// 16px min-height matches the marker so the title caps on the same line
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

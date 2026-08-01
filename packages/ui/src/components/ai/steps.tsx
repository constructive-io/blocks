'use client';

import { Check, ChevronDown, Loader2 } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from '../collapsible';

/** Marker diameter / rail width (px). */
const RAIL = 14;

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

function StepMarker({ status }: { status: StepStatus }) {
	return (
		<span
			data-slot="step-marker"
			className={cn(
				// relative so it participates in rail layout; z-10 sits above the absolute rule
				'relative z-10 flex shrink-0 items-center justify-center rounded-full',
				status === 'done' && 'bg-success text-white',
				status === 'running' && 'bg-primary/15 text-primary',
				status === 'error' && 'bg-destructive text-white',
				status === 'pending' && 'border-2 border-muted-foreground/40 bg-background',
			)}
			style={{ width: RAIL, height: RAIL }}
		>
			{status === 'running' ? (
				<Loader2 className="size-2.5 animate-spin motion-reduce:animate-none" strokeWidth={2.5} />
			) : status === 'done' ? (
				<Check className="size-2.5" strokeWidth={3} />
			) : null}
		</span>
	);
}

/**
 * Continuous timeline:
 *
 * ```
 *   ┃   absolute rule: left: calc(50% - 0.5px)  ← crisp 1px mid-axis
 *   ●   relative disk (same rail, items-center)
 *   ┃   flex-1 under the disk (hidden on last)
 *   ●
 *   ┃
 *   ○
 * ```
 *
 * The rule is drawn behind the disks and spans the full rail height so it
 * threads every marker center. Disks punch a hole with their own fill.
 */
function Step({ children, title, description, status = 'pending', className }: StepProps) {
	return (
		<li
			data-slot="step"
			data-status={status}
			className={cn('group/step flex items-stretch gap-3', className)}
		>
			{/* Rail stretches to full step height; children stack on a centered axis */}
			<div
				data-slot="step-rail"
				className="relative flex shrink-0 flex-col items-center"
				style={{ width: RAIL }}
			>
				{/* Full-height rule, pixel-snapped to the rail mid-axis */}
				<span
					aria-hidden
					data-slot="step-connector"
					className={cn(
						'pointer-events-none absolute top-0 w-px bg-border',
						// Through every marker… stop at last disk’s center
						'bottom-0 group-last/step:bottom-auto group-last/step:h-[7px]',
					)}
					style={{ left: 'calc(50% - 0.5px)' }}
				/>

				<StepMarker status={status} />

				{/* Flex spacer keeps rail height when content is short; line is absolute so this is layout only */}
				<span
					aria-hidden
					className="min-h-0 w-px flex-1 group-last/step:hidden"
				/>
			</div>

			<div className={cn('min-w-0 flex-1 text-[13px]', 'pb-4 group-last/step:pb-0')}>
				<div
					className={cn(
						'flex items-center font-medium leading-none',
						status === 'done' && 'text-muted-foreground',
						status === 'pending' && 'text-muted-foreground',
						status === 'running' && 'text-foreground',
						status === 'error' && 'text-destructive',
					)}
					style={{ minHeight: RAIL }}
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

'use client';

import { Check, ChevronDown, Loader2 } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from '../collapsible';

/** Marker / rail box edge in px. Line is centered with left: (SIZE - 1) / 2 — no transforms. */
const SIZE = 16;
const LINE_LEFT = (SIZE - 1) / 2; // 7.5 → crisp 1px on the rail mid-axis

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
 * Timeline step with a continuous rail:
 *
 * ```
 *   |          ← 1px line, left: 7.5px in a 16px rail (no translate)
 *   ●          ← marker absolute left:0 top:0 size 16, bg punches the line
 *   |
 *   ●
 *   |
 *   ●          ← last: line height only to marker center
 * ```
 */
function Step({ children, title, description, status = 'pending', className }: StepProps) {
	return (
		<li
			data-slot="step"
			data-status={status}
			className={cn('group/step relative flex', className)}
		>
			<div
				data-slot="step-rail"
				className="relative shrink-0 self-stretch"
				style={{ width: SIZE }}
			>
				{/* Vertical rule — same axis as marker center, no -translate-x (avoids half-pixel drift) */}
				<span
					aria-hidden
					data-slot="step-connector"
					className={cn(
						'pointer-events-none absolute top-0 w-px bg-border',
						// Full row height, except last step stops at marker midpoint
						'bottom-0 group-last/step:bottom-auto group-last/step:h-2',
					)}
					style={{ left: LINE_LEFT }}
				/>
				{/* Marker fills the rail width; line runs through its center behind the fill */}
				<span
					data-slot="step-marker"
					className="absolute top-0 left-0 z-10 flex items-center justify-center bg-background"
					style={{ width: SIZE, height: SIZE }}
				>
					{status === 'running' ? (
						<Loader2 className="size-3.5 animate-spin text-primary motion-reduce:animate-none" />
					) : status === 'done' ? (
						<Check className="size-3.5 text-success" strokeWidth={2.5} />
					) : status === 'error' ? (
						<span className="size-2 rounded-full bg-destructive" />
					) : (
						<span
							className="rounded-full border-2 border-muted-foreground/50 bg-background"
							style={{ width: 8, height: 8 }}
						/>
					)}
				</span>
			</div>

			<div className={cn('min-w-0 flex-1 pl-3 text-[13px]', 'pb-4 group-last/step:pb-0')}>
				<div
					className={cn(
						'flex items-center font-medium leading-none',
						status === 'done' && 'text-muted-foreground',
						status === 'pending' && 'text-muted-foreground',
						status === 'running' && 'text-foreground',
						status === 'error' && 'text-destructive',
					)}
					style={{ minHeight: SIZE }}
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

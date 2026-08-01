'use client';

import { Check, ChevronDown, Circle, CircleDashed, X } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from '../collapsible';

/**
 * Marker box (px). Icons are size-3.5 (14px); the box is slightly larger.
 * Odd rail keeps the 1px connector on an integer left: (RAIL - 1) / 2.
 */
const RAIL = 15;
/** Air between icon edge and the vertical segment (px). */
const GAP = 6;
/** Minimum visible connector length between short title-only steps (px). */
const MIN_SEGMENT = 12;

type StepStatus = 'pending' | 'running' | 'done' | 'error';

const STATUS_LABEL: Record<StepStatus, string> = {
	pending: 'Pending',
	running: 'In progress',
	done: 'Completed',
	error: 'Failed',
};

type StepsProps = {
	children: React.ReactNode;
	className?: string;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
	defaultOpen?: boolean;
	/** Header label when collapsed/expanded. */
	title?: React.ReactNode;
};

/**
 * Quiet timeline with gapped segments (not a continuous spine through icons):
 *
 * ```
 *   ✓
 *     ↕ GAP
 *   │  ≥ MIN_SEGMENT
 *     ↕ GAP
 *   ◌
 * ```
 *
 * Each step (except last) draws its own connector. The rail enforces a minimum
 * height so short title-only steps still show a readable segment.
 */
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
			className={cn('w-full min-w-0', className)}
			data-slot="steps"
		>
			<CollapsibleTrigger
				className={cn(
					'group flex w-fit max-w-full items-center gap-1.5 rounded-md px-1.5 py-1 text-[13px]',
					'text-muted-foreground transition-colors duration-150 hover:bg-accent hover:text-foreground',
				)}
			>
				<span className="min-w-0 truncate font-medium">{title}</span>
				<ChevronDown
					data-slot="collapsible-icon"
					className="size-3.5 shrink-0 opacity-60"
				/>
			</CollapsibleTrigger>
			<CollapsiblePanel innerClassName="py-1.5">
				<ol className="flex min-w-0 flex-col" data-slot="steps-list">
					{children}
				</ol>
			</CollapsiblePanel>
		</Collapsible>
	);
}

type StepProps = {
	children?: React.ReactNode;
	title: React.ReactNode;
	description?: React.ReactNode;
	status?: StepStatus;
	className?: string;
};

/**
 * Status as stroke icons only — no filled disks, no translucent glow.
 * Matches PlanTracker: Check / CircleDashed / Circle / X.
 */
function StepMarker({ status }: { status: StepStatus }) {
	return (
		<span
			data-slot="step-marker"
			className="relative z-10 flex shrink-0 items-center justify-center rounded-full bg-background"
			style={{ width: RAIL, height: RAIL }}
			aria-hidden
		>
			{status === 'done' ? (
				<Check className="size-3.5 text-success" strokeWidth={2.5} />
			) : status === 'running' ? (
				<CircleDashed
					className="size-3.5 animate-spin text-primary motion-reduce:animate-none"
					strokeWidth={2}
				/>
			) : status === 'error' ? (
				<X className="size-3.5 text-destructive" strokeWidth={2.5} />
			) : (
				<Circle className="size-3.5 text-muted-foreground/40" strokeWidth={1.75} />
			)}
		</span>
	);
}

function Step({ children, title, description, status = 'pending', className }: StepProps) {
	return (
		<li
			data-slot="step"
			data-status={status}
			aria-current={status === 'running' ? 'step' : undefined}
			className={cn('group/step relative flex min-w-0 items-stretch gap-2.5', className)}
		>
			{/*
			 * Rail stretches with content. Non-last min-height =
			 * RAIL + GAP + MIN_SEGMENT + GAP (15+6+12+6 = 39) so short
			 * title-only steps still show a readable connector.
			 * Keep min-h values in sync with RAIL / GAP / MIN_SEGMENT.
			 */}
			<div
				data-slot="step-rail"
				className="relative flex min-h-[39px] shrink-0 flex-col items-center group-last/step:min-h-[15px]"
				style={{ width: RAIL }}
			>
				<StepMarker status={status} />

				{/*
				 * Segment: starts GAP below this icon, ends GAP above the next icon.
				 * Hidden on the last step.
				 */}
				<span
					aria-hidden
					data-slot="step-connector"
					className="pointer-events-none absolute w-px bg-border group-last/step:hidden"
					style={{
						left: (RAIL - 1) / 2,
						top: RAIL + GAP,
						bottom: GAP,
					}}
				/>
			</div>

			<div
				className={cn(
					'min-w-0 flex-1 text-[13px]',
					// Space between steps lives on content; last step has none
					'pb-3.5 group-last/step:pb-0',
				)}
			>
				<div
					className={cn(
						// Line box = RAIL so the first line shares the marker’s vertical band;
						// wrapped lines grow downward without shifting that first line.
						'break-words font-medium',
						status === 'running' && 'text-foreground',
						status === 'done' && 'text-muted-foreground',
						status === 'pending' && 'text-muted-foreground/80',
						status === 'error' && 'text-destructive',
					)}
					style={{ minHeight: RAIL, lineHeight: `${RAIL}px` }}
				>
					<span className="sr-only">{STATUS_LABEL[status]}: </span>
					{title}
				</div>
				{description ? (
					<div className="mt-1 break-words text-[12px] leading-snug text-muted-foreground">
						{description}
					</div>
				) : null}
				{children ? (
					<div
						data-slot="step-body"
						className={cn(
							'mt-1.5 min-w-0 break-words text-[12px] leading-snug text-muted-foreground',
							// Nested pre/code from agent output
							'[&_pre]:mt-1.5 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-border [&_pre]:bg-muted/40 [&_pre]:p-2 [&_pre]:font-mono [&_pre]:text-[11px] [&_pre]:leading-relaxed',
							'[&_code]:rounded-sm [&_code]:bg-muted/50 [&_code]:px-1 [&_code]:py-px [&_code]:font-mono [&_code]:text-[11.5px]',
						)}
					>
						{children}
					</div>
				) : null}
			</div>
		</li>
	);
}

/** Alias for prompt-kit chain-of-thought naming. */
const ChainOfThought = Steps;
const ChainOfThoughtStep = Step;

export { Steps, Step, ChainOfThought, ChainOfThoughtStep };
export type { StepsProps, StepProps, StepStatus };

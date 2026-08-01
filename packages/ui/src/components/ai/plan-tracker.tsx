'use client';

import { Check, ChevronDown, Circle, CircleDashed, ListChecks } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from '../collapsible';
import type { Plan, PlanStep } from './types';

type PlanTrackerProps = {
	plan?: Plan | null;
	streaming?: boolean;
	className?: string;
	/** Flush bottom corners when stacked on a composer. */
	flushBottom?: boolean;
	defaultOpen?: boolean;
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
};

/**
 * Live agent plan checklist, typically pinned above the composer.
 */
function PlanTracker({
	plan,
	streaming = false,
	className,
	flushBottom = true,
	defaultOpen = false,
	open,
	onOpenChange,
}: PlanTrackerProps) {
	if (!plan || plan.steps.length === 0) return null;

	const total = plan.steps.length;
	const done = plan.steps.filter((s) => s.status === 'done').length;
	const complete = done === total;
	const activeIndex = plan.steps.findIndex((s) => s.status === 'in_progress');
	const focusIndex =
		activeIndex >= 0
			? activeIndex
			: streaming
				? plan.steps.findIndex((s) => s.status === 'pending')
				: -1;
	const focusStep = focusIndex >= 0 ? plan.steps[focusIndex] : null;

	return (
		<div data-slot="plan-tracker" className={cn('w-full', className)}>
			<Collapsible open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange} className="group/collapsible">
				<div
					className={cn(
						'border border-input bg-muted/40',
						flushBottom ? 'rounded-t-xl border-b-0' : 'rounded-xl',
					)}
				>
					<CollapsibleTrigger
						className={cn(
							'group flex w-full items-center gap-1.5 px-3 py-2 text-left text-[13px]',
							'text-muted-foreground transition-colors duration-150 hover:text-foreground',
						)}
					>
						<ListChecks className="size-3.5 shrink-0" />
						{complete ? (
							<span className="min-w-0 flex-1 truncate font-medium">{`${total}/${total} done`}</span>
						) : focusStep ? (
							<span className="min-w-0 flex-1 truncate font-medium">
								<span className="mr-1.5 font-mono text-[12px] font-normal tabular-nums text-muted-foreground/60">
									{focusIndex + 1}/{total}
								</span>
								{focusStep.label}
							</span>
						) : (
							<span className="min-w-0 flex-1 truncate font-medium">{`${done}/${total} steps`}</span>
						)}
						<ChevronDown
							data-slot="collapsible-icon"
							className="size-3.5 shrink-0 text-muted-foreground/60"
						/>
					</CollapsibleTrigger>
					<CollapsiblePanel innerClassName="py-0">
						<ul className="max-h-48 overflow-y-auto px-2 pb-1">
							{plan.steps.map((step, i) => (
								<PlanRow key={`${step.label}-${i}`} step={step} />
							))}
						</ul>
					</CollapsiblePanel>
				</div>
			</Collapsible>
		</div>
	);
}

function PlanRow({ step }: { step: PlanStep }) {
	return (
		<li className="flex items-center gap-2 rounded-md px-1.5 py-1 text-[13px]">
			<StepIcon status={step.status} />
			<span
				className={cn(
					'min-w-0 flex-1 truncate',
					step.status === 'done' ? 'text-muted-foreground line-through' : 'text-foreground',
				)}
			>
				{step.label}
			</span>
		</li>
	);
}

function StepIcon({ status }: { status: PlanStep['status'] }) {
	if (status === 'done') return <Check className="size-3.5 shrink-0 text-success" />;
	if (status === 'in_progress') {
		return <CircleDashed className="size-3.5 shrink-0 text-foreground/70" />;
	}
	return <Circle className="size-3.5 shrink-0 text-muted-foreground/40" />;
}

export { PlanTracker };
export type { PlanTrackerProps };

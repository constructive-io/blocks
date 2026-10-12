'use client';

import { Check, ChevronDown } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from '../collapsible';

type RecommendationOption = {
	id: string;
	label: React.ReactNode;
	description?: React.ReactNode;
	/** e.g. "Needs review" */
	badge?: React.ReactNode;
};

type RecommendationCardProps = {
	title?: React.ReactNode;
	/** Primary recommendation body (supports mono spans via children). */
	body: React.ReactNode;
	/** 0–1 confidence */
	confidence?: number;
	confidenceLabel?: React.ReactNode;
	alternatives?: RecommendationOption[];
	acceptLabel?: string;
	onAccept?: (optionId: string) => void;
	className?: string;
	/** Controlled selected option id. */
	selectedId?: string;
	defaultSelectedId?: string;
};

/**
 * Agent suggestion with confidence meter and optional alternatives drawer.
 */
function RecommendationCard({
	title = 'Recommendation',
	body,
	confidence,
	confidenceLabel,
	alternatives = [],
	acceptLabel = 'Accept',
	onAccept,
	className,
	selectedId: selectedProp,
	defaultSelectedId,
}: RecommendationCardProps) {
	const [internalId, setInternalId] = React.useState(
		defaultSelectedId ?? alternatives[0]?.id ?? 'primary',
	);
	const selectedId = selectedProp ?? internalId;
	const selectedAlt = alternatives.find((a) => a.id === selectedId);

	const displayBody = selectedAlt?.description ?? body;
	const pct = confidence != null ? Math.round(Math.max(0, Math.min(1, confidence)) * 100) : null;

	return (
		<div
			data-slot="recommendation-card"
			className={cn(
				'w-full max-w-md overflow-hidden rounded-lg bg-card shadow-card',
				className,
			)}
		>
			<div className="space-y-3 p-3">
				<div className="text-[0.75rem] font-medium text-muted-foreground">{title}</div>
				<div className="text-[0.8125rem] text-pretty leading-relaxed text-foreground [overflow-wrap:anywhere]">{displayBody}</div>

				{pct != null ? (
					<div className="space-y-1">
						<div className="flex items-center justify-between text-[0.6875rem] text-muted-foreground">
							<span>{confidenceLabel ?? 'Confidence'}</span>
							<span className="tabular-nums font-medium text-foreground">{pct}%</span>
						</div>
						<div className="h-1.5 overflow-hidden rounded-full bg-muted">
							<div
								className="h-full origin-left rounded-full bg-primary rtl:origin-right transition-transform duration-(--duration-slow) ease-out motion-reduce:transition-none"
								style={{ transform: `scaleX(${pct / 100})` }}
							/>
						</div>
					</div>
				) : null}

				{alternatives.length > 0 ? (
					<Collapsible className="group/collapsible">
						<CollapsibleTrigger
							className={cn(
								// outer card is rounded-lg + p-3 → inner uses rounded-md for concentric radii
								'flex w-full items-center justify-between rounded-md border border-border px-2.5 py-1.5 text-[0.78125rem]',
								'text-muted-foreground hover:bg-accent hover:text-foreground',
							)}
						>
							<span>Other options</span>
							<ChevronDown data-slot="collapsible-icon" className="size-3.5" />
						</CollapsibleTrigger>
						<CollapsiblePanel innerClassName="py-1.5">
							<ul className="flex flex-col gap-0.5">
								{alternatives.map((opt) => {
									const on = opt.id === selectedId;
									return (
										<li key={opt.id}>
											<button
												type="button"
												aria-pressed={on}
												onClick={() => {
													setInternalId(opt.id);
												}}
												className={cn(
													'flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-start text-[0.8125rem]',
													'hover:bg-accent',
													on && 'bg-accent',
												)}
											>
												<span
													className={cn(
														'mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border',
														on ? 'border-primary bg-primary text-primary-foreground' : 'border-border',
													)}
												>
													{on ? <Check className="size-2.5" strokeWidth={3} /> : null}
												</span>
												<span className="min-w-0 flex-1">
													<span className="font-medium text-foreground [overflow-wrap:anywhere]">{opt.label}</span>
													{opt.badge ? (
														<span className="ms-1.5 text-[0.6875rem] text-muted-foreground">{opt.badge}</span>
													) : null}
												</span>
											</button>
										</li>
									);
								})}
							</ul>
						</CollapsiblePanel>
					</Collapsible>
				) : null}

				<div className="flex flex-wrap justify-end">
					<Button
						type="button"
						size="sm"
						wrap
						onClick={() => onAccept?.(selectedId)}
					>
						{acceptLabel}
					</Button>
				</div>
			</div>
		</div>
	);
}

export { RecommendationCard };
export type { RecommendationCardProps, RecommendationOption };

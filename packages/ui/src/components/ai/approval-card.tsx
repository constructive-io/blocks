'use client';

import { ArrowUp, Check, X } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';

type ApprovalOption = {
	id: string;
	label: React.ReactNode;
	description?: React.ReactNode;
};

type ApprovalQuestion = {
	id: string;
	prompt: React.ReactNode;
	type?: 'single' | 'multiple';
	options: ApprovalOption[];
};

type ApprovalCardProps = {
	/** Single-shot confirm (desktop tool-confirm style). */
	title?: React.ReactNode;
	description?: React.ReactNode;
	/** Multi-step questions (Beautiful approval). */
	questions?: ApprovalQuestion[];
	confirmLabel?: string;
	skipLabel?: string;
	destructive?: boolean;
	/** Preview node under the title (tables, diffs, etc.). */
	preview?: React.ReactNode;
	onConfirm?: (payload: { answers?: Record<string, string[]> }) => void;
	onSkip?: () => void;
	onDismiss?: () => void;
	className?: string;
	/** Controlled sent state for demos. */
	defaultSent?: boolean;
};

/**
 * Human-in-the-loop approval: simple confirm/skip or multi-question flow.
 */
function ApprovalCard({
	title,
	description,
	questions,
	confirmLabel = 'Confirm',
	skipLabel = 'Skip',
	destructive = false,
	preview,
	onConfirm,
	onSkip,
	onDismiss,
	className,
	defaultSent = false,
}: ApprovalCardProps) {
	const multi = Boolean(questions?.length);
	const [qi, setQi] = React.useState(0);
	const [answers, setAnswers] = React.useState<Record<string, string[]>>({});
	const [sent, setSent] = React.useState(defaultSent);

	const question = multi ? questions![qi] : null;
	const selected = question ? (answers[question.id] ?? []) : [];
	const last = multi ? qi === questions!.length - 1 : true;

	const toggleOption = (optionId: string) => {
		if (!question) return;
		const type = question.type ?? 'single';
		setAnswers((prev) => {
			const current = prev[question.id] ?? [];
			const next =
				type === 'single'
					? [optionId]
					: current.includes(optionId)
						? current.filter((id) => id !== optionId)
						: [...current, optionId];
			return { ...prev, [question.id]: next };
		});
		if ((question.type ?? 'single') === 'single') {
			window.setTimeout(() => {
				if (last) {
					setSent(true);
					onConfirm?.({
						answers: {
							...answers,
							[question.id]: [optionId],
						},
					});
				} else {
					setQi((i) => i + 1);
				}
			}, 280);
		}
	};

	const submitMulti = () => {
		if (!question) return;
		if (last) {
			setSent(true);
			onConfirm?.({ answers });
		} else {
			setQi((i) => i + 1);
		}
	};

	if (sent) {
		return (
			<div
				data-slot="approval-card"
				className={cn(
					'flex min-h-28 w-full max-w-sm flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-4 shadow-xs',
					className,
				)}
			>
				<span className="flex size-6 items-center justify-center rounded-full bg-success text-white animate-[ai-fade-up_300ms_cubic-bezier(0.23,1,0.32,1)_both]">
					<Check className="size-3.5" strokeWidth={3} />
				</span>
				<span className="text-[13px] font-medium text-foreground">Approved</span>
			</div>
		);
	}

	// Simple confirm (desktop tool-confirm)
	if (!multi) {
		return (
			<div
				data-slot="approval-card"
				data-destructive={destructive ? 'true' : 'false'}
				className={cn(
					'w-full max-w-md overflow-hidden rounded-xl border bg-card shadow-xs',
					destructive ? 'border-destructive/35' : 'border-border',
					className,
				)}
			>
				<div className="flex items-start justify-between gap-2 px-3 pt-3">
					<div className="min-w-0 space-y-1">
						{title ? (
							<div className="text-[13px] font-medium text-pretty text-foreground">{title}</div>
						) : null}
						{description ? (
							<div className="text-xs text-pretty text-muted-foreground">{description}</div>
						) : null}
					</div>
					{onDismiss ? (
						<Button
							type="button"
							variant="ghost"
							size="icon-xs"
							aria-label="Dismiss"
							onClick={onDismiss}
						>
							<X className="size-3.5" />
						</Button>
					) : null}
				</div>
				{preview ? <div className="px-3 pt-2">{preview}</div> : null}
				<div className="flex items-center justify-end gap-1.5 px-3 py-2.5">
					{onSkip ? (
						<Button type="button" variant="ghost" size="sm" onClick={onSkip}>
							{skipLabel}
						</Button>
					) : null}
					<Button
						type="button"
						size="sm"
						variant={destructive ? 'destructive' : 'default'}
						onClick={() => {
							setSent(true);
							onConfirm?.({});
						}}
					>
						{confirmLabel}
					</Button>
				</div>
			</div>
		);
	}

	// Multi-question flow
	const progress = questions!.map((_, i) => i <= qi);
	const canAdvance = selected.length > 0;

	return (
		<div
			data-slot="approval-card"
			className={cn(
				'w-full max-w-sm overflow-hidden rounded-xl border border-border bg-card shadow-xs',
				className,
			)}
		>
			<div
				key={question!.id}
				className="p-3 animate-[ai-fade-up_300ms_cubic-bezier(0.23,1,0.32,1)_both] motion-reduce:animate-none"
			>
				<div className="flex items-start justify-between gap-2">
					<div className="text-[13px] font-medium text-pretty text-foreground">{question!.prompt}</div>
					<div className="flex items-center gap-1">
						{/* Progress pills */}
						<div className="flex items-center gap-0.5" aria-hidden>
							{progress.map((on, i) => (
								<span
									key={i}
									className={cn(
										'h-1 rounded-full transition-[width,background-color] duration-200',
										on ? 'w-3 bg-primary' : 'w-1.5 bg-border',
									)}
								/>
							))}
						</div>
						{onDismiss ? (
							<Button type="button" variant="ghost" size="icon-xs" aria-label="Dismiss" onClick={onDismiss}>
								<X className="size-3.5" />
							</Button>
						) : null}
					</div>
				</div>
				<div className="mt-2 flex flex-col gap-0.5">
					{question!.options.map((option) => {
						const on = selected.includes(option.id);
						return (
							<button
								key={option.id}
								type="button"
								aria-pressed={on}
								onClick={() => toggleOption(option.id)}
								className={cn(
									// card rounded-xl + p-3 → option rows use rounded-md (concentric)
									'-mx-1.5 flex min-h-10 items-start gap-2 rounded-md px-1.5 py-1.5 text-left text-[13px]',
									'transition-colors duration-150 hover:bg-accent',
									'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
								<span className="min-w-0">
									<span className="font-medium text-foreground">{option.label}</span>
									{option.description ? (
										<span className="mt-0.5 block text-xs text-muted-foreground">{option.description}</span>
									) : null}
								</span>
							</button>
						);
					})}
				</div>
				{(question!.type === 'multiple' || !last) && (
					<div className="mt-2 flex justify-end">
						<Button
							type="button"
							size="icon-sm"
							aria-label={last ? confirmLabel : 'Next'}
							disabled={!canAdvance}
							onClick={submitMulti}
						>
							<ArrowUp className="size-4" />
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}

export { ApprovalCard };
export type { ApprovalCardProps, ApprovalQuestion, ApprovalOption };

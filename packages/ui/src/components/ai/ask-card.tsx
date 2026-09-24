'use client';

import { CircleCheck, CircleHelp } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { iconEnterClass } from './mark-tile';

type AskOption = {
	id: string;
	label: React.ReactNode;
};

type AskQuestion = {
	id: string;
	question: React.ReactNode;
	options: AskOption[];
	/** Adds a free-text "Something else" row. Defaults to true. */
	allowOther?: boolean;
};

type AskChoice = { option: string } | { other: string };

type AskAnswer = { choices: Record<string, AskChoice> } | { skipped: true };

type AskCardProps = Omit<React.ComponentProps<'div'>, 'onSubmit'> & {
	questions: AskQuestion[];
	/** Settled answer. When set, the card collapses to a read-only summary. */
	answer?: AskAnswer;
	onSubmit?: (choices: Record<string, AskChoice>) => void;
	onSkip?: () => void;
	continueLabel?: React.ReactNode;
	skipLabel?: React.ReactNode;
	/** Name and placeholder of the free-text row. */
	otherLabel?: string;
	disabled?: boolean;
};

const KEYS = 'ABCDEFGHIJ';

function QuestionHeading({ id, children }: { id?: string; children: React.ReactNode }) {
	return (
		<div className="flex min-h-7 items-start gap-2 px-1 py-1">
			<CircleHelp aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
			<p id={id} className="text-pretty text-sm text-foreground">
				{children}
			</p>
		</div>
	);
}

function KeyBadge({ children, active }: { children: React.ReactNode; active?: boolean }) {
	return (
		<span
			aria-hidden="true"
			className={cn(
				'grid size-5 shrink-0 place-items-center rounded-[5px] border text-[11px] font-medium tabular-nums',
				active ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-muted text-muted-foreground',
			)}
		>
			{children}
		</span>
	);
}

function AskQuestionField({
	question,
	choice,
	onChoose,
	otherLabel,
	disabled,
}: {
	question: AskQuestion;
	choice: AskChoice | undefined;
	onChoose: (choice: AskChoice | undefined) => void;
	otherLabel: string;
	disabled?: boolean;
}) {
	const headingId = React.useId();
	const otherValue = choice && 'other' in choice ? choice.other : '';
	const rowClass =
		'flex min-h-9 w-full items-center gap-2.5 rounded-sm border px-2 py-1.5 text-left text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50';

	return (
		<div className="flex flex-col gap-1.5">
			<QuestionHeading id={headingId}>{question.question}</QuestionHeading>
			<div role="radiogroup" aria-labelledby={headingId} className="flex flex-col gap-1.5">
				{question.options.map((option, index) => {
					const checked = Boolean(choice && 'option' in choice && choice.option === option.id);
					return (
						<button
							key={option.id}
							type="button"
							role="radio"
							aria-checked={checked}
							disabled={disabled}
							onClick={() => onChoose({ option: option.id })}
							className={cn(
								rowClass,
								'cursor-pointer disabled:cursor-not-allowed disabled:opacity-64',
								checked
									? 'border-primary/40 bg-primary/6 text-foreground'
									: 'border-border bg-card text-foreground hover:bg-overlay-hover',
							)}
						>
							<KeyBadge active={checked}>{KEYS[index]}</KeyBadge>
							<span className="min-w-0 flex-1">{option.label}</span>
						</button>
					);
				})}
				{question.allowOther !== false ? (
					<label
						className={cn(
							rowClass,
							'cursor-text focus-within:ring-[3px] focus-within:ring-ring/50',
							otherValue ? 'border-primary/40 bg-primary/6' : 'border-border bg-card',
						)}
					>
						<KeyBadge active={Boolean(otherValue)}>{KEYS[question.options.length]}</KeyBadge>
						<input
							type="text"
							value={otherValue}
							disabled={disabled}
							placeholder={`${otherLabel}…`}
							aria-label={otherLabel}
							onChange={(event) => onChoose(event.target.value ? { other: event.target.value } : undefined)}
							className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-subtle-foreground pointer-coarse:text-base"
						/>
					</label>
				) : null}
			</div>
		</div>
	);
}

function AnswerChip({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
	return (
		<span
			className={cn(
				'inline-flex h-6 max-w-full items-center gap-1.5 rounded-md border border-border bg-muted px-1.5 text-[13px]',
				muted ? 'text-muted-foreground' : 'text-foreground',
			)}
		>
			{muted ? null : (
				<CircleCheck aria-hidden="true" className={cn('size-3.5 shrink-0 fill-primary text-primary-foreground', iconEnterClass)} />
			)}
			<span className="truncate">{children}</span>
		</span>
	);
}

/**
 * Inline clarifying questions from an agent. Each question offers lettered
 * options plus a free-text row; the card settles into a one-line summary per
 * question once answered or skipped.
 */
function AskCard({
	questions,
	answer,
	onSubmit,
	onSkip,
	continueLabel = 'Continue',
	skipLabel = 'Skip',
	otherLabel = 'Something else',
	disabled,
	className,
	...props
}: AskCardProps) {
	const [choices, setChoices] = React.useState<Record<string, AskChoice>>({});
	const complete = questions.every((question) => {
		const choice = choices[question.id];
		return choice && ('option' in choice || choice.other.trim().length > 0);
	});

	if (answer) {
		return (
			<div
				data-slot="ask-card"
				data-state="answered"
				className={cn('flex animate-[ai-fade-up_var(--duration-slow)_var(--ease-out)_both] flex-col gap-1 motion-reduce:animate-none', className)}
				{...props}
			>
				{questions.map((question) => {
					const choice = 'choices' in answer ? answer.choices[question.id] : undefined;
					const label = choice
						? 'option' in choice
							? question.options.find((option) => option.id === choice.option)?.label
							: `“${choice.other}”`
						: undefined;
					return (
						<div key={question.id} className="flex flex-wrap items-center gap-x-2 gap-y-1">
							<CircleHelp aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
							<p className="text-pretty text-sm text-foreground">{question.question}</p>
							{label ? <AnswerChip>{label}</AnswerChip> : <AnswerChip muted>Skipped</AnswerChip>}
						</div>
					);
				})}
			</div>
		);
	}

	return (
		<div
			data-slot="ask-card"
			data-state="open"
			className={cn('flex animate-[ai-fade-up_var(--duration-slow)_var(--ease-out)_both] flex-col gap-3 rounded-xl bg-card p-2 shadow-card motion-reduce:animate-none', className)}
			{...props}
		>
			{questions.map((question) => (
				<AskQuestionField
					key={question.id}
					question={question}
					choice={choices[question.id]}
					disabled={disabled}
					otherLabel={otherLabel}
					onChoose={(choice) =>
						setChoices((current) => {
							const next = { ...current };
							if (choice) next[question.id] = choice;
							else delete next[question.id];
							return next;
						})
					}
				/>
			))}
			<div className="flex items-center gap-2">
				<Button size="xs" disabled={disabled || !complete} onClick={() => onSubmit?.(choices)}>
					{continueLabel}
				</Button>
				{onSkip ? (
					<Button size="xs" variant="outline" disabled={disabled} onClick={onSkip}>
						{skipLabel}
					</Button>
				) : null}
			</div>
		</div>
	);
}

export { AskCard };
export type { AskCardProps, AskQuestion, AskOption, AskChoice, AskAnswer };

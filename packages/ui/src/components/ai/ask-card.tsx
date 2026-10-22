'use client';

import { ChevronDown, ChevronUp, CircleCheck, CircleHelp } from 'lucide-react';
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
	/** A small line above the question, e.g. who is asking or why the run paused. */
	eyebrow?: React.ReactNode;
	/** Glyph beside each question. Defaults to a help circle; `null` leaves the question bare, e.g. under an eyebrow. */
	icon?: React.ReactNode;
	disabled?: boolean;
};

function QuestionHeading({ id, icon, children }: { id?: string; icon?: React.ReactNode; children: React.ReactNode }) {
	const glyph = icon === undefined ? <CircleHelp /> : icon;
	return (
		<div className="flex items-start gap-2">
			{glyph ? (
				<span aria-hidden="true" className="flex h-5 shrink-0 items-center text-muted-foreground [&_svg]:size-4">
					{glyph}
				</span>
			) : null}
			<p id={id} className="min-w-0 text-pretty text-sm font-medium text-foreground [overflow-wrap:anywhere]">
				{children}
			</p>
		</div>
	);
}

/** Radio dot: a ring at rest, a filled disc with a pip once chosen. */
function RadioMark({ checked }: { checked: boolean }) {
	return (
		<span
			aria-hidden="true"
			className={cn(
				'grid size-4 shrink-0 place-items-center rounded-full border',
				checked ? 'border-primary bg-primary' : 'border-subtle-foreground/50',
			)}
		>
			{checked ? <span className={cn('size-1.5 rounded-full bg-primary-foreground', iconEnterClass)} /> : null}
		</span>
	);
}

function AskQuestionField({
	question,
	choice,
	onChoose,
	otherLabel,
	icon,
	disabled,
}: {
	question: AskQuestion;
	choice: AskChoice | undefined;
	onChoose: (choice: AskChoice | undefined) => void;
	otherLabel: string;
	icon?: React.ReactNode;
	disabled?: boolean;
}) {
	const headingId = React.useId();
	const otherValue = choice && 'other' in choice ? choice.other : '';
	// Card p-3 → rows bleed 6px into the padding and round at radius-md, so labels line up with the heading.
	const rowClass =
		'-mx-1.5 flex min-h-8 items-center gap-2.5 rounded-md px-1.5 py-1 text-start text-sm outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50';

	return (
		<div className="flex flex-col gap-2">
			<QuestionHeading id={headingId} icon={icon}>
				{question.question}
			</QuestionHeading>
			<div role="radiogroup" aria-labelledby={headingId} className="flex flex-col gap-0.5">
				{question.options.map((option) => {
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
								'cursor-pointer hover:bg-overlay-hover disabled:cursor-not-allowed disabled:opacity-64',
								checked ? 'bg-overlay-hover text-foreground' : 'text-muted-foreground hover:text-foreground',
							)}
						>
							<RadioMark checked={checked} />
							<span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{option.label}</span>
						</button>
					);
				})}
				{question.allowOther !== false ? (
					<label className={cn(rowClass, 'cursor-text focus-within:bg-overlay-hover', otherValue && 'bg-overlay-hover')}>
						<RadioMark checked={Boolean(otherValue)} />
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
				'inline-flex h-6 max-w-full items-center gap-1.5 rounded-md border border-border bg-muted px-1.5 text-[0.8125rem]',
				muted ? 'text-muted-foreground' : 'text-foreground',
			)}
		>
			{muted ? null : (
				<CircleCheck aria-hidden="true" className={cn('size-3.5 shrink-0 fill-primary text-primary-foreground', iconEnterClass)} />
			)}
			<span title={typeof children === 'string' ? children : undefined} className="truncate">
				{children}
			</span>
		</span>
	);
}

/**
 * Inline clarifying questions from an agent, one at a time. Each question
 * offers its options as radio rows plus a free-text row; Continue moves to the
 * next question and submits after the last. The card settles into a one-line
 * summary per question once answered or skipped.
 */
function AskCard({
	questions,
	answer,
	onSubmit,
	onSkip,
	continueLabel = 'Continue',
	skipLabel = 'Skip',
	otherLabel = 'Something else',
	eyebrow,
	icon,
	disabled,
	className,
	...props
}: AskCardProps) {
	const [choices, setChoices] = React.useState<Record<string, AskChoice>>({});
	const [page, setPage] = React.useState(0);
	const answered = (question: AskQuestion | undefined) => {
		const choice = question ? choices[question.id] : undefined;
		return Boolean(choice && ('option' in choice || choice.other.trim().length > 0));
	};
	const complete = questions.every(answered);
	const current = questions[Math.min(page, questions.length - 1)];
	const last = page >= questions.length - 1;
	const paged = questions.length > 1;

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
						// The icon keeps its own column, so a long question wraps beside it instead of below it.
						<div key={question.id} className="flex items-start gap-2">
							<CircleHelp aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
							<div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
								<p className="min-w-0 text-pretty text-sm text-foreground [overflow-wrap:anywhere]">{question.question}</p>
								{label ? <AnswerChip>{label}</AnswerChip> : <AnswerChip muted>Skipped</AnswerChip>}
							</div>
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
			className={cn('flex animate-[ai-fade-up_var(--duration-slow)_var(--ease-out)_both] flex-col gap-3 rounded-xl bg-card p-3 shadow-card motion-reduce:animate-none', className)}
			{...props}
		>
			{eyebrow ? <div className="-mb-1 flex min-h-4 items-center gap-1.5 text-xs text-muted-foreground [&_svg]:size-3.5 [&_svg]:shrink-0">{eyebrow}</div> : null}
			{current ? (
				// Keyed by question, so each page enters on its own.
				<div key={current.id} className="animate-[ai-fade-up_var(--duration-slow)_var(--ease-out)_both] motion-reduce:animate-none">
					<AskQuestionField
						question={current}
						choice={choices[current.id]}
						disabled={disabled}
						otherLabel={otherLabel}
						icon={icon}
						onChoose={(choice) =>
							setChoices((value) => {
								const next = { ...value };
								if (choice) next[current.id] = choice;
								else delete next[current.id];
								return next;
							})
						}
					/>
				</div>
			) : null}
			<div className="flex flex-wrap items-center gap-2">
				{paged ? (
					<div className="-ms-1 flex items-center text-xs text-muted-foreground tabular-nums">
						<Button size="icon-xs" variant="ghost" aria-label="Previous question" disabled={page === 0} onClick={() => setPage(page - 1)}>
							<ChevronUp aria-hidden="true" />
						</Button>
						<span aria-hidden="true">
							{page + 1}/{questions.length}
						</span>
						<span className="sr-only">
							Question {page + 1} of {questions.length}
						</span>
						<Button size="icon-xs" variant="ghost" aria-label="Next question" disabled={last || !answered(current)} onClick={() => setPage(page + 1)}>
							<ChevronDown aria-hidden="true" />
						</Button>
					</div>
				) : null}
				<div className="ms-auto flex flex-wrap items-center gap-1.5">
					{onSkip ? (
						<Button size="sm" variant="secondary" disabled={disabled} onClick={onSkip}>
							{skipLabel}
						</Button>
					) : null}
					<Button
						size="sm"
						disabled={disabled || (last ? !complete : !answered(current))}
						onClick={() => (last ? onSubmit?.(choices) : setPage(page + 1))}
					>
						{continueLabel}
					</Button>
				</div>
			</div>
		</div>
	);
}

export { AskCard };
export type { AskCardProps, AskQuestion, AskOption, AskChoice, AskAnswer };

'use client';

import { Bot, Check, ChevronRight, RotateCcw, Sparkles, Square, Zap } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { ApprovalCard } from '../ai/approval-card';
import { type AskChoice, AskCard } from '../ai/ask-card';
import { ChatContainer } from '../ai/chat-container';
import { CodeBlock } from '../ai/code-block';
import { FeedbackBar } from '../ai/feedback-bar';
import { iconEnterClass, MarkTile } from '../ai/mark-tile';
import { PlanTracker } from '../ai/plan-tracker';
import { Reasoning } from '../ai/reasoning';
import { Source, Sources } from '../ai/source';
import { ThinkingStatus } from '../ai/thinking-status';
import { ToolTrace } from '../ai/tool-trace';
import { Button } from '../button';
import { Spinner } from '../spinner';
import { type StatusSignal, StatusGlyph, StatusLabel } from './agent-status';
import { useAgentsBuilder } from './agents-builder-context';
import { Composer } from './composer';
import { IntegrationMark } from './integration-mark';
import { enterClass, focusRingClass, SurfaceBody, surfaceInsetClass, ToneBadge, TooltipIconButton, useInert } from '../workspace-kit/primitives';
import { useLatest } from '../workspace-kit/use-latest';
import { RevealText } from './reveal-text';
import { usePlaybackClock } from './playback';
import type { AgentRunScript, RunApproval, RunFailure, RunQuery, RunQuestion, ToolStep } from './types';
import { type AgentRunState, RUN_TIMING, type RunGroupPlay, runProgress } from './use-agent-run';

const GROUP_ICON = { subagents: <Bot />, skills: <Sparkles /> } as const;
const GROUP_NOUN = { subagents: ['agent', 'agents'], skills: ['skill', 'skills'] } as const;

/**
 * The line above a card a run stops on: the state's pixel mark, then the
 * sentence in the state's tone, the one coloured line on the card.
 */
function StatusLine({ signal, children }: { signal: StatusSignal; children: React.ReactNode }) {
	const { statusIndicator } = useAgentsBuilder();
	return (
		<StatusLabel indicator={statusIndicator} signal={signal} className="shrink-0">
			{children}
		</StatusLabel>
	);
}

// Static, so they are built once.
const APPROVAL_EYEBROW = <StatusLine signal="approval">Waiting for your approval</StatusLine>;
const QUESTION_EYEBROW = <StatusLine signal="input">Waiting for your answer</StatusLine>;
const QUEUED_EYEBROW = <StatusLine signal="queued">Queued</StatusLine>;

type RunGroupProps = {
	group: AgentRunScript['groups'][number];
	play: RunGroupPlay;
};

/** A fan-out group: streams its items open while running, then folds to a toggleable summary. */
function RunGroup({ group, play }: RunGroupProps) {
	const [expanded, setExpanded] = React.useState(false);
	const running = play.state === 'open';
	const open = running || expanded;
	const inertRef = useInert<HTMLUListElement>(!open);
	const [singular, plural] = GROUP_NOUN[group.id];
	const heading = (
		<>
			<span className="min-w-0 text-foreground [overflow-wrap:anywhere]">{group.label}</span>
			<span className="shrink-0 text-muted-foreground tabular-nums">
				· {group.items.length} {group.items.length === 1 ? singular : plural}
			</span>
		</>
	);
	const row = 'flex min-h-8 w-full items-center gap-1.5 px-2 py-1 text-start text-[0.8125rem]';

	return (
		<li className={enterClass}>
			{running ? (
				<div className={row}>
					<Spinner aria-hidden="true" role={undefined} className="size-3.5 text-muted-foreground" strokeWidth={1.5} />
					{heading}
				</div>
			) : (
				<button
					type="button"
					aria-expanded={open}
					onClick={() => setExpanded((value) => !value)}
					className={cn(row, 'cursor-pointer hover:bg-overlay-hover', focusRingClass, 'focus-visible:ring-inset')}
				>
					<ChevronRight
						aria-hidden="true"
						className={cn(
							'size-3.5 shrink-0 text-muted-foreground transition-transform duration-(--duration-moderate) ease-out motion-reduce:transition-none',
							open ? 'rotate-90' : 'rtl:-scale-x-100',
						)}
					/>
					{heading}
				</button>
			)}
			<div
				className={cn(
					'grid transition-[grid-template-rows] duration-(--duration-slow) ease-(--ease-out) motion-reduce:transition-none',
					open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
				)}
			>
				<ul ref={inertRef} className="min-h-0 overflow-hidden">
					{group.items.slice(0, play.shown).map((item, index) => (
						<li key={item} className={cn('flex h-7 items-center gap-2 pe-2 ps-[26px] text-[0.8125rem] text-muted-foreground', enterClass)}>
							<MarkTile>{GROUP_ICON[group.id]}</MarkTile>
							<span title={item} className="min-w-0 flex-1 truncate">
								{item}
							</span>
							{index < play.done ? <Check aria-label="Done" className={cn('size-3 text-subtle-foreground', iconEnterClass)} /> : null}
						</li>
					))}
				</ul>
			</div>
		</li>
	);
}

function cellTone(cell: string) {
	if (cell.startsWith('+')) return 'text-success-foreground';
	if (cell.startsWith('−') || cell.startsWith('-')) return 'text-destructive';
	return undefined;
}

/** Query result: numeric columns right-aligned, gains and losses tinted, caption in a footer strip. */
function ResultTable({ query }: { query: RunQuery }) {
	return (
		<figure className={cn(surfaceInsetClass, 'rounded-lg bg-card shadow-card', enterClass)}>
			<SurfaceBody>
				<div className="overflow-x-auto">
					<table className="w-full text-[0.8125rem] tabular-nums">
						<thead>
							<tr className="border-b border-dashed border-foreground/10 text-start text-xs text-muted-foreground">
								{query.columns.map((column, index) => (
									<th key={column} scope="col" className={cn('h-8 px-3 font-medium whitespace-nowrap', index > 0 && 'text-end')}>
										{column}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{query.rows.map((row) => (
								<tr key={row.join()} className="h-8">
									{row.map((cell, index) =>
										index === 0 ? (
											<th key={index} scope="row" className="px-3 text-start font-normal text-foreground">
												{cell}
											</th>
										) : (
											<td key={index} className={cn('px-3 text-end text-foreground', cellTone(cell))}>
												{cell}
											</td>
										),
									)}
								</tr>
							))}
						</tbody>
					</table>
				</div>
				{query.caption ? (
					<figcaption className="border-t border-dashed border-foreground/10 bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground tabular-nums">
						{query.caption}
					</figcaption>
				) : null}
			</SurfaceBody>
		</figure>
	);
}

type Decision = 'approved' | 'skipped' | null;

/** Chosen option ids by question id, `'skipped'`, or `null` while unanswered. */
type Answer = Record<string, string[]> | 'skipped' | null;

/**
 * Plays a gate's tool calls one by one once `active`, then reports whether
 * they finished. `settled` starts with every call done, for a past run.
 */
function useGateSteps(steps: ToolStep[], active: boolean, settled: boolean) {
	const [done, setDone] = React.useState(settled ? steps.length : 0);
	const running = active && done < steps.length;
	usePlaybackClock(running ? { delay: done === 0 ? RUN_TIMING.stepsSpin : RUN_TIMING.stepWork } : undefined, false, () =>
		setDone((value) => value + 1),
	);
	return { done, finished: done >= steps.length };
}

/** A gate's follow-up tool calls as a live trace, then the agent's reply once they finish. */
function GateOutcome({ steps, done, reply }: { steps: ToolStep[] | null; done: number; reply: string }) {
	const { integration } = useAgentsBuilder();
	return (
		<>
			{steps ? (
				<ToolTrace
					title="Write tools"
					steps={steps.map((step, index) => ({
						id: step.id,
						label: step.label,
						icon: <IntegrationMark integration={integration(step.integrationId)} bare />,
						status: index < done ? 'done' : index === done ? 'running' : 'pending',
					}))}
				/>
			) : null}
			{!steps || done >= steps.length ? (
				<RevealText text={reply} revealing duration={reply.length * RUN_TIMING.charMs} className="leading-[22px] text-foreground" />
			) : null}
		</>
	);
}

function ApprovalBlock({ approval, decision, done, onDecide }: { approval: RunApproval; decision: Decision; done: number; onDecide: (approved: boolean) => void }) {
	if (!decision) {
		return (
			<ApprovalCard
				className={cn('max-w-none rounded-xl', enterClass)}
				eyebrow={APPROVAL_EYEBROW}
				title={approval.title}
				description={approval.description}
				preview={<p className="rounded-md bg-muted/60 px-2.5 py-2 text-[0.8125rem] leading-5 text-pretty text-foreground [overflow-wrap:anywhere]">{approval.preview}</p>}
				confirmLabel={approval.confirmLabel}
				skipLabel={approval.skipLabel}
				onConfirm={() => onDecide(true)}
				onSkip={() => onDecide(false)}
			/>
		);
	}
	const approved = decision === 'approved';
	return (
		<div className="flex flex-col gap-3">
			<p className={cn('flex min-h-6 items-center gap-1.5 text-[0.8125rem] text-muted-foreground [overflow-wrap:anywhere]', enterClass)}>
				<Check aria-hidden="true" className={cn('size-3.5 shrink-0', iconEnterClass)} />
				<span className="min-w-0">{approved ? `You approved: ${approval.confirmLabel}` : `You chose: ${approval.skipLabel}`}</span>
			</p>
			<GateOutcome steps={approved ? approval.steps : null} done={done} reply={approved ? approval.approvedText : approval.skippedText} />
		</div>
	);
}

function answerIds(choice: AskChoice) {
	return 'option' in choice ? [choice.option] : [choice.other];
}

/** The question that ends a run: the ask card, then its summary, the follow-up calls, and the agent's reply. */
function QuestionBlock({
	question,
	answer,
	done,
	onAnswer,
}: {
	question: RunQuestion;
	answer: Answer;
	done: number;
	onAnswer: (answer: Exclude<Answer, null>) => void;
}) {
	const questions = question.questions.map((item) => ({
		id: item.id,
		question: item.question,
		options: item.options.map((option) => ({ id: option.id, label: option.label })),
		allowOther: false,
	}));
	if (answer === null) {
		return (
			<AskCard
				className={cn('max-w-none', enterClass)}
				eyebrow={QUESTION_EYEBROW}
				icon={null}
				questions={questions}
				onSubmit={(choices) => onAnswer(Object.fromEntries(Object.entries(choices).map(([id, choice]) => [id, answerIds(choice)])))}
				onSkip={() => onAnswer('skipped')}
			/>
		);
	}
	if (answer === 'skipped') {
		return (
			<div className="flex flex-col gap-3">
				<AskCard className="max-w-none" questions={questions} answer={{ skipped: true }} />
				<GateOutcome steps={null} done={0} reply={question.skippedText} />
			</div>
		);
	}
	// Each chosen option adds its own sentence; with none written, the generic reply stands in.
	const replies = question.questions.flatMap((item) => item.options.filter((option) => answer[item.id]?.includes(option.id) && option.reply).map((option) => option.reply!));
	const reply = replies.length ? replies.join(' ') : question.answeredText;
	return (
		<div className="flex flex-col gap-3">
			<AskCard
				className="max-w-none"
				questions={questions}
				answer={{ choices: Object.fromEntries(Object.entries(answer).map(([id, [option = '']]) => [id, { option }])) }}
			/>
			<GateOutcome steps={question.steps} done={done} reply={reply} />
		</div>
	);
}

/**
 * The card a run stops on when it cannot go on by itself: a status line, a
 * title, the body, and its actions on the right, like the approval and
 * question cards.
 */
function StopCard({
	eyebrow,
	title,
	actions,
	children,
}: {
	eyebrow: React.ReactNode;
	title: React.ReactNode;
	actions: React.ReactNode;
	children?: React.ReactNode;
}) {
	return (
		<div className={cn('flex flex-col gap-3 rounded-xl bg-card p-3 shadow-card', enterClass)}>
			<div className="flex flex-col gap-1.5">
				<p className="flex min-h-4 min-w-0 items-center gap-1.5 text-xs text-muted-foreground [&_svg]:size-3.5 [&_svg]:shrink-0">{eyebrow}</p>
				<p className="text-sm font-medium text-pretty text-foreground [overflow-wrap:anywhere]">{title}</p>
			</div>
			{children}
			<div className="flex flex-wrap items-center justify-end gap-1.5">{actions}</div>
		</div>
	);
}

/** Where a failed run stopped: the call that failed, the error, its raw output, and a retry. */
function FailureBlock({ failure, step, onRetry }: { failure: RunFailure; step?: ToolStep; onRetry?: () => void }) {
	return (
		<StopCard
			eyebrow={
				<>
					<StatusLine signal="failed">{step ? 'Failed at' : 'Run failed'}</StatusLine>
					{step ? <span className="min-w-0 truncate">{step.label}</span> : null}
				</>
			}
			title={failure.message}
			actions={
				<Button size="sm" onClick={onRetry}>
					<RotateCcw aria-hidden="true" />
					{failure.retryLabel ?? 'Retry run'}
				</Button>
			}
		>
			{failure.log ? <CodeBlock code={failure.log} filename="Output" highlight={false} maxCollapsedLines={false} /> : null}
		</StopCard>
	);
}

/** A run waiting for its slot: when it starts, the plan it will follow, and a way to start it now. */
function QueuedBlock({ note, plan, onStart }: { note?: string; plan?: string[]; onStart?: () => void }) {
	return (
		<StopCard
			eyebrow={QUEUED_EYEBROW}
			title={note ?? 'Starts at its next scheduled time.'}
			actions={
				<Button size="sm" onClick={onStart}>
					Run now
				</Button>
			}
		>
			{plan?.length ? (
				<div className="flex flex-col gap-1">
					<p className="text-xs text-muted-foreground">Up next</p>
					{/* Hung from a rail like the tool trace's, dashed because none of it has run yet, with each number zero-padded. */}
					<ol className="ms-2 flex flex-col border-s border-dashed border-subtle-foreground/35">
						{plan.map((step, index) => (
							<li key={step} className="flex min-h-7 items-center gap-2 ps-3 text-[0.8125rem] text-muted-foreground">
								<span aria-hidden="true" className="shrink-0 font-mono text-[0.6875rem] text-subtle-foreground tabular-nums">
									{String(index + 1).padStart(2, '0')}
								</span>
								<span className="min-w-0 [overflow-wrap:anywhere]">{step}</span>
							</li>
						))}
					</ol>
				</div>
			) : null}
		</StopCard>
	);
}

function CommandBar({ script, phase, progress, onStop }: { script: AgentRunScript; phase: RunPhase; progress?: number; onStop: () => void }) {
	const { statusIndicator } = useAgentsBuilder();
	return (
		<div className="relative z-10 flex h-[50px] shrink-0 items-center gap-3 rounded-xl bg-card px-3 shadow-card">
			<p title={`${script.command.verb} ${script.command.skill} ${script.command.scope}`} className="flex min-w-0 flex-1 items-center gap-1.5 text-sm whitespace-nowrap text-foreground">
				{script.command.verb}
				{/* The skill chip shrinks and truncates, so a long skill name cannot print over the status badge. */}
				<ToneBadge tone="primary" className="min-w-0 shrink">
					<Zap aria-hidden="true" className="shrink-0" />
					<span title={script.command.skill} className="truncate">{script.command.skill}</span>
				</ToneBadge>
				<span title={script.command.scope} className="truncate">{script.command.scope}</span>
			</p>
			{phase === 'running' ? (
				<span className="flex shrink-0 items-center gap-2.5">
					<StatusGlyph indicator={statusIndicator} signal="running" progress={progress} />
					<TooltipIconButton
						label="Stop run"
						size="sm"
						className="bg-foreground text-background hover:bg-foreground/90 hover:text-background"
						onClick={onStop}
					>
						<Square aria-hidden="true" className="size-2.5 fill-current" />
					</TooltipIconButton>
				</span>
			) : (
				<StatusLabel indicator={statusIndicator} signal={phase} progress={progress} className="shrink-0 text-xs">
					{RUN_PHASE_WORD[phase]}
				</StatusLabel>
			)}
		</div>
	);
}

/** Where the run stands, as the sidebar roster shows it. */
type RunPhase = 'queued' | 'running' | 'approval' | 'input' | 'failed' | 'done';

/** The header tag's word once the run stops. Both waits read the same here; the card below says which. */
const RUN_PHASE_WORD = { queued: 'Queued', approval: 'Needs you', input: 'Needs you', failed: 'Failed', done: 'Done' } as const;

type AgentRunPanelProps = {
	script: AgentRunScript;
	state: AgentRunState;
	onStop: () => void;
	/** Called whenever the run starts waiting on a person, resumes, or completes. */
	onPhaseChange?: (phase: RunPhase) => void;
	/** Brings the decision or the failure into view and focus once it shows, e.g. when the agent opened to decide. */
	focusStop?: boolean;
	/** A past run: its approval or question shows as already settled, with every follow-up call done. */
	resolved?: boolean;
	/** Holds the run before it starts; the panel offers "Run now". */
	queued?: boolean;
	/** When a queued run starts, e.g. "Starts at 09:00 UTC." */
	queuedNote?: string;
	onStart?: () => void;
	onRetry?: () => void;
};

/**
 * The current run, narrated: command bar, streamed notes, the tool trace,
 * sub-agent and skill fan-out, live thinking status, and a follow-up composer.
 */
function AgentRunPanel({
	script,
	state,
	onStop,
	onPhaseChange,
	focusStop = false,
	resolved = false,
	queued = false,
	queuedNote,
	onStart,
	onRetry,
}: AgentRunPanelProps) {
	const { integration, emit, currentAgent, statusIndicator } = useAgentsBuilder();
	const agentId = currentAgent.agent.id;
	const [followUps, setFollowUps] = React.useState<string[]>([]);
	// A past run settled its gate long ago: approved, or answered with the first options.
	const [decision, setDecision] = React.useState<Decision>(resolved && script.approval ? 'approved' : null);
	const [answer, setAnswer] = React.useState<Answer>(() =>
		resolved && script.question && !script.approval
			? Object.fromEntries(script.question.questions.map((item) => [item.id, item.options[0] ? [item.options[0].id] : []]))
			: null,
	);
	const approvedSteps = useGateSteps(script.approval?.steps ?? [], decision === 'approved', resolved);
	const answeredSteps = useGateSteps(script.question?.steps ?? [], answer !== null && answer !== 'skipped', resolved);
	const startedGroups = script.groups.filter((group) => state[group.id].state !== 'waiting');
	const failed = state.failedStep !== null;
	const awaitingApproval = Boolean(script.approval) && state.approval && !decision;
	const awaitingAnswer = Boolean(script.question) && state.question && answer === null;
	const gateFinished = script.approval
		? decision === 'skipped' || (decision === 'approved' && approvedSteps.finished)
		: script.question
			? answer === 'skipped' || (answer !== null && answeredSteps.finished)
			: true;
	const complete = state.settled && !failed && gateFinished;
	const phase: RunPhase = queued
		? 'queued'
		: failed
			? 'failed'
			: complete
				? 'done'
				: awaitingApproval
					? 'approval'
					: awaitingAnswer
						? 'input'
						: 'running';
	const stopped = phase === 'approval' || phase === 'input' || phase === 'failed';
	const onPhaseChangeRef = useLatest(onPhaseChange);
	const stopRef = React.useRef<HTMLDivElement>(null);
	const stopFocused = React.useRef(false);

	React.useEffect(() => onPhaseChangeRef.current?.(phase), [onPhaseChangeRef, phase]);

	React.useEffect(() => {
		// Only the first time the run stops; afterwards focus stays where the person put it.
		if (!focusStop || !stopped || stopFocused.current) return;
		stopFocused.current = true;
		stopRef.current?.scrollIntoView({ block: 'center' });
		stopRef.current?.focus({ preventScroll: true });
	}, [focusStop, stopped]);
	const plan = script.plan && {
		steps: script.plan.map((label, index) => {
			const done = index < state.planDone || (complete && index === script.plan!.length - 1);
			return { label, status: done ? ('done' as const) : index === state.planDone ? ('in_progress' as const) : ('pending' as const) };
		}),
	};

	return (
		<aside aria-label="Current run" className="flex h-full w-full shrink-0 flex-col p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] @4xl/view:w-[395px] @4xl/view:pe-0">
			<div className="group/run relative flex min-h-0 flex-1 flex-col">
				<CommandBar
					script={script}
					phase={phase}
					progress={runProgress(script, state)}
					onStop={() => {
						onStop();
						emit({ type: 'stop-run' });
					}}
				/>
				<div
					aria-hidden="true"
					className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-[70px] bg-gradient-to-b from-background via-background via-60% to-transparent"
				/>
				<ChatContainer className="-mt-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
					<div className="flex flex-col gap-5 pt-6 pb-10">
						{plan && !queued ? <PlanTracker plan={plan} streaming={!complete} flushBottom={false} className="px-3" /> : null}
						{script.reasoning && state.reasoning !== 'hidden' ? (
							<Reasoning
								className="-my-2 px-1.5"
								content={script.reasoning.text}
								isStreaming={state.reasoning === 'streaming'}
								durationMs={state.reasoning === 'done' ? script.reasoning.seconds * 1000 : null}
							/>
						) : null}
						{script.paragraphs.slice(0, state.shownParagraphs).map((paragraph, index) => (
							<RevealText
								key={paragraph}
								text={paragraph}
								revealing={state.typing === index}
								duration={paragraph.length * RUN_TIMING.charMs}
								className="px-3 leading-[22px] text-muted-foreground"
							/>
						))}
						{state.shownSteps > 0 ? (
							<ToolTrace
								className="px-3"
								// Calls after a failure never ran, so they are not listed.
								steps={script.steps.slice(0, failed ? state.failedStep! + 1 : undefined).map((step, index) => ({
									id: step.id,
									label: step.label,
									icon: <IntegrationMark integration={integration(step.integrationId)} bare />,
									status:
										index === state.failedStep ? 'error' : index < state.doneSteps ? 'done' : index === state.doneSteps ? 'running' : 'pending',
								}))}
							/>
						) : null}
						{script.query && state.query !== 'hidden' ? (
							<div className={cn('flex flex-col gap-2 px-3', enterClass)}>
								<CodeBlock
									code={script.query.sql}
									language="sql"
									filename={script.query.name}
									streamingLines={state.query === 'code'}
									lineIntervalMs={110}
									className="bg-card"
								/>
								{state.query === 'rows' ? <ResultTable query={script.query} /> : null}
							</div>
						) : null}
						{startedGroups.length > 0 ? (
							<ul className="mx-3 divide-y divide-border overflow-hidden rounded-xl bg-card shadow-card">
								{startedGroups.map((group) => (
									<RunGroup key={group.id} group={group} play={state[group.id]} />
								))}
							</ul>
						) : null}
						{script.findings?.paragraphs.slice(0, state.shownFindings).map((paragraph, index) => (
							<RevealText
								key={paragraph}
								text={paragraph}
								revealing={state.typingFinding === index}
								duration={paragraph.length * RUN_TIMING.charMs}
								className="px-3 leading-[22px] text-foreground"
							/>
						))}
						{script.findings && state.sources ? (
							<Sources label="Sources" className={cn('px-3', enterClass)}>
								{script.findings.sources.map((source) => (
									<Source key={source.title} title={source.title} description={source.description} />
								))}
							</Sources>
						) : null}
						{script.approval && state.approval ? (
							<div ref={stopRef} tabIndex={-1} role="group" aria-label={script.approval.title} className="px-3 outline-none">
								<ApprovalBlock
									approval={script.approval}
									decision={decision}
									done={approvedSteps.done}
									onDecide={(approved) => {
										setDecision(approved ? 'approved' : 'skipped');
										emit({ type: 'approve-run', agentId, approved });
									}}
								/>
							</div>
						) : null}
						{script.question && !script.approval && state.question ? (
							<div ref={stopRef} tabIndex={-1} role="group" aria-label={script.question.title} className="px-3 outline-none">
								<QuestionBlock
									question={script.question}
									answer={answer}
									done={answeredSteps.done}
									onAnswer={(next) => {
										setAnswer(next);
										emit({ type: 'answer-run', agentId, answers: next === 'skipped' ? null : next });
									}}
								/>
							</div>
						) : null}
						{failed && script.failure ? (
							<div ref={stopRef} tabIndex={-1} role="group" aria-label="Run failed" className="px-3 outline-none">
								<FailureBlock failure={script.failure} step={script.steps.find((step) => step.id === script.failure?.stepId)} onRetry={onRetry} />
							</div>
						) : null}
						{queued ? (
							<div className="px-3">
								<QueuedBlock note={queuedNote} plan={script.plan} onStart={onStart} />
							</div>
						) : null}
						{followUps.map((text, index) => (
							<div key={index} className={cn('mx-3 rounded-xl bg-card px-3 py-2 text-sm whitespace-pre-wrap text-foreground shadow-card [overflow-wrap:anywhere]', enterClass)}>
								{text}
							</div>
						))}
						{complete ? (
							<div className={cn('flex items-center justify-between gap-2 px-3', enterClass)}>
								<p className="flex h-7 items-center gap-2 text-[0.8125rem] text-muted-foreground">
									<StatusGlyph indicator={statusIndicator} signal="done" />
									Run complete
								</p>
								<FeedbackBar showRegenerate={false} copyText={script.findings?.paragraphs.join('\n\n')} />
							</div>
						) : state.settled || queued || awaitingApproval || awaitingAnswer ? null : (
							<ThinkingStatus
								className="px-3"
								elapsedSeconds={script.thinking.seconds}
								tokens={script.thinking.tokens}
								tokensPerTick={35}
							/>
						)}
					</div>
				</ChatContainer>
				<div
					aria-hidden="true"
					className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-10 bg-gradient-to-t from-background to-transparent opacity-0 transition-opacity duration-(--duration-moderate) group-has-[[data-at-bottom=false]]/run:opacity-100"
				/>
			</div>
			<Composer
				surface="run"
				ariaLabel="Add a follow-up"
				placeholder="Add a follow-up"
				onSubmit={(text) => {
					setFollowUps((current) => [...current, text]);
					emit({ type: 'send-follow-up', surface: 'run', text });
				}}
			/>
		</aside>
	);
}

export { AgentRunPanel };
export type { AgentRunPanelProps, RunPhase };

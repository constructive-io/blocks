'use client';

import { Bot, Check, ChevronRight, Hand, Sparkles, Square, Zap } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { ApprovalCard } from '../ai/approval-card';
import { ChatContainer } from '../ai/chat-container';
import { CodeBlock } from '../ai/code-block';
import { FeedbackBar } from '../ai/feedback-bar';
import { iconEnterClass, MarkTile } from '../ai/mark-tile';
import { PlanTracker } from '../ai/plan-tracker';
import { Reasoning } from '../ai/reasoning';
import { Source, Sources } from '../ai/source';
import { ThinkingStatus } from '../ai/thinking-status';
import { ToolTrace } from '../ai/tool-trace';
import { Spinner } from '../spinner';
import { useAgentsBuilder } from './agents-builder-context';
import { Composer } from './composer';
import { IntegrationMark } from './integration-mark';
import { enterClass, focusRingClass, SurfaceBody, surfaceInsetClass, ToneBadge, TooltipIconButton, useInert } from '../workspace-kit/primitives';
import { RevealText } from './reveal-text';
import { usePlaybackClock } from './playback';
import type { AgentRunScript, RunApproval, RunQuery, ToolStep } from './types';
import { type AgentRunState, RUN_TIMING, type RunGroupPlay } from './use-agent-run';

const GROUP_ICON = { subagents: <Bot />, skills: <Sparkles /> } as const;
const GROUP_NOUN = { subagents: ['agent', 'agents'], skills: ['skill', 'skills'] } as const;

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
			<span className="text-foreground">{group.label}</span>
			<span className="text-muted-foreground tabular-nums">
				· {group.items.length} {group.items.length === 1 ? singular : plural}
			</span>
		</>
	);
	const row = 'flex h-8 w-full items-center gap-1.5 px-2 text-left text-[13px]';

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
							'size-3.5 text-muted-foreground transition-transform duration-(--duration-moderate) ease-out motion-reduce:transition-none',
							open && 'rotate-90',
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
						<li key={item} className={cn('flex h-7 items-center gap-2 pr-2 pl-[26px] text-[13px] text-muted-foreground', enterClass)}>
							<MarkTile>{GROUP_ICON[group.id]}</MarkTile>
							<span className="min-w-0 flex-1 truncate">{item}</span>
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
					<table className="w-full text-[13px] tabular-nums">
						<thead>
							<tr className="border-b border-dashed border-foreground/10 text-left text-xs text-muted-foreground">
								{query.columns.map((column, index) => (
									<th key={column} scope="col" className={cn('h-8 px-3 font-medium whitespace-nowrap', index > 0 && 'text-right')}>
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
											<th key={index} scope="row" className="px-3 text-left font-normal text-foreground">
												{cell}
											</th>
										) : (
											<td key={index} className={cn('px-3 text-right text-foreground', cellTone(cell))}>
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

/** Plays the approved tool calls one by one, then reports whether they finished. */
function useApprovedSteps(steps: ToolStep[], decision: Decision) {
	const [done, setDone] = React.useState(0);
	const running = decision === 'approved' && done < steps.length;
	usePlaybackClock(running ? { delay: done === 0 ? RUN_TIMING.stepsSpin : RUN_TIMING.stepWork } : undefined, false, () =>
		setDone((value) => value + 1),
	);
	return { done, finished: decision === 'skipped' || (decision === 'approved' && done >= steps.length) };
}

function ApprovalBlock({ approval, decision, done, onDecide }: { approval: RunApproval; decision: Decision; done: number; onDecide: (approved: boolean) => void }) {
	const { integration } = useAgentsBuilder();
	if (!decision) {
		return (
			<ApprovalCard
				className={cn('max-w-none', enterClass)}
				title={approval.title}
				description={approval.description}
				preview={<p className="rounded-md bg-muted/60 px-2.5 py-2 text-[13px] leading-5 text-pretty text-foreground">{approval.preview}</p>}
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
			<p className={cn('flex h-6 items-center gap-1.5 text-[13px] text-muted-foreground', enterClass)}>
				<Check aria-hidden="true" className={cn('size-3.5', iconEnterClass)} />
				{approved ? `You approved: ${approval.confirmLabel}` : `You chose: ${approval.skipLabel}`}
			</p>
			{approved ? (
				<ToolTrace
					title="Write tools"
					steps={approval.steps.map((step, index) => ({
						id: step.id,
						label: step.label,
						icon: <IntegrationMark integration={integration(step.integrationId)} bare />,
						status: index < done ? 'done' : index === done ? 'running' : 'pending',
					}))}
				/>
			) : null}
			{!approved || done >= approval.steps.length ? (
				<RevealText
					text={approved ? approval.approvedText : approval.skippedText}
					revealing
					duration={(approved ? approval.approvedText : approval.skippedText).length * RUN_TIMING.charMs}
					className="leading-[22px] text-foreground"
				/>
			) : null}
		</div>
	);
}

function CommandBar({ script, status, onStop }: { script: AgentRunScript; status: 'running' | 'awaiting' | 'done'; onStop: () => void }) {
	return (
		<div className="relative z-10 flex h-[50px] shrink-0 items-center gap-3 rounded-xl bg-card px-3 shadow-card">
			<p className="flex min-w-0 flex-1 items-center gap-1.5 text-sm whitespace-nowrap text-foreground">
				{script.command.verb}
				<ToneBadge tone="primary">
					<Zap aria-hidden="true" />
					{script.command.skill}
				</ToneBadge>
				<span className="truncate">{script.command.scope}</span>
			</p>
			{status === 'done' ? (
				<span className="inline-flex h-6 items-center gap-1 rounded-md bg-muted px-1.5 text-xs text-muted-foreground">
					<Check aria-hidden="true" className={cn('size-3', iconEnterClass)} />
					Done
				</span>
			) : status === 'awaiting' ? (
				<ToneBadge tone="warning" className="h-6">
					<Hand aria-hidden="true" />
					Needs you
				</ToneBadge>
			) : (
				<TooltipIconButton
					label="Stop run"
					size="sm"
					className="bg-foreground text-background hover:bg-foreground/90 hover:text-background"
					onClick={onStop}
				>
					<Square aria-hidden="true" className="size-2.5 fill-current" />
				</TooltipIconButton>
			)}
		</div>
	);
}

type AgentRunPanelProps = {
	script: AgentRunScript;
	state: AgentRunState;
	onStop: () => void;
};

/**
 * The current run, narrated: command bar, streamed notes, the tool trace,
 * sub-agent and skill fan-out, live thinking status, and a follow-up composer.
 */
function AgentRunPanel({ script, state, onStop }: AgentRunPanelProps) {
	const { integration, emit, data } = useAgentsBuilder();
	const [followUps, setFollowUps] = React.useState<string[]>([]);
	const [decision, setDecision] = React.useState<Decision>(null);
	const approvedSteps = useApprovedSteps(script.approval?.steps ?? [], decision);
	const startedGroups = script.groups.filter((group) => state[group.id].state !== 'waiting');
	const awaiting = Boolean(script.approval) && state.approval && !decision;
	const complete = state.settled && (!script.approval || approvedSteps.finished);
	const plan = script.plan && {
		steps: script.plan.map((label, index) => {
			const done = index < state.planDone || (complete && index === script.plan!.length - 1);
			return { label, status: done ? ('done' as const) : index === state.planDone ? ('in_progress' as const) : ('pending' as const) };
		}),
	};

	return (
		<aside aria-label="Current run" className="flex h-full w-full shrink-0 flex-col p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] @4xl/view:w-[395px] @4xl/view:pr-0">
			<div className="group/run relative flex min-h-0 flex-1 flex-col">
				<CommandBar
					script={script}
					status={complete ? 'done' : awaiting ? 'awaiting' : 'running'}
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
						{plan ? <PlanTracker plan={plan} streaming={!complete} flushBottom={false} className="px-3" /> : null}
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
								steps={script.steps.map((step, index) => ({
									id: step.id,
									label: step.label,
									icon: <IntegrationMark integration={integration(step.integrationId)} bare />,
									status: index < state.doneSteps ? 'done' : index === state.doneSteps ? 'running' : 'pending',
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
							<div className="px-3">
								<ApprovalBlock
									approval={script.approval}
									decision={decision}
									done={approvedSteps.done}
									onDecide={(approved) => {
										setDecision(approved ? 'approved' : 'skipped');
										emit({ type: 'approve-run', agentId: data.agent.id, approved });
									}}
								/>
							</div>
						) : null}
						{followUps.map((text, index) => (
							<div key={index} className={cn('mx-3 rounded-xl bg-card px-3 py-2 text-sm text-foreground shadow-card', enterClass)}>
								{text}
							</div>
						))}
						{complete ? (
							<div className={cn('flex items-center justify-between gap-2 px-3', enterClass)}>
								<p className="flex h-7 items-center gap-2 text-[13px] text-muted-foreground">
									<Check aria-hidden="true" className="size-3.5" />
									Run complete
								</p>
								<FeedbackBar showRegenerate={false} copyText={script.findings?.paragraphs.join('\n\n')} />
							</div>
						) : awaiting ? (
							<p className="flex h-7 items-center gap-2 px-3 text-[13px] text-muted-foreground">
								<Hand aria-hidden="true" className="size-3.5" />
								Waiting for your approval
							</p>
						) : state.settled ? null : (
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

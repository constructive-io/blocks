'use client';

import { ArrowRight, GitCompareArrows, Split } from 'lucide-react';
import * as React from 'react';
import { flushSync } from 'react-dom';

import { plural } from '../../lib/intl';
import { AgentRing } from '../agents-builder/agent-status';
import { type AskAnswer, AskCard } from '../ai/ask-card';
import { formatCompact } from '../ai/context-ring';
import { FeedbackBar } from '../ai/feedback-bar';
import { InlineDiff } from '../ai/inline-diff';
import { Message, MessageContent } from '../ai/message';
import { Reasoning } from '../ai/reasoning';
import { SystemMessage } from '../ai/system-message';
import { ThinkingStatus } from '../ai/thinking-status';
import { Tool, ToolGroup } from '../ai/tool';
import type { ToolStatus } from '../ai/types';
import { Button } from '../button';
import { useLatest } from '../workspace-kit/use-latest';
import { displayUrl } from './browser-panel';
import { type HarnessView, type RunView, runTokens, TASK_TURN_ID, type TimelineItem } from './harness';
import { AgentMark, MessageRoute, nameOf, plainText, recipientNames, runStateLabel } from './run-presentation';
import type { SessionBeatKind } from './types';
import { revealDuration, type SessionHarness } from './use-harness';

const TOOL_NAME: Record<string, string> = {
	read: 'Read',
	grep: 'Grep',
	glob: 'Glob',
	list: 'List',
	webfetch: 'Fetch',
	websearch: 'Search'
};

/** Lines of command output shown in the transcript: the end, where the result is. */
const SHELL_TAIL = 40;

const DECISION_LABEL = { once: 'Allowed once', always: 'Always allowed', deny: 'Denied' } as const;

/** The live line under the timeline names what the agent is about to do. */
const UPCOMING_LABEL: Partial<Record<SessionBeatKind, string>> = {
	reasoning: 'Thinking',
	tools: 'Exploring',
	edit: 'Making edits',
	shell: 'Running commands',
	browse: 'Opening the browser',
	say: 'Writing',
	plan: 'Planning',
	spawn: 'Starting agents',
	message: 'Writing to another agent',
	route: 'Choosing an agent'
};

/** How a run's state reads in a tool card's status slot. */
function toolStatus(run: RunView): ToolStatus {
	if (run.status === 'done' || run.status === 'idle') return 'success';
	if (run.status === 'failed') return 'error';
	if (run.status === 'cancelled') return 'aborted';
	if (run.status === 'queued') return 'pending';
	return 'running';
}

/** Holds `live` true for `ms` after mount, so a beat that just landed can play out its reveal. */
function useLiveFor(live: boolean, ms: number) {
	const [active, setActive] = React.useState(live);
	React.useEffect(() => {
		if (!live) return;
		const timer = window.setTimeout(() => setActive(false), ms);
		return () => window.clearTimeout(timer);
	}, [live, ms]);
	return active;
}

/** Streams a reply in over its reveal time, rendering markdown as it grows, as a live token stream would. */
function Say({ text, live }: { text: string; live: boolean }) {
	const duration = revealDuration(text);
	const [shown, setShown] = React.useState(live ? 0 : text.length);
	React.useEffect(() => {
		if (!live) return;
		const start = performance.now();
		let frame = 0;
		const tick = (now: number) => {
			const share = Math.min((now - start) / duration, 1);
			setShown(Math.round(text.length * share));
			if (share < 1) frame = requestAnimationFrame(tick);
		};
		frame = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(frame);
	}, [duration, live, text]);
	return (
		<Message from="assistant">
			<MessageContent markdown streaming={shown < text.length}>
				{text.slice(0, shown)}
			</MessageContent>
		</Message>
	);
}

function Thought({ text, durationMs, live }: { text: string; durationMs: number; live: boolean }) {
	const streaming = useLiveFor(live, durationMs);
	return <Reasoning content={text} isStreaming={streaming} durationMs={streaming ? null : durationMs} markdown />;
}

type Handlers = {
	harness: SessionHarness;
	runId: string;
	onReview: (path?: string) => void;
	onBrowse: (url: string) => void;
	onOpenRun: (runId: string) => void;
};

/** Callbacks a row needs, kept stable for the life of the transcript so memoized rows skip unrelated updates. */
type RowActions = {
	review: (path?: string) => void;
	browse: (url: string) => void;
	openRun: (runId: string) => void;
	stop: (runId: string) => void;
	retry: () => void;
	answer: (requestId: string, answer: AskAnswer) => void;
};

/**
 * One step of the transcript. Memoized: the harness keeps an item's identity until it changes, so a new event
 * re-renders only the rows it touched, not hundreds of earlier ones.
 */
const BeatRow = React.memo(function BeatRow({
	item,
	live,
	final,
	retryable,
	actions
}: {
	item: Extract<TimelineItem, { type: 'beat' }>;
	/** Landed since this transcript opened, so it plays its reveal. */
	live: boolean;
	/** The last reply of a finished turn, which gets the copy and feedback actions. */
	final: boolean;
	/** The run failed and can be retried from here. */
	retryable: boolean;
	actions: RowActions;
}) {
	return (
		// The id anchors the turn rail's jumps; the margin keeps a jumped-to message clear of the top edge.
		// Rows out of view skip layout and paint, sized from their last render, so a long thread scrolls smoothly.
		<div
			data-item-id={item.id}
			className="min-w-0 scroll-mt-6 animate-[ai-fade-up_var(--duration-slow)_var(--ease-out)_both] [contain-intrinsic-size:auto_3rem] [content-visibility:auto] motion-reduce:animate-none"
		>
			<BeatBody item={item} live={live} retryable={retryable} actions={actions} />
			{final && item.beat.kind === 'say' ? <FeedbackBar className="mt-1" copyText={item.beat.text} showRegenerate={false} /> : null}
		</div>
	);
});

function BeatBody({ item, live, retryable, actions }: { item: Extract<TimelineItem, { type: 'beat' }>; live: boolean; retryable: boolean; actions: RowActions }) {
	const beat = item.beat;
	switch (beat.kind) {
		case 'user':
			return (
				<Message from="user">
					<MessageContent>{beat.text}</MessageContent>
				</Message>
			);
		case 'reasoning':
			return <Thought text={beat.text} durationMs={beat.durationMs} live={live} />;
		case 'say':
			return <Say text={beat.text} live={live} />;
		case 'tools': {
			const names = [...new Set(beat.calls.map((call) => TOOL_NAME[call.tool]))].join(', ');
			return (
				<ToolGroup
					defaultOpen={false}
					className="max-w-none"
					label={
						<>
							{item.running ? 'Running' : 'Used'} {beat.calls.length} <span className="font-medium text-foreground">{names}</span>
						</>
					}
				>
					{beat.calls.map((call, index) => (
						<Tool key={index} name={TOOL_NAME[call.tool]} summary={call.target} status={item.running ? 'running' : 'success'} />
					))}
				</ToolGroup>
			);
		}
		case 'edit': {
			const created = item.before === null || item.before === undefined;
			// The inline diff names the file and counts the lines, so the row doesn't repeat them.
			return (
				<Tool name={created ? 'Create' : 'Edit'} summary={beat.path} status="success">
					<InlineDiff source={{ before: item.before ?? '', after: beat.after, fileName: beat.path }} maxLines={14} />
					<Button size="xs" variant="ghost" className="-ms-2 text-muted-foreground" onClick={() => actions.review(beat.path)}>
						<GitCompareArrows aria-hidden="true" />
						Open in Files changed
					</Button>
				</Tool>
			);
		}
		case 'shell': {
			const lines = beat.output.replace(/\n+$/, '').split('\n');
			const earlier = Math.max(lines.length - SHELL_TAIL, 0);
			// Output can run to hundreds of lines; the end is where a failure says what went wrong, so that's what shows.
			const output = beat.output
				? earlier
					? [`… ${earlier} earlier ${plural(earlier, { one: 'line', other: 'lines' })}`, ...lines.slice(earlier)].join('\n')
					: lines.join('\n')
				: undefined;
			return (
				<Tool
					variant="card"
					name="Shell"
					summary={beat.command}
					status={item.running ? 'running' : beat.exitCode ? 'error' : 'success'}
					output={item.running ? undefined : output}
					errorText={!item.running && beat.exitCode ? `Exited with code ${beat.exitCode}` : undefined}
					defaultOpen={Boolean(beat.exitCode)}
				>
					<code dir="ltr" className="block text-start font-mono text-[0.75rem] whitespace-pre-wrap text-foreground [overflow-wrap:anywhere]">
						<span aria-hidden="true" className="text-subtle-foreground select-none">
							${' '}
						</span>
						{beat.command}
					</code>
				</Tool>
			);
		}
		case 'browse':
			return (
				<Tool name="Browser" summary={displayUrl(beat.url)} status="success">
					<Button size="xs" variant="ghost" className="-ms-2 text-muted-foreground" onClick={() => actions.browse(beat.url)}>
						Show in the browser panel
					</Button>
				</Tool>
			);
		case 'notice':
			return <p className="max-w-prose text-xs text-pretty text-muted-foreground [overflow-wrap:anywhere]">{beat.text}</p>;
		case 'error': {
			return (
				<SystemMessage variant="destructive" title={beat.title}>
					<p className="[overflow-wrap:anywhere]">{beat.text}</p>
					{retryable ? (
						<Button size="xs" variant="outline" className="mt-2" onClick={actions.retry}>
							Retry
						</Button>
					) : null}
				</SystemMessage>
			);
		}
	}
}

/**
 * A sub-agent the run started, where it started it: the agent, its task, what it's doing or what it found, and a
 * way into its own transcript.
 */
const SpawnCard = React.memo(function SpawnCard({ child, stateLabel, actions }: { child: RunView; stateLabel: string; actions: RowActions }) {
	const status = toolStatus(child);
	const live = status === 'running' || status === 'pending';
	const detail = live ? child.lastTool : child.summary && plainText(child.summary);
	// A card opens if its agent was working when it appeared; after that it stays as you leave it.
	const [openAtFirst] = React.useState(live);
	return (
		<Tool variant="card" name={child.name} summary={child.task} status={status} defaultOpen={openAtFirst}>
			<div className="flex flex-col gap-2">
				<p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
					<span>{stateLabel}</span>
					{child.kind ? <span>· {child.kind}</span> : null}
					{child.workspace?.branch ? <span className="font-mono">· {child.workspace.branch}</span> : null}
					<span className="tabular-nums">· {formatCompact(runTokens(child))} tokens</span>
					{child.background ? <span>· background</span> : null}
				</p>
				{detail ? <p className="line-clamp-3 text-[0.8125rem] text-pretty text-foreground [overflow-wrap:anywhere]">{detail}</p> : null}
				<div className="-ms-2 flex flex-wrap gap-1">
					<Button size="xs" variant="ghost" className="text-muted-foreground" onClick={() => actions.openRun(child.id)}>
						Open {child.name}
						<ArrowRight aria-hidden="true" className="rtl:-scale-x-100" />
					</Button>
					{live && child.capabilities?.stop !== false ? (
						<Button size="xs" variant="ghost" className="text-muted-foreground" onClick={() => actions.stop(child.id)}>
							Stop
						</Button>
					) : null}
				</div>
			</div>
		</Tool>
	);
});

/** Where a parent picks its workers' results back up: one line per worker with what it reported. */
function FanIn({ runIds, view, onOpenRun }: { runIds: string[]; view: HarnessView; onOpenRun: (runId: string) => void }) {
	const runs = runIds.map((id) => view.runs[id]).filter((run): run is RunView => Boolean(run));
	return (
		<ToolGroup
			className="max-w-none"
			defaultOpen
			label={
				<>
					Results from <span className="tabular-nums">{runs.length}</span> {plural(runs.length, { one: 'agent', other: 'agents' })}
				</>
			}
		>
			{runs.map((run) => (
				<button
					key={run.id}
					type="button"
					onClick={() => onOpenRun(run.id)}
					className="-mx-1 flex min-h-8 items-start gap-2 rounded-md px-1 py-1 text-start text-[0.8125rem] hover:bg-accent"
				>
					<AgentMark name={run.name} className="mt-0.5" />
					<span className="min-w-0 flex-1">
						<span className="font-medium text-foreground">{run.name}</span>{' '}
						<span className="text-muted-foreground [overflow-wrap:anywhere]">{run.summary ? plainText(run.summary) : runStateLabel(run, view)}</span>
					</span>
				</button>
			))}
		</ToolGroup>
	);
}

const PROTOCOL_LABEL = { 'plan-approval': 'Plan for approval', shutdown: 'Asks to wrap up', steer: 'Steer', result: 'Result', text: '' } as const;

/** A message between agents, or from you to one: who to whom, then what was said. */
const AgentMessage = React.memo(function AgentMessage({ item, from, to }: { item: Extract<TimelineItem, { type: 'message' }>; from: string; to: string }) {
	const label = PROTOCOL_LABEL[item.protocol];
	return (
		<div className="flex flex-col gap-1.5">
			<MessageRoute from={from} to={to} label={label} />
			<div className="ms-6 rounded-lg bg-muted/50 px-3 py-2">
				<MessageContent markdown>{item.text}</MessageContent>
			</div>
		</div>
	);
});

/** The last reply of each finished turn, which gets the copy and feedback actions. */
function settledReplies(items: TimelineItem[], running: boolean) {
	const finals = new Set<string>();
	let lastSay: string | null = null;
	for (const item of items) {
		if (item.type === 'beat' && item.beat.kind === 'user') {
			if (lastSay) finals.add(lastSay);
			lastSay = null;
		} else if (item.type === 'beat' && item.beat.kind === 'say') {
			lastSay = item.id;
		}
	}
	if (lastSay && !running) finals.add(lastSay);
	return finals;
}

/** What the live status line says: the step in progress if there is one, else the one about to start. */
function statusLabel(run: RunView, upcoming: SessionBeatKind | undefined, view: HarnessView) {
	if (run.status === 'waiting' && run.waitingOn?.kind === 'agent') return runStateLabel(run, view);
	for (let index = run.items.length - 1; index >= 0; index -= 1) {
		const item = run.items[index];
		if (item.type === 'beat' && item.running) return UPCOMING_LABEL[item.beat.kind] ?? 'Working';
	}
	return UPCOMING_LABEL[upcoming ?? 'say'] ?? 'Working';
}

/** Rows a transcript renders when it opens, and how many more it adds each time you scroll near the top. */
const HISTORY_CHUNK = 120;

export type TimelineHandle = {
	/** Renders history down to the row with this id if it isn't yet, and returns its element. */
	reveal: (id: string) => HTMLElement | null;
};

/**
 * One run's transcript, rendered entirely from AI kit parts: messages, reasoning, tool groups, edits with inline
 * diffs, commands, questions, sub-agent cards and their results, messages between agents, handoffs, phases, and a
 * summary of what each turn changed.
 */
export function SessionTimeline({
	harness,
	runId,
	onReview,
	onBrowse,
	onOpenRun,
	onAnswered,
	scroller,
	handle
}: Handlers & {
	onAnswered: () => void;
	/** The transcript's scroller, which earlier history loads against as you scroll up. */
	scroller: () => HTMLElement | null;
	handle?: React.Ref<TimelineHandle>;
}) {
	const view = harness.view;
	const run = view.runs[runId];
	// Steps already in the transcript when it opens are history: they don't replay their reveal when you come back.
	const [settledBefore] = React.useState(() => run?.items.length ?? 0);
	// A long thread opens on its latest rows; earlier ones render in chunks as you scroll up, so opening it stays quick.
	const [renderFrom, setRenderFrom] = React.useState(() => Math.max(0, (run?.items.length ?? 0) - HISTORY_CHUNK));
	const root = React.useRef<HTMLDivElement>(null);
	const sentinel = React.useRef<HTMLDivElement>(null);
	const items = run?.items;
	React.useImperativeHandle(
		handle,
		() => ({
			reveal: (id) => {
				const index = items?.findIndex((item) => item.id === id) ?? -1;
				if (index >= 0 && index < renderFrom) flushSync(() => setRenderFrom(Math.max(0, index - 8)));
				return root.current?.querySelector<HTMLElement>(`[data-item-id="${CSS.escape(id)}"]`) ?? null;
			}
		}),
		[items, renderFrom]
	);
	React.useEffect(() => {
		const node = sentinel.current;
		if (!node || renderFrom === 0) return;
		if (typeof IntersectionObserver === 'undefined') {
			setRenderFrom(0);
			return;
		}
		const observer = new IntersectionObserver(
			([entry]) => {
				// The browser keeps the rows you're reading in place as earlier ones are added above them.
				if (entry?.isIntersecting) setRenderFrom((from) => Math.max(0, from - HISTORY_CHUNK));
			},
			{ root: scroller(), rootMargin: '1200px 0px 0px 0px' }
		);
		observer.observe(node);
		return () => observer.disconnect();
	}, [renderFrom, scroller]);
	// The rows get callbacks that never change, so they can skip re-rendering; these read the newest props when called.
	const latest = useLatest({ harness, runId, onReview, onBrowse, onOpenRun, onAnswered });
	const actions = React.useMemo<RowActions>(
		() => ({
			review: (path) => latest.current.onReview(path),
			browse: (url) => latest.current.onBrowse(url),
			openRun: (id) => latest.current.onOpenRun(id),
			stop: (id) => latest.current.harness.stop(id),
			retry: () => latest.current.harness.retry(latest.current.runId),
			answer: (requestId, answer) => {
				latest.current.harness.answer(requestId, answer);
				latest.current.onAnswered();
			}
		}),
		[latest]
	);
	if (!run) return null;
	const busy = run.status === 'running' || (run.status === 'waiting' && run.waitingOn?.kind === 'agent');
	const lastIndex = run.items.length - 1;
	const last = run.items[lastIndex];
	const isLive = (item: TimelineItem, index: number) => item.type === 'beat' && item.live && index >= settledBefore;
	// A reply or thought that is still playing speaks for itself, so the live status line steps aside.
	const playing = last?.type === 'beat' && isLive(last, lastIndex) && (last.beat.kind === 'say' || last.beat.kind === 'reasoning');
	const finals = settledReplies(run.items, busy);
	const parent = run.parentRunId ? view.runs[run.parentRunId] : undefined;
	const retryable = run.status === 'failed';

	return (
		<div ref={root} className="flex flex-col gap-3">
			{renderFrom > 0 ? <div ref={sentinel} aria-hidden="true" className="h-px" /> : null}
			{parent && run.task && renderFrom === 0 ? (
				// A child's transcript opens with what it was asked to do, which is also its first turn on the rail.
				<Message from="user" data-item-id={TASK_TURN_ID} className="scroll-mt-6">
					<MessageContent>
						<span className="mb-1 block text-xs text-muted-foreground">Task from {parent.name}</span>
						{run.task}
					</MessageContent>
				</Message>
			) : null}
			{run.items.map((item, index) => {
				if (index < renderFrom) return null;
				if (item.type === 'beat') {
					return (
						<BeatRow
							key={item.id}
							item={item}
							live={isLive(item, index)}
							final={finals.has(item.id)}
							retryable={item.beat.kind === 'error' && retryable}
							actions={actions}
						/>
					);
				}
				if (item.type === 'spawn') {
					const child = view.runs[item.runId];
					return child ? <SpawnCard key={item.id} child={child} stateLabel={runStateLabel(child, view)} actions={actions} /> : null;
				}
				if (item.type === 'fan-in') return <FanIn key={item.id} runIds={item.runIds} view={view} onOpenRun={actions.openRun} />;
				if (item.type === 'message') {
					return (
						<AgentMessage
							key={item.id}
							item={item}
							from={nameOf(view, item.from)}
							to={recipientNames(view, item.to)}
						/>
					);
				}
				if (item.type === 'handoff') {
					return (
						<p key={item.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
							<Split aria-hidden="true" className="size-3.5 shrink-0" />
							<span>
								Control passed to <span className="font-medium text-foreground">{nameOf(view, item.to)}</span>
								{item.reason ? ` · ${item.reason}` : ''}
							</span>
						</p>
					);
				}
				if (item.type === 'route') return <Tool key={item.id} name={`Chose ${nameOf(view, item.to)}`} summary={item.reason} status="success" />;
				if (item.type === 'phase') {
					return (
						<div key={item.id} className="flex items-center gap-2 pt-2 text-xs font-medium text-muted-foreground">
							<AgentRing signal={item.status === 'running' ? 'running' : 'done'} />
							<span className="text-foreground">{item.name}</span>
							<span aria-hidden="true" className="h-px flex-1 bg-border" />
						</div>
					);
				}
				if (item.type === 'permission') {
					// A pending request waits in the dock above the composer; once decided it leaves a line here.
					if (!item.decision) return null;
					return <Tool key={item.id} name={DECISION_LABEL[item.decision]} summary={item.beat.command} status={item.decision === 'deny' ? 'aborted' : 'success'} />;
				}
				if (item.type === 'question') {
					return (
						<AskCard
							key={item.id}
							eyebrow={runId === view.rootRunId ? 'The agent has a question' : `${run.name} has a question`}
							questions={item.beat.questions}
							answer={item.answer}
							onSubmit={(choices) => actions.answer(item.requestId, { choices })}
							onSkip={() => actions.answer(item.requestId, { skipped: true })}
						/>
					);
				}
				return (
					<div key={item.id}>
						<Button size="xs" variant="outline" className="text-muted-foreground" onClick={() => actions.review(item.paths[0])}>
							<GitCompareArrows aria-hidden="true" />
							<span>
								<span className="tabular-nums">{item.paths.length}</span> {plural(item.paths.length, { one: 'file', other: 'files' })} changed
							</span>
							{item.additions ? <span className="font-mono text-success tabular-nums">+{item.additions}</span> : null}
							{item.deletions ? <span className="font-mono text-destructive tabular-nums">−{item.deletions}</span> : null}
						</Button>
					</div>
				);
			})}
			{busy && !playing ? (
				// One status line per run: its clock keeps counting as the label moves from step to step.
				<ThinkingStatus label={statusLabel(run, harness.upcoming(runId), view)} tokens={runTokens(run)} tokensPerTick={0} className="px-0" />
			) : null}
		</div>
	);
}

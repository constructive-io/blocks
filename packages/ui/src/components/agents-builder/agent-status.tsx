'use client';

import * as React from 'react';

import { cn } from '../../lib/utils';
import type { AgentStatus, AgentStatusIndicator, AgentSummary } from './types';

/** Resolves the deprecated `running` flag into a status. */
function agentStatus(agent: AgentSummary): AgentStatus {
	return agent.status ?? (agent.running ? 'running' : 'idle');
}

/** A run is still open: running, or paused on a person. These names shimmer. */
function isInFlight(status: AgentStatus) {
	return status === 'running' || status === 'approval' || status === 'input';
}

/** Paused on a person: opening the agent jumps straight to the decision. */
function isWaitingOnYou(status: AgentStatus) {
	return status === 'approval' || status === 'input';
}

/** Kept on screen even past the roster limit. */
function needsAttention(status: AgentStatus) {
	return isWaitingOnYou(status) || status === 'failed';
}

const STATUS_PHRASE: Record<AgentStatus, string | null> = {
	idle: null,
	queued: 'Queued',
	running: 'Running',
	approval: 'Waiting for your approval',
	input: 'Waiting for your answer',
	failed: 'Last run failed',
};

/** Sentence-case state for tooltips; `null` for an idle agent with nothing new. */
function statusPhrase(agent: AgentSummary): string | null {
	const status = agentStatus(agent);
	return STATUS_PHRASE[status] ?? (agent.unread ? 'New result' : null);
}

/** Accessible name: "Revenue Analyst, waiting for your approval". */
function agentLabel(agent: AgentSummary) {
	const phrase = statusPhrase(agent);
	return phrase ? `${agent.name}, ${phrase.toLowerCase()}` : agent.name;
}

const TAG_WORD = { approval: 'Approve', input: 'Answer', failed: 'Failed', queued: 'Queued' } as const;
type TaggedStatus = keyof typeof TAG_WORD;

/** States that show a word at the end of the row: the three that need you, and a queued run. */
function hasStatusTag(status: AgentStatus): status is TaggedStatus {
	return status in TAG_WORD;
}

/** A state an indicator draws: an agent's status, or a finished run whose result waits to be read. */
type StatusSignal = AgentStatus | 'done';

/** What the roster draws for an agent: its status, or `done` while a fresh result is unread. */
function agentSignal(agent: AgentSummary): StatusSignal {
	const status = agentStatus(agent);
	return status === 'idle' && agent.unread ? 'done' : status;
}

/** Colour belongs to the states that need you; everything else stays grey. */
const SIGNAL_TONE: Partial<Record<StatusSignal, string>> = {
	approval: 'var(--warning)',
	input: 'var(--primary)',
	failed: 'var(--destructive)',
};

/** Sets `--tone` for a toned state; calm states set nothing. */
function toneStyle(signal: StatusSignal): React.CSSProperties | undefined {
	const tone = SIGNAL_TONE[signal];
	return tone ? ({ '--tone': tone } as React.CSSProperties) : undefined;
}

/** Text in the state's tone, mixed toward the text colour so it holds contrast in both themes. */
const toneTextClass = 'text-[color-mix(in_oklab,var(--tone),var(--foreground)_28%)]';

const RAIL_PLACEMENT = {
	// Centred on a project's rail line: the list's 1px border, then 6px of padding before the row, so
	// the line's centre is 6.5px before the row and a 2px bar starts 7.5px before it, overhanging the
	// line by half a pixel each side. It reaches 1px past each end, half the 2px gap between rows, so
	// neighbouring stretches meet.
	rail: 'absolute -inset-y-px -start-[7.5px] w-0.5',
	edge: 'absolute inset-y-1.5 start-0 w-0.5',
	inline: 'relative h-3.5 w-0.5 shrink-0',
	// A slim capsule 3px before the box it sits beside, centred on it. Every state draws the same size.
	pill: 'absolute top-1/2 -start-[5px] h-5 w-0.5 -translate-y-1/2',
} as const;

type SignalRailProps = {
	signal: StatusSignal;
	/**
	 * `rail` lies on the line a project's rows hang from; `edge` draws at the
	 * row's own start edge where no line runs; `inline` is a short bar beside
	 * text, as in a status line; `pill` is a capsule beside a square, as in
	 * the icon rail.
	 */
	placement?: keyof typeof RAIL_PLACEMENT;
	className?: string;
};

/**
 * A stretch of rail as a status channel. While a run goes a light travels
 * down it; waiting on you it becomes a bar in the state's tone that breathes;
 * a failure holds the bar still; a queued run is dashed. An idle agent, or one
 * whose run has finished, draws nothing and leaves the rail as it is.
 */
function SignalRail({ signal, placement = 'rail', className }: SignalRailProps) {
	if (signal === 'idle' || signal === 'done') return null;
	if (placement === 'pill') {
		return (
			<span aria-hidden="true" data-slot="signal-rail" data-signal={signal} style={toneStyle(signal)} className={cn(RAIL_PLACEMENT.pill, className)}>
				<span
					className={cn(
						'absolute inset-0 rounded-full',
						signal === 'running'
							? 'bg-muted-foreground animate-[agent-pill-breathe_1.6s_ease-in-out_infinite] motion-reduce:animate-none'
							: signal === 'queued'
								? 'bg-[repeating-linear-gradient(to_bottom,var(--subtle-foreground)_0_2px,transparent_2px_4px)]'
								: cn('bg-(--tone)', signal !== 'failed' && 'animate-pulse motion-reduce:animate-none'),
					)}
				/>
			</span>
		);
	}
	return (
		<span aria-hidden="true" data-slot="signal-rail" data-signal={signal} style={toneStyle(signal)} className={cn(RAIL_PLACEMENT[placement], className)}>
			{signal === 'running' ? (
				// On the rail the project's own line is the track, so only the light is drawn over it.
				<span
					className={cn(
						'absolute inset-y-0 left-1/2 w-px -translate-x-1/2 overflow-hidden',
						placement !== 'rail' && 'bg-[color-mix(in_oklab,var(--foreground)_14%,transparent)]',
					)}
				>
					<span className="absolute inset-x-0 h-4 bg-[linear-gradient(to_bottom,transparent,var(--foreground),transparent)] animate-[agent-rail-travel_1.6s_cubic-bezier(0.45,0,0.55,1)_infinite] motion-reduce:top-1/2 motion-reduce:h-1 motion-reduce:animate-none" />
				</span>
			) : signal === 'queued' ? (
				// On the rail the gaps take the sidebar's colour so they cut its line; elsewhere they are clear.
				<span
					className={cn(
						'absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[repeating-linear-gradient(to_bottom,var(--subtle-foreground)_0_2px,var(--rail-gap)_2px_5px)]',
						placement === 'rail' ? '[--rail-gap:var(--sidebar)]' : '[--rail-gap:transparent]',
					)}
				/>
			) : (
				<span
					className={cn(
						// On the rail the bar fills its stretch with square ends, so it joins the line and its neighbours without a seam.
						'absolute inset-0',
						placement === 'rail' ? 'rounded-none' : 'rounded-full',
						'bg-(--tone) shadow-[0_0_6px_color-mix(in_oklab,var(--tone)_45%,transparent)]',
						signal !== 'failed' && 'animate-pulse motion-reduce:animate-none',
					)}
				/>
			)}
		</span>
	);
}

const RING_SIZE = {
	sm: { box: 14, r: 5.25, className: 'size-3.5' },
	lg: { box: 24, r: 11, className: 'size-6' },
} as const;

type AgentRingProps = {
	signal: StatusSignal;
	/** How far the run got, from 0 to 1. Without it a stop closes the ring and a run only spins. */
	progress?: number;
	/** `sm`: a 14px glyph before a name. `lg`: a 24px ring round the initials in the icon rail. */
	size?: keyof typeof RING_SIZE;
	/** Drawn inside an `lg` ring, e.g. the initials. */
	children?: React.ReactNode;
	className?: string;
};

/**
 * One drawn circle for every state, and its arc is how far the run got. A
 * running ring spins a short highlight over the arc; a stop holds the arc in
 * its tone with a centre dot, breathing while it waits on you; queued is a
 * dashed ring; a fresh result closes the ring round a check; idle is the
 * empty track.
 */
function AgentRing({ signal, progress, size = 'sm', children, className }: AgentRingProps) {
	const { box, r, className: sizeClass } = RING_SIZE[size];
	const length = 2 * Math.PI * r;
	const stopped = signal === 'approval' || signal === 'input' || signal === 'failed';
	const arc = signal === 'done' ? 1 : signal === 'running' || stopped ? Math.min(progress ?? (stopped ? 1 : 0), 1) : 0;
	const circle = { cx: box / 2, cy: box / 2, r, fill: 'none', stroke: 'currentColor', strokeWidth: 1.5 } as const;
	return (
		<span
			aria-hidden="true"
			data-slot="agent-ring"
			data-signal={signal}
			style={toneStyle(signal)}
			className={cn(
				'relative grid shrink-0 place-items-center',
				sizeClass,
				SIGNAL_TONE[signal] ? 'text-(--tone)' : signal === 'idle' ? 'text-subtle-foreground' : signal === 'done' ? 'text-foreground' : 'text-muted-foreground',
				className,
			)}
		>
			<svg viewBox={`0 0 ${box} ${box}`} className="absolute inset-0 size-full -rotate-90">
				<circle {...circle} strokeDasharray={signal === 'queued' ? '1.6 2' : undefined} opacity={signal === 'queued' ? 0.7 : 0.22} />
				{arc > 0 ? (
					<circle
						{...circle}
						strokeLinecap="round"
						strokeDasharray={`${length * arc} ${length}`}
						className="transition-[stroke-dasharray] duration-(--duration-slow) ease-(--ease-out) motion-reduce:transition-none"
					/>
				) : null}
			</svg>
			{signal === 'running' ? (
				<svg viewBox={`0 0 ${box} ${box}`} className="absolute inset-0 size-full animate-spin text-foreground [animation-duration:1.2s] motion-reduce:hidden">
					<circle {...circle} strokeLinecap="round" strokeDasharray={`${length * 0.14} ${length}`} />
				</svg>
			) : null}
			{size === 'lg' ? (
				children
			) : stopped ? (
				<span className={cn('size-1 rounded-full bg-current', signal !== 'failed' && 'animate-pulse motion-reduce:animate-none')} />
			) : signal === 'done' ? (
				<svg viewBox="0 0 14 14" className="absolute inset-0 size-full">
					<path d="M4.6 7.2 6.3 8.9 9.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
				</svg>
			) : null}
		</span>
	);
}

type StatusLabelProps = Omit<React.ComponentProps<'span'>, 'children'> & {
	indicator: AgentStatusIndicator;
	signal: StatusSignal;
	progress?: number;
	children: React.ReactNode;
};

/** A state's glyph in the chosen indicator: a ring, or a short bar of rail. */
function StatusGlyph({ indicator, signal, progress }: Pick<StatusLabelProps, 'indicator' | 'signal' | 'progress'>) {
	return indicator === 'rings' ? <AgentRing signal={signal} progress={progress} /> : <SignalRail signal={signal} placement="inline" />;
}

/** A state's glyph in the chosen indicator, then its words, in the state's tone when it needs you. */
function StatusLabel({ indicator, signal, progress, children, className, style, ...props }: StatusLabelProps) {
	return (
		<span
			{...props}
			style={{ ...toneStyle(signal), ...style }}
			className={cn('inline-flex min-w-0 items-center gap-1.5 font-medium', SIGNAL_TONE[signal] ? toneTextClass : 'text-muted-foreground', className)}
		>
			<StatusGlyph indicator={indicator} signal={signal} progress={progress} />
			<span className="truncate">{children}</span>
		</span>
	);
}

/**
 * The tag word on its own, under the initials in the icon rail, in the
 * state's tone. It shimmers while the run waits on you, like the initials
 * above it, and holds still once the run has failed or while it is queued.
 */
function AgentStatusWord({ status }: { status: AgentStatus }) {
	if (!hasStatusTag(status)) return null;
	return (
		<span
			aria-hidden="true"
			style={toneStyle(status)}
			className={cn(
				'block text-[0.5625rem] leading-none font-medium tracking-tight whitespace-nowrap',
				status === 'queued' ? '[--word:var(--subtle-foreground)]' : '[--word:color-mix(in_oklab,var(--tone),var(--foreground)_28%)]',
				isWaitingOnYou(status)
					? [
							// Same sweep as TextShimmer: toward the page colour in light, toward the text colour in dark.
							'bg-[linear-gradient(90deg,var(--word)_35%,color-mix(in_oklab,var(--word),var(--sidebar)_55%)_50%,var(--word)_65%)]',
							'dark:bg-[linear-gradient(90deg,var(--word)_35%,var(--foreground)_50%,var(--word)_65%)]',
							'bg-size-[200%_100%] bg-clip-text text-transparent animate-[ai-shimmer-text_1.4s_linear_infinite]',
							'motion-reduce:animate-none motion-reduce:bg-none motion-reduce:text-(--word)',
						]
					: 'text-(--word)',
			)}
		>
			{TAG_WORD[status]}
		</span>
	);
}

/** Most pressing first: a decision, then a question, then a failure, then a queued run. */
const TAG_PRIORITY: TaggedStatus[] = ['approval', 'input', 'failed', 'queued'];

/** The tag a folded group of agents shows: its most pressing agent's, or `null` when none has one. */
function mostUrgentTag(agents: AgentSummary[]): TaggedStatus | null {
	let best: TaggedStatus | null = null;
	for (const agent of agents) {
		const status = agentStatus(agent);
		if (hasStatusTag(status) && (best === null || TAG_PRIORITY.indexOf(status) < TAG_PRIORITY.indexOf(best))) best = status;
	}
	return best;
}

/**
 * The first `limit` agents in roster order, except that an agent needing
 * attention past the limit takes the place of the last calm row above it.
 * Only rows that need a person move, so the list never reshuffles on its own,
 * and it never grows past `limit`: once every row needs you, the rest wait
 * behind "More agents".
 */
function visibleRoster(agents: AgentSummary[], limit: number): AgentSummary[] {
	if (agents.length <= limit) return agents;
	const head = agents.slice(0, limit);
	const calm = head.filter((agent) => !needsAttention(agentStatus(agent))).length;
	const promoted = agents
		.slice(limit)
		.filter((agent) => needsAttention(agentStatus(agent)))
		.slice(0, calm);
	let room = promoted.length;
	const kept: AgentSummary[] = [];
	for (const agent of head.reverse()) {
		if (room > 0 && !needsAttention(agentStatus(agent))) room -= 1;
		else kept.unshift(agent);
	}
	return [...kept, ...promoted];
}

export {
	AgentRing,
	agentLabel,
	agentSignal,
	agentStatus,
	AgentStatusWord,
	hasStatusTag,
	isInFlight,
	isWaitingOnYou,
	mostUrgentTag,
	needsAttention,
	SignalRail,
	StatusGlyph,
	StatusLabel,
	statusPhrase,
	TAG_WORD,
	visibleRoster,
};
export type { AgentRingProps, SignalRailProps, StatusLabelProps, StatusSignal };

'use client';

import { cn } from '../../lib/utils';
import type { AgentStatus, AgentSummary } from './types';

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
/** The state's colour, only ever mixed in faintly: the tag stays nearly monochrome. */
const TAG_TONE = {
	approval: '[--tag:var(--warning)]',
	input: '[--tag:var(--primary)]',
	failed: '[--tag:var(--destructive)]',
	queued: '[--tag:var(--muted-foreground)]',
} as const;

/**
 * What an agent needs from you, as one word: a tag shaped like a drop, sharp
 * at the corner nearest the name or initials it belongs to, with off-white
 * text and a faint wash of the state's colour. Light theme fills it with a
 * translucent mid grey so the light text holds; dark theme keeps it dark
 * with a tinted edge. An open run's border shimmers like its name; a failed
 * run's border holds still. A queued run gets the same shape as an outline
 * only, quieter than anything that needs you. Nothing for other agents.
 */
function AgentStatusTag({ status }: { status: AgentStatus }) {
	if (!hasStatusTag(status)) return null;
	if (status === 'queued') {
		return (
			<span
				aria-hidden="true"
				className="rounded-[7px] rounded-ss-[2px] border border-subtle-foreground/35 px-1 text-[0.5625rem] leading-[13px] font-medium tracking-tight whitespace-nowrap text-muted-foreground"
			>
				{TAG_WORD.queued}
			</span>
		);
	}
	return (
		<span
			aria-hidden="true"
			className={cn(
				'relative flex p-px',
				TAG_TONE[status],
				// Light: a mid grey with a little hue, translucent but dark enough that off-white text clears 4.5:1 on the sidebar.
				'[--tag-fill:color-mix(in_oklab,color-mix(in_oklab,var(--tag)_16%,var(--muted-foreground))_94%,transparent)]',
				'[--tag-edge:color-mix(in_oklab,color-mix(in_oklab,var(--tag)_20%,var(--muted-foreground))_45%,transparent)]',
				'[--tag-glint:color-mix(in_oklab,var(--tag)_20%,var(--sidebar))]',
				// Dark: an opaque dark fill, so in the rail it still covers the row's edge, with a softer tinted edge.
				'dark:[--tag-fill:color-mix(in_oklab,var(--tag)_7%,var(--sidebar))]',
				'dark:[--tag-edge:color-mix(in_oklab,var(--tag)_28%,transparent)]',
				'dark:[--tag-glint:color-mix(in_oklab,var(--tag)_50%,var(--foreground))]',
			)}
		>
			{/* The border: a ring masked to its 1px padding, so it sweeps like text shimmer without showing through the fill. */}
			<span
				className={cn(
					'absolute inset-0 rounded-[7px] rounded-ss-[2px] p-px [mask:linear-gradient(#000_0_0)_content-box,linear-gradient(#000_0_0)] [mask-composite:exclude]',
					isWaitingOnYou(status)
						? [
								'bg-[linear-gradient(90deg,var(--tag-edge)_30%,var(--tag-glint)_50%,var(--tag-edge)_70%)]',
								'bg-size-[200%_100%] animate-[ai-shimmer-text_1.4s_linear_infinite]',
								'motion-reduce:animate-none motion-reduce:bg-none motion-reduce:bg-(--tag-edge)',
							]
						: 'bg-(--tag-edge)',
				)}
			/>
			{/* Inner radius = outer radius - the 1px ring, so the border keeps an even width round the curve. */}
			<span className="relative rounded-[6px] rounded-ss-[1px] bg-(--tag-fill) px-1 text-[0.5625rem] leading-[13px] font-medium tracking-tight whitespace-nowrap text-[color-mix(in_oklab,var(--tag)_6%,white)]">
				{TAG_WORD[status]}
			</span>
		</span>
	);
}

/**
 * The tag's word on its own, for the collapsed rail, where a boxed tag
 * crowds the initials: small type under them, faintly tinted with the state's
 * colour. It shimmers while the run waits on you, like the initials above it,
 * and holds still once the run has failed or while it is queued.
 */
function AgentStatusWord({ status }: { status: AgentStatus }) {
	if (!hasStatusTag(status)) return null;
	return (
		<span
			aria-hidden="true"
			className={cn(
				'block text-[0.5rem] leading-none font-medium tracking-tight whitespace-nowrap',
				TAG_TONE[status],
				status === 'queued' ? '[--word:var(--subtle-foreground)]' : '[--word:color-mix(in_oklab,var(--tag)_40%,var(--muted-foreground))]',
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

export { AgentStatusTag, AgentStatusWord, agentLabel, agentStatus, hasStatusTag, isInFlight, isWaitingOnYou, mostUrgentTag, needsAttention, statusPhrase, visibleRoster };

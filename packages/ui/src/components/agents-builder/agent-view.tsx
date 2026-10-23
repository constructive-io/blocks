'use client';

import { ArrowLeft } from 'lucide-react';
import * as React from 'react';

import { cn } from '../../lib/utils';
import { Button } from '../button';
import { AgentCanvas } from './agent-canvas';
import { AgentRunPanel, type RunPhase } from './agent-run-panel';
import { agentStatus } from './agent-status';
import { AgentsBuilderContext, useAgentsBuilder } from './agents-builder-context';
import { focusRingClass, NavMenuButton, pressClass, TooltipIconButton, useInert } from '../workspace-kit/primitives';
import { useLatest } from '../workspace-kit/use-latest';
import type { AgentRunScript, AgentStatus } from './types';
import { runProgress, useAgentRun } from './use-agent-run';
import { startViewTransition, ViewAnimation } from '../workspace-kit/view-transition';

/** How a run opens. Replay plays it from the start; settled jumps to where it stopped; resolved shows a finished run. */
type RunStart = 'replay' | 'settled' | 'resolved' | 'queued';

function runStart(status: AgentStatus, autoplay: boolean): RunStart {
	switch (status) {
		case 'queued':
			return 'queued';
		case 'running':
			return autoplay ? 'replay' : 'settled';
		case 'idle':
			return 'resolved';
		default:
			// Approval, input, and failed: open where the run stopped, at the decision or the error.
			return 'settled';
	}
}

/** What the sidebar row says while the run waits or after it fails. */
function phaseNote(script: AgentRunScript, phase: RunPhase) {
	if (phase === 'approval') return script.approval?.title;
	if (phase === 'input') return script.question?.title;
	if (phase === 'failed') return script.failure?.message;
	return undefined;
}

type AgentRunSessionProps = {
	script: AgentRunScript;
	start: RunStart;
	active: boolean;
	queuedNote?: string;
	panelOpen: boolean;
	onTogglePanel: () => void;
	onRestart: () => void;
};

/** One run of the agent: its panel and canvas share the replayed state, and its phase feeds the sidebar row. */
function AgentRunSession({ script, start, active, queuedNote, panelOpen, onTogglePanel, onRestart }: AgentRunSessionProps) {
	const { currentAgent, emit, updateAgent } = useAgentsBuilder();
	const agentId = currentAgent.agent.id;
	const activeRef = useLatest(active);
	const [queued, setQueued] = React.useState(start === 'queued');
	const { state, stop } = useAgentRun(script, { autoplay: start === 'replay' || start === 'queued', paused: queued });
	const panelRef = useInert<HTMLDivElement>(!panelOpen);
	const progress = runProgress(script, state);
	const updateAgentRef = useLatest(updateAgent);

	// The roster's ring follows the run as it goes.
	React.useEffect(() => updateAgentRef.current(agentId, { progress }), [agentId, progress, updateAgentRef]);

	const onPhaseChange = (phase: RunPhase) => {
		// A queued agent keeps what the host said about it, e.g. when it starts.
		if (phase === 'queued') return;
		updateAgent(agentId, {
			status: phase === 'done' ? 'idle' : phase,
			statusNote: phase === 'done' || phase === 'running' ? undefined : phaseNote(script, phase),
			// A run that finishes off screen leaves a result to read.
			unread: phase === 'done' && !activeRef.current,
		});
	};

	const layout = panelOpen
		? { panel: 'w-full opacity-100 @4xl/view:w-[395px]', canvas: 'hidden @4xl/view:block' }
		: { panel: 'hidden w-0 opacity-0 @4xl/view:flex', canvas: 'block' };

	return (
		<div className="flex min-h-0 flex-1">
			<div
				className={cn(
					'flex shrink-0 overflow-hidden transition-[width,opacity] duration-(--duration-slow) ease-(--ease-out) motion-reduce:transition-none',
					layout.panel,
				)}
				ref={panelRef}
			>
				<AgentRunPanel
					script={script}
					state={state}
					onStop={stop}
					onPhaseChange={onPhaseChange}
					focusStop={start === 'settled' && active}
					resolved={start === 'resolved'}
					queued={queued}
					queuedNote={queuedNote}
					onStart={() => {
						setQueued(false);
						emit({ type: 'start-run', agentId });
					}}
					onRetry={() => {
						emit({ type: 'retry-run', agentId });
						onRestart();
					}}
				/>
			</div>
			<div className={cn('min-w-0 flex-1 p-3', layout.canvas)}>
				<AgentCanvas state={state} panelOpen={panelOpen} onTogglePanel={onTogglePanel} />
			</div>
		</div>
	);
}

type AgentViewProps = {
	/** Replays a running agent's run from the start. Default true. */
	autoplay?: boolean;
	/** The agent to show. Defaults to the open agent. */
	agentId?: string;
	/** False while the view stays mounted off screen; a run finishing then leaves the agent unread. */
	active?: boolean;
};

/**
 * Agent detail: breadcrumb header, the run panel, and the agent canvas. The
 * agent opens as it stands: a running agent replays its run, one waiting on
 * you or failed opens where the run stopped, a queued one waits for its start,
 * and an idle one shows its finished run. A retry plays the run again without
 * its failure.
 */
function AgentView({ agentId, ...props }: AgentViewProps) {
	const context = useAgentsBuilder();
	const detail = (agentId === undefined ? undefined : context.agentDetail(agentId)) ?? context.currentAgent;
	// Everything inside reads this agent as the current one, even while another agent is open.
	const scoped = React.useMemo(() => ({ ...context, currentAgent: detail }), [context, detail]);
	return (
		<AgentsBuilderContext.Provider value={scoped}>
			<AgentViewBody {...props} />
		</AgentsBuilderContext.Provider>
	);
}

function AgentViewBody({ autoplay = true, active = true }: Omit<AgentViewProps, 'agentId'>) {
	const { data, currentAgent, agents, emit } = useAgentsBuilder();
	const { agent, run } = currentAgent;
	// The breadcrumb's scope: the agent's project when it has one.
	const projectId = agents.find((candidate) => candidate.id === agent.id)?.projectId;
	const scope = data.projects?.find((project) => project.id === projectId)?.name ?? 'Agents';
	const [session, setSession] = React.useState(() => {
		const summary = agents.find((candidate) => candidate.id === agent.id);
		return { attempt: 0, start: runStart(summary ? agentStatus(summary) : 'idle', autoplay), queuedNote: summary?.statusNote };
	});
	const [panelOpen, setPanelOpen] = React.useState(true);

	return (
		<div className="flex min-w-0 flex-1 flex-col">
			<header className="flex min-h-12 shrink-0 items-center gap-1 border-b border-border px-3">
				<NavMenuButton />
				<TooltipIconButton
					label="Back to agents"
					side="bottom"
					className="text-foreground"
					onClick={() => emit({ type: 'navigate', target: 'more-agents' })}
				>
					<ArrowLeft aria-hidden="true" className="size-3.5 rtl:-scale-x-100" />
				</TooltipIconButton>
				<nav aria-label="Breadcrumb" className="flex min-w-0 flex-1 items-center gap-1.5 ps-1">
					<span className="hidden truncate text-[0.8125rem] text-muted-foreground @md/view:inline">
	<bdi>{scope}</bdi>
</span>
					<span aria-hidden="true" className="hidden text-sm text-subtle-foreground @md/view:inline">
						/
					</span>
					<h1 title={agent.name} className="truncate text-sm font-medium text-foreground">
						<bdi>{agent.name}</bdi>
					</h1>
				</nav>
				<div className="flex shrink-0 items-center gap-2">
					<Button size="xs" variant="outline" onClick={() => emit({ type: 'share-agent', agentId: agent.id })}>
						Share
					</Button>
					<Button size="xs" variant="secondary" disabled>
						<span>
							Save<span className="hidden @md/view:inline"> agent</span>
						</span>
					</Button>
				</div>
			</header>
			<div className="flex shrink-0 justify-center border-b border-border px-3 py-2 @4xl/view:hidden">
				<div role="radiogroup" aria-label="Show" className="grid w-full max-w-xs grid-cols-2 gap-0.5 rounded-lg bg-muted p-0.5">
					{(
						[
							{ open: true, label: 'Run' },
							{ open: false, label: 'Canvas' },
						] as const
					).map((option) => (
						<button
							key={option.label}
							type="button"
							role="radio"
							aria-checked={panelOpen === option.open}
							onClick={() => startViewTransition(() => setPanelOpen(option.open))}
							className={cn(
								'h-8 cursor-pointer rounded-md text-[0.8125rem] pointer-coarse:h-9',
								pressClass,
								focusRingClass,
								panelOpen === option.open ? 'bg-card text-foreground shadow-card' : 'text-muted-foreground hover:text-foreground',
							)}
						>
							{option.label}
						</button>
					))}
				</div>
			</div>
			<ViewAnimation>
				<AgentRunSession
					key={session.attempt}
					script={session.attempt > 0 ? { ...run, failure: undefined } : run}
					start={session.start}
					active={active}
					queuedNote={session.queuedNote}
					panelOpen={panelOpen}
					onTogglePanel={() => setPanelOpen((value) => !value)}
					onRestart={() => setSession((current) => ({ ...current, attempt: current.attempt + 1, start: 'replay' }))}
				/>
			</ViewAnimation>
		</div>
	);
}

export { AgentView };
export type { AgentViewProps };

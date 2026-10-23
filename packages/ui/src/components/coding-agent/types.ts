import type * as React from 'react';

import type { AgentRun, FlowBeat, HarnessEvent, PermissionDecision, RunRole, RunSignal, SessionStatus, Worktree } from './harness';
import type { HarnessStore } from './harness-store';

import type { AskAnswer, AskQuestion } from '../ai/ask-card';
import type { AiModel, ModelSelection } from '../ai/model-selector';

/** `tabs` puts sessions in a strip across the top; `sidebar` lists them by project down the left. */
export type CodingAgentLayout = 'tabs' | 'sidebar';

/** Where a session's agent works: the project checkout itself, or its own git worktree. */
export type WorkspaceLocation = 'local' | 'worktree';

export type CodingProject = {
	id: string;
	name: string;
	/** Shown in the terminal prompt and the project menu, e.g. `~/code/acme-web`. */
	path: string;
	branch: string;
	/** The checkout as the agent first sees it, keyed by path. Edits are layered on top per session. */
	files: Record<string, string>;
};

export type { SessionStatus, ToolCallBeat } from './harness';

/** Events a script plays as they are, from the run playing it: messages between agents and the state of their branches. */
type CoordinationBeat = HarnessEvent extends infer E
	? E extends { kind: 'message' | 'handoff' | 'route' | 'phase' | 'task' | 'worktree' | 'pr' | 'check' }
		? Omit<E, 'id' | 'runId'>
		: never
	: never;

/**
 * One scripted step of a session. Each waits `delay` ms (or a sensible default for its kind) before it lands, and
 * `permission` and `question` hold the run until they are answered.
 */
export type SessionBeat = { delay?: number } & (
	| FlowBeat
	| { kind: 'permission'; title: string; command: string }
	| { kind: 'question'; questions: AskQuestion[] }
	// Multi-agent beats. A spawn starts a child run with its own script, which plays alongside the parent.
	| { kind: 'spawn'; agent: SpawnedAgent; script: SessionBeat[]; played?: number }
	/** Waits for the named children (all of this run's children by default), then lands a row of their results. */
	| { kind: 'await'; agents?: string[] }
	| CoordinationBeat
);

/**
 * A child agent a script spawns: the run it starts, as a worker unless it says otherwise. `id` is how other beats
 * address it (`to`, `await`).
 */
export type SpawnedAgent = Pick<AgentRun, 'id' | 'name' | 'kind' | 'phase' | 'background' | 'workspace' | 'capabilities'> & { role?: RunRole; task: string };

export type SessionBeatKind = SessionBeat['kind'];

export type CodingSession = {
	id: string;
	title: string;
	projectId: string;
	location?: WorkspaceLocation;
	/** Branch the session works on; defaults to the project's. */
	branch?: string;
	model?: ModelSelection;
	/** Name of the session's own agent, shown when other agents are in play. Defaults to "Agent". */
	agentName?: string;
	/** A scripted run for demos and fixtures. A real harness passes `events` or `store` instead. */
	script?: SessionBeat[];
	/** How many beats already happened before the session opened; they land at once instead of playing. */
	played?: number;
	/** A host-controlled event log; the session shows exactly what it describes. */
	events?: HarnessEvent[];
	/** A store the host pushes events into as they happen. */
	store?: HarnessStore;
	/**
	 * Worktrees known when the session opens, with their pull requests. The first is the session's own checkout;
	 * without one it is the session's branch. Agents' own worktrees join as they spawn.
	 */
	worktrees?: Worktree[];
	/** Short relative time for lists, e.g. "2m". */
	updatedLabel?: string;
};

/** A run as the shell lists it under its session in the sidebar. */
export type RunSummary = { id: string; name: string; parentRunId?: string; depth: number; status: RunSignal };

export type SessionPatch = {
	title?: string;
	status?: SessionStatus;
	unread?: boolean;
	/** Share of the script played, 0 to 1. */
	progress?: number;
	changedFiles?: number;
	/** The session's other agents, for the sidebar's indented rows. */
	runs?: RunSummary[];
};

export type SlashCommand = {
	name: string;
	description: string;
};

export type CodingAgentData = {
	/** Product name for the new-session screen and the sidebar header. */
	brand: string;
	projects: CodingProject[];
	sessions: CodingSession[];
	/** Sessions open (as tabs, or kept live in the sidebar layout) on first render, in order. */
	openSessionIds: string[];
	models: AiModel[];
	defaultModel: ModelSelection;
	commands: SlashCommand[];
	/** Context window used by the header's context ring. */
	contextWindow: number;
	/** Share of the plan's usage spent, 0 to 100. Shows a notice above the composer from 80. */
	usagePercent?: number;
	/** Beats played after a message is sent once a session's script has finished. */
	followUp: (text: string) => SessionBeat[];
	/** Beats for a brand new session started from the new-session screen. */
	newSessionScript: (text: string) => SessionBeat[];
};

/** Everything the template asks its host to do. The demo plays the result itself; a host wires real effects. */
export type CodingAgentAction =
	| { type: 'new-session'; sessionId: string; projectId: string; location: WorkspaceLocation }
	| { type: 'close-session'; sessionId: string }
	| { type: 'rename-session'; sessionId: string; title: string }
	| { type: 'delete-session'; sessionId: string }
	| { type: 'export-session'; sessionId: string }
	| { type: 'send'; sessionId: string; text: string; attachments: string[] }
	| { type: 'stop'; sessionId: string }
	| { type: 'stop-run'; sessionId: string; runId: string }
	| { type: 'pause-run'; sessionId: string; runId: string }
	| { type: 'resume-run'; sessionId: string; runId: string }
	| { type: 'steer-run'; sessionId: string; runId: string; text: string; attachments: string[] }
	| { type: 'retry-run'; sessionId: string; runId: string }
	| { type: 'permission'; sessionId: string; runId: string; requestId: string; decision: PermissionDecision; command: string }
	| { type: 'answer'; sessionId: string; runId: string; requestId: string; answer: AskAnswer }
	| { type: 'open-file'; sessionId: string; path: string }
	| { type: 'open-url'; sessionId: string; url: string }
	| { type: 'comment'; sessionId: string; path: string; line: number; text: string }
	| { type: 'terminal-command'; sessionId: string; command: string }
	| { type: 'open-pull-request'; sessionId: string; worktreeId: string; number: number; url?: string }
	| { type: 'create-pull-request'; sessionId: string; worktreeId: string }
	| { type: 'rerun-checks'; sessionId: string; worktreeId: string; checkIds: string[] }
	| { type: 'layout'; layout: CodingAgentLayout };

/** Renders the page shown in a browser panel tab for a URL. Return null to show the "can't preview" state. */
export type BrowserPageRenderer = (url: string) => React.ReactNode | null;

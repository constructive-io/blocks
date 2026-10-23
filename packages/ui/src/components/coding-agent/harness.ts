import type { AskAnswer, AskQuestion } from '../ai/ask-card';
import { diffLines } from '../ai/line-diff';
import type { PlanStep } from '../ai/types';

/**
 * The template's model of an agent harness. Whatever the host runs (one agent, sub-agents, a team that messages
 * itself, an orchestrator with workers), it reports as a log of these events, and `reduceHarness` folds the log
 * into what the views draw. The scripted demo is one producer of this log; a real harness is another.
 */

export type RunStatus = 'queued' | 'running' | 'waiting' | 'idle' | 'paused' | 'done' | 'failed' | 'cancelled';

/** Why a run is waiting. One status with a reason keeps blocked states from multiplying. */
export type WaitingOn =
	| { kind: 'human'; requestId: string }
	| { kind: 'agent'; runIds: string[] }
	| { kind: 'task'; taskIds: string[] }
	| { kind: 'limit'; reason: 'concurrency' | 'usage' | 'budget' };

export type RunRole = 'root' | 'orchestrator' | 'worker' | 'teammate' | 'peer' | 'remote';

export type RunUsage = { inputTokens: number; outputTokens: number; toolUses: number; durationMs: number; costUsd?: number };

/** What a person may do to a run from the UI. The harness decides; by default a child can be steered and stopped. */
export type RunCapabilities = { steer?: boolean; message?: boolean; stop?: boolean; pause?: boolean };

export type AgentRun = {
	id: string;
	/** Stays the same when a run is resumed under a new run id. */
	agentId?: string;
	name: string;
	/** The agent's definition, e.g. "Explore" or a custom agent. Shown beside the name. */
	kind?: string;
	parentRunId?: string;
	role: RunRole;
	phase?: string;
	attempt?: number;
	background?: boolean;
	task?: string;
	workspace?: { kind: 'shared' | 'worktree' | 'remote'; branch?: string; path?: string };
	budget?: { maxCostUsd?: number };
	capabilities?: RunCapabilities;
};

export type MessageProtocol = 'text' | 'steer' | 'result' | 'plan-approval' | 'shutdown';

export type HarnessTask = {
	id: string;
	title: string;
	status: 'pending' | 'in_progress' | 'blocked' | 'done' | 'failed';
	ownerRunId?: string;
	dependsOn?: string[];
};

export type HarnessRequest = { id: string; type: 'approval'; title: string; command: string } | { id: string; type: 'question'; questions: AskQuestion[] };

export type PermissionDecision = 'once' | 'always' | 'deny';

/** How a person settled a request: a decision on a command, or an answer to a question. */
export type RequestResolution = { decision: PermissionDecision } | { answer: AskAnswer };

export type CheckStatus = 'queued' | 'running' | 'passed' | 'failed' | 'skipped' | 'cancelled';

/** One CI check on a pull request: a job, a status context, or a bot's verdict. */
export type CICheck = {
	id: string;
	name: string;
	status: CheckStatus;
	/** Merging waits on it. */
	required?: boolean;
	/** One line of what it found, e.g. "2 failed in csrf.spec.ts". Shown for failures. */
	summary?: string;
};

export type PullRequestState = 'draft' | 'open' | 'merged' | 'closed';

/** Whether the pull request can merge right now, and if not, what's in the way. */
export type MergeState = 'clean' | 'blocked' | 'behind' | 'conflicts' | 'checking';

export type ReviewState = 'approved' | 'changes-requested' | 'commented' | 'pending';

/** What the review needs at a glance: where the pull request stands and which checks failed or are still going. */
export type PullRequest = {
	number: number;
	title: string;
	url?: string;
	state: PullRequestState;
	/** The overall decision across reviewers. */
	review?: ReviewState;
	merge?: MergeState;
	/** Review threads nobody has resolved yet. */
	unresolved?: number;
	checks?: CICheck[];
};

/**
 * Where changes land: the session's own checkout, or a worktree on its own branch. Agents that work in a worktree
 * register it when they spawn; a harness reports the rest (how far it is from its base, its pull request).
 */
export type Worktree = {
	/** Stable key; the branch name unless two worktrees share one. */
	id: string;
	branch: string;
	/** The branch it was cut from and its pull request merges into. */
	base?: string;
	kind: 'checkout' | 'worktree' | 'remote';
	path?: string;
	/** Commits ahead of and behind its base. */
	ahead?: number;
	behind?: number;
	/** Files that conflict with its base. */
	conflicts?: string[];
	pr?: PullRequest;
};

export type WorktreePatch = Partial<Worktree> & { id: string };
export type PullRequestPatch = Partial<PullRequest>;
export type CheckPatch = Partial<CICheck> & { id: string };

/** One read-only call in a batch, e.g. a read of `src/auth/session.ts`. */
export type ToolCallBeat = {
	tool: 'read' | 'grep' | 'glob' | 'list' | 'webfetch' | 'websearch';
	target: string;
};

/** One step a run takes: what it said, read, changed or ran. Each is a row of its transcript, except the plan. */
export type FlowBeat =
	| { kind: 'user'; text: string }
	| { kind: 'reasoning'; text: string; durationMs: number }
	| { kind: 'say'; text: string }
	| { kind: 'tools'; calls: ToolCallBeat[] }
	/** Lands in the run's worktree, or in `worktree` when an agent edits one that isn't its own. */
	| { kind: 'edit'; path: string; after: string; worktree?: string }
	| { kind: 'shell'; command: string; output: string; exitCode?: number }
	/** Docks on the composer instead of taking a row, so it updates in place as steps finish. */
	| { kind: 'plan'; steps: PlanStep[] }
	| { kind: 'browse'; url: string; title: string }
	| { kind: 'notice'; text: string }
	| { kind: 'error'; title: string; text: string };

/** One thing that happened in a run. `runId` is who it happened to. */
export type HarnessEvent = { id: string; runId: string } & (
	| { kind: 'run.spawned'; run: AgentRun }
	| { kind: 'run.status'; status: RunStatus; waitingOn?: WaitingOn; summary?: string; error?: string }
	| { kind: 'run.progress'; usage: Partial<RunUsage>; lastTool?: string }
	| { kind: 'beat'; beat: FlowBeat; live?: boolean; running?: boolean }
	| { kind: 'beat.settled'; eventId: string }
	| { kind: 'turn.end' }
	/** From `runId` unless `from` says otherwise, e.g. `you` for a person steering a run. */
	| { kind: 'message'; from?: string; to: string[] | 'all'; text: string; protocol?: MessageProtocol }
	| { kind: 'handoff'; to: string; reason?: string }
	| { kind: 'route'; to: string; reason?: string }
	| { kind: 'phase'; name: string; status: 'running' | 'done' }
	| { kind: 'fan-in'; runIds: string[] }
	| { kind: 'task'; task: HarnessTask }
	| { kind: 'request'; request: HarnessRequest }
	/** Settles a request of `runId`'s; a run held at it carries on. */
	| ({ kind: 'request.resolved'; requestId: string } & RequestResolution)
	| { kind: 'terminal'; lines: { kind: 'command' | 'output' | 'error'; text: string }[] }
	| { kind: 'terminal.clear' }
	/** Adds a worktree or updates what's known about it. */
	| { kind: 'worktree'; worktree: WorktreePatch }
	/** Opens or updates the pull request for a worktree. Checks given here replace the list; use `check` for one. */
	| { kind: 'pr'; worktreeId: string; pr: PullRequestPatch }
	/** Adds or updates one CI check on a worktree's pull request. */
	| { kind: 'check'; worktreeId: string; check: CheckPatch }
);

export type HarnessEventKind = HarnessEvent['kind'];

/** One row of a run's transcript. Live rows arrived during playback and animate in; history rows land settled. */
export type TimelineItem =
	| { id: string; type: 'beat'; beat: Exclude<FlowBeat, { kind: 'plan' }>; live: boolean; running?: boolean; before?: string | null }
	| { id: string; type: 'permission'; requestId: string; beat: { title: string; command: string }; decision?: PermissionDecision }
	| { id: string; type: 'question'; requestId: string; beat: { questions: AskQuestion[] }; answer?: AskAnswer }
	| { id: string; type: 'turn-end'; paths: string[]; additions: number; deletions: number }
	| { id: string; type: 'spawn'; runId: string }
	| { id: string; type: 'fan-in'; runIds: string[] }
	| { id: string; type: 'message'; from: string; to: string[] | 'all'; text: string; protocol: MessageProtocol }
	| { id: string; type: 'handoff'; to: string; reason?: string }
	| { id: string; type: 'route'; to: string; reason?: string }
	| { id: string; type: 'phase'; name: string; status: 'running' | 'done' };

/** A file the session changed: its contents before the session touched it (null when it's new) and now. */
export type FileChange = {
	/** Unique across worktrees: the same path can change in two of them. */
	key: string;
	path: string;
	/** The worktree the change landed in. */
	worktreeId: string;
	before: string | null;
	after: string;
	additions: number;
	deletions: number;
	runIds: string[];
};

export type TerminalLine = { id: string; kind: 'command' | 'output' | 'error'; text: string; runId: string };

export type RunView = AgentRun & {
	status: RunStatus;
	waitingOn?: WaitingOn;
	summary?: string;
	error?: string;
	lastTool?: string;
	usage: RunUsage;
	/** True once the harness reports usage itself; until then the view estimates tokens from the transcript. */
	usageReported: boolean;
	items: TimelineItem[];
	plan: PlanStep[] | null;
	/** Keys of the changes made since the turn began. */
	turnPaths: string[];
	depth: number;
	/** The worktree it works in: its own, or the nearest ancestor's, or the session's checkout. Set when it spawns. */
	worktreeId: string;
};

export type HarnessMessage = { id: string; from: string; to: string[] | 'all'; text: string; protocol: MessageProtocol };

export type HarnessView = {
	rootRunId: string;
	runs: Record<string, RunView>;
	/** Runs in the order they were spawned, the root first. */
	runOrder: string[];
	base: Record<string, string>;
	/** The session's own checkout as it stands now. Edits in other worktrees stay in `changes`. */
	files: Record<string, string>;
	changes: Record<string, FileChange>;
	terminal: TerminalLine[];
	tasks: HarnessTask[];
	messages: HarnessMessage[];
	/** Requests still waiting on a person, oldest first. */
	pending: { runId: string; request: HarnessRequest }[];
	/** Every worktree the session's agents work in, the session's own checkout first. */
	worktrees: Record<string, Worktree>;
	worktreeOrder: string[];
	/** The run that has control after a handoff, if any. */
	activeRunId: string;
	/** The page an agent last opened. A new object for each visit, so opening the same page again still shows it. */
	browse: { url: string; title: string } | null;
};

const ZERO_USAGE: RunUsage = { inputTokens: 0, outputTokens: 0, toolUses: 0, durationMs: 0 };

export function createRunView(run: AgentRun, depth: number, worktreeId: string): RunView {
	return { status: 'queued', usage: ZERO_USAGE, usageReported: false, items: [], plan: null, turnPaths: [], depth, worktreeId, ...run };
}

/** The checkout a session works in when nothing says otherwise. */
const DEFAULT_CHECKOUT: Worktree = { id: 'checkout', branch: 'main', kind: 'checkout' };

/** The session's own checkout: the first worktree it knew about. */
function checkoutOf(view: HarnessView) {
	return view.worktreeOrder[0] ?? DEFAULT_CHECKOUT.id;
}

/**
 * The empty view a session starts from: one root run, the project's files, and the worktrees already known, the
 * session's own checkout first.
 */
export function createHarnessView(root: AgentRun, files: Record<string, string>, worktrees: readonly Worktree[] = [DEFAULT_CHECKOUT]): HarnessView {
	const known = worktrees.length ? worktrees : [DEFAULT_CHECKOUT];
	return {
		rootRunId: root.id,
		runs: { [root.id]: { ...createRunView(root, 0, known[0].id), status: 'idle', usage: { ...ZERO_USAGE, inputTokens: BASE_TOKENS.root } } },
		runOrder: [root.id],
		base: files,
		files,
		changes: {},
		terminal: [],
		tasks: [],
		messages: [],
		pending: [],
		worktrees: Object.fromEntries(known.map((worktree) => [worktree.id, worktree])),
		worktreeOrder: known.map((worktree) => worktree.id),
		activeRunId: root.id,
		browse: null
	};
}

/** A file's lines, without the empty one a trailing newline would add. */
function linesOf(text: string | null) {
	if (!text) return [];
	return (text.endsWith('\n') ? text.slice(0, -1) : text).split('\n');
}

export function countChange(before: string | null, after: string) {
	let additions = 0;
	let deletions = 0;
	for (const line of diffLines(linesOf(before), linesOf(after))) {
		if (line.type === 'add') additions += 1;
		else if (line.type === 'del') deletions += 1;
	}
	return { additions, deletions };
}

/** A rough running total for runs whose harness doesn't report usage: about four characters a token. */
function estimateBeat(beat: FlowBeat, files: Record<string, string>) {
	switch (beat.kind) {
		case 'say':
		case 'reasoning':
		case 'user':
			return beat.text.length / 4;
		case 'edit':
			return beat.after.length / 4;
		case 'shell':
			return (beat.output.length + beat.command.length) / 4;
		case 'tools':
			return beat.calls.reduce((sum, call) => sum + (call.tool === 'read' ? (files[call.target]?.length ?? 800) : 600), 0) / 4;
		default:
			return 0;
	}
}

/** What a step reports on its run's row: the tool calls it made and the last of them, or its reply as the summary. */
function stepReport(beat: FlowBeat): { toolUses?: number; lastTool?: string; summary?: string } {
	switch (beat.kind) {
		case 'tools': {
			const last = beat.calls[beat.calls.length - 1];
			return { toolUses: beat.calls.length, lastTool: last ? `${last.tool} ${last.target}` : undefined };
		}
		case 'edit':
			return { toolUses: 1, lastTool: `edit ${beat.path}` };
		case 'shell':
			return { toolUses: 1, lastTool: beat.command };
		case 'say':
			return { summary: beat.text };
		default:
			return {};
	}
}

/** Prompt and tool definitions every run starts with, so a fresh agent doesn't read as empty. */
export const BASE_TOKENS = { root: 14_200, child: 6_400 } as const;

function patchRun(view: HarnessView, runId: string, patch: (run: RunView) => RunView) {
	const run = view.runs[runId];
	if (!run) return view;
	return { ...view, runs: { ...view.runs, [runId]: patch(run) } };
}

function pushItem(run: RunView, item: TimelineItem): RunView {
	return { ...run, items: [...run.items, item] };
}

function addTokens(run: RunView, tokens: number): RunView {
	if (run.usageReported || !tokens) return run;
	return { ...run, usage: { ...run.usage, inputTokens: run.usage.inputTokens + Math.round(tokens) } };
}

/** The key a change is stored under: its worktree and its path. */
export function changeKey(worktreeId: string, path: string) {
	return `${worktreeId}:${path}`;
}

/** Adds a worktree, or merges what's new into the one already known. */
function upsertWorktree(view: HarnessView, patch: WorktreePatch): HarnessView {
	const existing = view.worktrees[patch.id];
	const worktree: Worktree = existing ? { ...existing, ...patch } : { branch: patch.id, kind: 'worktree', ...patch };
	return {
		...view,
		worktrees: { ...view.worktrees, [patch.id]: worktree },
		worktreeOrder: existing ? view.worktreeOrder : [...view.worktreeOrder, patch.id]
	};
}

/** A pull request a patch opens before the harness has said what it is. */
function placeholderPr(worktree: Worktree): PullRequest {
	return { number: 0, title: worktree.branch, state: 'open' };
}

/**
 * Lands an edit in the run's worktree, or in the one it names, so one agent can touch several. Every worktree keeps
 * its own change; only an edit to the session's checkout changes the files the tree and the viewer show.
 */
function applyEdit(view: HarnessView, runId: string, beat: Extract<FlowBeat, { kind: 'edit' }>) {
	const state = beat.worktree && !view.worktrees[beat.worktree] ? upsertWorktree(view, { id: beat.worktree }) : view;
	const worktreeId = beat.worktree ?? view.runs[runId]?.worktreeId ?? checkoutOf(view);
	const key = changeKey(worktreeId, beat.path);
	const original = beat.path in view.base ? view.base[beat.path] : null;
	const existing = view.changes[key];
	const runIds = existing?.runIds.includes(runId) ? existing.runIds : [...(existing?.runIds ?? []), runId];
	const change: FileChange = { key, path: beat.path, worktreeId, before: original, after: beat.after, runIds, ...countChange(original, beat.after) };
	return {
		key,
		// The row's inline diff is against what the file held just before this edit.
		before: existing ? existing.after : original,
		view: {
			...state,
			files: worktreeId === checkoutOf(view) ? { ...view.files, [beat.path]: beat.after } : view.files,
			changes: { ...view.changes, [key]: change }
		}
	};
}

/** A command's lines in the terminal: the command, what it printed, and how it ended if it failed. */
function applyShell(view: HarnessView, eventId: string, runId: string, beat: Extract<FlowBeat, { kind: 'shell' }>): HarnessView {
	const lines: TerminalLine[] = [{ id: `${eventId}-c`, kind: 'command', text: beat.command, runId }];
	if (beat.output) {
		beat.output
			.replace(/\n+$/, '')
			.split('\n')
			.forEach((text, index) => lines.push({ id: `${eventId}-${index}`, kind: 'output', text, runId }));
	}
	// What the command printed stays as it was; only how it ended is marked as an error.
	if (beat.exitCode) lines.push({ id: `${eventId}-x`, kind: 'error', text: `exited with code ${beat.exitCode}`, runId });
	return { ...view, terminal: [...view.terminal, ...lines] };
}

/** Folds one event into the view. Pure, so a host can replay a stored log and get the same screen. */
export function reduceHarness(view: HarnessView, event: HarnessEvent): HarnessView {
	switch (event.kind) {
		case 'run.spawned': {
			const parent = event.run.parentRunId ? view.runs[event.run.parentRunId] : undefined;
			let state = view;
			// A run works where its parent does, unless it brings a worktree of its own.
			let worktreeId = parent?.worktreeId ?? checkoutOf(view);
			const workspace = event.run.workspace;
			if (workspace && workspace.kind !== 'shared' && workspace.branch) {
				worktreeId = workspace.branch;
				// A new one joins the session, cut from the worktree its parent works in.
				if (!view.worktrees[workspace.branch]) {
					const base = parent ? view.worktrees[parent.worktreeId]?.branch : undefined;
					state = upsertWorktree(state, { id: workspace.branch, branch: workspace.branch, kind: workspace.kind, path: workspace.path, base });
				}
			}
			const existing = view.runs[event.run.id];
			const run: RunView = existing
				? { ...existing, ...event.run, worktreeId }
				: { ...createRunView(event.run, parent ? parent.depth + 1 : 0, worktreeId), usage: { ...ZERO_USAGE, inputTokens: BASE_TOKENS.child } };
			state = { ...state, runs: { ...state.runs, [run.id]: run }, runOrder: existing ? state.runOrder : [...state.runOrder, run.id] };
			// The spawn shows in the parent's transcript as the card that opens the child.
			return parent ? patchRun(state, parent.id, (owner) => pushItem(owner, { id: event.id, type: 'spawn', runId: run.id })) : state;
		}
		case 'run.status': {
			const updated = patchRun(view, event.runId, (run) => ({
				...run,
				status: event.status,
				waitingOn: event.status === 'waiting' ? event.waitingOn : undefined,
				summary: event.summary ?? run.summary,
				error: event.error ?? (event.status === 'failed' ? run.error : undefined)
			}));
			// A run that has ended can't act on an answer, so whatever it was still asking leaves the dock with it.
			const ended = event.status === 'cancelled' || event.status === 'done' || event.status === 'failed';
			return ended && view.pending.some((entry) => entry.runId === event.runId)
				? { ...updated, pending: view.pending.filter((entry) => entry.runId !== event.runId) }
				: updated;
		}
		case 'run.progress':
			return patchRun(view, event.runId, (run) => ({
				...run,
				usage: { ...run.usage, ...event.usage },
				usageReported: true,
				lastTool: event.lastTool ?? run.lastTool
			}));
		case 'beat': {
			const beat = event.beat;
			// One tracker per turn, on the run: a later plan updates it in place.
			if (beat.kind === 'plan') return patchRun(view, event.runId, (run) => ({ ...run, plan: beat.steps }));
			let state = view;
			let before: string | null | undefined;
			let editKey: string | undefined;
			if (beat.kind === 'edit') {
				const edit = applyEdit(view, event.runId, beat);
				state = edit.view;
				before = edit.before;
				editKey = edit.key;
			}
			if (beat.kind === 'shell') state = applyShell(state, event.id, event.runId, beat);
			if (beat.kind === 'browse' && event.live) state = { ...state, browse: { url: beat.url, title: beat.title } };
			const tokens = estimateBeat(beat, view.files);
			const report = stepReport(beat);
			return patchRun(state, event.runId, (run) => {
				let updated = addTokens(run, tokens);
				updated = {
					...updated,
					usage: report.toolUses && !updated.usageReported ? { ...updated.usage, toolUses: updated.usage.toolUses + report.toolUses } : updated.usage,
					lastTool: report.lastTool ?? updated.lastTool,
					summary: report.summary ?? updated.summary
				};
				if (beat.kind === 'user') updated = { ...updated, turnPaths: [], plan: null };
				if (editKey && !updated.turnPaths.includes(editKey)) updated = { ...updated, turnPaths: [...updated.turnPaths, editKey] };
				return pushItem(updated, { id: event.id, type: 'beat', beat, live: event.live ?? true, running: event.running, before });
			});
		}
		case 'beat.settled':
			return patchRun(view, event.runId, (run) => ({
				...run,
				items: run.items.map((item) => (item.id === event.eventId && item.type === 'beat' ? { ...item, running: false } : item))
			}));
		case 'turn.end':
			return patchRun(view, event.runId, (run) => {
				if (run.turnPaths.length === 0) return run;
				const changes = run.turnPaths.flatMap((key) => view.changes[key] ?? []);
				// The same path changed in two worktrees is one file to read about.
				const paths = [...new Set(changes.map((change) => change.path))];
				return { ...pushItem(run, { id: event.id, type: 'turn-end', paths, ...lineTotals(changes) }), turnPaths: [] };
			});
		case 'message': {
			const from = event.from ?? event.runId;
			const message: HarnessMessage = { id: event.id, from, to: event.to, text: event.text, protocol: event.protocol ?? 'text' };
			const item: TimelineItem = { type: 'message', ...message };
			let state: HarnessView = { ...view, messages: [...view.messages, message] };
			// A message reads in the sender's transcript and in each recipient's.
			const recipients = event.to === 'all' ? view.runOrder.filter((id) => id !== from) : event.to;
			for (const runId of new Set([from, ...recipients])) {
				if (state.runs[runId]) state = patchRun(state, runId, (run) => pushItem(run, item));
			}
			return state;
		}
		case 'handoff':
			return { ...patchRun(view, event.runId, (run) => pushItem(run, { id: event.id, type: 'handoff', to: event.to, reason: event.reason })), activeRunId: event.to };
		case 'route':
			return patchRun(view, event.runId, (run) => pushItem(run, { id: event.id, type: 'route', to: event.to, reason: event.reason }));
		case 'phase':
			return patchRun(view, event.runId, (run) => {
				const index = run.items.findIndex((item) => item.type === 'phase' && item.name === event.name);
				if (index < 0) return pushItem(run, { id: event.id, type: 'phase', name: event.name, status: event.status });
				return { ...run, items: run.items.map((item, at) => (at === index && item.type === 'phase' ? { ...item, status: event.status } : item)) };
			});
		case 'fan-in':
			return patchRun(view, event.runId, (run) => pushItem(run, { id: event.id, type: 'fan-in', runIds: event.runIds }));
		case 'task': {
			const exists = view.tasks.some((task) => task.id === event.task.id);
			return { ...view, tasks: exists ? view.tasks.map((task) => (task.id === event.task.id ? { ...task, ...event.task } : task)) : [...view.tasks, event.task] };
		}
		case 'request': {
			const request = event.request;
			const item: TimelineItem =
				request.type === 'approval'
					? { id: event.id, type: 'permission', requestId: request.id, beat: { title: request.title, command: request.command } }
					: { id: event.id, type: 'question', requestId: request.id, beat: { questions: request.questions } };
			const state = { ...view, pending: [...view.pending, { runId: event.runId, request }] };
			return patchRun(state, event.runId, (run) => ({
				...pushItem(run, item),
				status: 'waiting',
				waitingOn: { kind: 'human', requestId: request.id }
			}));
		}
		case 'request.resolved': {
			const state = { ...view, pending: view.pending.filter((entry) => entry.request.id !== event.requestId) };
			return patchRun(state, event.runId, (run) => {
				const items = run.items.map((item) => {
					if (item.type === 'permission' && item.requestId === event.requestId && 'decision' in event) return { ...item, decision: event.decision };
					if (item.type === 'question' && item.requestId === event.requestId && 'answer' in event) return { ...item, answer: event.answer };
					return item;
				});
				// A run held at this request carries on; one that moved on meanwhile keeps the status it has.
				if (awaitsPerson(run) && run.waitingOn.requestId === event.requestId) return { ...run, items, status: 'running', waitingOn: undefined };
				return { ...run, items };
			});
		}
		case 'terminal':
			return {
				...view,
				terminal: [...view.terminal, ...event.lines.map((line, index) => ({ ...line, id: `${event.id}-${index}`, runId: event.runId }))]
			};
		case 'terminal.clear':
			return { ...view, terminal: [] };
		case 'worktree':
			return upsertWorktree(view, event.worktree);
		case 'pr': {
			const state = view.worktrees[event.worktreeId] ? view : upsertWorktree(view, { id: event.worktreeId });
			const worktree = state.worktrees[event.worktreeId];
			return upsertWorktree(state, { id: worktree.id, pr: { ...(worktree.pr ?? placeholderPr(worktree)), ...event.pr } });
		}
		case 'check': {
			const state = view.worktrees[event.worktreeId] ? view : upsertWorktree(view, { id: event.worktreeId });
			const worktree = state.worktrees[event.worktreeId];
			const pr = worktree.pr ?? placeholderPr(worktree);
			const checks = pr.checks ?? [];
			const found = checks.some((check) => check.id === event.check.id);
			const nextChecks = found
				? checks.map((check) => (check.id === event.check.id ? { ...check, ...event.check } : check))
				: [...checks, { name: event.check.id, status: 'queued' as const, ...event.check }];
			return upsertWorktree(state, { id: worktree.id, pr: { ...pr, checks: nextChecks } });
		}
	}
}

/** Lines added and removed across a set of changes. */
export function lineTotals(changes: readonly FileChange[]) {
	let additions = 0;
	let deletions = 0;
	for (const change of changes) {
		additions += change.additions;
		deletions += change.deletions;
	}
	return { additions, deletions };
}

export type CheckTally = { total: number; passed: number; failed: number; running: number; queued: number; skipped: number; requiredFailing: number };

/** Counts a pull request's checks by outcome. */
export function tallyChecks(checks: readonly CICheck[] = []): CheckTally {
	const tally: CheckTally = { total: checks.length, passed: 0, failed: 0, running: 0, queued: 0, skipped: 0, requiredFailing: 0 };
	for (const check of checks) {
		if (check.status === 'passed') tally.passed += 1;
		else if (check.status === 'failed') {
			tally.failed += 1;
			if (check.required) tally.requiredFailing += 1;
		} else if (check.status === 'running') tally.running += 1;
		else if (check.status === 'queued') tally.queued += 1;
		else tally.skipped += 1;
	}
	return tally;
}

export type ChecksOutcome = 'failed' | 'running' | 'passed' | 'none';

/** One word for a set of checks: any failure wins, then anything still going, then passed. */
export function checksOutcome(tally: CheckTally): ChecksOutcome {
	if (tally.total === 0) return 'none';
	if (tally.failed) return 'failed';
	if (tally.running || tally.queued) return 'running';
	return 'passed';
}

export type WorktreeSummary = {
	worktree: Worktree;
	changes: FileChange[];
	additions: number;
	deletions: number;
	/** Agents working in it or that changed files in it, in spawn order. */
	runIds: string[];
	checks: CheckTally;
};

/** Each worktree with the changes that landed in it and the agents involved, in the order they joined the session. */
export function summarizeWorktrees(view: HarnessView): WorktreeSummary[] {
	const changes = Object.values(view.changes);
	return view.worktreeOrder.map((id) => {
		const worktree = view.worktrees[id];
		const own = changes.filter((change) => change.worktreeId === id);
		const editors = new Set(own.flatMap((change) => change.runIds));
		const runIds = view.runOrder.filter((runId) => editors.has(runId) || view.runs[runId]?.worktreeId === id);
		return {
			worktree,
			changes: own,
			...lineTotals(own),
			runIds,
			checks: tallyChecks(worktree.pr?.checks)
		};
	});
}

/** Across every pull request in the session: whether any check failed, any is still going, or all passed. */
export function sessionChecks(worktrees: readonly WorktreeSummary[]) {
	return checksOutcome(tallyChecks(worktrees.flatMap((entry) => entry.worktree.pr?.checks ?? [])));
}

/** Replays a log onto a starting view. */
export function replayHarness(view: HarnessView, events: readonly HarnessEvent[]) {
	return events.reduce(reduceHarness, view);
}

/** Tokens a run has used: what the harness reported, or the estimate. */
export function runTokens(run: RunView) {
	return run.usage.inputTokens + run.usage.outputTokens;
}

/** The run and everything it spawned, depth first. */
export function descendants(view: HarnessView, runId: string): RunView[] {
	const out: RunView[] = [];
	const visit = (id: string) => {
		for (const childId of view.runOrder) {
			const child = view.runs[childId];
			if (child?.parentRunId === id) {
				out.push(child);
				visit(childId);
			}
		}
	};
	visit(runId);
	return out;
}

/** Runs from the root down to `runId`, for the breadcrumb. */
export function ancestry(view: HarnessView, runId: string): RunView[] {
	const out: RunView[] = [];
	let current: RunView | undefined = view.runs[runId];
	while (current) {
		out.unshift(current);
		current = current.parentRunId ? view.runs[current.parentRunId] : undefined;
	}
	return out;
}

export const ACTIVE_STATUSES: RunStatus[] = ['queued', 'running', 'waiting', 'paused'];

/** The run is held until a person approves a command or answers a question. */
export function awaitsPerson(run: RunView): run is RunView & { status: 'waiting'; waitingOn: { kind: 'human'; requestId: string } } {
	return run.status === 'waiting' && run.waitingOn?.kind === 'human';
}

/** Still has work in hand: queued, running, paused, or waiting on other agents, tasks or limits. Not one held for a person. */
export function isWorking(run: RunView) {
	return ACTIVE_STATUSES.includes(run.status) && !awaitsPerson(run);
}

/** Live state a session reports back to the shell, for its tab, sidebar row and the home list. */
export type SessionStatus = 'idle' | 'running' | 'approval' | 'input' | 'failed';

/** A session's states, plus queued, and done once a run has reported back. */
export type RunSignal = SessionStatus | 'queued' | 'done';

/** What a run means for a tab, a row or a ring: running, waiting on a person, failed, or at rest. */
export function runSignal(run: RunView, view: HarnessView): RunSignal {
	if (awaitsPerson(run)) {
		const request = view.pending.find((entry) => entry.request.id === run.waitingOn.requestId)?.request;
		return request?.type === 'question' ? 'input' : 'approval';
	}
	if (run.status === 'running' || run.status === 'waiting') return 'running';
	if (run.status === 'queued') return 'queued';
	if (run.status === 'failed') return 'failed';
	if (run.status === 'done') return 'done';
	return 'idle';
}

/** The session's status for its tab: whatever needs a person most, across every run. */
export function sessionStatus(view: HarnessView): SessionStatus {
	const signals = view.runOrder.map((id) => runSignal(view.runs[id], view));
	if (signals.includes('approval')) return 'approval';
	if (signals.includes('input')) return 'input';
	if (runSignal(view.runs[view.rootRunId], view) === 'failed') return 'failed';
	if (signals.includes('running') || signals.includes('queued')) return 'running';
	if (signals.includes('failed')) return 'failed';
	return 'idle';
}

/** Where a sub-agent's transcript opens: the task its parent gave it, which is also its first turn on the rail. */
export const TASK_TURN_ID = 'task';

'use client';

import * as React from 'react';

import type { AskAnswer } from '../ai/ask-card';
import { REDUCED_MOTION_DELAY } from '../agents-builder/playback';
import { prefersReducedMotion } from '../workspace-kit/reduced-motion';
import {
	type AgentRun,
	awaitsPerson,
	createHarnessView,
	type HarnessEvent,
	type HarnessRequest,
	type HarnessView,
	type PermissionDecision,
	reduceHarness,
	type RequestResolution,
	type RunCapabilities,
	type RunStatus,
	runTokens,
	sessionStatus,
	summarizeWorktrees,
	type Worktree
} from './harness';
import { useHarnessStoreEvents } from './harness-store';
import type { CodingAgentAction, CodingSession, SessionBeat, SessionBeatKind } from './types';

/** Default wait before each kind lands, in ms. */
const BEAT_DELAY: Record<SessionBeatKind, number> = {
	user: 250,
	reasoning: 500,
	say: 450,
	tools: 500,
	edit: 900,
	shell: 600,
	plan: 400,
	permission: 600,
	question: 600,
	browse: 600,
	notice: 300,
	error: 700,
	spawn: 500,
	await: 300,
	message: 700,
	handoff: 500,
	route: 500,
	phase: 300,
	task: 250,
	worktree: 200,
	pr: 600,
	check: 500
};

/** How long a running command or tool batch spins before it settles. */
const SETTLE_MS = { shell: 1300, tools: 1100 } as const;


/** What a scripted child may do unless its spawn says otherwise. */
const CHILD_CAPABILITIES: RunCapabilities = { steer: true, stop: true, pause: true };

/** Typewriter pace for replies: fast enough to read along, capped so long answers don't stall the run. */
export function revealDuration(text: string) {
	return Math.min(Math.max(text.length * 9, 450), 2400);
}

function holdFor(beat: SessionBeat) {
	if (beat.kind === 'say') return revealDuration(beat.text);
	if (beat.kind === 'reasoning') return beat.durationMs;
	return 0;
}

type Op = { id: string; delay: number } & ({ op: 'beat'; beat: SessionBeat } | { op: 'settle'; eventId?: string });

/**
 * Where a scripted run is in its script. Everything the view also shows (its status, a pause, the request it is held
 * at) lives in the harness view alone, so the two can't disagree.
 */
type Flow = {
	queue: Op[];
	/** Messages sent while the run was busy, waiting for its turn to end. */
	queued: { id: string; text: string }[];
	/** What a retry repeats. */
	lastStep: SessionBeat | null;
	played: number;
	/** Children this run is waiting on before it continues. */
	awaiting: string[] | null;
};

type ScriptState = { flows: Record<string, Flow>; view: HarnessView; nextId: number; followUp: (text: string) => SessionBeat[] };

type ScriptAction =
	| { type: 'due'; runId: string; opId: string }
	| { type: 'resolve'; requestId: string; decision: PermissionDecision }
	| { type: 'answer'; requestId: string; answer: AskAnswer }
	| { type: 'send'; runId: string; text: string; beats: SessionBeat[]; attachments: string[]; steer?: boolean }
	| { type: 'unqueue'; runId: string; id: string }
	| { type: 'stop'; runId: string }
	| { type: 'pause'; runId: string }
	| { type: 'resume'; runId: string }
	| { type: 'retry'; runId: string }
	| { type: 'terminal'; lines: { kind: 'command' | 'output' | 'error'; text: string }[] }
	| { type: 'clear-terminal' };

const TERMINAL: RunStatus[] = ['done', 'failed', 'cancelled', 'idle'];

/** Beats that report on the run instead of being a step it took. */
const SIDE_BEATS: SessionBeatKind[] = ['error', 'notice', 'worktree', 'pr', 'check'];

function nextId(state: ScriptState, prefix: string) {
	state.nextId += 1;
	return `${prefix}-${state.nextId}`;
}

type EventInput = HarnessEvent extends infer E ? (E extends HarnessEvent ? Omit<E, 'id'> : never) : never;

function emit(state: ScriptState, event: EventInput) {
	const id = nextId(state, 'e');
	state.view = reduceHarness(state.view, { ...event, id } as HarnessEvent);
	return id;
}

function statusOf(state: ScriptState, runId: string): RunStatus | undefined {
	return state.view.runs[runId]?.status;
}

function isSettled(state: ScriptState, runId: string) {
	return TERMINAL.includes(statusOf(state, runId) ?? 'done');
}

function setStatus(state: ScriptState, runId: string, status: RunStatus, extra: { waitingOn?: Extract<HarnessEvent, { kind: 'run.status' }>['waitingOn']; summary?: string } = {}) {
	emit(state, { kind: 'run.status', runId, status, ...extra });
}

function op(state: ScriptState, beat: SessionBeat): Op {
	return { id: nextId(state, 'op'), op: 'beat', beat, delay: beat.delay ?? BEAT_DELAY[beat.kind] };
}

function newFlow(): Flow {
	return { queue: [], queued: [], lastStep: null, played: 0, awaiting: null };
}

function childrenOf(state: ScriptState, runId: string) {
	return state.view.runOrder.filter((id) => state.view.runs[id]?.parentRunId === runId);
}

/**
 * Holds a run on a person: a command to approve or a question to answer. In history the gate was settled long ago,
 * so the command was allowed and each question took its first option.
 */
function raise(state: ScriptState, runId: string, beat: Extract<SessionBeat, { kind: 'permission' | 'question' }>, live: boolean) {
	const id = nextId(state, 'req');
	const request: HarnessRequest =
		beat.kind === 'permission' ? { id, type: 'approval', title: beat.title, command: beat.command } : { id, type: 'question', questions: beat.questions };
	emit(state, { kind: 'request', runId, request });
	if (live) return;
	const resolution: RequestResolution =
		beat.kind === 'permission'
			? { decision: 'once' }
			: { answer: { choices: Object.fromEntries(beat.questions.map((question) => [question.id, { option: question.options[0]?.id ?? '' }])) } };
	emit(state, { kind: 'request.resolved', runId, requestId: id, ...resolution });
}

/** Lands one beat for a run. `live` is false while replaying history, which lands at once and settles every gate. */
function land(state: ScriptState, runId: string, beat: SessionBeat, live: boolean) {
	const flow = state.flows[runId];
	flow.played += 1;
	// Retrying repeats the last thing the agent did, not a status report about its branch.
	if (!SIDE_BEATS.includes(beat.kind)) flow.lastStep = beat;
	switch (beat.kind) {
		case 'permission':
		case 'question':
			raise(state, runId, beat, live);
			return;
		case 'spawn': {
			const childId = beat.agent.id;
			emit(state, {
				kind: 'run.spawned',
				runId: childId,
				run: { ...beat.agent, role: beat.agent.role ?? 'worker', parentRunId: runId, capabilities: beat.agent.capabilities ?? CHILD_CAPABILITIES }
			});
			state.flows[childId] = newFlow();
			// A spawn in history brought its child's whole script with it, unless it says how far the child got.
			const played = beat.played ?? (live ? 0 : beat.script.length);
			setStatus(state, childId, 'running');
			for (const childBeat of beat.script.slice(0, played)) land(state, childId, childBeat, false);
			state.flows[childId].queue = beat.script.slice(played).map((entry) => op(state, entry));
			settle(state, childId);
			return;
		}
		case 'await': {
			const targets = beat.agents ?? childrenOf(state, runId);
			const pending = targets.filter((id) => !isSettled(state, id));
			if (!live || pending.length === 0) {
				emit(state, { kind: 'fan-in', runId, runIds: targets });
				return;
			}
			flow.awaiting = targets;
			setStatus(state, runId, 'waiting', { waitingOn: { kind: 'agent', runIds: pending } });
			return;
		}
		case 'error':
			emit(state, { kind: 'beat', runId, beat, live });
			setStatus(state, runId, 'failed');
			return;
		case 'user':
		case 'reasoning':
		case 'say':
		case 'tools':
		case 'edit':
		case 'shell':
		case 'plan':
		case 'browse':
		case 'notice': {
			// A command or a batch of reads spins for a moment before it settles.
			const spins = live && (beat.kind === 'shell' || beat.kind === 'tools') ? SETTLE_MS[beat.kind] : 0;
			const eventId = emit(state, { kind: 'beat', runId, beat, live, running: spins > 0 });
			if (spins) flow.queue.unshift({ id: nextId(state, 'op'), op: 'settle', eventId, delay: spins });
			return;
		}
		default:
			// The rest are harness events already, sent from this run.
			emit(state, { ...beat, runId });
	}
}

/** When every child a parent waits on has stopped, it gathers their results and carries on. */
function releaseParent(state: ScriptState, childId: string) {
	const parentId = state.view.runs[childId]?.parentRunId;
	const parent = parentId ? state.flows[parentId] : undefined;
	if (!parentId || !parent?.awaiting) return;
	const pending = parent.awaiting.filter((id) => !isSettled(state, id));
	if (pending.length > 0) {
		emit(state, { kind: 'run.status', runId: parentId, status: 'waiting', waitingOn: { kind: 'agent', runIds: pending } });
		return;
	}
	emit(state, { kind: 'fan-in', runId: parentId, runIds: parent.awaiting });
	parent.awaiting = null;
	setStatus(state, parentId, 'running');
	settle(state, parentId);
}

/** Closes a turn once its queue is empty: summarises the changes, sends the next queued message, or rests. */
function settle(state: ScriptState, runId: string) {
	const flow = state.flows[runId];
	if (!flow || statusOf(state, runId) !== 'running' || flow.queue.length > 0 || flow.awaiting) return;
	emit(state, { kind: 'turn.end', runId });
	const [next, ...rest] = flow.queued;
	flow.queued = rest;
	if (next) {
		const beats: SessionBeat[] = [{ kind: 'user', text: next.text, delay: 200 }, ...state.followUp(next.text)];
		flow.queue = beats.map((beat) => op(state, beat));
		return;
	}
	const isRoot = runId === state.view.rootRunId;
	// The session's own agent rests and can be messaged again; a child reports back and is done.
	setStatus(state, runId, isRoot ? 'idle' : 'done', { summary: state.view.runs[runId]?.summary });
	if (!isRoot) releaseParent(state, runId);
}

function stopRun(state: ScriptState, runId: string, note: string) {
	const flow = state.flows[runId];
	if (!flow) return;
	// Dropped first, so the children stopping below don't hand their results back to a run that's stopping too.
	flow.queue = [];
	flow.queued = [];
	flow.awaiting = null;
	// Each child stops its own children; the status is read fresh, so nobody below is stopped twice.
	for (const childId of childrenOf(state, runId)) {
		if (!isSettled(state, childId)) stopRun(state, childId, 'Stopped with its parent.');
	}
	for (const item of state.view.runs[runId]?.items ?? []) {
		if (item.type === 'beat' && item.running) emit(state, { kind: 'beat.settled', runId, eventId: item.id });
	}
	emit(state, { kind: 'beat', runId, beat: { kind: 'notice', text: note } });
	const isRoot = runId === state.view.rootRunId;
	setStatus(state, runId, isRoot ? 'idle' : 'cancelled');
	if (!isRoot) releaseParent(state, runId);
}

function clone(state: ScriptState): ScriptState {
	const flows: Record<string, Flow> = {};
	for (const [id, flow] of Object.entries(state.flows)) flows[id] = { ...flow, queue: [...flow.queue], queued: [...flow.queued] };
	return { ...state, flows };
}

function scriptReducer(current: ScriptState, action: ScriptAction): ScriptState {
	const state = clone(current);
	switch (action.type) {
		case 'due': {
			const flow = state.flows[action.runId];
			const head = flow?.queue[0];
			if (!flow || !head || head.id !== action.opId || statusOf(state, action.runId) !== 'running') return current;
			flow.queue.shift();
			if (head.op === 'settle') {
				if (head.eventId) emit(state, { kind: 'beat.settled', runId: action.runId, eventId: head.eventId });
			} else {
				land(state, action.runId, head.beat, true);
			}
			// The beat that just landed holds the next one back while it reveals or thinks.
			const hold = head.op === 'beat' ? holdFor(head.beat) : 0;
			if (hold && flow.queue[0]) flow.queue[0] = { ...flow.queue[0], delay: flow.queue[0].delay + hold };
			// The last beat of a turn still gets its hold, so the turn closes after the reply has revealed.
			else if (hold && statusOf(state, action.runId) === 'running') flow.queue.push({ id: nextId(state, 'op'), op: 'settle', delay: hold });
			settle(state, action.runId);
			return state;
		}
		case 'resolve':
		case 'answer': {
			const runId = state.view.pending.find((entry) => entry.request.id === action.requestId)?.runId;
			const run = runId ? state.view.runs[runId] : undefined;
			const flow = runId ? state.flows[runId] : undefined;
			// Only a run still held at this request picks back up; one stopped meanwhile stays stopped.
			if (!runId || !run || !flow || !awaitsPerson(run) || run.waitingOn.requestId !== action.requestId) return current;
			const resolution: RequestResolution = action.type === 'answer' ? { answer: action.answer } : { decision: action.decision };
			emit(state, { kind: 'request.resolved', runId, requestId: action.requestId, ...resolution });
			if (action.type === 'resolve' && action.decision === 'deny') {
				// A denied command is skipped along with its output, and the agent says so.
				if (flow.queue[0]?.op === 'beat' && flow.queue[0].beat.kind === 'shell') {
					flow.queue.shift();
					flow.played += 1;
				}
				flow.queue.unshift(op(state, { kind: 'notice', text: 'Command denied. Continuing without running it.', delay: 300 }));
			}
			settle(state, runId);
			return state;
		}
		case 'send': {
			const flow = state.flows[action.runId];
			if (!flow) return current;
			if (action.steer) emit(state, { kind: 'message', runId: action.runId, from: 'you', to: [action.runId], text: action.text, protocol: 'steer' });
			const status = statusOf(state, action.runId);
			const busy = status === 'running' || status === 'waiting';
			if (busy && !action.steer) {
				flow.queued.push({ id: nextId(state, 'queued'), text: action.text });
				return state;
			}
			const beats: SessionBeat[] = action.steer ? action.beats : [{ kind: 'user', text: action.text, delay: 0 }, ...action.beats];
			// Steering a busy run slots its reply in next; a resting run starts a new turn.
			flow.queue = busy ? [...beats.map((beat) => op(state, beat)), ...flow.queue] : beats.map((beat) => op(state, beat));
			if (!busy) setStatus(state, action.runId, 'running');
			return state;
		}
		case 'unqueue': {
			const flow = state.flows[action.runId];
			if (flow) flow.queued = flow.queued.filter((entry) => entry.id !== action.id);
			return state;
		}
		case 'stop': {
			if (!state.flows[action.runId] || isSettled(state, action.runId)) return current;
			stopRun(state, action.runId, action.runId === state.view.rootRunId ? 'Stopped. Send a message to pick it back up.' : 'Stopped.');
			return state;
		}
		case 'pause': {
			if (!state.flows[action.runId] || statusOf(state, action.runId) !== 'running') return current;
			setStatus(state, action.runId, 'paused');
			return state;
		}
		case 'resume': {
			if (!state.flows[action.runId] || statusOf(state, action.runId) !== 'paused') return current;
			setStatus(state, action.runId, 'running');
			return state;
		}
		case 'retry': {
			const flow = state.flows[action.runId];
			if (!flow || statusOf(state, action.runId) !== 'failed') return current;
			emit(state, { kind: 'beat', runId: action.runId, beat: { kind: 'notice', text: 'Retrying from the failed step.' } });
			// The step that failed runs again before whatever was left of the script.
			if (flow.lastStep && flow.lastStep.kind !== 'user') flow.queue.unshift(op(state, { ...flow.lastStep, delay: 500 }));
			setStatus(state, action.runId, 'running');
			settle(state, action.runId);
			return state;
		}
		case 'terminal':
			emit(state, { kind: 'terminal', runId: state.view.rootRunId, lines: action.lines });
			return state;
		case 'clear-terminal':
			emit(state, { kind: 'terminal.clear', runId: state.view.rootRunId });
			return state;
	}
}

/** What a control asks the host to do, or null for the ones that only ever touch the local script. */
function hostAction(control: ScriptAction, view: HarnessView, sessionId: string): CodingAgentAction | null {
	switch (control.type) {
		case 'send':
			return control.steer
				? { type: 'steer-run', sessionId, runId: control.runId, text: control.text, attachments: control.attachments }
				: { type: 'send', sessionId, text: control.text, attachments: control.attachments };
		case 'stop':
			// Stopping the session's own agent stops the session; any other agent stops on its own.
			return control.runId === view.rootRunId ? { type: 'stop', sessionId } : { type: 'stop-run', sessionId, runId: control.runId };
		case 'pause':
			return { type: 'pause-run', sessionId, runId: control.runId };
		case 'resume':
			return { type: 'resume-run', sessionId, runId: control.runId };
		case 'retry':
			return { type: 'retry-run', sessionId, runId: control.runId };
		case 'resolve': {
			const entry = view.pending.find((pending) => pending.request.id === control.requestId);
			if (entry?.request.type !== 'approval') return null;
			return { type: 'permission', sessionId, runId: entry.runId, requestId: control.requestId, decision: control.decision, command: entry.request.command };
		}
		case 'answer': {
			const entry = view.pending.find((pending) => pending.request.id === control.requestId);
			if (!entry) return null;
			return { type: 'answer', sessionId, runId: entry.runId, requestId: control.requestId, answer: control.answer };
		}
		default:
			return null;
	}
}

function rootRun(session: CodingSession): AgentRun {
	return { id: 'root', name: session.agentName ?? 'Agent', role: 'root', capabilities: { steer: true, stop: true } };
}

/** The session's own checkout and any worktrees it already knows about. */
function sessionWorktrees(session: CodingSession, branch: string): Worktree[] {
	const known = session.worktrees ?? [];
	if (known.length) return known;
	return [{ id: branch, branch, kind: session.location === 'worktree' ? 'worktree' : 'checkout' }];
}

function initialScript(session: CodingSession, files: Record<string, string>, branch: string, followUp: (text: string) => SessionBeat[]): ScriptState {
	const script = session.script ?? [];
	const state: ScriptState = { flows: {}, view: createHarnessView(rootRun(session), files, sessionWorktrees(session, branch)), nextId: 0, followUp };
	const root = state.view.rootRunId;
	state.flows[root] = newFlow();
	setStatus(state, root, 'running');
	const played = session.played ?? 0;
	for (const beat of script.slice(0, played)) land(state, root, beat, false);
	state.flows[root].queue = script.slice(played).map((beat) => op(state, beat));
	settle(state, root);
	return state;
}

/**
 * Times each running run's next step. Every head keeps the moment it became due, so one run landing a step never
 * restarts another run's wait.
 */
function useScheduler(state: ScriptState, dispatch: React.Dispatch<ScriptAction>) {
	const dueAt = React.useRef(new Map<string, number>());
	const heads = Object.entries(state.flows)
		.filter(([runId, flow]) => flow.queue[0] && state.view.runs[runId]?.status === 'running')
		.map(([runId, flow]) => ({ runId, op: flow.queue[0] }));
	// A paused or held run keeps its head and the moment it was due; a head that left its queue never will be.
	const queuedHeads = new Set(Object.values(state.flows).flatMap((flow) => (flow.queue[0] ? [flow.queue[0].id] : [])));
	const key = heads.map((head) => `${head.runId}:${head.op.id}`).join('|');
	React.useEffect(() => {
		for (const id of dueAt.current.keys()) if (!queuedHeads.has(id)) dueAt.current.delete(id);
		const now = performance.now();
		const reduced = prefersReducedMotion();
		const timers = heads.map(({ runId, op: head }) => {
			if (!dueAt.current.has(head.id)) dueAt.current.set(head.id, now + (reduced ? Math.min(head.delay, REDUCED_MOTION_DELAY) : head.delay));
			const wait = Math.max(0, (dueAt.current.get(head.id) ?? now) - now);
			return window.setTimeout(() => {
				dueAt.current.delete(head.id);
				dispatch({ type: 'due', runId, opId: head.id });
			}, wait);
		});
		return () => timers.forEach((timer) => window.clearTimeout(timer));
		// `key` captures the heads; the arrays themselves are rebuilt every render.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [key, dispatch]);
}

/** Reduces a host's events incrementally: an append-only log only folds what's new since the last render. */
function useHostView(events: readonly HarnessEvent[], initial: () => HarnessView) {
	const cache = React.useRef<{ events: readonly HarnessEvent[]; view: HarnessView } | null>(null);
	const cached = cache.current;
	let view: HarnessView;
	if (cached && cached.events === events) {
		view = cached.view;
	} else if (cached && events.length >= cached.events.length && (cached.events.length === 0 || events[cached.events.length - 1] === cached.events[cached.events.length - 1])) {
		// An append-only log: if the last event seen is still in place, only what came after it needs folding.
		view = events.slice(cached.events.length).reduce(reduceHarness, cached.view);
	} else {
		view = events.reduce(reduceHarness, initial());
	}
	cache.current = { events, view };
	return view;
}

/** What's coming next for a run, for its live status line. */
function upcoming(flow: Flow | undefined): SessionBeatKind | undefined {
	for (const entry of flow?.queue ?? []) if (entry.op === 'beat') return entry.beat.kind;
	return undefined;
}

/** Share of a run's script played so far, counting what it has been sent since. */
function playedShare(flow: Flow | undefined) {
	if (!flow) return 1;
	const total = flow.played + flow.queue.filter((entry) => entry.op === 'beat').length;
	return total ? flow.played / total : 1;
}

/** The host drives the session through its `events` log or `store`; without either, the session plays its script. */
export function isHosted(session: Pick<CodingSession, 'events' | 'store'>) {
	return Boolean(session.events || session.store);
}

/**
 * The session's harness: a scripted run for demos, or the host's `events` log or `store`. Either way the views get
 * one `HarnessView` and one set of controls. Every control reaches the host through `emit` as a `CodingAgentAction`;
 * a scripted session also plays it out, while in host mode nothing changes until the host answers with events.
 */
export function useHarness({
	session,
	files,
	branch,
	followUp,
	emit: emitAction
}: {
	session: CodingSession;
	files: Record<string, string>;
	/** The branch the session works on, for its checkout when `session.worktrees` doesn't name one. */
	branch: string;
	followUp: (text: string) => SessionBeat[];
	emit: (action: CodingAgentAction) => void;
}) {
	const host = isHosted(session);
	const [scripted, dispatch] = React.useReducer(scriptReducer, undefined, () => initialScript(host ? { ...session, script: [] } : session, files, branch, followUp));
	useScheduler(scripted, dispatch);
	const storeEvents = useHarnessStoreEvents(session.store);
	const hostEvents = session.events ?? storeEvents;
	const hostView = useHostView(host ? hostEvents : [], () => createHarnessView(rootRun(session), files, sessionWorktrees(session, branch)));
	const view = host ? hostView : scripted.view;

	const control = (action: ScriptAction) => {
		const forHost = hostAction(action, view, session.id);
		if (forHost) emitAction(forHost);
		if (!host) dispatch(action);
	};

	const changes = React.useMemo(() => Object.values(view.changes), [view.changes]);
	// Worktree rows only change with the worktrees, the changes or the runs, not with every step an agent takes.
	const { worktrees: worktreeMap, worktreeOrder, changes: changeMap, runOrder, runs } = view;
	const worktrees = React.useMemo(
		() => summarizeWorktrees(view),
		// The runs are read only for the worktree each works in, which is set when it spawns, so `runOrder` covers it.
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[worktreeMap, worktreeOrder, changeMap, runOrder]
	);
	const tokens = React.useMemo(() => runOrder.reduce((sum, id) => sum + runTokens(runs[id]), 0), [runOrder, runs]);

	return {
		view,
		status: sessionStatus(view),
		progress: host ? undefined : playedShare(scripted.flows[view.rootRunId]),
		files: view.files,
		changes,
		worktrees,
		terminal: view.terminal,
		browse: view.browse,
		tokens,
		queued: (runId: string) => (host ? [] : (scripted.flows[runId]?.queued ?? [])),
		upcoming: (runId: string) => (host ? undefined : upcoming(scripted.flows[runId])),
		send: (runId: string, text: string, beats: SessionBeat[], attachments: string[] = []) => control({ type: 'send', runId, text, beats, attachments }),
		steer: (runId: string, text: string, beats: SessionBeat[], attachments: string[] = []) => control({ type: 'send', runId, text, beats, attachments, steer: true }),
		unqueue: (runId: string, id: string) => control({ type: 'unqueue', runId, id }),
		stop: (runId: string) => control({ type: 'stop', runId }),
		pause: (runId: string) => control({ type: 'pause', runId }),
		resume: (runId: string) => control({ type: 'resume', runId }),
		retry: (runId: string) => control({ type: 'retry', runId }),
		resolvePermission: (requestId: string, decision: PermissionDecision) => control({ type: 'resolve', requestId, decision }),
		answer: (requestId: string, answer: AskAnswer) => control({ type: 'answer', requestId, answer }),
		appendTerminal: (lines: { kind: 'command' | 'output' | 'error'; text: string }[]) => control({ type: 'terminal', lines }),
		clearTerminal: () => control({ type: 'clear-terminal' })
	};
}

export type SessionHarness = ReturnType<typeof useHarness>;

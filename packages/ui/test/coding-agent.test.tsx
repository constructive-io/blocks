import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CODING_AGENT_DEMO, CodingAgent, type CodingAgentAction, type CodingAgentData, type CodingSession, type SessionBeat } from '../src/components/coding-agent';
import { createHarnessStore } from '../src/components/coding-agent/harness-store';
import { turnsOf } from '../src/components/coding-agent/turn-rail';
import { ancestry, createHarnessView, type HarnessEvent, replayHarness, summarizeWorktrees } from '../src/components/coding-agent/harness';
import { type SessionHarness, useHarness } from '../src/components/coding-agent/use-harness';

// The diff and tree renderers draw into shadow roots with constructed stylesheets, which jsdom lacks. The shell's
// behaviour doesn't depend on what they draw, so they render as plain stand-ins here.
vi.mock('@pierre/diffs/react', () => ({
	MultiFileDiff: ({ newFile }: { newFile: { name: string } }) => <div data-testid="diff">{newFile.name}</div>,
	File: ({ file }: { file: { contents: string } }) => <pre>{file.contents}</pre>
}));
vi.mock('@pierre/trees/react', () => ({
	useFileTree: () => ({ model: { resetPaths() {}, setGitStatus() {}, getSelectedPaths: () => [], getItem: () => null, scrollToPath() {} } }),
	FileTree: () => <div data-testid="tree" />
}));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.CSS ??= {} as typeof CSS;
CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`);
globalThis.PointerEvent ??= MouseEvent as unknown as typeof PointerEvent;

class NoopObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
	takeRecords() {
		return [];
	}
}

let root: Root | undefined;
let container: HTMLDivElement | undefined;

beforeEach(() => {
	vi.useFakeTimers();
	vi.stubGlobal('ResizeObserver', NoopObserver);
	vi.stubGlobal('IntersectionObserver', NoopObserver);
	vi.stubGlobal(
		'matchMedia',
		(query: string) =>
			({
				matches: false,
				media: query,
				addEventListener() {},
				removeEventListener() {},
				addListener() {},
				removeListener() {},
				onchange: null,
				dispatchEvent: () => false
			}) as MediaQueryList
	);
	Element.prototype.scrollTo ??= function scrollTo() {};
	Element.prototype.scrollIntoView ??= function scrollIntoView() {};
});

afterEach(() => {
	act(() => root?.unmount());
	container?.remove();
	root = undefined;
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

async function render(node: React.ReactNode) {
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
	await act(async () => root!.render(node));
}

/** Plays timers in 100ms slices until `done`, failing after `limit` ms of simulated time. */
async function until(done: () => boolean, limit = 60_000) {
	for (let elapsed = 0; !done(); elapsed += 100) {
		if (elapsed > limit) throw new Error(`Still waiting after ${limit}ms`);
		await act(async () => {
			await vi.advanceTimersByTimeAsync(100);
		});
	}
}

async function click(element: Element | null | undefined) {
	if (!element) throw new Error('Element not found');
	await act(async () => (element as HTMLElement).click());
}

const FILES = { 'src/a.ts': 'export const a = 1;\n' };

/** Renders the harness hook alone and hands back its latest state and what it sent the host. */
async function renderHarness(session: Partial<CodingSession>) {
	const latest: { harness?: SessionHarness } = {};
	const emit = vi.fn<(action: CodingAgentAction) => void>();
	function Harness() {
		latest.harness = useHarness({
			session: { id: 's', title: 'Test', projectId: 'acme-web', ...session },
			files: FILES,
			branch: 'main',
			followUp: (text) => [{ kind: 'say', text: `Reply to ${text}` }],
			emit
		});
		return null;
	}
	await render(<Harness />);
	return Object.assign(latest as { harness: SessionHarness }, { emit });
}

const playScript = (script: SessionBeat[], played = 0) => renderHarness({ script, played });

const rootRun = (state: { harness: SessionHarness }) => state.harness.view.runs.root!;
const beats = (state: { harness: SessionHarness }, runId = 'root') =>
	state.harness.view.runs[runId]!.items.flatMap((item) => (item.type === 'beat' ? [item.beat] : []));

const GATED: SessionBeat[] = [
	{ kind: 'user', text: 'Make a two' },
	{ kind: 'edit', path: 'src/a.ts', after: 'export const a = 2;\n' },
	{ kind: 'permission', title: 'Run a command', command: 'pnpm test' },
	{ kind: 'shell', command: 'pnpm test', output: '1 passed', exitCode: 0 },
	{ kind: 'say', text: 'Done.' }
];

describe('useHarness with a script', () => {
	it('holds at a permission gate, then runs the command and closes the turn with what changed', async () => {
		const state = await playScript(GATED);
		await until(() => state.harness.status === 'approval');
		expect(state.harness.changes).toEqual([expect.objectContaining({ path: 'src/a.ts', additions: 1, deletions: 1, runIds: ['root'] })]);
		expect(state.harness.terminal).toEqual([]);

		await act(async () => state.harness.resolvePermission(state.harness.view.pending[0]!.request.id, 'once'));
		await until(() => state.harness.status === 'idle');
		expect(state.harness.terminal.map((line) => line.text)).toEqual(['pnpm test', '1 passed']);
		expect(rootRun(state).items.at(-1)).toMatchObject({ type: 'turn-end', paths: ['src/a.ts'], additions: 1, deletions: 1 });
	});

	it('skips a denied command and says so', async () => {
		const state = await playScript(GATED);
		await until(() => state.harness.status === 'approval');
		await act(async () => state.harness.resolvePermission(state.harness.view.pending[0]!.request.id, 'deny'));
		await until(() => state.harness.status === 'idle');
		expect(state.harness.terminal).toEqual([]);
		expect(beats(state).some((beat) => beat.kind === 'shell')).toBe(false);
		expect(beats(state)).toContainEqual(expect.objectContaining({ kind: 'notice', text: 'Command denied. Continuing without running it.' }));
	});

	it('queues a message sent mid-run and sends it once the run settles', async () => {
		const state = await playScript([
			{ kind: 'user', text: 'Start' },
			{ kind: 'say', text: 'Working on it.' }
		]);
		await act(async () => state.harness.send('root', 'Also add docs', []));
		expect(state.harness.queued('root').map((entry) => entry.text)).toEqual(['Also add docs']);

		await until(() => state.harness.status === 'idle');
		expect(state.harness.queued('root')).toEqual([]);
		expect(beats(state).slice(-2)).toEqual([
			expect.objectContaining({ kind: 'user', text: 'Also add docs' }),
			expect.objectContaining({ kind: 'say', text: 'Reply to Also add docs' })
		]);
	});

	it('lands history at once and leaves a failed run waiting for a retry', async () => {
		const state = await playScript(
			[
				{ kind: 'user', text: 'Fix it' },
				{ kind: 'error', title: 'The run stopped', text: 'Overloaded.' },
				{ kind: 'say', text: 'Fixed after the retry.' }
			],
			2
		);
		expect(state.harness.status).toBe('failed');
		expect(beats(state).map((beat) => beat.kind)).toEqual(['user', 'error']);

		await act(async () => state.harness.retry('root'));
		await until(() => state.harness.status === 'idle');
		expect(beats(state).at(-1)).toMatchObject({ kind: 'say', text: 'Fixed after the retry.' });
	});

	it('runs workers side by side, waits for them, and gathers their results', async () => {
		const worker = (id: string, text: string): SessionBeat => ({
			kind: 'spawn',
			agent: { id, name: id.toUpperCase(), task: `Do ${id}` },
			script: [
				{ kind: 'tools', calls: [{ tool: 'read', target: 'src/a.ts' }] },
				{ kind: 'say', text }
			]
		});
		const state = await playScript([
			{ kind: 'user', text: 'Split it' },
			worker('a', 'A is done.'),
			worker('b', 'B is done.'),
			{ kind: 'await' },
			{ kind: 'say', text: 'Both done.' }
		]);
		await until(() => rootRun(state).status === 'waiting');
		expect(rootRun(state).waitingOn).toMatchObject({ kind: 'agent' });
		expect(state.harness.view.runs.a!.status).toBe('running');
		expect(state.harness.view.runs.b!.status).toBe('running');

		await until(() => state.harness.status === 'idle');
		expect(state.harness.view.runs.a).toMatchObject({ status: 'done', summary: 'A is done.', parentRunId: 'root', depth: 1 });
		expect(state.harness.view.runs.b).toMatchObject({ status: 'done', summary: 'B is done.' });
		expect(rootRun(state).items.filter((item) => item.type === 'spawn').map((item) => item.type === 'spawn' && item.runId)).toEqual(['a', 'b']);
		expect(rootRun(state).items).toContainEqual(expect.objectContaining({ type: 'fan-in', runIds: ['a', 'b'] }));
		expect(beats(state).at(-1)).toMatchObject({ kind: 'say', text: 'Both done.' });
	});

	it('brings a child agent’s approval to the session and lets it carry on once allowed', async () => {
		const state = await playScript([
			{ kind: 'user', text: 'Go' },
			{
				kind: 'spawn',
				agent: { id: 'worker', name: 'Worker', task: 'Run the tests' },
				script: [
					{ kind: 'permission', title: 'Run a command', command: 'pnpm test' },
					{ kind: 'shell', command: 'pnpm test', output: 'ok', exitCode: 0 },
					{ kind: 'say', text: 'Tests pass.' }
				]
			},
			{ kind: 'await' }
		]);
		await until(() => state.harness.status === 'approval');
		expect(state.harness.view.pending).toEqual([expect.objectContaining({ runId: 'worker' })]);

		await act(async () => state.harness.resolvePermission(state.harness.view.pending[0]!.request.id, 'once'));
		await until(() => state.harness.status === 'idle');
		expect(state.harness.view.runs.worker).toMatchObject({ status: 'done', summary: 'Tests pass.' });
		expect(state.harness.terminal.find((line) => line.kind === 'command')).toMatchObject({ text: 'pnpm test', runId: 'worker' });
	});

	it('stops a worker and everything under it without stopping the session', async () => {
		const state = await playScript([
			{ kind: 'user', text: 'Go' },
			{ kind: 'spawn', agent: { id: 'slow', name: 'Slow', task: 'Take a while' }, script: [{ kind: 'say', text: 'Still going.', delay: 60_000 }] },
			{ kind: 'await' },
			{ kind: 'say', text: 'Carried on without it.' }
		]);
		await until(() => state.harness.view.runs.slow?.status === 'running');
		await act(async () => state.harness.stop('slow'));
		expect(state.harness.view.runs.slow!.status).toBe('cancelled');
		await until(() => state.harness.status === 'idle');
		expect(beats(state).at(-1)).toMatchObject({ kind: 'say', text: 'Carried on without it.' });
	});

	it('plays a steer sent to a worker that was paused and then stopped', async () => {
		const state = await playScript([
			{ kind: 'user', text: 'Go' },
			{ kind: 'spawn', agent: { id: 'slow', name: 'Slow', task: 'Take a while' }, script: [{ kind: 'say', text: 'Still going.', delay: 60_000 }] }
		]);
		await until(() => state.harness.view.runs.slow?.status === 'running');
		await act(async () => state.harness.pause('slow'));
		expect(state.harness.view.runs.slow!.status).toBe('paused');
		await act(async () => state.harness.stop('slow'));
		expect(state.harness.view.runs.slow!.status).toBe('cancelled');

		await act(async () => state.harness.steer('slow', 'Try the cache instead', [{ kind: 'say', text: 'Using the cache.' }]));
		await until(() => state.harness.view.runs.slow!.status === 'done');
		expect(beats(state, 'slow').at(-1)).toMatchObject({ kind: 'say', text: 'Using the cache.' });
		expect(state.emit).toHaveBeenLastCalledWith({ type: 'steer-run', sessionId: 's', runId: 'slow', text: 'Try the cache instead', attachments: [] });
	});

	it('stops a run, its workers and theirs once each, without gathering their results', async () => {
		const slow = (id: string): SessionBeat => ({ kind: 'spawn', agent: { id, name: id, task: `Do ${id}` }, script: [{ kind: 'say', text: 'Still going.', delay: 60_000 }] });
		const state = await playScript([
			{ kind: 'user', text: 'Go' },
			slow('a'),
			{ kind: 'spawn', agent: { id: 'b', name: 'b', task: 'Split it again' }, script: [slow('c'), { kind: 'await' }] },
			{ kind: 'await' }
		]);
		await until(() => rootRun(state).waitingOn?.kind === 'agent' && state.harness.view.runs.b?.waitingOn?.kind === 'agent');
		await act(async () => state.harness.stop('root'));

		const notices = (runId: string) => beats(state, runId).filter((beat) => beat.kind === 'notice').map((beat) => beat.kind === 'notice' && beat.text);
		expect(notices('root')).toEqual(['Stopped. Send a message to pick it back up.']);
		for (const id of ['a', 'b', 'c']) {
			expect(state.harness.view.runs[id]!.status).toBe('cancelled');
			expect(notices(id)).toEqual(['Stopped with its parent.']);
		}
		expect(rootRun(state).items.some((item) => item.type === 'fan-in')).toBe(false);
		expect(state.harness.view.runs.b!.items.some((item) => item.type === 'fan-in')).toBe(false);
		expect(state.harness.status).toBe('idle');
	});
});

describe('useHarness with a host', () => {
	it('sends every control to the host and leaves the view to the host’s events', async () => {
		const store = createHarnessStore([
			{ id: 'h1', runId: 'root', kind: 'run.status', status: 'running' },
			{ id: 'h2', runId: 'w', kind: 'run.spawned', run: { id: 'w', name: 'Worker', role: 'worker', parentRunId: 'root', capabilities: { stop: true, pause: true } } },
			{ id: 'h3', runId: 'w', kind: 'run.status', status: 'running' },
			{ id: 'h4', runId: 'w', kind: 'request', request: { id: 'r1', type: 'approval', title: 'Run a command', command: 'pnpm test' } },
			{ id: 'h5', runId: 'root', kind: 'request', request: { id: 'q1', type: 'question', questions: [] } }
		]);
		const state = await renderHarness({ id: 'hosted', store });
		const before = state.harness.view;

		await act(async () => {
			state.harness.stop('root');
			state.harness.stop('w');
			state.harness.pause('w');
			state.harness.resume('w');
			state.harness.retry('w');
			state.harness.resolvePermission('r1', 'deny');
			state.harness.answer('q1', { skipped: true });
		});
		expect(state.emit.mock.calls.map(([action]) => action)).toEqual([
			{ type: 'stop', sessionId: 'hosted' },
			{ type: 'stop-run', sessionId: 'hosted', runId: 'w' },
			{ type: 'pause-run', sessionId: 'hosted', runId: 'w' },
			{ type: 'resume-run', sessionId: 'hosted', runId: 'w' },
			{ type: 'retry-run', sessionId: 'hosted', runId: 'w' },
			{ type: 'permission', sessionId: 'hosted', runId: 'w', requestId: 'r1', decision: 'deny', command: 'pnpm test' },
			{ type: 'answer', sessionId: 'hosted', runId: 'root', requestId: 'q1', answer: { skipped: true } }
		]);
		expect(state.harness.view).toBe(before);
		expect(state.harness.view.pending.map((entry) => entry.request.id)).toEqual(['r1', 'q1']);

		// The host acts and reports back; resolving the request carries the worker on without a status of its own.
		await act(async () => store.push({ id: 'h6', runId: 'w', kind: 'request.resolved', requestId: 'r1', decision: 'deny' }));
		expect(state.harness.view.runs.w).toMatchObject({ status: 'running', waitingOn: undefined });
		expect(state.harness.view.runs.w!.items).toContainEqual(expect.objectContaining({ type: 'permission', requestId: 'r1', decision: 'deny' }));
	});
});

describe('reduceHarness', () => {
	const view = () => createHarnessView({ id: 'root', name: 'Lead', role: 'root' }, FILES);
	const events: HarnessEvent[] = [
		{ id: '1', runId: 'w', kind: 'run.spawned', run: { id: 'w', name: 'Worker', role: 'worker', parentRunId: 'root', task: 'Fix it' } },
		{ id: '2', runId: 'r', kind: 'run.spawned', run: { id: 'r', name: 'Reviewer', role: 'worker', parentRunId: 'w' } },
		{ id: '3', runId: 'w', kind: 'message', from: 'w', to: ['r'], text: 'Please check this', protocol: 'text' },
		{ id: '4', runId: 'w', kind: 'task', task: { id: 't', title: 'Fix it', status: 'in_progress', ownerRunId: 'w' } },
		{ id: '5', runId: 'w', kind: 'task', task: { id: 't', title: 'Fix it', status: 'done', ownerRunId: 'w' } },
		{ id: '6', runId: 'w', kind: 'run.progress', usage: { inputTokens: 1200, outputTokens: 300, costUsd: 0.04 } },
		{ id: '7', runId: 'root', kind: 'handoff', to: 'w', reason: 'It owns the fix' }
	];

	it('builds the agent tree, threads messages to both ends, and keeps one row per task', () => {
		const state = replayHarness(view(), events);
		expect(ancestry(state, 'r').map((run) => run.name)).toEqual(['Lead', 'Worker', 'Reviewer']);
		expect(state.runs.r!.depth).toBe(2);
		expect(state.runs.w!.items.some((item) => item.type === 'message')).toBe(true);
		expect(state.runs.r!.items.some((item) => item.type === 'message')).toBe(true);
		expect(state.tasks).toEqual([expect.objectContaining({ id: 't', status: 'done' })]);
		expect(state.runs.w!.usage).toMatchObject({ inputTokens: 1200, outputTokens: 300, costUsd: 0.04 });
		expect(state.activeRunId).toBe('w');
	});

	it('splits a transcript into turns for the rail: a recovered error is done, an open question waits on you', () => {
		const state = replayHarness(view(), [
			{ id: 't1', runId: 'root', kind: 'beat', beat: { kind: 'user', text: 'Add invites' } },
			{ id: 't2', runId: 'root', kind: 'beat', beat: { kind: 'error', title: 'Tests failed', text: '1 failing' } },
			{ id: 't3', runId: 'root', kind: 'beat', beat: { kind: 'say', text: 'Fixed it.' } },
			{ id: 't4', runId: 'root', kind: 'beat', beat: { kind: 'user', text: 'Now audit events' } },
			{ id: 't5', runId: 'root', kind: 'request', request: { id: 'q', type: 'question', questions: [] } }
		]);
		expect(turnsOf(state.runs.root!)).toEqual([
			{ id: 't1', prompt: 'Add invites', reply: 'Fixed it.', state: 'done' },
			{ id: 't4', prompt: 'Now audit events', state: 'waiting' }
		]);
	});

	it('keeps changes per worktree, so one agent can edit several and two can change the same file', () => {
		const start = createHarnessView({ id: 'root', name: 'Lead', role: 'root' }, FILES, [{ id: 'main', branch: 'main', kind: 'checkout' }]);
		const worktreeEvents: HarnessEvent[] = [
			{ id: '1', runId: 'a', kind: 'run.spawned', run: { id: 'a', name: 'Cookies', role: 'worker', parentRunId: 'root', workspace: { kind: 'worktree', branch: 'fix/a' } } },
			{ id: '2', runId: 'b', kind: 'run.spawned', run: { id: 'b', name: 'Csrf', role: 'worker', parentRunId: 'root', workspace: { kind: 'worktree', branch: 'fix/b' } } },
			{ id: '3', runId: 'a', kind: 'beat', beat: { kind: 'edit', path: 'src/x.ts', after: 'a\n' } },
			{ id: '4', runId: 'b', kind: 'beat', beat: { kind: 'edit', path: 'src/x.ts', after: 'b\n' } },
			// The lead, working in the checkout, also fixes something on the first worker's branch.
			{ id: '5', runId: 'root', kind: 'beat', beat: { kind: 'edit', path: 'src/y.ts', after: 'y\n', worktree: 'fix/a' } },
			{ id: '6', runId: 'b', kind: 'pr', worktreeId: 'fix/b', pr: { number: 7, title: 'Block cross-site writes', state: 'open', checks: [{ id: 'e2e', name: 'E2E', status: 'running' }] } },
			{ id: '7', runId: 'b', kind: 'check', worktreeId: 'fix/b', check: { id: 'e2e', status: 'failed', summary: 'webhook returns 403' } }
		];
		const state = replayHarness(start, worktreeEvents);
		const summaries = summarizeWorktrees(state);

		expect(summaries.map((entry) => entry.worktree.id)).toEqual(['main', 'fix/a', 'fix/b']);
		expect(state.worktrees['fix/a']).toMatchObject({ base: 'main', kind: 'worktree' });
		const [, first, second] = summaries;
		expect(first!.changes.map((change) => change.path)).toEqual(['src/x.ts', 'src/y.ts']);
		expect(first!.runIds).toEqual(['root', 'a']);
		expect(second!.changes.map((change) => change.after)).toEqual(['b\n']);
		expect(second!.worktree.pr?.checks).toEqual([{ id: 'e2e', name: 'E2E', status: 'failed', summary: 'webhook returns 403' }]);
		expect(second!.checks).toMatchObject({ total: 1, failed: 1 });
	});
});

const tab = (title: string) =>
	[...container!.querySelectorAll<HTMLElement>('[role="tab"]')].find((element) => {
		const name = element.getAttribute('aria-label') ?? '';
		return name === title || name.startsWith(`${title}, `);
	});
const button = (label: string) => container!.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);

/** Two sessions: a finished one in front and a short run in a background tab. */
const TWO_SESSIONS: CodingAgentData = {
	...CODING_AGENT_DEMO,
	sessions: [
		{ id: 'front', title: 'Front session', projectId: 'acme-web', script: [{ kind: 'user', text: 'Hello' }], played: 1 },
		{
			id: 'back',
			title: 'Background session',
			projectId: 'acme-web',
			script: [
				{ kind: 'user', text: 'Rename the helper' },
				{ kind: 'say', text: 'Renamed it.' }
			]
		}
	],
	openSessionIds: ['front', 'back']
};

describe('CodingAgent', () => {
	it('marks a session that finishes in a background tab until you open it', async () => {
		await render(<CodingAgent data={TWO_SESSIONS} />);
		expect(tab('Background session')?.getAttribute('aria-label')).toBe('Background session, Working');

		await until(() => tab('Background session')?.getAttribute('aria-label') === 'Background session, New result');
		await click(tab('Background session'));
		expect(tab('Background session')?.getAttribute('aria-label')).toBe('Background session');
	});

	it('keeps a closed session reachable from the session list', async () => {
		const onAction = vi.fn();
		await render(<CodingAgent data={TWO_SESSIONS} onAction={onAction} />);
		await click(button('Close Background session'));
		expect(tab('Background session')).toBeUndefined();
		expect(onAction).toHaveBeenCalledWith({ type: 'close-session', sessionId: 'back' });

		await click(button('All sessions'));
		const row = [...container!.querySelectorAll('button')].find((element) => element.textContent?.includes('Background session'));
		await click(row);
		expect(tab('Background session')?.getAttribute('aria-selected')).toBe('true');
	});

	it('keeps every session running when the layout switches', async () => {
		await render(<CodingAgent data={TWO_SESSIONS} defaultActiveSessionId="back" />);
		await until(() => Boolean(container!.textContent?.includes('Rename the helper')));
		await click(button('Show sessions in a sidebar'));

		expect(container!.querySelector('[role="toolbar"][aria-label="Sessions"]')).toBeNull();
		expect(container!.querySelector('aside[aria-label="Sessions"]')).not.toBeNull();
		// The same run carries on: the message already shown is still there and the reply still lands.
		expect(container!.textContent).toContain('Rename the helper');
		await until(() => Boolean(container!.textContent?.includes('Renamed it.')));
	});

	it('completes a slash command from the composer menu', async () => {
		await render(<CodingAgent data={TWO_SESSIONS} />);
		const textarea = [...container!.querySelectorAll<HTMLTextAreaElement>('textarea[aria-label="Message the agent"]')].find(
			(element) => !element.closest('[hidden]')
		)!;
		await act(async () => {
			const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
			setValue.call(textarea, '/te');
			textarea.setSelectionRange(3, 3);
			textarea.dispatchEvent(new Event('input', { bubbles: true }));
		});
		expect([...container!.querySelectorAll('[cmdk-item]')].map((item) => item.textContent)).toContain('/testRun the test suite');

		await act(async () => {
			textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		});
		expect(textarea.value).toBe('/test ');
	});

	it('shows what a host pushes into a store, as it arrives', async () => {
		const store = createHarnessStore();
		const data: CodingAgentData = {
			...CODING_AGENT_DEMO,
			sessions: [{ id: 'hosted', title: 'Hosted session', projectId: 'acme-web', store }],
			openSessionIds: ['hosted']
		};
		await render(<CodingAgent data={data} />);
		expect(container!.textContent).not.toContain('Researcher');

		await act(async () =>
			store.push(
				{ id: 'h1', runId: 'root', kind: 'beat', beat: { kind: 'user', text: 'Look into flaky tests' } },
				{ id: 'h2', runId: 'res', kind: 'run.spawned', run: { id: 'res', name: 'Researcher', role: 'worker', parentRunId: 'root', task: 'Find the flaky tests' } },
				{ id: 'h3', runId: 'res', kind: 'run.status', status: 'running' }
			)
		);
		expect(container!.textContent).toContain('Look into flaky tests');
		expect(container!.textContent).toContain('Researcher');
		expect(tab('Hosted session')?.getAttribute('aria-label')).toBe('Hosted session, Working');
	});
});

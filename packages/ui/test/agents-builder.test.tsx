import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	AGENTS_BUILDER_DEMO,
	AgentsBuilder,
	type AgentsBuilderAction,
	DEMO_AGENT_DETAILS,
} from '../src/components/agents-builder';
import { visibleRoster } from '../src/components/agents-builder/agent-status';
import { CONVERSATION_TIMING, sayDuration } from '../src/components/agents-builder/use-scripted-conversation';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// React 19.3's ViewTransition names host nodes with CSS.escape, which jsdom lacks.
globalThis.CSS ??= {} as typeof CSS;
CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`);
// Base UI's switch dispatches PointerEvents, which jsdom does not implement.
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
				dispatchEvent: () => false,
			}) as MediaQueryList,
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

const headingNamed = (name: string) =>
	[...container!.querySelectorAll('h2')].find((element) => element.textContent?.trim() === name);
const byLabel = (label: string) => container!.querySelector<HTMLElement>(`[aria-label="${label}"]`);
/** What a screen reader announces: the aria-label, else the text without its aria-hidden parts (like a row's status tag). */
function accessibleName(element: HTMLElement) {
	const label = element.getAttribute('aria-label');
	if (label) return label;
	const copy = element.cloneNode(true) as HTMLElement;
	for (const hidden of copy.querySelectorAll('[aria-hidden="true"]')) hidden.remove();
	return copy.textContent?.trim();
}
const buttonNamed = (name: string) => [...container!.querySelectorAll<HTMLButtonElement>('button')].find((element) => accessibleName(element) === name);

const roster = () => [...container!.querySelectorAll<HTMLButtonElement>('nav button')].map(accessibleName);
const detail = (agentId: string) => DEMO_AGENT_DETAILS.find((entry) => entry.agent.id === agentId)!;

async function click(element: HTMLElement | null | undefined) {
	if (!element) throw new Error('Element not found');
	await act(async () => element.click());
}

/**
 * Advances in small slices so each playback step can commit and schedule the
 * next; `slack` absorbs the up-to-one-slice latency each step adds.
 */
async function advance(ms: number, slack = 200, slice = 20) {
	for (let elapsed = 0; elapsed < ms + slack; elapsed += slice) {
		await act(async () => {
			await vi.advanceTimersByTimeAsync(slice);
		});
	}
}

/** Plays timers in 100ms slices until `done`, failing after `limit` ms of simulated time. */
async function until(done: () => boolean, limit = 120_000) {
	for (let elapsed = 0; !done(); elapsed += 100) {
		if (elapsed > limit) throw new Error(`Still waiting after ${limit}ms`);
		await act(async () => {
			await vi.advanceTimersByTimeAsync(100);
		});
	}
}

const runComplete = () => Boolean(container!.textContent?.includes('Run complete'));

describe('AgentsBuilder', () => {
	it('switches views from the sidebar and filters integrations to connected apps', async () => {
		await render(<AgentsBuilder data={AGENTS_BUILDER_DEMO} autoplayRun={false} />);
		expect(container!.querySelector('h1')?.textContent).toBe('Chat');

		await click(buttonNamed('Sources'));
		expect(headingNamed('Recommended')).toBeDefined();
		expect(byLabel('Connect Intercom')).not.toBeNull();

		const connectedFilter = [...container!.querySelectorAll<HTMLElement>('[role="option"]')].find(
			(option) => option.textContent?.trim() === 'Connected',
		);
		await click(connectedFilter);
		expect(headingNamed('Recommended')).toBeUndefined();
		expect(byLabel('Connect Intercom')).toBeNull();
		expect(byLabel('Manage GitHub')).not.toBeNull();
	}, 15_000);

	it('routes host-owned controls through onAction', async () => {
		const onAction = vi.fn<(action: AgentsBuilderAction) => void>();
		await render(<AgentsBuilder data={AGENTS_BUILDER_DEMO} autoplayRun={false} onAction={onAction} defaultView="skills" />);

		await click(byLabel('Open metric-definitions'));
		expect(onAction).toHaveBeenCalledWith({ type: 'open-skill', skillId: 'metric-definitions' });

		await click(buttonNamed('Schedules'));
		await click(byLabel('Pause Monthly forecast') ?? byLabel('Resume Monthly forecast'));
		expect(onAction).toHaveBeenCalledWith({ type: 'toggle-schedule', scheduleId: 'monthly-forecast', active: true });
	}, 15_000);

	it('opens the inbox, sends an agent-drafted reply and approves an agent action', async () => {
		const onAction = vi.fn<(action: AgentsBuilderAction) => void>();
		await render(<AgentsBuilder data={AGENTS_BUILDER_DEMO} autoplayRun={false} onAction={onAction} />);

		const inbox = [...container!.querySelectorAll<HTMLButtonElement>('nav button')].find((button) => button.textContent?.startsWith('Inbox'));
		expect(inbox?.textContent).toContain('2 need you');
		await click(inbox);
		expect([...container!.querySelectorAll('h1')].map((heading) => heading.textContent)).toContain('Inbox');

		const [maya, alert] = AGENTS_BUILDER_DEMO.inbox;
		expect(headingNamed(maya.contact.name)).toBeDefined();
		await click(buttonNamed('Send by SMS'));
		expect(onAction).toHaveBeenCalledWith({ type: 'send-reply', threadId: maya.id, text: maya.draft!.text, drafted: true });
		expect(byLabel(`Draft reply from Revenue Analyst`)).toBeNull();

		const alertRow = [...container!.querySelectorAll<HTMLButtonElement>('section[aria-label="Conversations"] button')].find((button) =>
			button.textContent?.includes(alert.contact.name),
		);
		await click(alertRow);
		await click(buttonNamed(alert.approval!.confirmLabel));
		expect(onAction).toHaveBeenCalledWith({ type: 'approve-thread-action', threadId: alert.id });
		expect(container!.textContent).toContain(alert.approval!.doneText);
	}, 15_000);

	it('plays a recommendation until the agent asks to connect a missing app, then continues without it', async () => {
		vi.useFakeTimers();
		await render(<AgentsBuilder data={AGENTS_BUILDER_DEMO} autoplayRun={false} />);
		const [recommendation] = AGENTS_BUILDER_DEMO.recommendations;

		await click(container!.querySelector<HTMLElement>(`[aria-label^="Explain last week"]`));
		expect(container!.textContent).toContain(recommendation.prompt);
		expect(byLabel('Stop')).not.toBeNull();

		const opening = recommendation.reply[0] as { text: string };
		await advance(CONVERSATION_TIMING.beforeReply + sayDuration(opening.text) + CONVERSATION_TIMING.afterSay);
		await advance(CONVERSATION_TIMING.stepWork * 2 + CONVERSATION_TIMING.afterSteps);
		const gap = recommendation.reply[2] as { text: string };
		await advance(sayDuration(gap.text) + CONVERSATION_TIMING.afterSay);

		const prompt = container!.querySelector('[data-slot="connect-prompt"]');
		expect(prompt?.getAttribute('data-status')).toBe('idle');

		await click(buttonNamed('Stripe and Snowflake only'));
		expect(prompt?.getAttribute('data-status')).toBe('skipped');
		await advance(CONVERSATION_TIMING.beforeReply + CONVERSATION_TIMING.sayMax + CONVERSATION_TIMING.afterSay);
		expect(container!.textContent).toContain('Stripe and Snowflake only, then.');
		expect(byLabel('Stop')).toBeNull();
	}, 15_000);

	it('names each agent row by its state and resumes a waiting agent at its approval card', async () => {
		const onAction = vi.fn<(action: AgentsBuilderAction) => void>();
		await render(<AgentsBuilder data={AGENTS_BUILDER_DEMO} onAction={onAction} />);

		expect(roster()).toEqual(
			expect.arrayContaining([
				'Revenue Analyst, waiting for your approval',
				'Churn Radar, running',
				'Data Quality Monitor, last run failed',
				'Schema Steward, waiting for your answer',
				'Metrics Librarian, new result',
				'Forecast Planner, queued',
			]),
		);

		// Autoplay is on, yet the agent opens settled with the decision focused rather than replaying.
		await click(buttonNamed('Revenue Analyst, waiting for your approval'));
		const card = byLabel(AGENTS_BUILDER_DEMO.run.approval!.title);
		expect(card).not.toBeNull();
		expect(document.activeElement).toBe(card);

		await click(buttonNamed(AGENTS_BUILDER_DEMO.run.approval!.skipLabel));
		expect(onAction).toHaveBeenCalledWith({ type: 'approve-run', agentId: 'revenue-analyst', approved: false });
		expect(roster()).toContain('Revenue Analyst');
	}, 15_000);

	it('groups the roster by project and keeps what needs you visible in a folded project', async () => {
		await render(<AgentsBuilder data={AGENTS_BUILDER_DEMO} />);
		const project = (name: string) =>
			[...container!.querySelectorAll<HTMLButtonElement>('nav button[aria-expanded]')].find((button) => accessibleName(button)?.startsWith(name))!;

		// Projects with something happening start open; a quiet one starts folded.
		expect(project('Revenue').getAttribute('aria-expanded')).toBe('true');
		expect(project('Governance').getAttribute('aria-expanded')).toBe('false');
		expect(roster()).not.toContain('Access Auditor');

		// Folded, the project still says how many of its agents wait on you.
		await click(project('Data platform'));
		expect(accessibleName(project('Data platform'))).toBe('Data platform, 2 need you');
		expect(roster()).not.toContain('Schema Steward, waiting for your answer');

		// Past the per-project limit, calm agents wait behind "Show N more".
		expect(roster()).not.toContain('Cohort Builder');
		await click(buttonNamed('Show 1 more'));
		expect(roster()).toContain('Cohort Builder');
	});

	it('hands an agent without a detail to the host and clears its unread result', async () => {
		const onAction = vi.fn<(action: AgentsBuilderAction) => void>();
		await render(<AgentsBuilder data={{ ...AGENTS_BUILDER_DEMO, agentDetails: undefined }} autoplayRun={false} onAction={onAction} />);

		await click(buttonNamed('Metrics Librarian, new result'));
		expect(onAction).toHaveBeenCalledWith({ type: 'open-agent', agentId: 'metrics-librarian' });
		expect(buttonNamed('Metrics Librarian')).toBeDefined();
	});

	it('opens a finished agent at its latest result without replaying it', async () => {
		const onAction = vi.fn<(action: AgentsBuilderAction) => void>();
		await render(<AgentsBuilder data={AGENTS_BUILDER_DEMO} onAction={onAction} />);

		await click(buttonNamed('Metrics Librarian, new result'));
		expect(onAction).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'open-agent' }));
		expect([...container!.querySelectorAll('h1')].map((heading) => heading.textContent)).toContain('Metrics Librarian');
		expect(container!.textContent).toContain('Run complete');
		expect(roster()).toContain('Metrics Librarian');
	});

	it('stops a failed run at its tool call and plays it through on retry', async () => {
		vi.useFakeTimers();
		const onAction = vi.fn<(action: AgentsBuilderAction) => void>();
		const { failure, steps } = detail('data-quality-monitor').run;
		await render(<AgentsBuilder data={AGENTS_BUILDER_DEMO} onAction={onAction} />);

		await click(buttonNamed('Data Quality Monitor, last run failed'));
		const stop = byLabel('Run failed');
		expect(stop?.textContent).toContain(failure!.message);
		expect(document.activeElement).toBe(stop);
		const failedCall = steps.find((step) => step.id === failure!.stepId)!;
		expect(container!.querySelector('[data-status="error"]')?.textContent).toContain(failedCall.label);
		// Calls after the failure never ran.
		expect(container!.textContent).not.toContain(steps.at(-1)!.label);

		await click(buttonNamed('Retry run'));
		expect(onAction).toHaveBeenCalledWith({ type: 'retry-run', agentId: 'data-quality-monitor' });
		expect(roster()).toContain('Data Quality Monitor, running');

		await until(runComplete);
		expect(byLabel('Run failed')).toBeNull();
		expect(roster()).toContain('Data Quality Monitor');
	}, 20_000);

	it('asks its question, then makes the follow-up calls for the chosen answers', async () => {
		vi.useFakeTimers();
		const onAction = vi.fn<(action: AgentsBuilderAction) => void>();
		const { question } = detail('schema-steward').run;
		await render(<AgentsBuilder data={AGENTS_BUILDER_DEMO} onAction={onAction} />);

		await click(buttonNamed('Schema Steward, waiting for your answer'));
		expect(document.activeElement).toBe(byLabel(question!.title));
		const option = (label: string) =>
			[...container!.querySelectorAll<HTMLButtonElement>('[role="radio"]')].find((radio) => radio.textContent?.includes(label));
		// One question at a time: Continue moves to the second, then submits both.
		await click(option('Move them to billing'));
		await click(buttonNamed('Continue'));
		expect(onAction).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'answer-run' }));
		await click(option('Yes, in this PR'));
		await click(buttonNamed('Continue'));
		expect(onAction).toHaveBeenCalledWith({
			type: 'answer-run',
			agentId: 'schema-steward',
			answers: { 'owner-schema': ['billing'], rls: ['same-pr'] },
		});
		expect(roster()).toContain('Schema Steward, running');

		await until(runComplete, 10_000);
		expect(container!.textContent).toContain(question!.steps.at(-1)!.label);
		expect(roster()).toContain('Schema Steward');
	}, 20_000);

	it('keeps a run going after you leave its agent and leaves the result unread', async () => {
		vi.useFakeTimers();
		await render(<AgentsBuilder data={AGENTS_BUILDER_DEMO} />);

		await click(buttonNamed('Churn Radar, running'));
		await advance(1_000, 0, 100);
		await click(buttonNamed('Chat'));
		await until(() => roster().includes('Churn Radar, new result'));

		// Back in the agent, the finished run is still there instead of a replay.
		await click(buttonNamed('Churn Radar, new result'));
		expect(container!.textContent).toContain('Run complete');
		expect(roster()).toContain('Churn Radar');
	}, 20_000);

	it('holds a queued run until it is started', async () => {
		vi.useFakeTimers();
		const onAction = vi.fn<(action: AgentsBuilderAction) => void>();
		await render(<AgentsBuilder data={AGENTS_BUILDER_DEMO} onAction={onAction} />);

		await click(buttonNamed('Forecast Planner, queued'));
		expect(container!.textContent).toContain('The October forecast starts at 09:30 UTC.');
		await advance(2_000, 0, 100);
		expect(roster()).toContain('Forecast Planner, queued');

		await click(buttonNamed('Run now'));
		expect(onAction).toHaveBeenCalledWith({ type: 'start-run', agentId: 'forecast-planner' });
		expect(roster()).toContain('Forecast Planner, running');
		await until(runComplete);
		expect(roster()).toContain('Forecast Planner');
	}, 20_000);
});

describe('visibleRoster', () => {
	const agent = (id: string, status?: 'approval' | 'failed' | 'running') => ({ id, name: id, status });
	const ids = (agents: { id: string }[]) => agents.map((entry) => entry.id);

	it('swaps the last calm rows for agents past the limit that need a person', () => {
		const agents = [agent('a', 'approval'), agent('b'), agent('c', 'running'), agent('d'), agent('e', 'failed'), agent('f')];
		expect(ids(visibleRoster(agents, 4))).toEqual(['a', 'b', 'c', 'e']);
	});

	it('never grows past the limit when every visible row already needs a person', () => {
		const agents = [agent('a', 'approval'), agent('b', 'failed'), agent('c', 'approval'), agent('d', 'failed')];
		expect(ids(visibleRoster(agents, 2))).toEqual(['a', 'b']);
	});
});

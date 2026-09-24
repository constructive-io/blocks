import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AGENTS_BUILDER_DEMO, AgentsBuilder, type AgentsBuilderAction } from '../src/components/agents-builder';
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
const buttonNamed = (name: string) =>
	[...container!.querySelectorAll<HTMLButtonElement>('button')].find((element) => element.textContent?.trim() === name);

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
});

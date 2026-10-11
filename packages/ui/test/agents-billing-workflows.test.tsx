import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AGENTS_BUILDER_DEMO, AgentsBuilder, type AgentsBuilderAction } from '../src/components/agents-builder';
import { BILLING_ACCOUNT_DEMO, BillingAccount, type BillingAccountAction } from '../src/components/billing-account';
import { BILLING_CONSOLE_DEMO, BillingConsole } from '../src/components/billing-console';
import { DEMO_NOW } from '../src/components/billing-kit';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.CSS ??= {} as typeof CSS;
CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`);
globalThis.PointerEvent ??= MouseEvent as unknown as typeof PointerEvent;

// jsdom supplies no layout observers; the production components remain real.
class NoopObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
	takeRecords() { return []; }
}

let root: Root | undefined;
let container: HTMLDivElement | undefined;

beforeEach(() => {
	vi.stubGlobal('ResizeObserver', NoopObserver);
	vi.stubGlobal('IntersectionObserver', NoopObserver);
	vi.stubGlobal('matchMedia', (query: string) => ({
		matches: query.includes('prefers-reduced-motion'), media: query, onchange: null,
		addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, dispatchEvent: () => false,
	}) as MediaQueryList);
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

function buttonNamed(name: string | RegExp, scope: ParentNode = document.body) {
	return [...scope.querySelectorAll<HTMLButtonElement>('button')].find((button) => {
		const label = button.getAttribute('aria-label') ?? button.textContent?.trim() ?? '';
		return typeof name === 'string' ? label === name : name.test(label);
	});
}

function radioNamed(group: string, name: string) {
	const scope = document.body.querySelector(`[role="radiogroup"][aria-label="${group}"]`);
	return [...(scope?.querySelectorAll<HTMLElement>('[role="radio"]') ?? [])].find((radio) =>
		radio.textContent?.startsWith(name),
	);
}

function fieldNamed(name: string, scope: ParentNode = document.body) {
	const label = [...scope.querySelectorAll<HTMLLabelElement>('label')].find((candidate) => candidate.textContent?.trim().startsWith(name));
	return label ? (label.htmlFor ? document.getElementById(label.htmlFor) : label.querySelector('input')) as HTMLInputElement : null;
}

function accessible(element: HTMLElement | undefined) {
	if (!element) return false;
	for (let ancestor: HTMLElement | null = element; ancestor; ancestor = ancestor.parentElement) {
		if (ancestor.inert || ancestor.hidden || ancestor.getAttribute('aria-hidden') === 'true') return false;
	}
	return true;
}

async function click(element: HTMLElement | null | undefined) {
	if (!element) throw new Error('Visible control not found');
	await act(async () => element.click());
}

async function type(input: HTMLInputElement | HTMLTextAreaElement | null, value: string) {
	if (!input) throw new Error('Input not found');
	await act(async () => {
		const prototype = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
		Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(input, value);
		input.dispatchEvent(new Event('input', { bubbles: true }));
	});
}

async function untilVisible(predicate: () => boolean) {
	for (let elapsed = 0; elapsed < 10_000 && !predicate(); elapsed += 40) {
		await act(async () => { await vi.advanceTimersByTimeAsync(40); });
	}
	expect(predicate()).toBe(true);
}

function artifact(name: string, actions: unknown) {
	const directory = process.env.BLOCKS_TEST_ARTIFACTS ?? '/tmp/blocks-test-audit/agents-billing-artifacts';
	mkdirSync(directory, { recursive: true });
	writeFileSync(join(directory, `${name}.html`), `<!doctype html><html><body>${document.body.innerHTML}</body></html>\n`);
	writeFileSync(join(directory, `${name}.json`), `${JSON.stringify(actions, null, 2)}\n`);
}

describe('agent run and billing operator workflows', () => {
	it('runs an agent to approval, exposes its evidence and canvas, and only writes after approval', async () => {
		vi.useFakeTimers();
		const onAction = vi.fn<(action: AgentsBuilderAction) => void>();
		await render(<AgentsBuilder data={AGENTS_BUILDER_DEMO} defaultView="agent" onAction={onAction} />);
		const run = () => document.body.querySelector<HTMLElement>('aside[aria-label="Current run"]')!;
		expect(buttonNamed('Stop run', run())).toBeDefined();
		expect(document.body.querySelector('section[aria-label="Tools"]')).toBeNull();
		await untilVisible(() => Boolean(buttonNamed('Post to #revenue', run())));
		expect(run().textContent).toContain('Waiting for your approval');
		expect(run().textContent).not.toContain('Run complete');
		expect(onAction).not.toHaveBeenCalled();
		const churn = [...run().querySelectorAll('tbody tr')].find((row) => row.textContent?.startsWith('Churn'));
		expect([...churn!.querySelectorAll('th, td')].map((cell) => cell.textContent?.trim())).toEqual(['Churn', '9', '−$83,150']);
		expect(run().textContent).toContain('Halcyon renewal');

		await click(radioNamed('Show', 'Canvas'));
		const tools = document.body.querySelector<HTMLElement>('section[aria-label="Tools"]')!;
		const toggle = buttonNamed('Tools', tools)!;
		expect(toggle.getAttribute('aria-expanded')).toBe('true');
		await click(toggle);
		expect(toggle.getAttribute('aria-expanded')).toBe('false');
		expect(accessible(buttonNamed('Show 2 more', tools))).toBe(false);
		await click(toggle);
		await click(buttonNamed('Show 2 more', tools));
		expect(tools.textContent).toContain('Slack History #revenue');
		expect(buttonNamed('Show less', tools)?.getAttribute('aria-expanded')).toBe('true');
		await click(buttonNamed('Edit', document.body.querySelector('section[aria-label="Agent"]')!));
		await click(buttonNamed('Set identity'));
		await click(buttonNamed('Share'));
		expect(onAction.mock.calls.map(([action]) => action)).toEqual([
			{ type: 'edit-instructions', agentId: 'revenue-analyst' },
			{ type: 'set-identity', agentId: 'revenue-analyst' },
			{ type: 'share-agent', agentId: 'revenue-analyst' },
		]);

		await click(radioNamed('Show', 'Run'));
		await click(buttonNamed('Post to #revenue', run()));
		expect(onAction).toHaveBeenCalledWith({ type: 'approve-run', agentId: 'revenue-analyst', approved: true });
		await untilVisible(() => run().textContent?.includes('Run complete') ?? false);
		expect(run().textContent).toContain('Posted to #revenue and filed under Revenue / Weekly.');
		await type(run().querySelector<HTMLTextAreaElement>('textarea[aria-label="Add a follow-up"]'), '  Explain the cohort change  ');
		await click(buttonNamed('Send', run()));
		expect(onAction).toHaveBeenLastCalledWith({ type: 'send-follow-up', surface: 'run', text: 'Explain the cohort change' });
		expect(run().querySelector<HTMLTextAreaElement>('textarea')?.value).toBe('');
		expect(run().textContent).toContain('Explain the cohort change');
		artifact('agent-approved', onAction.mock.calls);
	});

	it('stops the preview without approving writes and preserves the draft when approval is declined', async () => {
		vi.useFakeTimers();
		const onAction = vi.fn<(action: AgentsBuilderAction) => void>();
		await render(<AgentsBuilder data={AGENTS_BUILDER_DEMO} defaultView="agent" onAction={onAction} />);
		const run = document.body.querySelector<HTMLElement>('aside[aria-label="Current run"]')!;
		await click(buttonNamed('Stop run', run));
		expect(onAction).toHaveBeenCalledExactlyOnceWith({ type: 'stop-run' });
		expect(buttonNamed('Stop run', run)).toBeUndefined();
		expect(run.textContent).toContain('Waiting for your approval');
		await click(buttonNamed('Keep as draft', run));
		expect(onAction).toHaveBeenLastCalledWith({ type: 'approve-run', agentId: 'revenue-analyst', approved: false });
		expect(run.textContent).toContain('Kept as a draft in Revenue / Weekly.');
		expect(run.textContent).toContain('Run complete');
		expect(run.textContent).not.toContain('Write tools');
		artifact('agent-declined', onAction.mock.calls);
	});

	it('keeps a refused database hold unchanged, retries its audit note, and waits for release acceptance', async () => {
		const onHold = vi.fn().mockRejectedValueOnce(new Error('Operator permission changed.')).mockResolvedValue(undefined);
		let acceptRelease!: () => void;
		const onRelease = vi.fn(() => new Promise<void>((resolve) => { acceptRelease = resolve; }));
		await render(<BillingConsole data={BILLING_CONSOLE_DEMO} defaultView="standing" now={DEMO_NOW} onHoldDatabase={onHold} onReleaseDatabase={onRelease} />);
		const row = () => [...document.body.querySelectorAll('tbody tr')].find((candidate) => candidate.textContent?.includes('harbor-warehouse'))!;
		await click(buttonNamed('Hold', row()));
		const dialog = () => document.body.querySelector<HTMLElement>('[role="dialog"]')!;
		expect(dialog().textContent).toContain('Hold harbor-warehouse?');
		expect(buttonNamed('Place hold', dialog())?.disabled).toBe(true);
		await type(fieldNamed('Reason, for the audit trail', dialog()), '  Incident 731  ');
		await click(buttonNamed('Place hold', dialog()));
		expect(dialog().querySelector('[role="alert"]')?.textContent).toBe('Operator permission changed.');
		expect(row().textContent).toContain('Serving');
		expect(row().textContent).not.toContain('Incident 731');
		await click(buttonNamed('Place hold', dialog()));
		expect(onHold).toHaveBeenNthCalledWith(2, expect.objectContaining({ id: 'db-harbor', suspendedReason: null }), 'Incident 731');
		expect(row().textContent).toContain('Incident 731');
		expect(buttonNamed('Lift hold', row())).toBeDefined();
		await click(radioNamed('Standing', 'Admin holds'));
		expect([...document.body.querySelectorAll('tbody tr')].map((candidate) => candidate.textContent)).toHaveLength(2);
		expect(document.body.querySelector('tbody')?.textContent).not.toContain('kite-prod');
		await click(buttonNamed('Lift hold', row()));
		expect(buttonNamed('Releasing…', row())?.disabled).toBe(true);
		expect(row().textContent).toContain('Incident 731');
		expect(onRelease).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: 'db-harbor', note: 'Incident 731', suspendedReason: 'admin' }));
		await act(async () => acceptRelease());
		expect(document.body.querySelector('tbody')?.textContent).not.toContain('harbor-warehouse');
		await click(radioNamed('Standing', 'All'));
		expect(row().textContent).toContain('Serving');
		expect(row().textContent).not.toContain('Incident 731');
		artifact('database-hold-release', { holds: onHold.mock.calls, releases: onRelease.mock.calls });
	});

	it('filters operator customers and keeps a refused then accepted grant scoped to the selected customer', async () => {
		const onAction = vi.fn();
		const onGrant = vi.fn().mockRejectedValueOnce(new Error('Credit approval required.')).mockResolvedValue(undefined);
		await render(<BillingConsole data={BILLING_CONSOLE_DEMO} defaultView="customers" now={DEMO_NOW} onGrantCredits={onGrant} onAction={onAction} />);
		await click(radioNamed('Customer standing', 'Needs attention'));
		expect(buttonNamed('Open Northwind Labs')).toBeUndefined();
		expect(buttonNamed('Open Harbor Analytics')).toBeDefined();
		await click(radioNamed('Customer standing', 'All'));
		await type(fieldNamed('Search customers'), '  CUS_QNORTHWIND  ');
		expect(buttonNamed('Open Harbor Analytics')).toBeUndefined();
		await click(buttonNamed('Open Northwind Labs'));
		expect(onAction).toHaveBeenCalledExactlyOnceWith({ type: 'open-customer', customerId: 'cus-northwind' });
		const sheet = () => document.body.querySelector<HTMLElement>('[role="dialog"]')!;
		await click(buttonNamed('Grant', sheet()));
		expect(buttonNamed('Grant credits', sheet())?.disabled).toBe(true);
		await type(fieldNamed('Amount', sheet()), '1,250');
		await type(fieldNamed('Expires after', sheet()), '7');
		await type(fieldNamed('Reason (shown in the ledger)', sheet()), '  Incident 731 credit  ');
		await click(buttonNamed('Grant credits', sheet()));
		expect(sheet().querySelector('[role="alert"]')?.textContent).toBe('Credit approval required.');
		const credits = () => [...sheet().querySelectorAll('section')].find((section) => section.querySelector('h2')?.textContent === 'Credits');
		expect(credits()?.textContent).not.toContain('Incident 731 credit');
		await click(buttonNamed('Grant credits', sheet()));
		expect(onGrant).toHaveBeenNthCalledWith(2, { customerId: 'cus-northwind', meterSlug: 'universal', amount: 1250, creditType: 'permanent', expiresInDays: 7, reason: 'Incident 731 credit' });
		expect(credits()?.textContent).toContain('Incident 731 credit');
		expect(credits()?.textContent).toContain('1,250');
		await click(buttonNamed('Close', sheet()));
		await type(fieldNamed('Search customers'), 'ops@harbor.io');
		await click(buttonNamed('Open Harbor Analytics'));
		expect(sheet().textContent).toContain('Harbor Analytics');
		expect(sheet().textContent).not.toContain('Incident 731 credit');
		expect(sheet().textContent).toContain('card_declined');
		artifact('customer-grant-isolation', { actions: onAction.mock.calls, grants: onGrant.mock.calls });
	});

	it('traces an exhausted meter through its waterfall and ledger before switching billing accounts', async () => {
		const onAction = vi.fn<(action: BillingAccountAction) => void>();
		await render(<BillingAccount data={BILLING_ACCOUNT_DEMO} defaultView="usage" now={DEMO_NOW} onAction={onAction} />);
		const pool = buttonNamed(/^Messaging.*3 meters/)!;
		expect(pool.getAttribute('aria-expanded')).toBe('true');
		const children = document.getElementById(pool.getAttribute('aria-controls')!)!;
		expect(children.textContent).toContain('SMS');
		await click(pool);
		expect(children.hidden).toBe(true);
		await click(pool);
		expect(children.hidden).toBe(false);
		const sms = buttonNamed(/^SMS/, children)!;
		expect(sms.textContent).toContain('limit reached');
		expect(sms.textContent).toContain('drew 1.2K credits');
		await click(sms);
		const sheet = document.body.querySelector<HTMLElement>('[role="dialog"]')!;
		expect(sheet.textContent).toContain('2,000');
		expect(sheet.textContent).toContain('0 left');
		expect(sheet.textContent).toContain('5 credits from Messaging, then from Universal credits.');
		expect(sheet.textContent).toContain('Whole account · 1 hour');
		expect(sheet.textContent).toContain('500 requests');
		expect(sheet.textContent).toContain('Per member · 1 hour');
		expect(sheet.textContent).toContain('100 requests');
		await click(buttonNamed('Close', sheet));
		await click(buttonNamed('Activity'));
		await click(radioNamed('Entry type', 'Grants'));
		const activity = document.body.querySelector<HTMLElement>('section[aria-label="Activity"]')!;
		expect(activity.textContent).toContain('Goodwill after the Sep 12 incident');
		expect(activity.textContent).toContain('+10,000');
		expect(activity.textContent).not.toContain('Verification codes');
		await click(radioNamed('Entry type', 'Usage'));
		expect(activity.textContent).toContain('38 SMS past the allowance at 5 credits each');
		expect(activity.textContent).toContain('−190');
		expect(activity.textContent).not.toContain('Goodwill after the Sep 12 incident');
		await click(buttonNamed('Billing account: Northwind Labs'));
		const personal = [...document.body.querySelectorAll<HTMLElement>('[role="menuitem"]')].find((item) => item.textContent?.startsWith('Mira Sato'));
		await click(personal);
		expect(onAction).toHaveBeenCalledExactlyOnceWith({ type: 'switch-account', accountId: 'acct-personal' });
		artifact('usage-ledger-account-switch', onAction.mock.calls);
	});
});

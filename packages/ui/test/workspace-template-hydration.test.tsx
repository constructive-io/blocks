import * as React from 'react';
import { act } from 'react';
import { hydrateRoot, type Root } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AGENTS_BUILDER_DEMO, AgentsBuilder, type AgentsBuilderAction } from '../src/components/agents-builder';
import { BILLING_ACCOUNT_DEMO, BillingAccount, type PlanChangeRequest } from '../src/components/billing-account';
import { DEMO_NOW } from '../src/components/billing-kit';
import { DATA_ROOMS_DEMO, DataRooms, type DataRoomsCommand } from '../src/components/data-rooms';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.CSS ??= {} as typeof CSS;
CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`);
globalThis.PointerEvent ??= MouseEvent as unknown as typeof PointerEvent;

class NoopObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
	takeRecords() { return []; }
}

let root: Root | undefined;
let container: HTMLDivElement;
let diagnostics: unknown[][];
let recoveryErrors: unknown[];

beforeEach(() => {
	diagnostics = [];
	recoveryErrors = [];
	vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => diagnostics.push(args));
	vi.stubGlobal('ResizeObserver', NoopObserver);
	vi.stubGlobal('IntersectionObserver', NoopObserver);
	vi.stubGlobal('matchMedia', (query: string) => ({
		matches: false,
		media: query,
		addEventListener() {},
		removeEventListener() {},
		addListener() {},
		removeListener() {},
		onchange: null,
		dispatchEvent: () => false,
	}));
	Element.prototype.scrollTo ??= function scrollTo() {};
	Element.prototype.scrollIntoView ??= function scrollIntoView() {};
});

afterEach(async () => {
	await act(async () => root?.unmount());
	root = undefined;
	container?.remove();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
});

function serverMarkup(node: React.ReactNode) {
	const names = ['window', 'document', 'navigator'] as const;
	const descriptors = names.map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)] as const);
	try {
		for (const name of names) Object.defineProperty(globalThis, name, { configurable: true, value: undefined });
		return renderToString(node);
	} finally {
		for (const [name, descriptor] of descriptors) {
			if (descriptor) Object.defineProperty(globalThis, name, descriptor);
			else Reflect.deleteProperty(globalThis, name);
		}
	}
}

async function hydrate(node: React.ReactNode, inspectServer?: (server: HTMLDivElement) => void) {
	container = document.createElement('div');
	container.innerHTML = serverMarkup(node);
	document.body.appendChild(container);
	inspectServer?.(container);
	await act(async () => {
		root = hydrateRoot(container, node, { onRecoverableError: (error) => recoveryErrors.push(error) });
	});
}

function button(name: string | RegExp): HTMLButtonElement {
	const found = [...document.body.querySelectorAll('button')].find((element) => {
		const label = element.getAttribute('aria-label') ?? element.textContent?.trim() ?? '';
		return typeof name === 'string' ? label === name : name.test(label);
	});
	if (!found) throw new Error(`Missing button: ${name}`);
	return found;
}

async function click(element: HTMLElement) {
	await act(async () => element.click());
}

function field(label: string) {
	const found = [...container.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea')].find((element) =>
		element.getAttribute('aria-label') === label || [...element.labels ?? []].some((entry) => entry.textContent?.trim() === label),
	);
	if (!found) throw new Error(`Missing field: ${label}`);
	return found;
}

async function type(label: string, value: string) {
	const element = field(label);
	await act(async () => {
		const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
		Object.getOwnPropertyDescriptor(prototype, 'value')!.set!.call(element, value);
		element.dispatchEvent(new Event('input', { bubbles: true }));
	});
}

function expectCleanHydration() {
	expect(recoveryErrors).toEqual([]);
	expect(diagnostics).toEqual([]);
}

describe('workspace templates hydrate into usable host integrations', () => {
	it('hydrates an agent inbox and sends its draft once through the host', async () => {
		const onAction = vi.fn<(action: AgentsBuilderAction) => void>();
		const data = {
			...AGENTS_BUILDER_DEMO,
			inbox: [{
				...AGENTS_BUILDER_DEMO.inbox[0]!,
				id: 'hydrated-thread',
				draft: { ...AGENTS_BUILDER_DEMO.inbox[0]!.draft!, text: 'Please send the quarterly report.' },
			}],
		};
		await hydrate(<AgentsBuilder data={data} defaultView="inbox" autoplayRun={false} onAction={onAction} />);
		expect(onAction).not.toHaveBeenCalled();
		expect(button('Send by SMS')).toBeDefined();
		await click(button('Send by SMS'));
		expect(onAction.mock.calls).toEqual([[{
			type: 'send-reply', threadId: 'hydrated-thread', text: 'Please send the quarterly report.', drafted: true,
		}]]);
		expect(container.querySelector('[aria-label="Draft reply from Revenue Analyst"]')).toBeNull();
		expect(container.textContent).toContain('Please send the quarterly report.');
		expectCleanHydration();
	});

	it('hydrates billing with the server clock and schedules a plan change through the host', async () => {
		const onChangePlan = vi.fn<(request: PlanChangeRequest) => Promise<void>>().mockResolvedValue(undefined);
		await hydrate(<BillingAccount data={BILLING_ACCOUNT_DEMO} defaultView="plans" now={DEMO_NOW} locale="en-US" timeZone="UTC" onChangePlan={onChangePlan} />);
		expect(onChangePlan).not.toHaveBeenCalled();
		await click(button('Switch to Pro'));
		expect(document.body.querySelector('[role="dialog"]')?.textContent).toContain('7 databases in use; Pro allows 5.');
		await click(button('Schedule change'));
		expect(onChangePlan).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({
			timing: 'period_end', checkout: false, plan: expect.objectContaining({ name: 'pro' }),
		}));
		expect(container.textContent).toContain('Moving to Pro on Oct 1, 2026');
		expectCleanHydration();
	});

	it('hydrates an agreement gate and preserves a question draft until the host accepts it', async () => {
		const onCommand = vi.fn<(command: DataRoomsCommand) => Promise<void>>()
			.mockResolvedValueOnce(undefined)
			.mockRejectedValueOnce(new Error('The question service is unavailable.'))
			.mockResolvedValue(undefined);
		const node = <DataRooms data={{ ...DATA_ROOMS_DEMO, viewerId: 'person-owen' }} defaultView="room" defaultRoomId="room-atlas" defaultTab="documents" onCommand={onCommand} />;
		await hydrate(node, (server) => {
			expect(server.textContent).toContain('I have read and agree to these terms');
			expect(server.textContent).not.toContain('Audited accounts FY2025.pdf');
		});
		expect(onCommand).not.toHaveBeenCalled();
		expect(button('Accept and enter').disabled).toBe(true);
		const consent = [...container.querySelectorAll<HTMLLabelElement>('label')].find((label) => label.textContent?.trim() === 'I have read and agree to these terms');
		if (!consent) throw new Error('Missing agreement consent label');
		await click(consent);
		expect(button('Accept and enter').disabled).toBe(false);
		await click(button('Accept and enter'));
		expect(onCommand.mock.calls).toEqual([[{ type: 'accept-agreement', roomId: 'room-atlas', version: 2 }]]);
		expect(container.textContent).not.toContain('I have read and agree to these terms');
		expect(button('02 Financials')).toBeDefined();
		await click(button(/^Q&A/));
		await click(button('Ask a question'));
		await type('Question', 'When is the next diligence review?');
		await type('Details', 'Please confirm the date for our company.');
		await click(button('Send question'));
		expect(container.querySelector('[role="alert"]')?.textContent).toBe('The question service is unavailable.');
		expect(field('Question').value).toBe('When is the next diligence review?');
		expect(field('Details').value).toBe('Please confirm the date for our company.');
		await click(button('Send question'));
		expect(onCommand.mock.calls).toEqual([
			[{ type: 'accept-agreement', roomId: 'room-atlas', version: 2 }],
			[{ type: 'ask-question', roomId: 'room-atlas', title: 'When is the next diligence review?', body: 'Please confirm the date for our company.', documentId: undefined }],
			[{ type: 'ask-question', roomId: 'room-atlas', title: 'When is the next diligence review?', body: 'Please confirm the date for our company.', documentId: undefined }],
		]);
		expect(container.querySelector('form[aria-label="Ask a question"]')).toBeNull();
		await click(button(/When is the next diligence review\?/));
		expect([...container.querySelectorAll('h2')].some((heading) => heading.textContent === 'When is the next diligence review?')).toBe(true);
		expect(container.textContent).toContain('Please confirm the date for our company.');
		expectCleanHydration();
	});
});

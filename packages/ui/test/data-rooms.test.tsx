import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	answerFromScript,
	DATA_ROOMS_DEMO,
	DataRooms,
	type DataRoomsAction,
	type DataRoomsCommand,
	type DataRoomsProps,
} from '../src/components/data-rooms';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// React 19.3's ViewTransition names host nodes with CSS.escape, which jsdom lacks.
globalThis.CSS ??= {} as typeof CSS;
CSS.escape ??= (value: string) => value.replace(/[^\w-]/g, (char) => `\\${char}`);
// Base UI dispatches PointerEvents, which jsdom does not implement.
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
});

afterEach(() => {
	act(() => root?.unmount());
	container?.remove();
	root = undefined;
	vi.unstubAllGlobals();
});

async function render(props: Partial<DataRoomsProps>) {
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
	await act(async () => root!.render(<DataRooms data={DATA_ROOMS_DEMO} {...props} />));
}

const text = () => document.body.textContent ?? '';
const buttonNamed = (name: string | RegExp) =>
	[...document.body.querySelectorAll<HTMLButtonElement>('button')].find((element) => {
		const label = element.getAttribute('aria-label') ?? element.textContent?.trim() ?? '';
		return typeof name === 'string' ? label === name || element.textContent?.trim() === name : name.test(label);
	});

async function click(element: Element | null | undefined) {
	if (!element) throw new Error('Element not found');
	await act(async () => (element as HTMLElement).click());
}

async function type(input: HTMLInputElement | null, value: string) {
	if (!input) throw new Error('Input not found');
	await act(async () => {
		Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
		input.dispatchEvent(new Event('input', { bubbles: true }));
	});
}

async function press(element: Element | null, key: string) {
	if (!element) throw new Error('Element not found');
	await act(async () => element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })));
}

const room = (tab: DataRoomsProps['defaultTab'] = 'documents'): Partial<DataRoomsProps> => ({ defaultView: 'room', defaultRoomId: 'room-atlas', defaultTab: tab });
const dialog = () => document.body.querySelector('[role="dialog"]');

describe('DataRooms', () => {
	it('invites through the host, keeps the dialog open when refused, and shows the new member once saved', async () => {
		const onCommand = vi
			.fn<(command: DataRoomsCommand) => Promise<void>>()
			.mockRejectedValueOnce(new Error('The invite service is unavailable.'))
			.mockResolvedValue(undefined);
		await render({ ...room('people'), onCommand });
		expect(text()).not.toContain('Hana Kim');

		await click(buttonNamed('Invite'));
		const input = dialog()?.querySelector<HTMLInputElement>('input[inputmode="email"]') ?? null;
		await type(input, 'hana@northwind.co');
		await press(input, 'Enter');
		await click(buttonNamed('Send invite'));
		expect(onCommand).toHaveBeenLastCalledWith(expect.objectContaining({ type: 'invite', roomId: 'room-atlas', invites: [expect.objectContaining({ email: 'hana@northwind.co' })] }));
		expect(dialog()?.querySelector('[role="alert"]')?.textContent).toBe('The invite service is unavailable.');

		await click(buttonNamed('Send invite'));
		expect(dialog()).toBeNull();
		expect(text()).toContain('Hana Kim');
	});

	it('shows a share-only guest nothing outside their folder', async () => {
		await render({ ...room('documents'), defaultPreviewAs: 'person-kai' });
		expect(text()).toContain('Previewing as Kai Moreno');
		expect(text()).not.toContain('Audited accounts FY2025.pdf');
		expect(text()).not.toContain('Share purchase agreement');
		expect(buttonNamed('Invite')).toBeUndefined();
	});

	it('hides downloads on view-only documents and watermarks the reader', async () => {
		const onAction = vi.fn<(action: DataRoomsAction) => void>();
		await render({ ...room('documents'), defaultPreviewAs: 'person-dana', onAction });
		await click(buttonNamed('02 Financials'));
		await click(buttonNamed('Model'));
		await click([...document.body.querySelectorAll('button')].find((element) => element.textContent?.includes('Valuation model v7.xlsx')));
		expect(onAction).toHaveBeenCalledWith({ type: 'view-document', documentId: 'doc-valuation-model' });
		const sheet = dialog();
		expect(sheet?.textContent).toContain('Watermarked for Dana Chen');
		expect([...(sheet?.querySelectorAll('button') ?? [])].some((element) => element.textContent?.trim() === 'Download')).toBe(false);
	});

	it('asks for the new agreement before entering and records the acceptance through the host', async () => {
		const onCommand = vi.fn<(command: DataRoomsCommand) => Promise<void>>().mockResolvedValue(undefined);
		await render({ ...room('documents'), data: { ...DATA_ROOMS_DEMO, viewerId: 'person-owen' }, onCommand });
		expect(text()).toContain('The agreement changed since you accepted version 1');
		expect(buttonNamed('Accept and enter')?.disabled).toBe(true);

		await click(document.body.querySelector('[role="checkbox"]'));
		await click(buttonNamed('Accept and enter'));
		expect(onCommand).toHaveBeenCalledWith({ type: 'accept-agreement', roomId: 'room-atlas', version: 2 });
		expect(text()).not.toContain('I have read and agree');
		expect(buttonNamed('02 Financials')).toBeDefined();
	});

	it('previews a room manager with their controls visible but locked', async () => {
		const onCommand = vi.fn();
		await render({ ...room('people'), defaultPreviewAs: 'person-grace', onCommand });
		const invite = buttonNamed('Invite');
		expect(invite).toBeDefined();
		expect(invite?.disabled).toBe(true);
		expect(onCommand).not.toHaveBeenCalled();
	});

	it('explains inherited access in the trace', async () => {
		await render(room('people'));
		await click([...document.body.querySelectorAll('button')].find((element) => element.textContent?.includes('Elliot Brandt')));
		expect(dialog()?.textContent).toContain('Owner of Northwind Holdings, carried through Fund II');
	});
});

describe('room assistant answers', () => {
	it('only cites documents the reader can open, and says nothing otherwise', () => {
		const ask = (viewerId: string, prompt: string) => answerFromScript(DATA_ROOMS_DEMO, { roomId: 'room-atlas', viewerId, prompt });

		const maya = ask('person-maya', 'How did revenue grow in FY2025?');
		expect(maya.citations.map((citation) => citation.documentId)).toEqual(['doc-audited', 'doc-revenue-bridge', 'doc-management-accounts']);

		const owen = ask('person-owen', 'Can Halvorsen terminate on a change of control?');
		expect(owen.citations).toEqual([]);
		expect(owen.text).toBe(DATA_ROOMS_DEMO.assistant!.fallback);

		const kai = ask('person-kai', 'What EBITDA does the valuation model assume?');
		expect(kai.citations.map((citation) => citation.documentId)).toEqual(['doc-model-assumptions', 'doc-valuation-model']);
	});
});

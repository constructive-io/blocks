/* @vitest-environment jsdom */
//
// The map is an optional peer. When `leaflet` cannot be imported (not installed, or
// the import fails), the geometry editor must not fail as a whole: it says the map is
// not available and edits the shape as GeoJSON text, written through the grid's write
// path. Exercised through <Sheets> over the torture schema with the leaflet import
// forced to fail.

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SheetsConfig } from '../../context/sheets-context';
import { SheetsProvider } from '../../context/sheets-provider';
import { Sheets } from '../../grid/sheets';
import type { RecordedMutation } from '../../testing/model-backend';
import { createTortureBackend } from '../../adapter/__tests__/torture-backend';

vi.mock('leaflet', () => {
	throw new Error("Cannot find module 'leaflet'");
});
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() }));
vi.mock('@constructive-io/ui/toast', () => ({ toast }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function settle(ms = 20) {
	await act(async () => {
		await new Promise((resolve) => setTimeout(resolve, ms));
	});
}

async function waitUntil<T>(read: () => T | null | undefined | false, what: string): Promise<T> {
	for (let attempt = 0; attempt < 150; attempt++) {
		const found = read();
		if (found) return found;
		await settle();
	}
	throw new Error(`Timed out waiting for ${what}`);
}

async function fire(element: Element, type: string) {
	await act(async () => {
		element.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
	});
}

function writtenValues(mutation: RecordedMutation | undefined): Record<string, unknown> {
	const input = (mutation?.variables as { input?: Record<string, unknown> } | undefined)?.input ?? {};
	const nested = Object.values(input).find((value) => value && typeof value === 'object' && !Array.isArray(value));
	return (nested ?? {}) as Record<string, unknown>;
}

describe('geometry editor without the map', () => {
	let root: Root;
	let container: HTMLDivElement;
	let queryClient: QueryClient;

	beforeEach(() => {
		vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(20000);
		vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(800);
		vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 20000, 33));
		vi.spyOn(console, 'warn').mockImplementation(() => {});
		queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
		container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
	});

	afterEach(async () => {
		await act(async () => root.unmount());
		queryClient.clear();
		container.remove();
		vi.restoreAllMocks();
	});

	it('falls back to GeoJSON text with a note and writes the edited point', async () => {
		const backend = createTortureBackend({ server: 'v2' });
		const config: SheetsConfig = {
			endpoint: 'https://data.local/graphql',
			auth: { mode: 'embedded', getToken: () => null, getIdentityKey: () => 'user-1' },
			execute: backend.execute,
			queryClient,
		};
		await act(async () =>
			root.render(
				<div style={{ height: 800, width: 20000 }}>
					<SheetsProvider config={config}>
						<Sheets tableName='StructuredKind' />
					</SheetsProvider>
				</div>,
			),
		);
		await waitUntil(() => container.querySelector('[id^="sheets-cell-0-"]'), 'rows');
		const keys = Array.from(container.querySelectorAll<HTMLElement>('[data-part-id="sheets-header-cell"]')).map((header) => header.dataset.colKey);
		const pin = container.querySelector(`#sheets-cell-0-${keys.indexOf('pin')}`)!;

		await fire(pin, 'dblclick');
		const note = await waitUntil(
			() => Array.from(document.querySelectorAll('[role="status"]')).find((entry) => entry.textContent?.includes('The map is not available here')),
			'the fallback note',
		);
		expect(note.textContent).toBe('The map is not available here. Edit the shape as GeoJSON.');
		expect(document.body.textContent).not.toContain('Editor failed');

		const text = document.querySelector<HTMLTextAreaElement>('#geometry-json')!;
		expect(JSON.parse(text.value)).toEqual({ type: 'Point', coordinates: [-122.4194, 37.7749] });
		const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
		await act(async () => {
			setter?.call(text, '{ "type": "Point", "coordinates": [2.3522, 48.8566] }');
			text.dispatchEvent(new Event('input', { bubbles: true }));
		});
		const save = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.trim() === 'Save')!;
		await fire(save, 'click');

		const update = await waitUntil(() => backend.mutations.find((mutation) => mutation.op === 'update'), 'the update');
		expect(writtenValues(update)).toEqual({ pin: { type: 'Point', coordinates: [2.3522, 48.8566] } });
	});
});

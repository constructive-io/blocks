/* @vitest-environment jsdom */
//
// The map (Leaflet) loads on first use. While it loads, the geometry editor must already
// show everything else at its final size: the search row, the location line and a
// placeholder of the map's own height. Before, the whole map picker waited behind a
// shorter placeholder, so the editor grew by about 112px when the map arrived.
// Exercised through <Sheets> over the torture schema with the Leaflet import held open.

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SheetsConfig } from '../../context/sheets-context';
import { SheetsProvider } from '../../context/sheets-provider';
import { Sheets } from '../../grid/sheets';
import { createTortureBackend } from '../../adapter/__tests__/torture-backend';

// The map's import never finishes in this file, so the editor stays in its loading state.
vi.mock('leaflet', () => new Promise(() => {}));

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

describe('geometry editor while the map loads', () => {
	let root: Root;
	let container: HTMLDivElement;
	let queryClient: QueryClient;

	beforeEach(() => {
		vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(20000);
		vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(800);
		vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 20000, 33));
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

	async function openPin(map?: SheetsConfig['map']): Promise<HTMLElement | null> {
		const backend = createTortureBackend({ server: 'v2' });
		const config: SheetsConfig = {
			endpoint: 'https://data.local/graphql',
			auth: { mode: 'embedded', getToken: () => null, getIdentityKey: () => 'user-1' },
			execute: backend.execute,
			queryClient,
			map,
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
		await act(async () => {
			container.querySelector(`#sheets-cell-0-${keys.indexOf('pin')}`)!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});
		return document.querySelector<HTMLElement>('[data-slot="geometry-editor"]');
	}

	it('with place search turned off, the map has no search box', async () => {
		const editor = await openPin({ placeSearch: 'off' });
		expect(editor).not.toBeNull();
		expect(editor!.querySelector('input[placeholder^="Search for a location"]')).toBeNull();
		expect(Array.from(editor!.querySelectorAll<HTMLElement>('[style*="height"]')).map((element) => element.style.height)).toContain('280px');
	});

	it('with map tiles turned off, the shape is edited as GeoJSON text', async () => {
		const editor = await openPin({ tiles: 'off' });
		expect(editor).not.toBeNull();
		expect(editor!.querySelector('[data-slot="tabs-list"]')).toBeNull();
		expect(JSON.parse(editor!.querySelector<HTMLTextAreaElement>('#geometry-json')!.value)).toEqual({ type: 'Point', coordinates: [-122.4194, 37.7749] });
	});

	it('shows the search row, the location and a map-height placeholder before Leaflet arrives', async () => {
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
		await act(async () => {
			container.querySelector(`#sheets-cell-0-${keys.indexOf('pin')}`)!.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});

		// The editor's first frame already holds the search row: nothing waits but the map.
		const editor = document.querySelector<HTMLElement>('[data-slot="geometry-editor"]');
		expect(editor).not.toBeNull();
		expect(editor!.querySelector('input[placeholder^="Search for a location"]')).not.toBeNull();
		expect(editor!.textContent).toContain('Latitude: 37.774900, Longitude: -122.419400');
		expect(editor!.querySelector('.leaflet-container')).toBeNull();
		const placeholders = Array.from(editor!.querySelectorAll<HTMLElement>('[style*="height"]')).map((element) => element.style.height);
		expect(placeholders).toContain('280px');
	});
});

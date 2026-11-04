/* @vitest-environment jsdom */
// A file id the storage endpoint can't sign stays cached as unresolved, so a
// virtualized cell remounting during scroll doesn't send the lookup again.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMediaDownloadUrls = vi.hoisted(() => vi.fn(async () => new Map<string, string>()));
vi.mock('../../context/sheets-upload-presigned', () => ({ fetchMediaDownloadUrls }));

import { SheetsContext, type SheetsContextValue } from '../../context/sheets-context';
import { useSheetsMediaUrl } from '../use-sheets-media-url';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const CONTEXT = {
	storage: { endpoint: 'https://storage.example.com/graphql', execute: vi.fn() },
	scopeKey: { databaseId: 'db-1', endpoint: '', identityKey: 'user-1' },
} as unknown as SheetsContextValue;

function Cell() {
	const { url } = useSheetsMediaUrl({ id: 'file-without-url', key: 'k' });
	return <span>{url ?? 'none'}</span>;
}

describe('useSheetsMediaUrl', () => {
	let container: HTMLDivElement;
	let root: Root;
	let client: QueryClient;

	beforeEach(() => {
		container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
		client = new QueryClient();
	});
	afterEach(async () => {
		await act(async () => root.unmount());
		client.clear();
		document.body.innerHTML = '';
		fetchMediaDownloadUrls.mockClear();
	});

	async function render(mounted: boolean) {
		await act(async () => {
			root.render(
				<QueryClientProvider client={client}>
					<SheetsContext.Provider value={CONTEXT}>{mounted ? <Cell /> : null}</SheetsContext.Provider>
				</QueryClientProvider>,
			);
		});
	}

	it('does not look up an unresolved file again when its cell remounts', async () => {
		await render(true);
		expect(fetchMediaDownloadUrls).toHaveBeenCalledOnce();
		expect(container.textContent).toBe('none');

		await render(false);
		await render(true);
		expect(fetchMediaDownloadUrls).toHaveBeenCalledOnce();
	});
});

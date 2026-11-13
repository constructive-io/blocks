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
		fetchMediaDownloadUrls.mockReset();
		fetchMediaDownloadUrls.mockImplementation(async () => new Map<string, string>());
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

	it('looks a just-uploaded file up again on a short backoff, so its preview appears once the upload is confirmed', async () => {
		vi.useFakeTimers();
		try {
			// The storage service has not confirmed the upload yet: no URL on the first two lookups.
			fetchMediaDownloadUrls
				.mockImplementationOnce(async () => new Map())
				.mockImplementationOnce(async () => new Map())
				.mockImplementationOnce(async () => new Map([['file-without-url', 'https://cdn.example.com/signed']]));
			await render(true);
			expect(container.textContent).toBe('none');
			await act(async () => vi.advanceTimersByTimeAsync(2_000));
			expect(fetchMediaDownloadUrls).toHaveBeenCalledTimes(2);
			expect(container.textContent).toBe('none');
			await act(async () => vi.advanceTimersByTimeAsync(4_000));
			expect(fetchMediaDownloadUrls).toHaveBeenCalledTimes(3);
			// Let the resolved lookup render.
			await act(async () => vi.advanceTimersByTimeAsync(50));
			expect(container.textContent).toBe('https://cdn.example.com/signed');
		} finally {
			vi.useRealTimers();
		}
	});

	it('stops looking up a file that never gets a URL after a bounded number of tries', async () => {
		vi.useFakeTimers();
		try {
			await render(true);
			await act(async () => vi.advanceTimersByTimeAsync(5 * 60_000));
			// The first lookup and five retries (2, 4, 8, 16 and 30 seconds), then nothing more.
			expect(fetchMediaDownloadUrls).toHaveBeenCalledTimes(6);
			await act(async () => vi.advanceTimersByTimeAsync(10 * 60_000));
			expect(fetchMediaDownloadUrls).toHaveBeenCalledTimes(6);
		} finally {
			vi.useRealTimers();
		}
	});

	it('does not look up an unresolved file again when its cell remounts', async () => {
		await render(true);
		expect(fetchMediaDownloadUrls).toHaveBeenCalledOnce();
		expect(container.textContent).toBe('none');

		await render(false);
		await render(true);
		expect(fetchMediaDownloadUrls).toHaveBeenCalledOnce();
	});
});

/* @vitest-environment jsdom */
//
// A host transport (`SheetsConfig.transport`) carries every request the grid
// makes: the data and storage GraphQL through `transport.fetch`, the file bytes
// through `transport.put`. A desktop host uses it to send them from a process
// that browser CORS does not apply to. The grid never falls back to the window's
// own fetch or XMLHttpRequest, and Sheets keeps its own handling of what comes
// back (the bearer token, an expired upload URL, a lost session).
//
// Ways it can fail, each covered below:
//   1. a request bypasses the transport (window fetch or XHR is used);
//   2. the token or the endpoint is lost on the way (wrong host, no bearer);
//   3. the PUT gets other headers or bytes than the upload payload names;
//   4. an expired URL answered through `transport.put` is not renewed.
// A 401 and a failed host PUT are covered with `createSheetsExecute` and
// `createSheetsUpload` in `context/sheets-execute.test.ts`.

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SheetsConfig, SheetsTransport } from '../../context/sheets-context';
import { responseErrorsOf } from '../../context/sheets-execute';
import { SheetsProvider } from '../../context/sheets-provider';
import { Sheets } from '../../grid/sheets';
import { createUploadBackends, type UploadBackends } from './upload-backends';

vi.mock('@constructive-io/ui/toast', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() } }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const D2 = '00000000-0000-4000-8000-0000000000d2';
const DATA = 'https://data.test/graphql';
const STORAGE = 'https://storage.test/graphql';
const EXPIRED = '<Error><Code>AccessDenied</Code><Message>Request has expired</Message></Error>';

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

interface HostRequest {
	url: string;
	authorization: string | undefined;
}

interface HostPut {
	url: string;
	headers: Record<string, string>;
	body: Blob;
}

/** A host transport over the fake APIs: GraphQL answered like the server would, each PUT answered by `answerPut`. */
function hostTransport(backends: UploadBackends, answerPut: (index: number) => { status: number; body: string }) {
	const requests: HostRequest[] = [];
	const puts: HostPut[] = [];
	const transport: SheetsTransport = {
		fetch: async (url, init) => {
			requests.push({ url, authorization: init.headers.Authorization });
			const api = url === DATA ? backends.data : url === STORAGE ? backends.storage : null;
			if (!api) return new Response('no such API', { status: 404 });
			const { query, variables } = JSON.parse(init.body) as { query: string; variables?: Record<string, unknown> };
			try {
				return Response.json({ data: await api.execute(query, variables) });
			} catch (error) {
				return Response.json({ data: null, errors: responseErrorsOf(error) ?? [{ message: String((error as Error).message) }] });
			}
		},
		put: async (url, body, options) => {
			puts.push({ url, headers: options.headers, body });
			const answer = answerPut(puts.length - 1);
			if (answer.status < 300) options.onProgress?.({ loaded: body.size, total: body.size, percentage: 100 });
			return answer;
		},
	};
	return { transport, requests, puts };
}

describe('Sheets over a host transport', () => {
	let root: Root;
	let container: HTMLDivElement;
	let queryClient: QueryClient;
	let backends: UploadBackends;
	const windowFetch = vi.fn(() => Promise.reject(new Error('the window fetch was used')));
	const windowXhr = vi.fn(() => {
		throw new Error('the window XMLHttpRequest was used');
	});

	beforeEach(() => {
		vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(20000);
		vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(800);
		vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 20000, 33));
		Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: () => 'blob:preview' });
		Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: () => {} });
		vi.stubGlobal('fetch', windowFetch);
		vi.stubGlobal('XMLHttpRequest', windowXhr);
		queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } } });
		container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
	});

	afterEach(async () => {
		await act(async () => root.unmount());
		queryClient.clear();
		container.remove();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		vi.clearAllMocks();
	});

	async function uploadAvatar(answerPut: (index: number) => { status: number; body: string }) {
		backends = createUploadBackends();
		const host = hostTransport(backends, answerPut);
		const config: SheetsConfig = {
			endpoint: DATA,
			auth: { mode: 'embedded', getToken: () => 'token-1', getIdentityKey: () => 'user-1' },
			storage: { endpoint: STORAGE },
			upload: { processing: { initialDelayMs: 10, maxDelayMs: 20, timeoutMs: 2_000 } },
			transport: host.transport,
			queryClient,
		};
		await act(async () =>
			root.render(
				<div style={{ height: 800, width: 20000 }}>
					<SheetsProvider config={config}>
						<Sheets tableName='DomainKind' />
					</SheetsProvider>
				</div>,
			),
		);
		await waitUntil(() => container.querySelector('[id^="sheets-cell-1-"]'), 'the rows');

		const keys = Array.from(container.querySelectorAll<HTMLElement>('[data-part-id="sheets-header-cell"]')).map((header) => header.dataset.colKey ?? '');
		const avatar = container.querySelector<HTMLElement>(`#sheets-cell-1-${keys.indexOf('avatar')}`)!;
		await act(async () => avatar.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, cancelable: true })));
		const editor = await waitUntil(() => document.querySelector<HTMLElement>('[data-slot="image-editor"]'), 'the image editor');
		await waitUntil(() => editor.querySelector('[data-upload-state="ready"]'), 'the editor ready to upload');

		const file = new File(['png-bytes'], 'cat.png', { type: 'image/png' });
		const input = editor.querySelector<HTMLInputElement>('input[type="file"]')!;
		Object.defineProperty(input, 'files', { configurable: true, value: [file] });
		await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));
		await act(async () => {
			editor.querySelector('[data-slot="file-entry"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true, bubbles: true }));
		});
		await waitUntil(() => backends.updates().length === 1, 'the cell write');
		return { ...host, file };
	}

	it('sends the GraphQL and the bytes through the host, never through the window', async () => {
		const { requests, puts, file } = await uploadAvatar(() => ({ status: 200, body: '' }));

		expect(windowFetch).not.toHaveBeenCalled();
		expect(windowXhr).not.toHaveBeenCalled();
		expect(new Set(requests.map((request) => request.url))).toEqual(new Set([DATA, STORAGE]));
		expect(requests.every((request) => request.authorization === 'Bearer token-1')).toBe(true);

		const payload = backends.uploadPayloads[0]!;
		expect(puts).toEqual([{ url: payload.uploadUrl, headers: payload.uploadHeaders, body: file }]);
		expect(backends.updates()[0]!.variables).toEqual({ input: { id: D2, domainKindPatch: { avatar: payload.file } } });
	});

	it('renews an upload URL that the host says has expired, once', async () => {
		const { puts } = await uploadAvatar((index) => (index === 0 ? { status: 403, body: EXPIRED } : { status: 200, body: '' }));

		expect(backends.uploadInputs).toHaveLength(2);
		const renewed = backends.uploadPayloads[1]!;
		expect(puts.map((put) => put.url)).toEqual([backends.uploadPayloads[0]!.uploadUrl, renewed.uploadUrl]);
		expect(backends.updates()[0]!.variables).toEqual({ input: { id: D2, domainKindPatch: { avatar: renewed.file } } });
	});
});

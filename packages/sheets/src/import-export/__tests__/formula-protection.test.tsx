/* @vitest-environment jsdom */
//
// CSV formula protection, opt-in, on every export path: the grid handle
// (`SheetsHandle.exportCsv`), "Export selected" in the toolbar, and "Export
// view"; the last two follow the host's `csvExport.protectFormulas`. Driven through the public surface over the captured
// torture schema; assertions are on the files the browser saves.
//
// Failure modes this guards against:
// - a text value that starts with =, +, -, @, a tab or a carriage return is
//   written as is when protection is on (a spreadsheet would run it);
// - a number stored as a number (a negative integer, a negative big or exact
//   decimal sent as a string) gets an apostrophe and stops being a number;
// - the apostrophe breaks the CSV quoting of a cell that also holds a comma, a
//   quote or a line break, or a leading tab or carriage return is lost;
// - a linked record's label is left unprotected;
// - protection changes a file when it is off (the default).
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient } from '@tanstack/react-query';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTortureBackend, type TortureBackend } from '../../adapter/__tests__/torture-backend';
import { SheetsProvider } from '../../context/sheets-provider';
import { Sheets } from '../../grid/sheets';
import type { SheetsHandle } from '../../grid/sheets.types';
import { readDelimitedTable } from '../delimited-text';

vi.mock('@constructive-io/ui/toast', () => ({
	toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
vi.setConfig({ testTimeout: 30_000 });

let root: Root;
let container: HTMLDivElement;
let queryClient: QueryClient;
let blobs: Map<string, Blob>;
let downloads: { name: string; blob: Blob }[];

beforeEach(() => {
	queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
	blobs = new Map();
	downloads = [];
	let next = 0;
	Object.defineProperty(URL, 'createObjectURL', {
		configurable: true,
		writable: true,
		value: (blob: Blob) => {
			next += 1;
			const url = `blob:formula-${next}`;
			blobs.set(url, blob);
			return url;
		},
	});
	Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, writable: true, value: () => {} });
	vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
		downloads.push({ name: this.download, blob: blobs.get(this.href)! });
	});
	vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(4000);
	vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(900);
	vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 4000, 33));
});

afterEach(async () => {
	await act(async () => root.unmount());
	queryClient.clear();
	container.remove();
	vi.restoreAllMocks();
});

// The row checkbox (Base UI) creates a PointerEvent, which jsdom lacks; MouseEvent has every field it reads.
const originalPointerEvent = window.PointerEvent;
beforeAll(() => {
	Object.defineProperty(window, 'PointerEvent', { configurable: true, writable: true, value: originalPointerEvent ?? MouseEvent });
});
afterAll(() => {
	if (originalPointerEvent) Object.defineProperty(window, 'PointerEvent', { configurable: true, writable: true, value: originalPointerEvent });
	else delete (window as unknown as Record<string, unknown>).PointerEvent;
});

async function waitUntil<T>(read: () => T | null | undefined | false, what: string): Promise<T> {
	for (let attempt = 0; attempt < 200; attempt++) {
		const found = read();
		if (found) return found;
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 20));
		});
	}
	throw new Error(`Timed out waiting for ${what}`);
}

async function click(element: HTMLElement) {
	await act(async () => element.click());
}

async function fileText(blob: Blob): Promise<string> {
	const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as ArrayBuffer);
		reader.onerror = () => reject(reader.error);
		reader.readAsArrayBuffer(blob);
	});
	return new TextDecoder('utf-8', { ignoreBOM: true }).decode(buffer);
}

const DANGEROUS = {
	id: '00000000-0000-4000-8000-0000000000f1',
	label: '=1+1',
	textValue: '+cmd',
	citextValue: '@user',
	varcharValue: '-text',
	integerValue: -5,
	bigintValue: '-9007199254740993',
	numericUnbounded: '-12.5',
	realValue: -1.5,
};

const QUOTED = {
	id: '00000000-0000-4000-8000-0000000000f2',
	label: '\tTabbed',
	textValue: '\rReturn',
	citextValue: '=HYPERLINK("http://x","y")',
	varcharValue: '=1,2',
	integerValue: 7,
	bigintValue: '12',
	numericUnbounded: '1.5',
	realValue: 2,
};

const MULTILINE = {
	id: '00000000-0000-4000-8000-0000000000f3',
	label: 'safe',
	textValue: '=multi\nline',
	citextValue: 'plain',
	varcharValue: 'a-b',
	integerValue: 0,
	bigintValue: '-1',
	numericUnbounded: '0',
	realValue: -0.25,
};

const COLUMNS = ['label', 'textValue', 'citextValue', 'varcharValue', 'integerValue', 'bigintValue', 'numericUnbounded', 'realValue'];

function seed(backend: TortureBackend) {
	backend.rows.ScalarKind = [DANGEROUS, QUOTED, MULTILINE].map((row) => ({ ...backend.rows.ScalarKind![0], ...row }));
	const project = backend.rows.Project!.find((row) => row.id === 1)!;
	project.name = '=Evil';
}

async function mountSheets(tableName: string, csvExport?: { protectFormulas?: boolean }) {
	const backend = createTortureBackend({ server: 'v2' });
	seed(backend);
	const handle: { current: SheetsHandle | null } = { current: null };
	await act(async () =>
		root.render(
			<SheetsProvider
				config={{
					endpoint: 'mock://sheets',
					auth: { mode: 'embedded', getToken: () => 'test', getIdentityKey: () => 'user-1' },
					execute: backend.execute,
					queryClient,
				}}
			>
				<div style={{ height: 900, width: 4000 }}>
					<Sheets ref={handle} tableName={tableName} csvExport={csvExport} />
				</div>
			</SheetsProvider>,
		),
	);
	await waitUntil(() => container.querySelectorAll('[role="row"][data-row]').length > 0, 'the rows');
	return { backend, handle };
}

function exportViewButton(): Promise<HTMLButtonElement> {
	return waitUntil(() => {
		const found = container.querySelector<HTMLButtonElement>('[aria-label="Export all rows of this view as CSV"]');
		return found && !found.disabled ? found : null;
	}, 'the Export view button');
}

/** The saved file as records (header first), parsed back with the same CSV rules. */
async function savedRecords(): Promise<{ raw: string; records: string[][] }> {
	const raw = await fileText(downloads.at(-1)!.blob);
	const table = readDelimitedTable(raw, ',');
	return { raw, records: [table.header, ...table.records.map((record) => record.fields)] };
}

describe('CSV formula protection', () => {
	it('is off by default: the file holds the values exactly as stored', async () => {
		const { handle } = await mountSheets('ScalarKind');
		await act(async () => handle.current!.exportCsv({ filename: 'kinds.csv', columns: COLUMNS }));
		const { records } = await savedRecords();
		expect(records[1]).toEqual(['=1+1', '+cmd', '@user', '-text', '-5', '-9007199254740993', '-12.5', '-1.5']);
		expect(records[2]!.slice(0, 4)).toEqual(['\tTabbed', '\rReturn', '=HYPERLINK("http://x","y")', '=1,2']);
	});

	it('prefixes text that a spreadsheet would run, and leaves numbers, quoting and line breaks intact', async () => {
		const { handle } = await mountSheets('ScalarKind');
		await act(async () => handle.current!.exportCsv({ filename: 'kinds.csv', columns: COLUMNS, protectFormulas: true }));
		const { raw, records } = await savedRecords();

		// Text starting with = + - @ gets an apostrophe; numbers stored as numbers do not, negative or not.
		expect(records[1]).toEqual(["'=1+1", "'+cmd", "'@user", "'-text", '-5', '-9007199254740993', '-12.5', '-1.5']);
		// A leading tab or carriage return is kept after the apostrophe; quotes and commas stay quoted correctly.
		expect(records[2]!.slice(0, 4)).toEqual(["'\tTabbed", "'\rReturn", '\'=HYPERLINK("http://x","y")', "'=1,2"]);
		expect(raw).toContain('"\'\rReturn"');
		expect(raw).toContain('"\'=HYPERLINK(""http://x"",""y"")"');
		expect(raw).toContain('"\'=1,2"');
		// A multi-line cell stays one quoted cell; text that only contains a dash later is unchanged.
		expect(records[3]).toEqual(['safe', "'=multi\nline", 'plain', 'a-b', '0', '-1', '0', '-0.25']);
		expect(raw).toContain('"\'=multi\nline"');
		// The header is never changed.
		expect(records[0]).toEqual(COLUMNS);
	});

	it('protects a linked record label too', async () => {
		const { handle } = await mountSheets('Task');
		await act(async () => handle.current!.exportCsv({ filename: 'tasks.csv', columns: ['title', 'project'], protectFormulas: true }));
		const { records } = await savedRecords();
		expect(records.slice(1).filter((record) => record[0] === 'Design the mill')).toEqual([['Design the mill', "'=Evil"]]);
	});

	it('Export selected follows the host option', async () => {
		await mountSheets('ScalarKind', { protectFormulas: true });
		await click(await waitUntil(() => container.querySelector<HTMLElement>('[aria-label="Select row 0"]'), 'the first row checkbox'));
		await click(await waitUntil(() => container.querySelector<HTMLButtonElement>('[aria-label="Export selected rows"]'), 'Export selected'));
		const { records } = await savedRecords();
		const header = records[0]!;
		const row = records[1]!;
		expect(row[header.indexOf('label')]).toBe("'=1+1");
		expect(row[header.indexOf('integerValue')]).toBe('-5');
		expect(row[header.indexOf('bigintValue')]).toBe('-9007199254740993');
	});

	it('Export view follows the host option: on', async () => {
		await mountSheets('ScalarKind', { protectFormulas: true });
		await click(await exportViewButton());
		await waitUntil(() => downloads.length === 1, 'the download');
		const { records } = await savedRecords();
		const header = records[0]!;
		const row = records.find((record) => record[header.indexOf('label')]?.endsWith('=1+1'))!;
		expect(row[header.indexOf('label')]).toBe("'=1+1");
		expect(row[header.indexOf('textValue')]).toBe("'+cmd");
		expect(row[header.indexOf('integerValue')]).toBe('-5');
		expect(row[header.indexOf('bigintValue')]).toBe('-9007199254740993');
		// No extra step: the export starts on the click and the dialog shows the result.
		expect(document.querySelector('[role="dialog"] [role="checkbox"]')).toBeNull();
	});

	it('Export view follows the host option: off', async () => {
		await mountSheets('ScalarKind');
		await click(await exportViewButton());
		await waitUntil(() => downloads.length === 1, 'the download');
		const { records } = await savedRecords();
		const header = records[0]!;
		const row = records.find((record) => record[header.indexOf('label')]?.endsWith('=1+1'))!;
		expect(row[header.indexOf('label')]).toBe('=1+1');
		expect(row[header.indexOf('textValue')]).toBe('+cmd');
		expect(row[header.indexOf('integerValue')]).toBe('-5');
	});
});

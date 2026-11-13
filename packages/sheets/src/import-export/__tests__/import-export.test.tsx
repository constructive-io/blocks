/* @vitest-environment jsdom */
//
// Import and export through the public controls, over the captured torture
// schema (the model backend), driven as a user: paste or choose a file, map
// columns, check, import, cancel, download. Assertions are on what the user
// sees, on the records the backend stores, and on the files the browser saves.
//
// Artifact: the error report and the head of the exported view, in `__artifacts__/`.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient } from '@tanstack/react-query';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MetaQuery, SortSpec } from '@constructive-io/data';

import { createTortureBackend, tortureMeta, type TortureBackend } from '../../adapter/__tests__/torture-backend';
import { SheetsProvider } from '../../context/sheets-provider';
import type { SheetsExecuteFn } from '../../context/sheets-execute';
import { useTableModel } from '../../hooks/use-table-model';
import { Sheets } from '../../grid/sheets';
import type { SheetsHandle } from '../../grid/sheets.types';
import { ExportViewControl, ImportRecordsControl } from '../index';

vi.mock('@constructive-io/ui/toast', () => ({
	toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
vi.setConfig({ testTimeout: 30_000 });

const ADA = '00000000-0000-4000-8000-0000000000a1';
const GRACE = '00000000-0000-4000-8000-0000000000a2';
const LINUS = '00000000-0000-4000-8000-0000000000a3';

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
			const url = `blob:test-${next}`;
			blobs.set(url, blob);
			return url;
		},
	});
	Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, writable: true, value: () => {} });
	vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
		downloads.push({ name: this.download, blob: blobs.get(this.href)! });
	});
});

afterEach(async () => {
	await act(async () => root.unmount());
	queryClient.clear();
	container.remove();
	vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

interface ExportProps {
	where?: Readonly<Record<string, unknown>>;
	orderBy?: readonly SortSpec[];
	columns?: readonly string[];
}

function Controls({ table, view }: { table: string; view?: ExportProps }) {
	const { model } = useTableModel(table);
	return (
		<div>
			<ImportRecordsControl model={model} />
			<ExportViewControl model={model} {...view} />
		</div>
	);
}

/** Wrap the backend's execute, for slow or failing requests. */
type ExecuteWrapper = (source: string, variables: Record<string, unknown> | undefined, run: () => Promise<unknown>) => Promise<unknown>;

async function mount(
	table: string,
	options: { meta?: MetaQuery; view?: ExportProps; wrap?: ExecuteWrapper; setup?: (backend: TortureBackend) => void } = {},
): Promise<TortureBackend> {
	const backend = createTortureBackend({ server: 'v2', meta: options.meta });
	options.setup?.(backend);
	const execute: SheetsExecuteFn = async <T,>(document: unknown, variables?: Record<string, unknown>) => {
		const run = () => backend.execute<T>(document, variables);
		return (options.wrap ? options.wrap(String(document), variables, run) : run()) as Promise<T>;
	};
	await act(async () =>
		root.render(
			<SheetsProvider
				config={{
					endpoint: 'mock://sheets',
					auth: { mode: 'embedded', getToken: () => 'test', getIdentityKey: () => 'user-1' },
					execute,
					queryClient,
				}}
			>
				<Controls table={table} view={options.view} />
			</SheetsProvider>,
		),
	);
	return backend;
}

async function waitUntil<T>(read: () => T | null | undefined | false, what = 'the expected state'): Promise<T> {
	for (let attempt = 0; attempt < 400; attempt++) {
		const found = read();
		if (found) return found;
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 20));
		});
	}
	const dialog = document.querySelector('[role="dialog"]')?.textContent ?? '(no dialog)';
	throw new Error(`Timed out waiting for ${what}. Dialog: ${dialog.slice(0, 600)}`);
}

function byText<T extends HTMLElement>(selector: string, text: string | RegExp, scope: ParentNode = document): T | undefined {
	return Array.from(scope.querySelectorAll<T>(selector)).find((element) => {
		const value = element.textContent?.trim() ?? '';
		return typeof text === 'string' ? value === text : text.test(value);
	});
}

const button = (text: string | RegExp) => waitUntil(() => byText<HTMLButtonElement>('button', text), `the button ${text}`);

/** Open the import dialog once the table has loaded. */
async function openImport() {
	const found = await waitUntil(() => {
		const candidate = byText<HTMLButtonElement>('button', 'Import');
		return candidate && !candidate.disabled ? candidate : null;
	}, 'the Import button to be enabled');
	await click(found);
}

async function click(element: HTMLElement) {
	await act(async () => element.click());
}

/** The dialog's status line once it matches. */
const status = (text: RegExp) =>
	waitUntil(() => byText<HTMLElement>('[role="dialog"] [role="status"]', text), `a status matching ${text}`);

async function paste(text: string) {
	await openImport();
	const area = await waitUntil(() => document.querySelector<HTMLTextAreaElement>('[role="dialog"] textarea'), 'the paste box');
	const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!;
	await act(async () => {
		setter.call(area, text);
		area.dispatchEvent(new Event('input', { bubbles: true }));
	});
	await click(await button('Use pasted rows'));
}

/** Open a select and pick the option whose text is `label`. */
async function choose(trigger: HTMLElement, label: string) {
	await act(async () => trigger.click());
	const option = await waitUntil(() => {
		const list = document.getElementById(trigger.getAttribute('aria-controls') ?? '');
		return list ? byText<HTMLElement>('[role="option"]', label, list) : null;
	}, `the option "${label}"`);
	await act(async () => {
		for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup']) {
			option.dispatchEvent(new MouseEvent(type, { bubbles: true }));
		}
		option.click();
	});
	await waitUntil(() => trigger.getAttribute('aria-expanded') !== 'true', 'the option list to close');
}

const fieldSelect = (column: string) =>
	waitUntil(() => document.querySelector<HTMLElement>(`[aria-label="Field for ${column}"]`), `the field select of ${column}`);

/** A saved file's text, byte-order mark kept. */
async function fileText(blob: Blob): Promise<string> {
	const buffer = await new Promise<ArrayBuffer>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as ArrayBuffer);
		reader.onerror = () => reject(reader.error);
		reader.readAsArrayBuffer(blob);
	});
	return new TextDecoder('utf-8', { ignoreBOM: true }).decode(buffer);
}

const creates = (backend: TortureBackend, table: string) =>
	backend.mutations.filter((mutation) => mutation.op === 'create' && mutation.tableName === table);

const listRequests = (backend: TortureBackend, table: string) =>
	backend.requests.filter((request) => request.source.includes(`query ModelList_${table}`));

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

describe('import', () => {
	it('checks every row, links records only by an exact key or a unique label, and creates the rows that pass', async () => {
		const backend = await mount('Project', {
			// A second "Grace Hopper" makes that name ambiguous; her e-mail address still names one person.
			setup: (server) => server.rows.Person!.push({ id: '00000000-0000-4000-8000-0000000000b9', email: 'grace.h@example.com', fullName: 'Grace Hopper', managerId: null }),
		});
		await paste(
			[
				'Name,Owner,Country,Checker,id',
				'Lighthouse,Ada Lovelace,France,,',
				`Bridge,grace@example.com,US,${LINUS},`,
				'',
				'Tower,Nobody,JP,,',
				'Mill,,Japan,,',
				'Twin,Grace Hopper,FR,,',
				'Dup,Linus Torvalds,FR,,x1',
				'Shared,Ada Lovelace,Japan,,,extra',
			].join('\n'),
		);

		await status(/^7 rows in Pasted text$/);
		// Headers that name a field are matched; "Checker" names none and starts unmapped.
		expect((await fieldSelect('Name')).textContent).toContain('Name');
		expect((await fieldSelect('Owner')).textContent).toContain('Owner');
		expect((await fieldSelect('Country')).textContent).toContain('Country');
		expect((await fieldSelect('id')).textContent).toContain('Id');
		expect((await fieldSelect('Checker')).textContent).toContain('Do not import');

		// A linked record and its own key field cannot both be chosen.
		await choose(await fieldSelect('id'), 'Country code');
		await waitUntil(
			() => byText('[role="alert"] li', 'Country and Country code both set Country code. Choose one of them.'),
			'the mapping conflict',
		);
		expect((await button('Check rows')).disabled).toBe(true);
		await choose(await fieldSelect('id'), 'Id');
		await choose(await fieldSelect('Checker'), 'Reviewer');

		await click(await button('Check rows'));
		await status(/^2 rows are ready to import\. 5 rows have problems and will not be imported\.$/);
		expect(byText('[role="dialog"] td', 'No record has "Nobody" as its id or full name or email.')).toBeTruthy();
		// Lookups compare exact values only.
		const personLookups = listRequests(backend, 'Person').map((request) => JSON.stringify(request.variables?.where ?? null));
		expect(personLookups.length).toBeGreaterThan(0);
		expect(personLookups.every((where) => where.includes('"in":'))).toBe(true);

		await click(await button('Import 2 rows'));
		await status(/^2 records were added\. 5 rows were not imported because of problems in the file\.$/);

		expect(creates(backend, 'Project')).toHaveLength(2);
		const stored = backend.rows.Project!.slice(-2).map(({ name, ownerId, countryCode, reviewerId }) => ({ name, ownerId, countryCode, reviewerId }));
		expect(stored).toEqual([
			{ name: 'Lighthouse', ownerId: ADA, countryCode: 'FR', reviewerId: null },
			{ name: 'Bridge', ownerId: GRACE, countryCode: 'US', reviewerId: LINUS },
		]);

		await click(await button('Download error report'));
		const report = downloads.at(-1)!;
		expect(report.name).toBe('Project-import-errors.csv');
		const text = await fileText(report.blob);
		expect(text.split('\r\n')).toEqual([
			'﻿Row,Column,Reason',
			'5,Owner,"No record has ""Nobody"" as its id or full name or email."',
			'6,Owner,This field needs a value.',
			'7,Owner,"2 records match ""Grace Hopper"". Use a value that only one record has."',
			'8,id,Enter a whole number.',
			'9,,"This row has 6 values, but the header has 5 columns."',
			'',
		]);
		await expect(text).toMatchFileSnapshot('./__artifacts__/import-error-report.csv');
	});

	it('reads a chosen file: byte-order mark, line ends, quoted separators and line breaks, detected separator', async () => {
		const backend = await mount('Country');
		await openImport();
		const input = await waitUntil(() => document.querySelector<HTMLInputElement>('[role="dialog"] input[type="file"]'), 'the file input');
		const body = '﻿iso_code\tName\r\nZZ\t"Line one\r\nline two"\r\n\r\nQQ\t"Say ""hi""; or, not"\r\nXQ\t"a\tb"\r\n';
		const file = new File([body], 'countries.tsv', { type: 'text/tab-separated-values' });
		Object.defineProperty(input, 'files', { configurable: true, value: [file] });
		await act(async () => {
			input.dispatchEvent(new Event('change', { bubbles: true }));
		});

		await status(/^3 rows in countries\.tsv$/);
		expect(document.querySelector('[aria-label="Separator"]')?.textContent).toContain('Tab');
		expect((await fieldSelect('iso_code')).textContent).toContain('Iso code');
		await click(await button('Check rows'));
		await status(/^3 rows are ready to import\.$/);
		await click(await button('Import 3 rows'));
		await status(/^3 records were added\.$/);
		expect(byText('button', 'Download error report')).toBeUndefined();

		expect(backend.rows.Country!.slice(-3)).toEqual([
			{ isoCode: 'ZZ', name: 'Line one\r\nline two' },
			{ isoCode: 'QQ', name: 'Say "hi"; or, not' },
			{ isoCode: 'XQ', name: 'a\tb' },
		]);
	});

	it('sends at most four creates at once, stops on cancel, and reports refused and unsent rows', async () => {
		let inFlight = 0;
		let maxInFlight = 0;
		const backend = await mount('Country', {
			wrap: async (source, variables, run) => {
				if (!/^\s*mutation\b/.test(source)) return run();
				inFlight += 1;
				maxInFlight = Math.max(maxInFlight, inFlight);
				try {
					await sleep(40);
					const record = (variables?.input as { country?: { isoCode?: string } } | undefined)?.country;
					if (record?.isoCode === 'CX') throw new Error('A country with this code already exists.');
					return await run();
				} finally {
					inFlight -= 1;
				}
			},
		});
		// Country codes have at most two characters: AX, BX, ... TX.
		const codes = Array.from({ length: 20 }, (_, index) => `${String.fromCharCode(65 + index)}X`);
		await paste(['isoCode,name', ...codes.map((code) => `${code},Country ${code}`)].join('\n'));
		await click(await button('Check rows'));
		await click(await button('Import 20 rows'));

		await status(/^([4-9]|1[0-5]) of 20 rows sent/);
		await click(await button('Cancel'));
		const done = await status(/records were added\./);

		// The refused create (row 4) never reached the store.
		const created = creates(backend, 'Country').length;
		const sent = created + 1;
		expect(maxInFlight).toBe(4);
		expect(sent).toBeLessThan(20);
		expect(done.textContent).toContain(`${created} records were added. 1 row was refused. ${20 - sent} rows were not sent, because the import was cancelled.`);
		expect(backend.rows.Country!.filter((row) => String(row.isoCode).endsWith('X'))).toHaveLength(created);

		await click(await button('Download error report'));
		const lines = (await fileText(downloads.at(-1)!.blob)).split('\r\n');
		expect(lines).toContain('4,,A country with this code already exists.');
		expect(lines.filter((line) => line.endsWith(',,Not imported: the import stopped before this row was sent.'))).toHaveLength(20 - sent);
	});

	it('shows why a table takes no import', async () => {
		const meta = tortureMeta('v2');
		const country = meta._meta!.tables!.find((table) => table?.name === 'Country')!;
		country.query = { ...country.query!, create: null };
		await mount('Country', { meta });
		const reasonOf = (element: HTMLElement | undefined) =>
			document.getElementById(element?.getAttribute('aria-describedby') ?? '')?.textContent ?? null;
		const importButton = await waitUntil(() => {
			const found = byText<HTMLButtonElement>('button', 'Import');
			return reasonOf(found) === 'New records cannot be added to this table.' ? found : null;
		}, 'the reason the Import button is disabled');
		expect(importButton.disabled).toBe(true);
		expect(importButton.parentElement?.getAttribute('title')).toBe('New records cannot be added to this table.');
	});
});

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

describe('export', () => {
	const addProjects = (backend: TortureBackend) => {
		for (let index = 1; index <= 450; index++) {
			backend.rows.Project!.push({
				id: 1000 + index,
				name: `Project ${String(index).padStart(3, '0')}`,
				ownerId: ADA,
				reviewerId: null,
				countryCode: index % 2 === 0 ? 'FR' : 'JP',
			});
		}
	};
	const view: ExportProps = {
		where: { countryCode: { equalTo: 'FR' } },
		orderBy: [{ field: 'name', direction: 'desc' }],
		columns: ['name', 'owner', 'countryCode'],
	};

	it('saves every page of the view with its filter, sort and columns', async () => {
		const backend = await mount('Project', { view, setup: addProjects });
		const exportButton = await waitUntil(() => {
			const found = document.querySelector<HTMLButtonElement>('[aria-label="Export all rows of this view as CSV"]');
			return found && !found.disabled ? found : null;
		}, 'the Export view button');
		const before = listRequests(backend, 'Project').length;
		await click(exportButton);
		await status(/^226 rows exported to Project\.csv\.$/);

		const pages = listRequests(backend, 'Project').slice(before);
		expect(pages.map((request) => [request.variables?.first, typeof request.variables?.after])).toEqual([
			[200, 'undefined'],
			[200, 'string'],
		]);
		expect(pages.every((request) => JSON.stringify(request.variables?.where) === JSON.stringify(view.where))).toBe(true);
		// Only the view's columns are read (with the keys they need).
		expect(pages[0]!.source).not.toContain('reviewerId');

		expect(downloads).toHaveLength(1);
		expect(downloads[0]!.name).toBe('Project.csv');
		const lines = (await fileText(downloads[0]!.blob)).split('\r\n');
		expect(lines[0]).toBe('﻿name,owner,countryCode');
		expect(lines.slice(1, 3)).toEqual(['Project 450,Ada Lovelace,FR', 'Project 448,Ada Lovelace,FR']);
		expect(lines.at(-2)).toBe('Kernel,Linus Torvalds,FR');
		expect(lines).toHaveLength(1 + 226 + 1);
		await expect(lines.slice(0, 6).join('\n') + '\n').toMatchFileSnapshot('./__artifacts__/export-view-head.csv');
	});

	it('stops reading pages when cancelled and saves nothing', async () => {
		let slow = false;
		const backend = await mount('Project', {
			view,
			setup: addProjects,
			wrap: async (source, _variables, run) => {
				if (slow && source.includes('query ModelList_Project')) await sleep(150);
				return run();
			},
		});
		const exportButton = await waitUntil(() => {
			const found = document.querySelector<HTMLButtonElement>('[aria-label="Export all rows of this view as CSV"]');
			return found && !found.disabled ? found : null;
		}, 'the Export view button');
		slow = true;
		const before = listRequests(backend, 'Project').length;
		await click(exportButton);
		await status(/read…$/);
		await click(await button('Cancel'));
		await waitUntil(() => !document.querySelector('[role="dialog"]'), 'the export dialog to close');
		await act(async () => {
			await sleep(400);
		});
		expect(downloads).toHaveLength(0);
		expect(listRequests(backend, 'Project').length - before).toBe(1);
	});
});

// ---------------------------------------------------------------------------
// From the grid toolbar
// ---------------------------------------------------------------------------

/** Text of one grid column for every rendered row. */
function columnTexts(colKey: string): string[] {
	const keys = Array.from(container.querySelectorAll('[role="columnheader"][data-col-key]')).map(
		(header) => header.getAttribute('data-col-key') ?? '',
	);
	const column = keys.indexOf(colKey);
	if (column === -1) return [];
	return Array.from(container.querySelectorAll<HTMLElement>('[role="row"][data-row]')).map((row) => {
		const index = row.getAttribute('data-row');
		return container.querySelector(`#sheets-cell-${index}-${column}`)?.textContent?.trim() ?? '';
	});
}

/** Render <Sheets> for one table over the torture backend. */
async function mountSheets(tableName: string) {
	vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(4000);
	vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(900);
	vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 4000, 33));
	const backend = createTortureBackend({ server: 'v2' });
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
					<Sheets ref={handle} tableName={tableName} />
				</div>
			</SheetsProvider>,
		),
	);
	return { backend, handle };
}

describe('grid toolbar', () => {
	// The row checkbox (Base UI) creates a PointerEvent, which jsdom lacks; MouseEvent has every field it reads.
	const originalPointerEvent = window.PointerEvent;
	beforeAll(() => {
		Object.defineProperty(window, 'PointerEvent', { configurable: true, writable: true, value: originalPointerEvent ?? MouseEvent });
	});
	afterAll(() => {
		if (originalPointerEvent) Object.defineProperty(window, 'PointerEvent', { configurable: true, writable: true, value: originalPointerEvent });
		else delete (window as unknown as Record<string, unknown>).PointerEvent;
	});

	it('imports rows the grid then shows, and both exports save the grid copy format', async () => {
		const { backend, handle } = await mountSheets('Project');
		await waitUntil(() => columnTexts('name').includes('Kernel'), 'the Project rows');

		// The grid's own export saves the loaded rows (none selected): linked records as labels, with a byte-order mark.
		await act(async () => handle.current!.exportCsv({ filename: 'Project.csv' }));
		const loaded = (await fileText(downloads.at(-1)!.blob)).split('\r\n');
		expect(downloads.at(-1)!.name).toBe('Project.csv');
		expect(loaded[0]!.startsWith('\uFEFF')).toBe(true);
		expect(loaded.find((line) => line.startsWith('3,Kernel,'))).toContain('Linus Torvalds');
		expect(loaded.some((line) => line.includes('[object Object]'))).toBe(false);

		// Export view reads every row of the view from the server.
		await click(await waitUntil(() => {
			const found = container.querySelector<HTMLButtonElement>('[aria-label="Export all rows of this view as CSV"]');
			return found && !found.disabled ? found : null;
		}, 'the Export view button'));
		await status(/^3 rows exported to Project\.csv\.$/);
		expect((await fileText(downloads.at(-1)!.blob)).split('\r\n')[0]).toBe(loaded[0]);
		await click(await button('Close'));
		await waitUntil(() => !document.querySelector('[role="dialog"]'), 'the export dialog to close');

		await paste('name,owner\nObservatory,Ada Lovelace');
		await click(await button('Check rows'));
		await click(await button('Import 1 row'));
		await status(/^1 record was added\.$/);
		await click(await button('Close'));
		await waitUntil(() => columnTexts('name').includes('Observatory'), 'the imported row in the grid');
		expect(backend.rows.Project!.at(-1)).toMatchObject({ name: 'Observatory', ownerId: ADA });
	});

	it('exports only the selected rows, with structured values as JSON', async () => {
		await mountSheets('StructuredKind');
		await waitUntil(() => columnTexts('id').length === 3, 'the StructuredKind rows');
		await click(await waitUntil(() => container.querySelector<HTMLElement>('[aria-label="Select row 0"]'), 'the first row checkbox'));
		const exportSelected = await waitUntil(
			() => container.querySelector<HTMLButtonElement>('[aria-label="Export selected rows"]'),
			'the Export selected button',
		);
		expect(exportSelected.textContent).toContain('Export selected (1)');
		await click(exportSelected);

		expect(downloads.at(-1)!.name).toBe('StructuredKind.csv');
		const lines = (await fileText(downloads.at(-1)!.blob)).split('\r\n');
		expect(lines).toHaveLength(3); // header, the selected row, the final line end
		expect(lines[0]!.startsWith('\uFEFFid,')).toBe(true);
		const header = lines[0]!.slice(1).split(',');
		expect(header).toContain('address');
		// The composite value and the range are JSON (quoted for CSV), so the file imports back exactly.
		expect(lines[1]).toContain('"{""street"":""1 Main St"",""city"":""Springfield"",""postalCode"":""12345"",""country"":""US""}"');
		expect(lines[1]).toContain('""inclusive"":true');
		expect(lines[1]).not.toContain('[object Object]');
	});
});

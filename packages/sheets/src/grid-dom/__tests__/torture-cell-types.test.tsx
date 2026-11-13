/* @vitest-environment jsdom */
//
// Every column kind of the captured torture schema, through the public surface: the
// real <Sheets> grid over the model backend (graphql-js against the captured schema),
// asserting what the user sees in each cell and the exact values the backend receives.

import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { MetaQuery } from '@constructive-io/data';

import type { SheetsConfig } from '../../context/sheets-context';
import { SheetsProvider } from '../../context/sheets-provider';
import { Sheets } from '../../grid/sheets';
import type { RecordedMutation } from '../../testing/model-backend';
import { createTortureBackend, tortureMeta, type TortureBackend, type TortureServer } from '../../adapter/__tests__/torture-backend';

const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() }));
vi.mock('@constructive-io/ui/toast', () => ({ toast }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type MetaField = NonNullable<NonNullable<NonNullable<NonNullable<MetaQuery['_meta']>['tables']>[number]>['fields']>[number];

async function settle(ms = 20) {
	await act(async () => {
		await new Promise((resolve) => setTimeout(resolve, ms));
	});
}

async function waitUntil<T>(read: () => T | null | undefined | false, what: string): Promise<T> {
	for (let attempt = 0; attempt < 100; attempt++) {
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

async function typeText(element: HTMLInputElement | HTMLTextAreaElement, text: string) {
	const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value')?.set;
	await act(async () => {
		setter?.call(element, text);
		element.dispatchEvent(new Event('input', { bubbles: true }));
	});
}

async function pressKey(element: Element, key: string) {
	await act(async () => {
		element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
	});
}

/** The values a create or update sent: the record or patch object of its input. */
function writtenValues(mutation: RecordedMutation | undefined): Record<string, unknown> {
	const input = (mutation?.variables as { input?: Record<string, unknown> } | undefined)?.input ?? {};
	const nested = Object.values(input).find((value) => value && typeof value === 'object' && !Array.isArray(value));
	return (nested ?? {}) as Record<string, unknown>;
}

function metaFields(server: TortureServer, table: string): NonNullable<MetaField>[] {
	const meta = tortureMeta(server);
	const entry = meta._meta?.tables?.find((candidate) => candidate?.name === table);
	return (entry?.fields ?? []).filter((field): field is NonNullable<MetaField> => Boolean(field));
}

describe('Sheets over the torture schema: cell types', () => {
	let root: Root;
	let container: HTMLDivElement;
	let queryClient: QueryClient;

	beforeEach(() => {
		// Wide enough that the column virtualizer renders every column.
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
		vi.clearAllMocks();
	});

	async function mount(table: string, backend: TortureBackend) {
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
						<Sheets tableName={table} />
					</SheetsProvider>
				</div>,
			),
		);
		await waitUntil(() => container.querySelector('[id^="sheets-cell-0-"]'), `${table} rows`);
	}

	/** Column keys in column-index order (the header renders every column, the frozen one first). */
	function columnKeys(): string[] {
		return Array.from(container.querySelectorAll<HTMLElement>('[data-part-id="sheets-header-cell"]')).map(
			(header) => header.dataset.colKey ?? '',
		);
	}

	function cell(rowIndex: number, key: string): HTMLElement {
		const col = columnKeys().indexOf(key);
		const element = container.querySelector<HTMLElement>(`#sheets-cell-${rowIndex}-${col}`);
		if (col < 0 || !element) throw new Error(`No cell for ${key} in row ${rowIndex} (columns: ${columnKeys().join(', ')})`);
		return element;
	}

	async function editInline(rowIndex: number, key: string, text: string) {
		await fire(cell(rowIndex, key), 'dblclick');
		const input = await waitUntil(
			() => container.querySelector<HTMLInputElement | HTMLTextAreaElement>('[data-slot="inline-cell-editor"]'),
			`inline editor for ${key}`,
		);
		await typeText(input, text);
		await pressKey(input, 'Enter');
	}

	async function paste(rowIndex: number, key: string, text: string) {
		await fire(cell(rowIndex, key), 'click');
		const grid = container.querySelector('[role="grid"]');
		if (!grid) throw new Error('No grid');
		const event = new Event('paste', { bubbles: true, cancelable: true });
		Object.defineProperty(event, 'clipboardData', { value: { getData: () => text, setData: () => {} } });
		await act(async () => {
			grid.dispatchEvent(event);
		});
		await settle(40);
	}

	describe.each<TortureServer>(['v2', 'baseline'])('every scalar column renders its stored value without loss (%s server)', (server) => {
		it('shows text, numbers, dates, times, addresses, bits and paths digit for digit', async () => {
			const backend = createTortureBackend({ server });
			const rows = structuredClone(backend.rows.ScalarKind);
			await mount('ScalarKind', backend);

			const exact = new Set(['text', 'citext', 'varchar', 'bpchar', 'int2', 'int4', 'int8', 'numeric', 'float4', 'float8', 'money', 'uuid', 'date', 'inet', 'cidr', 'macaddr', 'bit', 'varbit', 'ltree']);
			// Times and dates with times read by the display rule; the exact stored text starts the title.
			const forPeople = new Set(['time', 'timetz', 'timestamp', 'timestamptz']);
			let checked = 0;
			for (const field of metaFields(server, 'ScalarKind')) {
				for (const [rowIndex, row] of rows.entries()) {
					const stored = row[field.name];
					const text = cell(rowIndex, field.name).textContent ?? '';
					if (stored === null || stored === undefined) {
						// A missing value is an empty cell (a nullable boolean shows no checkbox, never "false").
						expect(text, `${field.name} row ${rowIndex}`).toBe('');
						expect(cell(rowIndex, field.name).querySelector('[role="checkbox"], button[aria-checked], input[type="checkbox"]')).toBeNull();
						continue;
					}
					if (exact.has(field.type.pgType)) {
						expect(text, `${field.name} row ${rowIndex}`).toBe(String(stored));
						checked += 1;
					}
					if (forPeople.has(field.type.pgType)) {
						const view = cell(rowIndex, field.name).querySelector('[data-slot="text-cell"]');
						expect(view?.getAttribute('title')?.split(' · shown in ')[0], `${field.name} row ${rowIndex}`).toBe(String(stored));
						expect(text, `${field.name} row ${rowIndex}`).not.toBe('');
						checked += 1;
					}
				}
			}
			// Every exact kind of all three rows (typical, extremes, nulls) was compared.
			expect(checked).toBeGreaterThan(40);

			// The display rule: a date as stored, "HH:mm:ss" / "YYYY-MM-DD HH:mm:ss", fractions only when
			// not zero, zoned values in the viewer's zone (named in the title).
			const titleOf = (rowIndex: number, key: string) => cell(rowIndex, key).querySelector('[data-slot="text-cell"]')?.getAttribute('title');
			expect(cell(0, 'dateValue').textContent).toBe('2024-02-29');
			expect(cell(0, 'timeValue').textContent).toBe('13:45:30.123456');
			expect(cell(1, 'timeValue').textContent).toBe('00:00:00');
			expect(cell(0, 'timestampValue').textContent).toBe('2024-02-29 13:45:30.123456');
			expect(cell(1, 'timestampValue').textContent).toBe('1970-01-01 00:00:00');
			expect(titleOf(0, 'timestampValue')).toBe('2024-02-29T13:45:30.123456');
			expect(cell(0, 'timestamptzValue').textContent).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:30\.123456$/);
			expect(titleOf(0, 'timestamptzValue')).toMatch(/^2024-02-29T13:45:30\.123456\+00:00 · shown in \S+/);
			expect(cell(0, 'timetzValue').textContent).toMatch(/^\d{2}:\d{2}:30$/);
			expect(titleOf(0, 'timetzValue')).toMatch(/^06:45:30\.000000\+00:00 · shown in \S+/);

			// The extremes: a whole number above 2^53 and a 60-digit decimal, digit for digit.
			expect(cell(0, 'bigintValue').textContent).toBe('9007199254740993');
			expect(cell(1, 'bigintValue').textContent).toBe('9223372036854775807');
			expect(cell(0, 'numericUnbounded').textContent).toBe('123456789012345678901234567890.123456789012345678901234567890');
			// A number wider than its column is cut at its end with an ellipsis (never clipped on the left),
			// and the whole value is in the title. Layout itself is not measurable here.
			for (const [rowIndex, key, value] of [
				[1, 'bigintValue', '9223372036854775807'],
				[0, 'numericUnbounded', '123456789012345678901234567890.123456789012345678901234567890'],
				[1, 'doubleValue', '1.7976931348623157e+308'],
			] as const) {
				const view = cell(rowIndex, key).querySelector<HTMLElement>('[data-slot="number-cell"]');
				expect(view?.getAttribute('title'), key).toBe(value);
				expect(view?.querySelector('[data-truncate="end"]')?.textContent, key).toBe(value);
			}
			// Structured values read back as readable text, not "[object Object]".
			expect(cell(0, 'intervalValue').textContent).toBe('1y 2mo 3d 4h 5m 6.789s');
			expect(cell(0, 'jsonValue').textContent).toBe(JSON.stringify(rows[0].jsonValue));
			expect(cell(0, 'byteaValue').textContent).toContain(String(rows[0].byteaValue));
			expect(cell(0, 'byteaValue').textContent).toMatch(/\d+ bytes/);
			// A bit string is text, never a checkbox.
			expect(cell(0, 'bitValue').querySelector('input[type="checkbox"], button[role="checkbox"]')).toBeNull();
		});
	});

	it('shows list, choice and structured values in full', async () => {
		const backend = createTortureBackend({ server: 'v2' });
		await mount('ArrayKind', backend);

		expect(cell(0, 'textList').textContent).toContain('two, with comma');
		expect(cell(0, 'textList').textContent).toContain('three "quoted"');
		expect(cell(0, 'numericList').textContent).toContain('99999999.99');
		// Enum lists show each value's label as a badge.
		expect(cell(0, 'statusList').textContent).toBe('todoin_progress1st_reviewneeds-review');
		expect(cell(1, 'textList').textContent).toBe('');

		await act(async () => root.unmount());
		root = createRoot(container);
		await mount('StructuredKind', createTortureBackend({ server: 'v2' }));
		expect(cell(0, 'address').textContent).toBe('Street: 1 Main St, City: Springfield, Postal code: 12345, Country: US');
		expect(cell(0, 'intRange').textContent).toBe('[1, 10)');
		// Timestamp ends read by the display rule, in the viewer's zone; the exact text and the zone are the title.
		expect(cell(0, 'timestampRange').textContent).toMatch(/^\[\d{4}-\d{2}-\d{2} \d{2}:\d{2}:00, \d{4}-\d{2}-\d{2} \d{2}:\d{2}:00\)$/);
		expect(cell(0, 'timestampRange').querySelector('[data-slot="text-cell"]')?.getAttribute('title')).toMatch(
			/^\[2024-01-01T00:00:00\.000000\+00:00, 2024-02-01T00:00:00\.000000\+00:00\) · shown in \S+/,
		);
		expect(cell(0, 'dateRange').textContent).toBe('[2024-01-01, 2024-02-01)');
		// Shapes in plain words, with part counts; no value is an empty cell, never "Invalid".
		expect(cell(0, 'anyShape').textContent).toBe('Line');
		expect(cell(0, 'pin').textContent).toBe('Point');
		expect(cell(0, 'outline').textContent).toBe('Polygon');
		expect(cell(0, 'geoPin').textContent).toBe('Point');
		expect(cell(0, 'anyGeo').textContent).toBe('Line');
		expect(cell(1, 'anyShape').textContent).toBe('2 shapes');
		for (const key of ['outline', 'geoPin', 'anyGeo']) expect(cell(1, key).textContent).toBe('');
		for (const key of ['anyShape', 'pin', 'outline', 'geoPin', 'anyGeo']) expect(cell(2, key).textContent).toBe('');
		expect(cell(1, 'intRange').textContent).toBe('(-∞, 6)');
		expect(cell(2, 'dateRange').textContent).toBe('Any value');
		expect(cell(0, 'nativePoint').textContent).toBe('(1.5, -2.25)');
		expect(cell(1, 'embedding').textContent).toBe('3 numbers · [0, 0, 0]');
	});

	it('enum labels with a space or a dash read as written and write their wire values, picked, typed or pasted', async () => {
		const backend = createTortureBackend({ server: 'v2' });
		await mount('Task', backend);
		const taskRow = backend.rows.Task.findIndex((row) => row.status === 'ON_HOLD');
		expect(cell(taskRow, 'status').textContent).toBe('on hold');
		expect(cell(taskRow, 'reviewStatus').textContent).toBe('needs-review');

		// Picked from the option list.
		await fire(cell(0, 'status'), 'dblclick');
		const option = await waitUntil(
			() => Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find((entry) => entry.textContent?.includes('on hold')),
			'the "on hold" option',
		);
		await fire(option, 'click');
		await waitUntil(() => backend.mutations.length === 1, 'the picked update');
		expect(writtenValues(backend.mutations[0])).toEqual({ status: 'ON_HOLD' });

		// Typed into the option search (eight choices make the list searchable), then Enter.
		await fire(cell(1, 'status'), 'dblclick');
		const search = await waitUntil(
			() => document.querySelector<HTMLInputElement>('[data-slot="select-editor"] input'),
			'the option search',
		);
		await typeText(search, 'needs-review');
		await pressKey(search, 'Enter');
		await waitUntil(() => backend.mutations.length === 2, 'the typed update');
		expect(writtenValues(backend.mutations[1])).toEqual({ status: 'NEEDS_REVIEW' });

		// Pasted as the label people read.
		await paste(2, 'reviewStatus', 'on hold');
		await waitUntil(() => backend.mutations.length === 3, 'the pasted update');
		expect(writtenValues(backend.mutations[2])).toEqual({ reviewStatus: 'ON_HOLD' });
		await paste(3, 'reviewStatus', 'needs-review');
		await waitUntil(() => backend.mutations.length === 4, 'the second pasted update');
		expect(writtenValues(backend.mutations[3])).toEqual({ reviewStatus: 'NEEDS_REVIEW' });
	});

	it('a tree path and a list of paths display and round-trip in the form each is served in', async () => {
		const backend = createTortureBackend({ server: 'v2' });
		await mount('ScalarKind', backend);
		const grid = () => container.querySelector('[role="grid"]')!;
		async function copy(rowIndex: number, key: string): Promise<string> {
			await fire(cell(rowIndex, key), 'click');
			let copied = '';
			const event = new Event('copy', { bubbles: true, cancelable: true });
			Object.defineProperty(event, 'clipboardData', { value: { setData: (_type: string, text: string) => (copied = text), getData: () => '' } });
			await act(async () => {
				grid().dispatchEvent(event);
			});
			return copied;
		}

		// A plain path is served with slashes and written back the same way.
		expect(cell(0, 'ltreeValue').textContent).toBe('/top/science/astronomy');
		await paste(1, 'ltreeValue', await copy(0, 'ltreeValue'));
		await waitUntil(() => backend.mutations.length === 1, 'the pasted path');
		expect(writtenValues(backend.mutations[0])).toEqual({ ltreeValue: '/top/science/astronomy' });

		// A list of paths is served dotted: each path is one chip, and a copy pastes back unchanged.
		await act(async () => root.unmount());
		root = createRoot(container);
		const arrays = createTortureBackend({ server: 'v2' });
		await mount('ArrayKind', arrays);
		const chips = Array.from(cell(0, 'pathList').querySelectorAll('[data-slot="badges-cell"] > *')).map((chip) => chip.textContent);
		expect(chips).toEqual(['top.science', 'a']);
		await paste(1, 'pathList', await copy(0, 'pathList'));
		await waitUntil(() => arrays.mutations.length === 1, 'the pasted path list');
		expect(writtenValues(arrays.mutations[0])).toEqual({ pathList: ['top.science', 'a'] });

		// Saving the list editor without a change writes the same paths.
		const editor = await openOverlay(0, 'pathList', 'array-editor');
		await fire(buttonIn(editor, 'Save'), 'click');
		await waitUntil(() => arrays.mutations.length === 2 || !document.querySelector('[data-slot="array-editor"]'), 'the saved list');
		if (arrays.mutations.length === 2) expect(writtenValues(arrays.mutations[1])).toEqual({ pathList: ['top.science', 'a'] });
	});

	it('an enum edit shows labels and writes the wire value', async () => {
		const backend = createTortureBackend({ server: 'v2' });
		await mount('Task', backend);
		expect(cell(0, 'status').textContent).toBe('in_progress');

		await fire(cell(0, 'status'), 'dblclick');
		const option = await waitUntil(
			() => Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find((entry) => entry.textContent?.includes('Blocked')),
			'the Blocked option',
		);
		await fire(option, 'click');

		const update = await waitUntil(() => backend.mutations.find((mutation) => mutation.op === 'update'), 'the update');
		expect(writtenValues(update)).toEqual({ status: 'BLOCKED' });
		await waitUntil(() => cell(0, 'status').textContent === 'Blocked', 'the new label');
	});

	it('a decimal edit and a paste round-trip exactly', async () => {
		const backend = createTortureBackend({ server: 'v2' });
		await mount('ScalarKind', backend);

		const longDecimal = '98765432109876543210987654321.000000000000000000000000000001';
		await editInline(0, 'numericUnbounded', longDecimal);
		await waitUntil(() => backend.mutations.length === 1, 'the decimal update');
		expect(writtenValues(backend.mutations[0])).toEqual({ numericUnbounded: longDecimal });
		await waitUntil(() => cell(0, 'numericUnbounded').textContent === longDecimal, 'the exact decimal in the cell');

		await paste(0, 'bigintValue', '9223372036854775806');
		await waitUntil(() => backend.mutations.length === 2, 'the pasted update');
		expect(writtenValues(backend.mutations[1])).toEqual({ bigintValue: '9223372036854775806' });
		expect(toast.error).not.toHaveBeenCalled();
		expect(toast.warning).not.toHaveBeenCalled();
	});

	it('copy then paste keeps multi-line text and JSON exactly', async () => {
		const backend = createTortureBackend({ server: 'v2' });
		backend.rows.ScalarKind[0].textValue = 'line one\n\t"line two"';
		await mount('ScalarKind', backend);
		const grid = container.querySelector('[role="grid"]')!;

		async function copy(rowIndex: number, key: string): Promise<string> {
			await fire(cell(rowIndex, key), 'click');
			let copied = '';
			const event = new Event('copy', { bubbles: true, cancelable: true });
			Object.defineProperty(event, 'clipboardData', { value: { setData: (_type: string, text: string) => (copied = text), getData: () => '' } });
			await act(async () => {
				grid.dispatchEvent(event);
			});
			return copied;
		}

		await paste(2, 'textValue', await copy(0, 'textValue'));
		await waitUntil(() => backend.mutations.length === 1, 'the pasted text');
		expect(writtenValues(backend.mutations[0])).toEqual({ textValue: 'line one\n\t"line two"' });

		await paste(2, 'jsonbValue', await copy(0, 'jsonValue'));
		await waitUntil(() => backend.mutations.length === 2, 'the pasted JSON');
		expect(writtenValues(backend.mutations[1])).toEqual({ jsonbValue: backend.rows.ScalarKind[0].jsonValue });

		// An enum copies as its label and pastes back as its wire value.
		await act(async () => root.unmount());
		root = createRoot(container);
		const tasks = createTortureBackend({ server: 'v2' });
		await mount('Task', tasks);
		const tasksGrid = container.querySelector('[role="grid"]')!;
		await fire(cell(0, 'status'), 'click');
		let label = '';
		const copyEvent = new Event('copy', { bubbles: true, cancelable: true });
		Object.defineProperty(copyEvent, 'clipboardData', { value: { setData: (_type: string, text: string) => (label = text), getData: () => '' } });
		await act(async () => {
			tasksGrid.dispatchEvent(copyEvent);
		});
		expect(label).toBe('in_progress');
		await paste(1, 'reviewStatus', label);
		await waitUntil(() => tasks.mutations.length === 1, 'the pasted choice');
		expect(writtenValues(tasks.mutations[0])).toEqual({ reviewStatus: 'IN_PROGRESS' });
	});

	it('pasting text into a number column is refused and reported, nothing is written', async () => {
		const backend = createTortureBackend({ server: 'v2' });
		await mount('ScalarKind', backend);

		await paste(0, 'integerValue', 'forty-two');
		await waitUntil(() => toast.error.mock.calls.length > 0, 'the refusal notice');
		expect(backend.mutations).toHaveLength(0);
		expect(toast.error).toHaveBeenCalledWith({ message: 'Integer value was not changed', description: 'Enter a whole number.' });
		expect(cell(0, 'integerValue').textContent).toBe('42');

		// A decimal with more places than the column keeps is refused, not rounded.
		await paste(0, 'numericBounded', '1.23456');
		expect(toast.error).toHaveBeenLastCalledWith({
			message: 'Numeric bounded was not changed',
			description: 'Use at most 4 digits after the decimal point.',
		});
		expect(backend.mutations).toHaveLength(0);
	});

	it('an edit a row rule refuses is not shown as saved: the value comes back and the error says why', async () => {
		// The server answers an update of a row it hides from this user with an empty record and no error.
		const backend = createTortureBackend({ server: 'v2', writeHidden: (table) => table === 'Task' });
		await mount('Task', backend);
		const before = cell(0, 'title').textContent;
		const stored = backend.rows.Task!.map((row) => row.title);

		await editInline(0, 'title', 'Changed without access');
		const card = await waitUntil(() => container.querySelector('[data-part-id="sheets-write-error"]'), 'the error card');
		expect(card.textContent).toContain('This record was not changed. You may not be allowed to change it, or it no longer exists.');
		await waitUntil(() => cell(0, 'title').textContent === before, 'the value to come back');
		expect(backend.rows.Task!.map((row) => row.title)).toEqual(stored);
		await waitUntil(() => container.querySelector('[data-part-id="sheets-save-status"]')?.textContent?.includes('Not saved'), 'the save status');
	});

	it('a null boolean stays empty; one click on the box checks it, and a toggle never empties a cell', async () => {
		const backend = createTortureBackend({ server: 'v2' });
		await mount('ScalarKind', backend);
		const nulls = 2;
		expect(cell(nulls, 'boolNullable').querySelector('button, input')).toBeNull();

		// One click on the empty cell's box target writes true.
		await fire(cell(nulls, 'boolNullable').querySelector<HTMLElement>('[data-slot="boolean-toggle"]')!, 'click');
		await waitUntil(() => backend.mutations.length === 1, 'the first toggle');
		expect(writtenValues(backend.mutations[0])).toEqual({ boolNullable: true });

		// The saved false (row 1) of a nullable column flips to true; only Delete empties it.
		await fire(cell(1, 'boolNullable'), 'dblclick');
		await waitUntil(() => backend.mutations.length === 2, 'the second toggle');
		expect(writtenValues(backend.mutations[1])).toEqual({ boolNullable: true });

		// A column that requires a value only flips between true and false.
		await fire(cell(1, 'boolRequired'), 'dblclick');
		await waitUntil(() => backend.mutations.length === 3, 'the required toggle');
		expect(writtenValues(backend.mutations[2])).toEqual({ boolRequired: true });
	});

	it('a computed column and a column that cannot be changed are read-only and say why', async () => {
		const backend = createTortureBackend({ server: 'v2' });
		await mount('GeneratedValue', backend);

		for (const key of ['total', 'frozenCode']) {
			const reason = cell(0, key).getAttribute('title');
			expect(reason, key).toBeTruthy();
			await fire(cell(0, key), 'dblclick');
			expect(toast.info).toHaveBeenLastCalledWith(expect.objectContaining({ description: reason }));
		}
		// Typing into the read-only cell is refused the same way, and nothing is written.
		await paste(0, 'total', '1.00');
		expect(backend.mutations).toHaveLength(0);
		expect(toast.error).toHaveBeenCalledWith(expect.objectContaining({ description: cell(0, 'total').getAttribute('title') }));
	});

	it('a draft row on a table whose key has no default creates with the typed key, and asks for it when missing', async () => {
		const backend = createTortureBackend({ server: 'v2' });
		await mount('Country', backend);
		const addRow = await waitUntil(
			() => Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.trim() === 'Add row'),
			'the Add row button',
		);
		await fire(addRow, 'click');
		const draft = 3;
		await waitUntil(() => container.querySelector(`#sheets-cell-${draft}-0`), 'the draft row');

		// Without the key, the row's Save asks for it and sends nothing.
		await editInline(draft, 'name', 'Germany');
		const save = await waitUntil(() => container.querySelector<HTMLButtonElement>('[data-slot="draft-action-cell"]'), 'the draft Save');
		await fire(save, 'click');
		await waitUntil(() => cell(draft, 'isoCode').getAttribute('title') === 'Iso code is required', 'the required notice');
		expect(backend.mutations).toHaveLength(0);

		await editInline(draft, 'isoCode', 'DE');
		await fire(save, 'click');
		const create = await waitUntil(() => backend.mutations.find((mutation) => mutation.op === 'create'), 'the create');
		expect(writtenValues(create)).toEqual({ isoCode: 'DE', name: 'Germany' });
	});

	async function openOverlay(rowIndex: number, key: string, slot: string): Promise<HTMLElement> {
		await fire(cell(rowIndex, key), 'dblclick');
		return waitUntil(() => document.querySelector<HTMLElement>(`[data-slot="${slot}"]`), `the ${slot} for ${key}`);
	}

	function buttonIn(parent: ParentNode, label: string): HTMLButtonElement {
		const found = Array.from(parent.querySelectorAll('button')).find((button) => button.textContent?.trim() === label);
		if (!found) throw new Error(`No "${label}" button`);
		return found;
	}

	it('records, ranges and durations edit as their parts and are written as objects', async () => {
		const backend = createTortureBackend({ server: 'v2' });
		await mount('StructuredKind', backend);

		const address = await openOverlay(0, 'address', 'record-editor');
		await typeText(address.querySelector<HTMLInputElement>('#record-field-address-city')!, 'Shelbyville');
		await fire(buttonIn(address, 'Save'), 'click');
		await waitUntil(() => backend.mutations.length === 1, 'the address update');
		expect(writtenValues(backend.mutations[0])).toEqual({
			address: { street: '1 Main St', city: 'Shelbyville', postalCode: '12345', country: 'US' },
		});

		const range = await openOverlay(0, 'intRange', 'range-editor');
		await typeText(range.querySelector<HTMLInputElement>('[aria-label="End value"]')!, '20');
		await fire(buttonIn(range, 'Save'), 'click');
		await waitUntil(() => backend.mutations.length === 2, 'the range update');
		expect(writtenValues(backend.mutations[1])).toEqual({
			intRange: { start: { value: 1, inclusive: true }, end: { value: 20, inclusive: false } },
		});

		// A bound that does not fit the range's values is refused in the editor.
		const badRange = await openOverlay(1, 'intRange', 'range-editor');
		await typeText(badRange.querySelector<HTMLInputElement>('[aria-label="End value"]')!, 'soon');
		await fire(buttonIn(badRange, 'Save'), 'click');
		expect(badRange.querySelector('[role="alert"]')?.textContent).toBe('End: Enter a whole number.');
		expect(backend.mutations).toHaveLength(2);
	});

	it('an overlay editor takes the keyboard when Enter opens it, and Escape hands it back to the grid', async () => {
		const backend = createTortureBackend({ server: 'v2' });
		await mount('StructuredKind', backend);
		const grid = container.querySelector<HTMLElement>('[role="grid"]')!;

		await fire(cell(0, 'intRange'), 'click');
		await act(async () => grid.focus());
		await pressKey(grid, 'Enter');
		await waitUntil(() => document.querySelector('[data-slot="range-editor"]'), 'the range editor');
		const overlay = document.querySelector<HTMLElement>('[data-slot="sheets-editor-overlay"]')!;
		expect(overlay.contains(document.activeElement)).toBe(true);

		await pressKey(document.activeElement!, 'Escape');
		await waitUntil(() => !document.querySelector('[data-slot="range-editor"]'), 'the range editor to close');
		expect(document.activeElement).toBe(grid);
		expect(backend.mutations).toHaveLength(0);
	});

	it('a duration, a JSON string and a number list round-trip; raw bytes open a viewer', async () => {
		const backend = createTortureBackend({ server: 'v2' });
		await mount('ScalarKind', backend);

		const duration = await openOverlay(0, 'intervalValue', 'record-editor');
		// Largest part first, the way the cell reads ("1y 2mo 3d 4h 5m 6.789s").
		expect(Array.from(duration.querySelectorAll('label')).map((label) => label.textContent?.replace(' *', ''))).toEqual([
			'Years',
			'Months',
			'Days',
			'Hours',
			'Minutes',
			'Seconds',
		]);
		await typeText(duration.querySelector<HTMLInputElement>('#record-field-intervalValue-days')!, '10');
		await fire(buttonIn(duration, 'Save'), 'click');
		await waitUntil(() => backend.mutations.length === 1, 'the duration update');
		expect(writtenValues(backend.mutations[0])).toEqual({
			intervalValue: { years: 1, months: 2, days: 10, hours: 4, minutes: 5, seconds: 6.789 },
		});

		// A JSON value may be a string at the top level.
		await fire(cell(0, 'jsonbValue'), 'dblclick');
		const json = await waitUntil(() => document.querySelector<HTMLTextAreaElement>('textarea'), 'the JSON editor');
		await typeText(json, '"just text"');
		await fire(buttonIn(document.body, 'Save'), 'click');
		await waitUntil(() => backend.mutations.length === 2, 'the JSON update');
		expect(writtenValues(backend.mutations[1])).toEqual({ jsonbValue: 'just text' });

		const viewer = await openOverlay(0, 'byteaValue', 'value-viewer');
		expect(viewer.textContent).toContain('4 bytes');
		expect(viewer.textContent).toContain('3q2+7w==');
		expect(backend.mutations).toHaveLength(2);

		await act(async () => root.unmount());
		root = createRoot(container);
		const lists = createTortureBackend({ server: 'v2' });
		await mount('ArrayKind', lists);
		const editor = await openOverlay(0, 'intList', 'array-editor');
		const input = editor.querySelector<HTMLInputElement>('input')!;
		await typeText(input, 'four');
		await fire(buttonIn(editor, 'Save'), 'click');
		expect(editor.querySelector('[role="alert"]')?.textContent).toBe('Item 4: Enter a whole number.');
		await typeText(editor.querySelector<HTMLInputElement>('input')!, '');
		await fire(editor.querySelector<HTMLButtonElement>('[aria-label="Remove four"]')!, 'click');
		await typeText(editor.querySelector<HTMLInputElement>('input')!, '4');
		await fire(buttonIn(editor, 'Save'), 'click');
		await waitUntil(() => lists.mutations.length === 1, 'the list update');
		expect(writtenValues(lists.mutations[0])).toEqual({ intList: [1, 2, 3, 4] });
	});

	it('clearing respects required columns: text becomes empty, other kinds are refused', async () => {
		const backend = createTortureBackend({ server: 'v2' });
		await mount('ScalarKind', backend);
		const grid = container.querySelector('[role="grid"]')!;

		await fire(cell(0, 'boolRequired'), 'click');
		await pressKey(grid, 'Delete');
		await waitUntil(() => toast.error.mock.calls.length > 0, 'the refusal');
		expect(toast.error).toHaveBeenCalledWith({ message: 'Bool required was not changed', description: 'This field needs a value.' });
		expect(backend.mutations).toHaveLength(0);

		await fire(cell(0, 'label'), 'click');
		await pressKey(grid, 'Delete');
		await waitUntil(() => backend.mutations.length === 1, 'the cleared label');
		expect(writtenValues(backend.mutations[0])).toEqual({ label: '' });

		await fire(cell(0, 'textValue'), 'click');
		await pressKey(grid, 'Delete');
		await waitUntil(() => backend.mutations.length === 2, 'the cleared text');
		expect(writtenValues(backend.mutations[1])).toEqual({ textValue: null });
	});

	it('the search keywords viewer takes the keyboard on open; Escape or a press outside closes it', async () => {
		const backend = createTortureBackend({ server: 'v2' });
		await mount('ScalarKind', backend);
		const grid = container.querySelector<HTMLElement>('[role="grid"]')!;
		const viewer = () => document.querySelector<HTMLElement>('[data-slot="tsvector-viewer"]');

		await fire(cell(0, 'tsvectorValue'), 'click');
		await act(async () => grid.focus());
		await pressKey(grid, 'Enter');
		await waitUntil(viewer, 'the keywords viewer');
		expect(viewer()!.querySelectorAll('[aria-label="Search keywords"] li').length).toBeGreaterThan(0);
		expect(document.querySelector('[data-slot="sheets-editor-overlay"]')!.contains(document.activeElement)).toBe(true);

		await pressKey(document.activeElement!, 'Escape');
		await waitUntil(() => !viewer(), 'the viewer to close on Escape');
		expect(document.activeElement).toBe(grid);

		await pressKey(grid, 'Enter');
		await waitUntil(viewer, 'the keywords viewer again');
		await act(async () => {
			document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true }));
		});
		await waitUntil(() => !viewer(), 'the viewer to close on a press outside');
		expect(backend.mutations).toHaveLength(0);
	});

	it('the cell the grid points at is a gridcell announced as selected, with plain content inside', async () => {
		const backend = createTortureBackend({ server: 'v2' });
		await mount('DomainKind', backend);
		const grid = container.querySelector<HTMLElement>('[role="grid"]')!;

		await fire(cell(0, 'host'), 'click');
		const active = await waitUntil(() => {
			const id = grid.getAttribute('aria-activedescendant');
			return id ? document.getElementById(id) : null;
		}, 'the active descendant');
		expect(active).toBe(cell(0, 'host'));
		expect(active.getAttribute('role')).toBe('gridcell');
		expect(active.getAttribute('aria-selected')).toBe('true');
		expect(active.getAttribute('aria-colindex')).toBe(String(columnKeys().indexOf('host') + 1));
		expect(active.querySelector('[role="gridcell"]')).toBeNull();
		// The other cells are not selected.
		expect(cell(0, 'contactEmail').getAttribute('aria-selected')).toBeNull();
		// A read-only cell says so, with its reason, on the gridcell itself.
		expect(cell(0, 'id').getAttribute('aria-readonly')).toBe('true');
		expect(cell(0, 'id').getAttribute('aria-description')).toBe(cell(0, 'id').getAttribute('title'));
	});

	it('an email or web address cell is selected by its first click; only a click on the link of the active cell follows it', async () => {
		const backend = createTortureBackend({ server: 'v2' });
		await mount('DomainKind', backend);

		// Every click that reaches the window: what it hit and whether something stopped the
		// browser from following a link. The window listener runs last, then stops jsdom's own
		// navigation so the test never leaves the page.
		const clicks: { onLink: boolean; prevented: boolean }[] = [];
		const record = (event: MouseEvent) => {
			clicks.push({ onLink: (event.target as Element).closest('a[href]') !== null, prevented: event.defaultPrevented });
			event.preventDefault();
		};
		window.addEventListener('click', record);
		try {
			for (const [key, href] of [
				['contactEmail', 'mailto:Someone@Example.com'],
				['homepage', 'https://example.com/a?b=c'],
			] as const) {
				clicks.length = 0;
				const label = cell(0, key).querySelector<HTMLElement>('[data-slot="uri-cell"] > *')!;
				// The first click on the text only selects the cell: it does not land on a link.
				await fire(label, 'click');
				await waitUntil(() => cell(0, key).getAttribute('aria-selected') === 'true', `the selected ${key} cell`);
				expect(clicks).toEqual([{ onLink: false, prevented: false }]);

				// In the active cell a click on the link is allowed to follow it.
				const link = cell(0, key).querySelector<HTMLAnchorElement>('a[href]')!;
				expect(link.getAttribute('href')).toBe(href);
				await fire(link, 'click');
				expect(clicks[1]).toEqual({ onLink: true, prevented: false });

				// The second click of a double-click is the cell's, not the link's.
				await act(async () => {
					link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 2 }));
				});
				expect(clicks[2]).toEqual({ onLink: true, prevented: true });
			}
		} finally {
			window.removeEventListener('click', record);
		}
		expect(backend.mutations).toHaveLength(0);
	});

	it('a value the server could not send shows a notice and cannot be edited', async () => {
		const backend = createTortureBackend({ server: 'v2' });
		// A float that cannot be served: the field is null plus one error for that cell.
		backend.rows.SpecialValue[2].realValue = Number.NaN;
		await mount('SpecialValue', backend);

		expect(cell(2, 'realValue').textContent).toBe('This value cannot be shown');
		expect(cell(2, 'doubleValue').textContent).toBe('-2.5');
		// The decimal NaN and Infinity are values, shown as they are.
		expect(cell(0, 'numericValue').textContent).toBe('NaN');
		expect(cell(1, 'numericValue').textContent).toBe('Infinity');

		await fire(cell(2, 'realValue'), 'dblclick');
		expect(toast.info).toHaveBeenCalledWith(expect.objectContaining({ message: 'Real value cannot be changed' }));
		expect(backend.mutations).toHaveLength(0);
	});
});

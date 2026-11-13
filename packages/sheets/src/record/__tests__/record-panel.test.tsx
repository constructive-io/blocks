/* @vitest-environment jsdom */
//
// The record panel through the public surface: <Sheets> over the captured torture
// schema (graphql-js against the real schema, rows in memory), opened by a host
// (`recordId`, the imperative handle), asserting what the user sees in the panel and
// the exact writes the backend receives.

import { act, createRef } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { SheetsConfig } from '../../context/sheets-context';
import type { SheetsExecuteFn } from '../../context/sheets-execute';
import { SheetsProvider } from '../../context/sheets-provider';
import { Sheets } from '../../grid/sheets';
import type { SheetsHandle } from '../../grid/sheets.types';
import type { SheetsRowIdentifier } from '../../row-identity';
import type { RecordedMutation } from '../../testing/model-backend';
import { createTortureBackend, type TortureBackend } from '../../adapter/__tests__/torture-backend';

const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() }));
vi.mock('@constructive-io/ui/toast', () => ({ toast }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
		element.focus();
		setter?.call(element, text);
		element.dispatchEvent(new Event('input', { bubbles: true }));
	});
}

async function pressKey(element: Element, key: string, init: KeyboardEventInit = {}) {
	await act(async () => {
		element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));
	});
}

async function blur(element: HTMLElement) {
	await act(async () => {
		element.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
		element.blur();
	});
}

/** The values a create or update sent: the record or patch object of its input. */
function writtenValues(mutation: RecordedMutation | undefined): Record<string, unknown> {
	const input = (mutation?.variables as { input?: Record<string, unknown> } | undefined)?.input ?? {};
	const nested = Object.values(input).find((value) => value && typeof value === 'object' && !Array.isArray(value));
	return (nested ?? {}) as Record<string, unknown>;
}

function panel(): HTMLElement | null {
	return document.querySelector<HTMLElement>('[data-slot="record-panel"]');
}

function field(name: string): HTMLElement {
	const element = panel()?.querySelector<HTMLElement>(`[data-slot="record-field"][data-field="${name}"]`);
	if (!element) throw new Error(`No field ${name} in the panel`);
	return element;
}

function buttonIn(parent: ParentNode, label: string): HTMLButtonElement {
	const found = Array.from(parent.querySelectorAll('button')).find(
		(button) => button.textContent?.trim() === label || button.getAttribute('aria-label') === label,
	);
	if (!found) throw new Error(`No "${label}" button`);
	return found;
}

function title(): string {
	return panel()?.querySelector('[data-slot="sheet-title"]')?.textContent ?? '';
}

describe('record panel', () => {
	let root: Root;
	let container: HTMLDivElement;
	let queryClient: QueryClient;

	beforeEach(() => {
		vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(1600);
		vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(800);
		vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 1600, 33));
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

	interface MountOptions {
		recordId?: SheetsRowIdentifier | null;
		onRecordOpenChange?: (recordId: SheetsRowIdentifier | null) => void;
		execute?: SheetsExecuteFn;
		handle?: React.RefObject<SheetsHandle | null>;
		/** The table has no rows: wait for the empty state instead of the first row. */
		empty?: boolean;
	}

	async function mount(table: string, backend: TortureBackend, options: MountOptions = {}) {
		const config: SheetsConfig = {
			endpoint: 'https://data.local/graphql',
			auth: { mode: 'embedded', getToken: () => null, getIdentityKey: () => 'user-1' },
			execute: options.execute ?? backend.execute,
			queryClient,
		};
		const render = (recordId: SheetsRowIdentifier | null | undefined) =>
			root.render(
				<div style={{ height: 800, width: 1600 }}>
					<SheetsProvider config={config}>
						<Sheets
							ref={options.handle}
							tableName={table}
							recordId={recordId}
							onRecordOpenChange={options.onRecordOpenChange}
						/>
					</SheetsProvider>
				</div>,
			);
		await act(async () => render(options.recordId));
		if (options.empty) await waitUntil(() => container.querySelector('[data-part-id], [data-slot]') && !container.querySelector('[aria-busy="true"]'), `${table} empty state`);
		else await waitUntil(() => container.querySelector('[id^="sheets-cell-0-"]'), `${table} rows`);
		return { rerender: async (recordId: SheetsRowIdentifier | null | undefined) => act(async () => render(recordId)) };
	}

	it('a host opens a record by id: the title comes from the display fields and each field is routed like its grid cell', async () => {
		const backend = createTortureBackend({ server: 'v2' });
		const changes: (SheetsRowIdentifier | null)[] = [];
		const view = await mount('GeneratedValue', backend, { recordId: 1, onRecordOpenChange: (id) => changes.push(id) });

		await waitUntil(() => title() === '1', 'the record title (its key: the display field is empty)');
		// Computed and write-protected columns show the model's reason, as in the grid.
		expect(field('total').querySelector('[data-slot="record-field-reason"]')?.textContent).toBeTruthy();
		expect(field('total').textContent).toContain('59.97');
		expect(field('frozenCode').querySelector('[data-slot="record-field-reason"]')?.textContent).toBeTruthy();
		// A field the update accepts edits in place.
		expect(field('quantity').querySelector('input')).not.toBeNull();

		await view.rerender(null);
		await waitUntil(() => !panel(), 'the panel to close');
		expect(changes).toEqual([]);
	});

	it('a field edit saves the parsed value through the update; a value that does not fit is refused on the field', async () => {
		const backend = createTortureBackend({ server: 'v2' });
		await mount('ScalarKind', backend, { recordId: '00000000-0000-4000-8000-000000000001' });
		await waitUntil(() => title() === 'typical', 'the record');

		const bigint = field('bigintValue').querySelector<HTMLInputElement>('input')!;
		expect(bigint.value).toBe('9007199254740993');
		await typeText(bigint, '9223372036854775806');
		await pressKey(bigint, 'Enter');
		const update = await waitUntil(() => backend.mutations.find((mutation) => mutation.op === 'update'), 'the update');
		expect(writtenValues(update)).toEqual({ bigintValue: '9223372036854775806' });

		const integer = field('integerValue').querySelector<HTMLInputElement>('input')!;
		await typeText(integer, 'forty-two');
		await pressKey(integer, 'Enter');
		await waitUntil(() => field('integerValue').querySelector('[role="alert"]'), 'the refusal');
		expect(field('integerValue').querySelector('[role="alert"]')?.textContent).toBe('Enter a whole number.');
		expect(backend.mutations).toHaveLength(1);

		// Escape restores the stored value and keeps the panel open.
		await pressKey(integer, 'Escape');
		expect(integer.value).toBe('42');
		expect(panel()).not.toBeNull();
	});

	it('choices use the grid option picker and booleans keep "no value" apart from No', async () => {
		const backend = createTortureBackend({ server: 'v2' });
		await mount('Task', backend, { recordId: '1' });
		await waitUntil(() => title() === 'Design the mill', 'the task');

		expect(field('status').textContent).toContain('in_progress');
		await fire(buttonIn(field('status'), 'Edit Status'), 'click');
		const option = await waitUntil(
			() => Array.from(field('status').querySelectorAll<HTMLElement>('[role="option"]')).find((entry) => entry.textContent?.includes('Blocked')),
			'the Blocked option',
		);
		await fire(option, 'click');
		const update = await waitUntil(() => backend.mutations.find((mutation) => mutation.op === 'update'), 'the update');
		expect(writtenValues(update)).toEqual({ status: 'BLOCKED' });
		await waitUntil(() => field('status').textContent?.includes('Blocked'), 'the new label');
		// Closing the picker, by a pick or by Escape, gives focus back to the field's Edit button.
		expect(document.activeElement).toBe(buttonIn(field('status'), 'Edit Status'));
		await fire(buttonIn(field('status'), 'Edit Status'), 'click');
		await waitUntil(() => field('status').querySelector('[role="listbox"]'), 'the picker again');
		await pressKey(document.activeElement!, 'Escape');
		await waitUntil(() => !field('status').querySelector('[role="listbox"]'), 'the picker to close');
		expect(document.activeElement).toBe(buttonIn(field('status'), 'Edit Status'));
		expect(panel()).not.toBeNull();

		await act(async () => root.unmount());
		root = createRoot(container);
		const scalars = createTortureBackend({ server: 'v2' });
		await mount('ScalarKind', scalars, { recordId: '00000000-0000-4000-8000-000000000003' });
		await waitUntil(() => title() === 'nulls', 'the nulls record');
		const radios = () => Array.from(field('boolNullable').querySelectorAll<HTMLInputElement>('input[type="radio"]'));
		expect(radios().map((radio) => radio.parentElement?.textContent)).toEqual(['Yes', 'No', 'Empty']);
		expect(radios().find((radio) => radio.checked)?.parentElement?.textContent).toBe('Empty');
		// A required boolean offers no Empty.
		expect(field('boolRequired').querySelectorAll('input[type="radio"]')).toHaveLength(2);
		await fire(radios()[0]!, 'click');
		await waitUntil(() => scalars.mutations.length === 1, 'the boolean update');
		expect(writtenValues(scalars.mutations[0])).toEqual({ boolNullable: true });
	});

	it('a save the server refuses keeps its message on the field and puts the value back', async () => {
		const backend = createTortureBackend({ server: 'v2' });
		const execute: SheetsExecuteFn = async <T,>(document: unknown, variables?: Record<string, unknown>) => {
			if (/^\s*mutation\b/.test(String(document))) throw new Error('Quantity must be at least 1.');
			return backend.execute<T>(document, variables);
		};
		await mount('GeneratedValue', backend, { recordId: 1, execute });
		await waitUntil(() => title() === '1', 'the record');

		const quantity = field('quantity').querySelector<HTMLInputElement>('input')!;
		await typeText(quantity, '0');
		await pressKey(quantity, 'Enter');
		await waitUntil(() => field('quantity').querySelector('[role="alert"]'), 'the server message');
		expect(field('quantity').querySelector('[role="alert"]')?.textContent).toContain('Quantity must be at least 1.');
		// The stored value is shown again under the message (the typed text stays until the user moves on).
		await pressKey(quantity, 'Escape');
		expect(quantity.value).toBe('3');
	});

	it('previous and next walk the grid rows and report the record to the host; delete asks first', async () => {
		const backend = createTortureBackend({ server: 'v2' });
		const handle = createRef<SheetsHandle>();
		const changes: (SheetsRowIdentifier | null)[] = [];
		await mount('Country', backend, { handle, onRecordOpenChange: (id) => changes.push(id) });

		await act(async () => {
			expect(handle.current?.openRecord({ isoCode: 'FR' })).toBe(true);
		});
		await waitUntil(() => title() === 'France', 'France');
		expect(buttonIn(panel()!, 'Previous record').disabled).toBe(true);
		await fire(buttonIn(panel()!, 'Next record'), 'click');
		await waitUntil(() => title() === 'Japan', 'Japan');
		expect(changes).toEqual([{ isoCode: 'FR' }, { isoCode: 'JP' }]);

		// Delete waits for the record to load.
		await waitUntil(() => !buttonIn(panel()!, 'Delete record').disabled, 'the loaded record');
		await fire(buttonIn(panel()!, 'Delete record'), 'click');
		// Escape cancels the confirmation and gives focus back to the delete button; the panel stays open.
		const first = await waitUntil(() => panel()?.querySelector<HTMLElement>('[data-slot="record-delete-confirm"]'), 'the confirmation');
		await pressKey(buttonIn(first, 'Cancel'), 'Escape');
		await waitUntil(() => !panel()?.querySelector('[data-slot="record-delete-confirm"]'), 'the cancelled confirmation');
		expect(document.activeElement).toBe(buttonIn(panel()!, 'Delete record'));
		await fire(buttonIn(panel()!, 'Delete record'), 'click');
		const confirmation = await waitUntil(
			() => panel()?.querySelector<HTMLElement>('[data-slot="record-delete-confirm"]'),
			'the delete confirmation',
		);
		expect(backend.mutations.some((mutation) => mutation.op === 'delete')).toBe(false);
		const confirm = buttonIn(confirmation, 'Delete');
		await fire(confirm, 'click');
		const removed = await waitUntil(() => backend.mutations.find((mutation) => mutation.op === 'delete'), 'the delete');
		expect((removed.variables as { input?: Record<string, unknown> }).input).toMatchObject({ isoCode: 'JP' });
		// The panel moves on to the next row's record.
		await waitUntil(() => title() === 'United States', 'the next record');
	});

	it('a new record is checked by the model form, sends only what was set, then shows the created record', async () => {
		const backend = createTortureBackend({ server: 'v2' });
		const handle = createRef<SheetsHandle>();
		await mount('Country', backend, { handle });

		await act(async () => {
			expect(handle.current?.openNewRecord()).toBe(true);
		});
		await waitUntil(() => title() === 'New record', 'the new-record form');
		await fire(buttonIn(panel()!, 'Create record'), 'click');
		expect(field('isoCode').querySelector('[role="alert"]')?.textContent).toBe('Iso code is required');
		expect(field('name').querySelector('[role="alert"]')?.textContent).toBe('Name is required');
		expect(backend.mutations).toHaveLength(0);

		const iso = field('isoCode').querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea')!;
		await typeText(iso, 'DE');
		await blur(iso);
		const name = field('name').querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea')!;
		await typeText(name, 'Germany');
		await blur(name);
		await fire(buttonIn(panel()!, 'Create record'), 'click');

		const create = await waitUntil(() => backend.mutations.find((mutation) => mutation.op === 'create'), 'the create');
		expect(writtenValues(create)).toEqual({ isoCode: 'DE', name: 'Germany' });
		await waitUntil(() => title() === 'Germany', 'the created record');
	});

	it('a new record can be filled in on an empty table', async () => {
		const backend = createTortureBackend({ server: 'v2' });
		backend.rows.Country.length = 0;
		const handle = createRef<SheetsHandle>();
		await mount('Country', backend, { handle, empty: true });
		await waitUntil(() => handle.current, 'the grid handle');

		await act(async () => {
			expect(handle.current?.openNewRecord()).toBe(true);
		});
		await waitUntil(() => title() === 'New record', 'the new-record form');
		const iso = field('isoCode').querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea')!;
		await typeText(iso, 'NZ');
		await blur(iso);
		const name = field('name').querySelector<HTMLInputElement | HTMLTextAreaElement>('input, textarea')!;
		await typeText(name, 'New Zealand');
		await blur(name);
		await fire(buttonIn(panel()!, 'Create record'), 'click');
		const create = await waitUntil(() => backend.mutations.find((mutation) => mutation.op === 'create'), 'the create');
		expect(writtenValues(create)).toEqual({ isoCode: 'NZ', name: 'New Zealand' });
		await waitUntil(() => title() === 'New Zealand', 'the created record');
	});

	it('the keyboard opens the active row with Shift+Space and Escape in the grid closes it; the toolbar opens a new record', async () => {
		const backend = createTortureBackend({ server: 'v2' });
		await mount('Country', backend);
		const grid = container.querySelector<HTMLElement>('[role="grid"]')!;

		await fire(container.querySelector('#sheets-cell-1-0')!, 'click');
		await act(async () => grid.focus());
		await pressKey(grid, ' ', { code: 'Space', shiftKey: true });
		await waitUntil(() => title() === 'Japan', 'the active row\'s record');

		await act(async () => grid.focus());
		await pressKey(grid, 'Escape');
		await waitUntil(() => !panel(), 'the panel to close');

		await fire(buttonIn(container, 'New record'), 'click');
		await waitUntil(() => title() === 'New record', 'the new-record form');
		expect(backend.mutations).toHaveLength(0);
	});

	it('linked records show per relation; opening one stacks it, Back returns, and the row expand control opens a row', async () => {
		const backend = createTortureBackend({ server: 'v2' });
		await mount('Person', backend);

		// The row marker's open button runs `record.open` for that row.
		const expand = await waitUntil(() => container.querySelector<HTMLButtonElement>('[data-part-id="sheets-row-expand"]'), 'the row open button');
		await fire(expand, 'click');
		const person = await waitUntil(() => title() || null, 'the person');
		const owned = await waitUntil(
			() => panel()?.querySelector<HTMLElement>('[data-slot="relation-section"][data-relation="ownedProjects"]'),
			'the owned projects section',
		);
		const open = await waitUntil(
			() => owned.querySelector<HTMLButtonElement>('button[aria-label^="Open "]'),
			'an owned project to open',
		);
		const projectName = open.getAttribute('aria-label')!.slice('Open '.length);
		await fire(open, 'click');
		await waitUntil(() => title() === projectName, 'the linked project');
		expect(panel()?.textContent).toContain('Project');

		await fire(buttonIn(panel()!, 'Back to the previous record'), 'click');
		await waitUntil(() => title() === person, 'back to the person');
		expect(backend.mutations).toHaveLength(0);
	});

	it('a file field opens the uploads editor, read-only with the grid\'s reason when there is no storage', async () => {
		const backend = createTortureBackend({ server: 'v2' });
		await mount('DomainKind', backend, { recordId: '00000000-0000-4000-8000-0000000000d1' });
		await waitUntil(() => title() === 'Someone@Example.com', 'the record');

		expect(field('avatar').querySelector('[data-slot="record-field-reason"]')?.textContent).toContain('Uploads need a storage endpoint');
		await fire(buttonIn(field('avatar'), 'View Avatar'), 'click');
		await waitUntil(() => field('avatar').querySelector('[data-slot="image-editor"]'), 'the file editor');
		expect(backend.mutations).toHaveLength(0);
	});

	it('a value the server could not send shows its notice and cannot be edited; closing returns focus to the grid', async () => {
		const backend = createTortureBackend({ server: 'v2' });
		backend.rows.SpecialValue[2].realValue = Number.NaN;
		const handle = createRef<SheetsHandle>();
		await mount('SpecialValue', backend, { handle });
		await act(async () => {
			handle.current?.openRecord(3);
		});
		await waitUntil(() => title() === 'finite', 'the record');

		expect(field('realValue').textContent).toContain('This value cannot be shown');
		expect(field('realValue').querySelector('input')).toBeNull();
		expect(field('realValue').querySelector('[data-slot="record-field-reason"]')?.textContent).toBeTruthy();
		expect(field('numericValue').querySelector<HTMLInputElement>('input')?.value).toBe('3.5');

		// Escape on a field closes the panel (an edit in progress takes Escape first, as tested above).
		await pressKey(field('numericValue').querySelector('input')!, 'Escape');
		await waitUntil(() => !panel(), 'the panel to close');
		await waitUntil(() => document.activeElement?.getAttribute('role') === 'grid', 'focus back on the grid');
	});
});

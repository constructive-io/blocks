// Test support for <Sheets> over the captured torture schema: mount one or more
// grids in one provider, record every request, inject failures, and drive the
// controls as a user (selects, inputs, keys). Used by the integration tests of
// the filters, sort, search, views and column layout.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, vi } from 'vitest';

import { createTortureBackend, type TortureBackend } from '../../../adapter/__tests__/torture-backend';
import type { SheetsConfig } from '../../../context/sheets-context';
import { SheetsProvider } from '../../../context/sheets-provider';
import type { SheetsExecuteFn } from '../../../context/sheets-execute';
import { fieldLabel } from '../../../cell-types/field-label';
import { Sheets, type SheetsProps } from '../../sheets';

export type { TortureBackend };

let root: Root;
let container: HTMLDivElement;
let queryClient: QueryClient;

/** Register the jsdom layout shims and a fresh root per test. Call once at the top of a test file. */
export function useSheetsHarness(): void {
	beforeEach(() => {
		// Base UI creates a PointerEvent while activating a checkbox; jsdom has no constructor for it.
		if (typeof window.PointerEvent === 'undefined') {
			Object.defineProperty(window, 'PointerEvent', { configurable: true, writable: true, value: MouseEvent });
		}
		vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(4000);
		vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(900);
		vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 4000, 33));
		queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
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
}

export function harnessContainer(): HTMLDivElement {
	return container;
}

export async function waitUntil<T>(read: () => T | null | undefined | false, what = 'the expected state'): Promise<T> {
	for (let attempt = 0; attempt < 400; attempt++) {
		const found = read();
		if (found) return found;
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 20));
		});
	}
	throw new Error(`Timed out waiting for ${what}`);
}

/** Let typed text commit and the next list request go out. */
export async function settle(ms = 320) {
	await act(async () => {
		await new Promise((resolve) => setTimeout(resolve, ms));
	});
}

export type GridOptions = Omit<SheetsProps, 'tableName'>;

export interface Harness {
	backend: TortureBackend;
	/** Make requests whose text matches fail with `error`, until `heal` is called. */
	failWhen: (match: (source: string) => boolean, error: () => unknown) => { heal: () => void };
	mount: (tables: readonly { name: string; options?: GridOptions }[], config?: Partial<SheetsConfig>) => Promise<void>;
	/** Remove every grid (the provider stays mounted). */
	unmountGrids: () => Promise<void>;
}

export function createHarness(): Harness {
	const backend = createTortureBackend({ server: 'v2' });
	const failures: { match: (source: string) => boolean; error: () => unknown; active: boolean }[] = [];
	const execute: SheetsExecuteFn = async <T,>(document: unknown, variables?: Record<string, unknown>) => {
		const source = String(document);
		const failure = failures.find((entry) => entry.active && entry.match(source));
		if (failure) {
			backend.requests.push({ source, variables });
			throw failure.error();
		}
		return backend.execute<T>(document, variables);
	};
	let lastConfig: Partial<SheetsConfig> = {};
	const renderWith = async (tables: readonly { name: string; options?: GridOptions }[], config: Partial<SheetsConfig>) => {
		lastConfig = config;
		await act(async () =>
			root.render(
				<SheetsProvider
					config={{
						endpoint: 'mock://sheets',
						auth: { mode: 'embedded', getToken: () => 'test', getIdentityKey: () => 'user-1' },
						execute,
						queryClient,
						...config,
					}}
				>
					{tables.map((table) => (
						<div key={table.name} data-table={table.name} style={{ height: 900, width: 4000 }}>
							<Sheets tableName={table.name} {...table.options} />
						</div>
					))}
				</SheetsProvider>,
			),
		);
	};
	return {
		backend,
		mount: (tables, config = {}) => renderWith(tables, config),
		unmountGrids: () => renderWith([], lastConfig),
		failWhen: (match, error) => {
			const entry = { match, error, active: true };
			failures.push(entry);
			return { heal: () => (entry.active = false) };
		},
	};
}

export async function render(tables: readonly { name: string; options?: GridOptions }[], config?: Partial<SheetsConfig>): Promise<Harness> {
	const harness = createHarness();
	await harness.mount(tables, config);
	return harness;
}

export const renderTable = async (name: string, options?: GridOptions) => (await render([{ name, options }])).backend;

export function gridOf(table?: string): HTMLElement {
	return table ? container.querySelector<HTMLElement>(`[data-table="${table}"]`)! : container;
}

/** Column keys of the header row, in display order. */
export function headerKeys(table?: string): string[] {
	return Array.from(gridOf(table).querySelectorAll('[role="columnheader"][data-col-key]')).map(
		(header) => header.getAttribute('data-col-key') ?? '',
	);
}

/** The header cell of a column. */
export function header(colKey: string, table?: string): HTMLElement {
	return gridOf(table).querySelector<HTMLElement>(`[role="columnheader"][data-col-key="${colKey}"]`)!;
}

/** Text of one column for every rendered row, in row order. */
export function columnTexts(colKey: string, table?: string): string[] {
	const scope = gridOf(table);
	const column = headerKeys(table).indexOf(colKey);
	if (column === -1) return [];
	return Array.from(scope.querySelectorAll<HTMLElement>('[role="row"][data-row]')).map((row) => {
		const index = row.getAttribute('data-row');
		return scope.querySelector(`#sheets-cell-${index}-${column}`)?.textContent?.trim() ?? '';
	});
}

export async function rowsShown(colKey: string, expected: readonly string[], table?: string) {
	await waitUntil(
		() => JSON.stringify([...columnTexts(colKey, table)].sort()) === JSON.stringify([...expected].sort()),
		`rows ${JSON.stringify(expected)} (shown: ${JSON.stringify(columnTexts(colKey, table))})`,
	);
}

/** JSON with sorted keys, for comparing filter objects. */
export function stable(value: unknown): string {
	return JSON.stringify(value, (_key, entry) =>
		entry && typeof entry === 'object' && !Array.isArray(entry)
			? Object.fromEntries(Object.entries(entry as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
			: entry,
	);
}

/** The list requests of a table, in order. */
export function listRequests(backend: TortureBackend, table: string) {
	return backend.requests.filter((request) => request.source.includes(`query ModelList_${table}`));
}

export function listVariables(backend: TortureBackend, table: string): Record<string, unknown>[] {
	return listRequests(backend, table).map((request) => request.variables ?? {});
}

export async function sentWhere(backend: TortureBackend, table: string, expected: unknown) {
	await waitUntil(
		() => stable(listVariables(backend, table).at(-1)?.where ?? null) === stable(expected),
		`a ${table} list request with ${stable(expected)} (last: ${stable(listVariables(backend, table).at(-1)?.where ?? null)})`,
	);
}

export async function sentOrderBy(backend: TortureBackend, table: string, expected: readonly string[] | undefined) {
	await waitUntil(
		() => stable(listVariables(backend, table).at(-1)?.orderBy ?? null) === stable(expected ?? null),
		`a ${table} list request ordered by ${stable(expected ?? null)}`,
	);
}

export function byText<T extends HTMLElement>(selector: string, text: string, scope: ParentNode = document): T | undefined {
	return Array.from(scope.querySelectorAll<T>(selector)).find((element) => element.textContent?.trim() === text);
}

export function byLabel<T extends HTMLElement>(label: string | RegExp, scope: ParentNode = document): T | undefined {
	return Array.from(scope.querySelectorAll<T>('[aria-label]')).find((element) => {
		const value = element.getAttribute('aria-label') ?? '';
		return typeof label === 'string' ? value === label : label.test(value);
	});
}

export async function click(element: HTMLElement, init: MouseEventInit = {}) {
	await act(async () => {
		element.dispatchEvent(new MouseEvent('click', { bubbles: true, ...init }));
	});
}

/** Press and click, the way a pointer opens a Base UI trigger or picks an item. */
export async function press(element: HTMLElement) {
	await act(async () => {
		for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup']) {
			element.dispatchEvent(new MouseEvent(type, { bubbles: true }));
		}
		element.click();
	});
}

/** Open a select and pick the option whose text is `label` from the list that trigger opened. */
export async function choose(trigger: HTMLElement, label: string) {
	await act(async () => trigger.click());
	const option = await waitUntil(() => {
		const list = document.getElementById(trigger.getAttribute('aria-controls') ?? '');
		return list ? byText<HTMLElement>('[role="option"]', label, list) : null;
	}, `the option "${label}"`);
	await press(option);
	await waitUntil(() => trigger.getAttribute('aria-expanded') !== 'true', 'the option list to close');
}

export async function typeText(input: HTMLInputElement, text: string) {
	const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
	await act(async () => {
		setter.call(input, text);
		input.dispatchEvent(new Event('input', { bubbles: true }));
	});
}

export async function key(target: HTMLElement, keyName: string, init: KeyboardEventInit = {}) {
	await act(async () => {
		target.dispatchEvent(new KeyboardEvent('keydown', { key: keyName, bubbles: true, cancelable: true, ...init }));
	});
}

/** The platform's Mod key (Cmd on a Mac, Ctrl elsewhere) for KeyboardEvent init. */
export function modKey(): KeyboardEventInit {
	return /mac/i.test(navigator.platform) ? { metaKey: true } : { ctrlKey: true };
}

export async function openFilters(table?: string) {
	const trigger = await waitUntil(() => byLabel<HTMLElement>(/^Filters/, gridOf(table)), 'the Filters button');
	await click(trigger);
	return waitUntil(() => document.querySelector<HTMLElement>('[data-part-id="sheets-filter-group"]'), 'the filter builder');
}

/** Add a condition to `group` and return its row. */
export async function addCondition(group: HTMLElement): Promise<HTMLElement> {
	const before = group.querySelectorAll(':scope > .grid > [data-part-id="sheets-filter-condition"]').length;
	const button = Array.from(group.querySelectorAll<HTMLElement>(':scope > div > button')).find(
		(candidate) => candidate.textContent?.trim() === 'Add condition',
	)!;
	await click(button);
	return waitUntil(() => {
		const rows = group.querySelectorAll<HTMLElement>(':scope > .grid > [data-part-id="sheets-filter-condition"]');
		return rows.length > before ? rows[rows.length - 1] : null;
	}, 'the new condition');
}

/** Build one condition on a field (by its raw name; the builder shows its label): field, operator, then the value step. */
export async function condition(
	row: HTMLElement,
	field: string,
	operator: string | null,
	value?: (row: HTMLElement) => Promise<void>,
) {
	const label = fieldLabel(field);
	await choose(byLabel<HTMLElement>('Field', row)!, label);
	if (operator) await choose(await waitUntil(() => byLabel<HTMLElement>(`Condition for ${label}`, row), 'the operator'), operator);
	if (value) await value(row);
}

export const typeValue = (text: string) => async (row: HTMLElement) => {
	const input = await waitUntil(() => byLabel<HTMLInputElement>(/^Value for /, row), 'the value input');
	await typeText(input, text);
	await settle();
};

export const pickValue = (label: string) => async (row: HTMLElement) => {
	await choose(await waitUntil(() => byLabel<HTMLElement>(/^Value for /, row), 'the value select'), label);
};

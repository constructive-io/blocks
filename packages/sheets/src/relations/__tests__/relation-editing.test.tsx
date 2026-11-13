/* @vitest-environment jsdom */
//
// Relation editing through the public surface: <Sheets> over the captured
// torture schema (the model backend), opened and driven as a user, with
// assertions on what the editor shows and on the exact mutations the backend
// receives. Every relation shape is driven by the table model only: renamed,
// composite and unique non-key references, two relations to one table,
// required links, pure and impure junctions, self references, search, and
// the older server without `remoteKeys`.
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTortureBackend, type TortureBackend, type TortureServer } from '../../adapter/__tests__/torture-backend';
import type { SheetsExecuteFn } from '../../context/sheets-execute';
import { SheetsProvider } from '../../context/sheets-provider';
import { Sheets } from '../../grid/sheets';
import type { SheetsOpenTableRequest } from '../relation-navigation';

vi.mock('@constructive-io/ui/toast', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
// Each test renders the whole grid and waits on several round-trips; leave room on a busy machine.
vi.setConfig({ testTimeout: 20_000 });

const ADA = '00000000-0000-4000-8000-0000000000a1';
const GRACE = '00000000-0000-4000-8000-0000000000a2';

let root: Root;
let container: HTMLDivElement;
let queryClient: QueryClient;

beforeEach(() => {
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

async function waitUntil<T>(read: () => T | null | undefined | false, what = 'the expected state'): Promise<T> {
	for (let attempt = 0; attempt < 200; attempt++) {
		const found = read();
		if (found) return found;
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 20));
		});
	}
	throw new Error(`Timed out waiting for ${what}`);
}

interface RenderOptions {
	server?: TortureServer;
	onOpenTable?: (request: SheetsOpenTableRequest) => void;
	/** Reject a mutation with a server message: return the message, or null to let it through. */
	rejectMutation?: (source: string, variables: Record<string, unknown> | undefined) => string | null;
	/** Act as a host that opens a requested table below the grid, with the request's filters. */
	openTables?: boolean;
}

/** A host that opens the table an `onOpenTable` request names, filtered as the request says. */
function OpenTableHost({ tableName, onOpenTable }: { tableName: string; onOpenTable?: (request: SheetsOpenTableRequest) => void }) {
	const [opened, setOpened] = useState<SheetsOpenTableRequest | null>(null);
	return (
		<>
			<Sheets
				tableName={tableName}
				onOpenTable={(request) => {
					onOpenTable?.(request);
					setOpened(request);
				}}
			/>
			{opened ? (
				<section data-testid='opened-table' style={{ height: 400, width: 4000 }}>
					<Sheets tableName={opened.tableKey} filters={opened.filters ?? undefined} />
				</section>
			) : null}
		</>
	);
}

async function render(tableName: string, options: RenderOptions = {}) {
	const backend = createTortureBackend({ server: options.server ?? 'v2' });
	const execute: SheetsExecuteFn = async <T,>(document: unknown, variables?: Record<string, unknown>) => {
		const source = String(document);
		const rejection = /^\s*mutation\b/.test(source) ? options.rejectMutation?.(source, variables) : null;
		if (rejection) throw new Error(rejection);
		return backend.execute<T>(document, variables);
	};
	await act(async () =>
		root.render(
			<div style={{ height: 900, width: 4000 }}>
				<SheetsProvider
					config={{
						endpoint: 'mock://sheets',
						auth: { mode: 'embedded', getToken: () => 'test', getIdentityKey: () => 'user-1' },
						execute,
						queryClient,
					}}
				>
					{options.openTables ? (
						<OpenTableHost tableName={tableName} onOpenTable={options.onOpenTable} />
					) : (
						<Sheets tableName={tableName} onOpenTable={options.onOpenTable} />
					)}
				</SheetsProvider>
			</div>,
		),
	);
	return backend;
}

function headerKeys(): string[] {
	return Array.from(container.querySelectorAll('[role="columnheader"][data-col-key]')).map(
		(header) => header.getAttribute('data-col-key') ?? '',
	);
}

/** The cell of `colKey` in the row whose `labelKey` column shows `label`, or null. */
function findCell(colKey: string, labelKey: string, label: string): HTMLElement | null {
	const keys = headerKeys();
	const column = keys.indexOf(colKey);
	const labelColumn = keys.indexOf(labelKey);
	if (column === -1 || labelColumn === -1) return null;
	for (const row of Array.from(container.querySelectorAll<HTMLElement>('[role="row"][data-row]'))) {
		const index = row.getAttribute('data-row');
		const labelCell = container.querySelector(`#sheets-cell-${index}-${labelColumn}`);
		if (labelCell?.textContent?.trim() === label) return container.querySelector<HTMLElement>(`#sheets-cell-${index}-${column}`);
	}
	return null;
}

function cell(colKey: string, labelKey: string, label: string): Promise<HTMLElement> {
	return waitUntil(() => findCell(colKey, labelKey, label), `the ${colKey} cell of "${label}"`);
}

async function openEditor(colKey: string, labelKey: string, label: string): Promise<HTMLElement> {
	const target = await cell(colKey, labelKey, label);
	await act(async () => {
		target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
		target.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
	});
	return waitUntil(() => document.querySelector<HTMLElement>('[data-slot="relation-editor"]'), 'the relation editor');
}

function options(editor: HTMLElement): HTMLElement[] {
	return Array.from(editor.querySelectorAll<HTMLElement>('[role="option"]'));
}

async function option(editor: HTMLElement, label: string): Promise<HTMLElement> {
	return waitUntil(() => options(editor).find((entry) => entry.textContent?.includes(label)), `the option "${label}"`);
}

function linked(editor: HTMLElement): string[] {
	return Array.from(editor.querySelectorAll('[data-testid="relation-links"] li[data-state]'))
		.filter((item) => item.getAttribute('data-state') !== 'removed')
		.map((item) => item.querySelector('[title]')?.getAttribute('title') ?? '');
}

function button(scope: ParentNode, label: string): HTMLButtonElement | undefined {
	return Array.from(scope.querySelectorAll<HTMLButtonElement>('button')).find((entry) => entry.textContent?.trim() === label);
}

/** A button that is rendered and enabled (the editor enables writes once the related models load). */
function enabled(scope: ParentNode, selector: string): Promise<HTMLButtonElement> {
	return waitUntil(() => {
		const found = scope.querySelector<HTMLButtonElement>(selector);
		return found && !found.disabled ? found : null;
	}, `an enabled ${selector}`);
}

async function click(element: HTMLElement) {
	await act(async () => {
		element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
	});
}

async function save(editor: HTMLElement) {
	const saveButton = await waitUntil(() => {
		const found = button(editor, 'Save');
		return found && !found.disabled ? found : null;
	}, 'an enabled Save button');
	await click(saveButton);
}

async function typeInto(input: HTMLInputElement, text: string) {
	await act(async () => {
		const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
		setter?.call(input, text);
		input.dispatchEvent(new Event('input', { bubbles: true }));
	});
}

async function key(element: HTMLElement, name: string) {
	await act(async () => {
		element.dispatchEvent(new KeyboardEvent('keydown', { key: name, bubbles: true }));
	});
}

function mutationsOf(backend: TortureBackend) {
	return backend.mutations.map(({ op, tableName, variables }) => ({ op, tableName, variables }));
}

async function editorClosed() {
	await waitUntil(() => !document.querySelector('[data-slot="relation-editor"]'), 'the editor to close');
}

describe('relation columns', () => {
	it('shows relation columns from the model with clean headers, hiding only the key fields of shown links', async () => {
		await render('Task');
		await cell('title', 'title', 'Design the mill');
		const keys = headerKeys();
		// The primary key first; each belongsTo takes the place of its key fields.
		expect(keys).toEqual([
			'id',
			'project',
			'title',
			'status',
			'reviewStatus',
			'priority',
			'personByAssigneeEmail',
			'warehouseItem',
			'dueOn',
			'labels',
		]);
		// The junction hasMany is covered by the many-to-many column.
		expect(keys).not.toContain('taskLabels');
		const headerText = Array.from(container.querySelectorAll('[role="columnheader"][data-col-key]')).map((header) => header.textContent ?? '');
		expect(headerText.every((text) => !text.includes('('))).toBe(true);
		// Headers read as labels; the column key stays the field name.
		expect(headerText.some((text) => text.includes('Person by assignee email'))).toBe(true);
	});

	it('labels links from the display rule, with key values for a composite key', async () => {
		await render('Task');
		expect((await cell('warehouseItem', 'title', 'Design the mill')).textContent).toContain('east · SKU-1');
		expect((await cell('project', 'title', 'Design the mill')).textContent).toContain('Analytical Engine');
		const labels = await cell('labels', 'title', 'Design the mill');
		expect(labels.textContent).toContain('urgent');
		expect(labels.textContent).toContain('backend');
	});
});

describe('opening linked records from the grid', () => {
	it('opens a chip of the active cell in the record panel, and leaves other cells alone', async () => {
		await render('Task');
		const projectCell = await cell('project', 'title', 'Design the mill');
		const labelsCell = await cell('labels', 'title', 'Design the mill');
		// Not active yet: chips are plain text, a click only selects the cell.
		expect(projectCell.querySelector('button')).toBeNull();

		// A double-click keeps its grid meaning: the first click selects the cell (the chip
		// becomes a button), the second click and the double-click open the link editor.
		await act(async () => {
			projectCell.querySelector('span')!.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
		});
		const armed = await waitUntil(
			() => findCell('project', 'title', 'Design the mill')?.querySelector<HTMLButtonElement>('button[aria-label="Open Analytical Engine"]'),
			'the chip button',
		);
		await act(async () => {
			armed.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 2 }));
			armed.dispatchEvent(new MouseEvent('dblclick', { bubbles: true, detail: 2 }));
		});
		const editor = await waitUntil(() => document.querySelector<HTMLElement>('[data-slot="relation-editor"]'), 'the relation editor');
		expect(document.querySelector('[data-slot="record-panel"]')).toBeNull();
		await key(editor.querySelector<HTMLInputElement>('input[role="combobox"]') ?? editor, 'Escape');
		await editorClosed();

		// A single click on the chip of the active cell opens its record.
		await click(projectCell);
		const chip = await waitUntil(
			() => findCell('project', 'title', 'Design the mill')?.querySelector<HTMLButtonElement>('button[aria-label="Open Analytical Engine"]'),
			'the open chip',
		);
		expect(labelsCell.querySelector('button')).toBeNull();
		await click(chip);
		const panel = await waitUntil(() => document.querySelector<HTMLElement>('[data-slot="record-panel"]'), 'the record panel');
		await waitUntil(() => panel.textContent?.includes('Analytical Engine'), 'the linked record in the panel');
		expect(document.querySelector('[data-slot="relation-editor"]')).toBeNull();
	});
});

describe('keyboard focus', () => {
	it('Enter opens the link editor with focus in the search box, arrows move the option, Escape gives focus back to the grid cell', async () => {
		const backend = await render('Task');
		const projectCell = await cell('project', 'title', 'Punch the cards');
		const grid = container.querySelector<HTMLElement>('[role="grid"]')!;
		await click(projectCell);
		const activeCell = grid.getAttribute('aria-activedescendant');
		expect(activeCell).toBe(projectCell.id);

		await act(async () => grid.focus());
		await key(grid, 'Enter');
		const editor = await waitUntil(() => document.querySelector<HTMLElement>('[data-slot="relation-editor"]'), 'the relation editor');
		const search = await waitUntil(
			() => (document.activeElement?.getAttribute('role') === 'combobox' ? (document.activeElement as HTMLInputElement) : null),
			'focus in the search box',
		);
		expect(editor.contains(search)).toBe(true);
		await option(editor, 'Kernel');
		const first = search.getAttribute('aria-activedescendant');
		await key(search, 'ArrowDown');
		expect(search.getAttribute('aria-activedescendant')).not.toBe(first);

		await key(search, 'Escape');
		await editorClosed();
		expect(document.activeElement).toBe(grid);
		expect(grid.getAttribute('aria-activedescendant')).toBe(activeCell);
		expect(backend.mutations).toEqual([]);
	});
});

describe('belongsTo editing', () => {
	it('writes a renamed key field (Project.country -> Country.isoCode)', async () => {
		const backend = await render('Project');
		const editor = await openEditor('country', 'name', 'Compiler');
		await click(await option(editor, 'Japan'));
		await save(editor);
		await editorClosed();

		expect(mutationsOf(backend)).toEqual([
			{ op: 'update', tableName: 'Project', variables: { input: { id: 2, projectPatch: { countryCode: 'JP' } } } },
		]);
		await waitUntil(() => findCell('country', 'name', 'Compiler')?.textContent?.includes('Japan'), 'the new label');
	});

	it('writes every field of a composite key (Task.warehouseItem)', async () => {
		const backend = await render('Task');
		const editor = await openEditor('warehouseItem', 'title', 'Punch the cards');
		// Readable heading (raw field name as its title); a to-one picker chooses one record.
		const heading = editor.querySelector('[data-slot="editor-header"] h3');
		expect(heading?.textContent).toBe('Warehouse item');
		expect(heading?.getAttribute('title')).toBe('warehouseItem');
		expect(editor.querySelector('[data-slot="editor-header"]')?.textContent).toContain('One linked WarehouseItem record');
		await waitUntil(() => editor.querySelector('section[aria-label="Choose from WarehouseItem"]'), 'the to-one picker');
		await click(await option(editor, 'west · SKU-1'));
		await save(editor);
		await editorClosed();

		expect(mutationsOf(backend)).toEqual([
			{
				op: 'update',
				tableName: 'Task',
				variables: { input: { id: '2', taskPatch: { warehouseCode: 'west', sku: 'SKU-1' } } },
			},
		]);
	});

	it('writes the referenced unique field, not the key (Task.personByAssigneeEmail)', async () => {
		const backend = await render('Task');
		const editor = await openEditor('personByAssigneeEmail', 'title', 'Punch the cards');
		await click(await option(editor, 'Grace Hopper'));
		await save(editor);
		await editorClosed();

		expect(mutationsOf(backend)).toEqual([
			{ op: 'update', tableName: 'Task', variables: { input: { id: '2', taskPatch: { assigneeEmail: 'grace@example.com' } } } },
		]);
	});

	it('keeps a required link and says why it cannot be cleared (Project.owner)', async () => {
		const backend = await render('Project');
		const editor = await openEditor('owner', 'name', 'Compiler');
		await waitUntil(() => linked(editor).includes('Grace Hopper'), 'the current owner');

		await waitUntil(() => editor.textContent?.includes('This link is required, so it cannot be removed.'), 'the reason');
		// The footer's Clear is unavailable with the reason as its title; there is no Cancel (Escape cancels).
		const clearButton = button(editor, 'Clear');
		expect(clearButton?.title).toBe('This link is required, so it cannot be removed.');
		await click(clearButton!);
		expect(backend.mutations).toEqual([]);
		expect(button(editor, 'Cancel')).toBeUndefined();
		// No remove control for a link that cannot be removed; the reason is shown instead.
		expect(editor.querySelector('button[aria-label="Remove Grace Hopper"]')).toBeNull();

		// Replacing the owner is still allowed.
		await click(await option(editor, 'Ada Lovelace'));
		await save(editor);
		await editorClosed();
		expect(mutationsOf(backend)).toEqual([
			{ op: 'update', tableName: 'Project', variables: { input: { id: 2, projectPatch: { ownerId: ADA } } } },
		]);
	});

	it('clears an optional link from the footer and closes (Project.country)', async () => {
		const backend = await render('Project');
		const editor = await openEditor('country', 'name', 'Analytical Engine');
		const clearButton = await waitUntil(() => {
			const found = button(editor, 'Clear');
			return found && found.title === 'Remove the value' ? found : null;
		}, 'a usable Clear');
		await click(clearButton);
		await editorClosed();
		expect(mutationsOf(backend)).toEqual([
			{ op: 'update', tableName: 'Project', variables: { input: { id: 1, projectPatch: { countryCode: null } } } },
		]);
		await waitUntil(() => findCell('country', 'name', 'Analytical Engine')?.textContent === '', 'the cleared cell');
	});

	it('opens the linked record from the editor in the record panel', async () => {
		await render('Project');
		const editor = await openEditor('owner', 'name', 'Compiler');
		await click(await enabled(editor, 'button[aria-label="Open Grace Hopper"]'));
		const panel = await waitUntil(() => document.querySelector<HTMLElement>('[data-slot="record-panel"]'), 'the record panel');
		await waitUntil(() => panel.textContent?.includes('grace@example.com'), 'the linked person in the panel');
	});

	it('links a person to their manager (self reference)', async () => {
		const backend = await render('Person');
		const editor = await openEditor('manager', 'fullName', 'Linus Torvalds');
		await click(await option(editor, 'Grace Hopper'));
		await save(editor);
		await editorClosed();
		expect(mutationsOf(backend)).toEqual([
			{
				op: 'update',
				tableName: 'Person',
				variables: { input: { id: '00000000-0000-4000-8000-0000000000a3', personPatch: { managerId: GRACE } } },
			},
		]);
	});

	it('searches the label fields with the filter operators the related table has, and picks with the keyboard', async () => {
		const backend = await render('Project');
		const editor = await openEditor('reviewer', 'name', 'Compiler');
		await option(editor, 'Linus Torvalds');
		const search = editor.querySelector<HTMLInputElement>('input[role="combobox"]');
		expect(search).toBeTruthy();
		await typeInto(search!, 'grace');

		await waitUntil(() => options(editor).length === 1 && options(editor)[0]?.textContent?.includes('Grace Hopper'), 'one search result');
		const searched = backend.requests.find((request) => request.source.includes('people(') && request.variables?.where);
		expect(searched?.variables?.where).toEqual({
			or: [{ fullName: { includesInsensitive: 'grace' } }, { email: { includesInsensitive: 'grace' } }],
		});

		await key(search!, 'ArrowDown');
		await key(search!, 'Enter');
		expect(options(editor)[0]?.getAttribute('aria-selected')).toBe('true');
		await save(editor);
		await editorClosed();
		expect(mutationsOf(backend)).toEqual([
			{ op: 'update', tableName: 'Project', variables: { input: { id: 2, projectPatch: { reviewerId: GRACE } } } },
		]);
	});

	it('reports a failed save with the server message and keeps the choice', async () => {
		let reject = true;
		const backend = await render('Project', {
			rejectMutation: () => (reject ? 'permission denied for table projects' : null),
		});
		const editor = await openEditor('country', 'name', 'Compiler');
		await click(await option(editor, 'Japan'));
		await save(editor);

		const alert = await waitUntil(() => editor.querySelector('[role="alert"]'), 'the error');
		expect(alert.textContent).toContain('Could not link "Japan": permission denied for table projects');
		expect(document.querySelector('[data-slot="relation-editor"]')).toBe(editor);
		expect((await option(editor, 'Japan')).getAttribute('aria-selected')).toBe('true');
		expect(findCell('country', 'name', 'Compiler')?.textContent ?? '').not.toContain('Japan');
		expect(backend.mutations).toEqual([]);

		reject = false;
		await save(editor);
		await editorClosed();
		expect(mutationsOf(backend)).toEqual([
			{ op: 'update', tableName: 'Project', variables: { input: { id: 2, projectPatch: { countryCode: 'JP' } } } },
		]);
	});

	it('creates a related record from the picker and links it on Save', async () => {
		const backend = await render('Project');
		const editor = await openEditor('country', 'name', 'Compiler');
		await click(
			await waitUntil(() => {
				const found = button(editor, 'Create new');
				return found && !found.disabled ? found : null;
			}, 'a usable create button'),
		);

		const form = await waitUntil(() => editor.querySelector<HTMLFormElement>('form[aria-label="New Country"]'), 'the create form');
		const inputs = Array.from(form.querySelectorAll<HTMLInputElement>('input'));
		const labels = Array.from(form.querySelectorAll('label')).map((label) => label.textContent?.replace('*', '').trim());
		expect(labels).toEqual(['Iso code', 'Name']);
		await typeInto(inputs[0]!, 'DE');
		await typeInto(inputs[1]!, 'Germany');
		await click(button(form, 'Create')!);

		await waitUntil(() => editor.textContent?.includes('Created "Germany". Save to link it.'), 'the created notice');
		await save(editor);
		await editorClosed();
		expect(mutationsOf(backend)).toEqual([
			{ op: 'create', tableName: 'Country', variables: { input: { country: { isoCode: 'DE', name: 'Germany' } } } },
			{ op: 'update', tableName: 'Project', variables: { input: { id: 2, projectPatch: { countryCode: 'DE' } } } },
		]);
	});
});

describe('draft rows', () => {
	it('keeps a belongsTo choice on the draft and sends its key with the create', async () => {
		const backend = await render('PersonProfile');
		await cell('person', 'bio', 'First programmer');
		await click(await waitUntil(() => button(container, 'Add row'), 'the add row button'));
		const column = headerKeys().indexOf('person');
		const draftCell = await waitUntil(() => container.querySelector<HTMLElement>(`#sheets-cell-2-${column}`), 'the draft cell');
		await act(async () => {
			draftCell.dispatchEvent(new MouseEvent('click', { bubbles: true }));
			draftCell.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
		});
		const editor = await waitUntil(() => document.querySelector<HTMLElement>('[data-slot="relation-editor"]'), 'the editor');
		await click(await option(editor, 'Linus Torvalds'));
		await save(editor);
		await editorClosed();
		expect(backend.mutations).toEqual([]);
		await waitUntil(() => container.querySelector(`#sheets-cell-2-${column}`)?.textContent?.includes('Linus Torvalds'), 'the draft label');

		await click(await waitUntil(() => container.querySelector<HTMLElement>('[data-slot="draft-action-cell"]'), 'the draft save button'));
		await waitUntil(() => backend.mutations.length > 0, 'the create');
		expect(mutationsOf(backend)).toEqual([
			{
				op: 'create',
				tableName: 'PersonProfile',
				variables: { input: { personProfile: { personId: '00000000-0000-4000-8000-0000000000a3' } } },
			},
		]);
	});

	it('closes on Escape without writing anything', async () => {
		const backend = await render('Project');
		const editor = await openEditor('country', 'name', 'Compiler');
		await click(await option(editor, 'Japan'));
		await key(editor.querySelector<HTMLInputElement>('input[role="combobox"]')!, 'Escape');
		await editorClosed();
		expect(backend.mutations).toEqual([]);
	});
});

describe('hasOne / hasMany editing', () => {
	it('writes each relation to the same table through its own field (Person.ownedProjects, Person.reviewedProjects)', async () => {
		const backend = await render('Person');

		let editor = await openEditor('reviewedProjects', 'fullName', 'Ada Lovelace');
		await click(await option(editor, 'Compiler'));
		await save(editor);
		await editorClosed();

		editor = await openEditor('ownedProjects', 'fullName', 'Ada Lovelace');
		const kernel = await option(editor, 'Kernel');
		// Kernel belongs to another owner, so linking it moves it here.
		expect(kernel.textContent).toContain('moves it here');
		await click(kernel);
		await save(editor);
		await editorClosed();

		expect(mutationsOf(backend)).toEqual([
			{ op: 'update', tableName: 'Project', variables: { input: { id: 2, projectPatch: { reviewerId: ADA } } } },
			{ op: 'update', tableName: 'Project', variables: { input: { id: 3, projectPatch: { ownerId: ADA } } } },
		]);
	});

	it('loads the full link set through a filtered query and unlinks only when the model allows it', async () => {
		const backend = await render('Person');
		const editor = await openEditor('peopleByManagerId', 'fullName', 'Ada Lovelace');
		await waitUntil(() => linked(editor).length === 2, 'two reports');
		expect(linked(editor).sort()).toEqual(['Grace Hopper', 'Linus Torvalds']);
		const linksQuery = backend.requests.find((request) => request.source.includes('people(') && request.variables?.where);
		expect(linksQuery?.variables?.where).toEqual({ managerId: { equalTo: ADA } });

		await click(await enabled(editor, 'button[aria-label="Remove Linus Torvalds"]'));
		await save(editor);
		await editorClosed();
		expect(mutationsOf(backend)).toEqual([
			{
				op: 'update',
				tableName: 'Person',
				variables: { input: { id: '00000000-0000-4000-8000-0000000000a3', personPatch: { managerId: null } } },
			},
		]);
	});

	it('disables unlinking a link the related record must keep, with the reason (Project.tasks)', async () => {
		await render('Project');
		const editor = await openEditor('tasks', 'name', 'Analytical Engine');
		await waitUntil(() => linked(editor).length === 2, 'two tasks');
		expect(editor.querySelector('button[aria-label="Remove Design the mill"]')).toBeNull();
		await waitUntil(() => editor.textContent?.includes('Each linked record must keep this link, so it cannot be removed.'), 'the reason');
	});
	it('reports a partial failure per record, keeps the failed choice and refetches', async () => {
		const backend = await render('Person', {
			rejectMutation: (_source, variables) =>
				(variables?.input as { id?: unknown } | undefined)?.id === 2 ? 'Compiler is locked' : null,
		});
		const editor = await openEditor('reviewedProjects', 'fullName', 'Linus Torvalds');
		await click(await option(editor, 'Compiler'));
		await click(await option(editor, 'Analytical Engine'));
		await save(editor);

		const alert = await waitUntil(() => editor.querySelector('[role="alert"]'), 'the error');
		expect(alert.textContent).toContain('Saved 1 of 2 changes.');
		expect(alert.textContent).toContain('Could not link "Compiler": Compiler is locked');
		expect(mutationsOf(backend)).toEqual([
			{ op: 'update', tableName: 'Project', variables: { input: { id: 1, projectPatch: { reviewerId: '00000000-0000-4000-8000-0000000000a3' } } } },
		]);
		// The saved link comes back from the server; the failed one stays a pending choice.
		await waitUntil(() => linked(editor).includes('Analytical Engine') && linked(editor).includes('Kernel'), 'the refetched links');
		const pendingCompiler = editor.querySelector('[data-testid="relation-links"] li[data-state="added"]');
		expect(pendingCompiler?.textContent).toContain('Compiler');
	});
});

describe('manyToMany editing', () => {
	it('adds and removes junction rows on a pure junction with a composite key (Label.tasks)', async () => {
		const backend = await render('Label');
		const editor = await openEditor('tasks', 'name', 'backend');
		await waitUntil(() => editor.querySelector('section[aria-label="Add from Task"]'), 'the to-many picker');
		await waitUntil(() => linked(editor).length === 2, 'two linked tasks');

		await click(await enabled(editor, 'button[aria-label="Remove Write the linker"]'));
		await click(await option(editor, 'Merge the patches'));
		await save(editor);
		await editorClosed();

		expect(mutationsOf(backend)).toEqual([
			{ op: 'delete', tableName: 'TaskLabel', variables: { input: { taskId: '3', labelId: 2 } } },
			{ op: 'create', tableName: 'TaskLabel', variables: { input: { taskLabel: { labelId: 2, taskId: '4' } } } },
		]);
	});

	it('keeps a junction with required extra fields read-only with the reason and opens it filtered to this record', async () => {
		const requests: SheetsOpenTableRequest[] = [];
		const backend = await render('Project', { onOpenTable: (request) => requests.push(request), openTables: true });
		const editor = await openEditor('peopleByProjectMemberProjectIdAndPersonId', 'name', 'Analytical Engine');

		await waitUntil(() => linked(editor).length === 2, 'the two members');
		expect(linked(editor).sort()).toEqual(['Ada Lovelace', 'Grace Hopper']);
		await waitUntil(
			() => editor.textContent?.includes('Adding a link needs more information (role, joinedOn), so this field is read-only.'),
			'the reason',
		);
		expect(button(editor, 'Save')).toBeUndefined();
		expect(editor.querySelector('input[role="combobox"]')).toBeNull();

		await click(await waitUntil(() => button(editor, 'Open ProjectMember'), 'the open button'));
		expect(requests).toHaveLength(1);
		expect(requests[0]).toMatchObject({ tableKey: 'sheets_torture.ProjectMember', tableName: 'ProjectMember', reason: 'linked-records' });
		expect(requests[0]!.filters).toMatchObject({
			kind: 'group',
			logic: 'and',
			children: [{ kind: 'column', column: 'projectId', operator: 'equalTo', value: '1' }],
		});

		// The host passes the filters straight to the grid it opens: only this project's members show.
		const opened = await waitUntil(() => container.querySelector<HTMLElement>('[data-testid="opened-table"]'), 'the opened table');
		await waitUntil(() => opened.querySelectorAll('[role="row"][data-row]').length === 2, 'the two member rows');
		expect(opened.textContent).toContain('owner');
		expect(opened.textContent).toContain('reviewer');
		const listed = backend.requests.find((request) => request.source.includes('projectMembers(') && request.variables?.where);
		expect(listed?.variables?.where).toEqual({ projectId: { equalTo: 1 } });
		expect(backend.mutations).toEqual([]);
	});
});

describe('older server without remoteKeys', () => {
	it('keeps the ambiguous relations read-only while the unambiguous ones still edit', async () => {
		const backend = await render('Person', { server: 'baseline' });

		let editor = await openEditor('ownedProjects', 'fullName', 'Ada Lovelace');
		await waitUntil(() => editor.textContent?.includes('More than one link connects these tables, so this field is read-only.'), 'the reason');
		expect(button(editor, 'Save')).toBeUndefined();
		await key(editor.querySelector<HTMLElement>('[role="dialog"]') ?? editor, 'Escape');
		await editorClosed();

		editor = await openEditor('manager', 'fullName', 'Linus Torvalds');
		await click(await option(editor, 'Grace Hopper'));
		await save(editor);
		await editorClosed();
		expect(mutationsOf(backend)).toEqual([
			{
				op: 'update',
				tableName: 'Person',
				variables: { input: { id: '00000000-0000-4000-8000-0000000000a3', personPatch: { managerId: GRACE } } },
			},
		]);
	});
});

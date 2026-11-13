/* @vitest-environment jsdom */
//
// Column layout and saved views through the public surface: <Sheets> over the
// captured torture schema, driven as a user (Fields control, header drag,
// header menu, keyboard, view switcher), with assertions on what the grid
// shows, on the list requests it sends, and on what the view storage holds.
import { act } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fieldLabel } from '../../../cell-types/field-label';
import type { SheetsStoredView, SheetsViewStorage } from '../view-storage';
import { createMemoryViewStorage } from '../view-storage';
import type { SheetsColumnLayout } from '../../view-state/view-state.types';
import {
	byLabel,
	byText,
	choose,
	click,
	createHarness,
	gridOf,
	harnessContainer,
	header,
	headerKeys,
	key,
	listRequests,
	modKey,
	press,
	render,
	renderTable,
	sentOrderBy,
	sentWhere,
	typeText,
	useSheetsHarness,
	waitUntil,
} from '../../view-state/__tests__/sheets-harness';

vi.mock('@constructive-io/ui/toast', () => ({
	toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.setConfig({ testTimeout: 30_000 });

useSheetsHarness();

beforeEach(() => {
	window.localStorage.clear();
});

const TASK_COLUMNS = ['id', 'project', 'title', 'status', 'reviewStatus', 'priority', 'personByAssigneeEmail', 'warehouseItem', 'dueOn', 'labels'];

async function taskHeaders() {
	return waitUntil(() => (headerKeys().includes('priority') ? headerKeys() : null), 'the Task headers');
}

async function openFields() {
	await click(await waitUntil(() => byLabel<HTMLElement>(/^Fields/), 'the Fields button'));
	return waitUntil(() => document.querySelector<HTMLElement>('[data-part-id="sheets-fields-control"]'), 'the Fields control');
}

function field(key: string): HTMLElement {
	return document.querySelector<HTMLElement>(`[data-part-id="sheets-field"][data-field="${key}"]`)!;
}

async function drag(source: HTMLElement, target: HTMLElement, at: { clientX?: number; clientY?: number }) {
	await act(async () => {
		source.dispatchEvent(new MouseEvent('dragstart', { bubbles: true }));
	});
	await act(async () => {
		target.dispatchEvent(new MouseEvent('dragover', { bubbles: true, cancelable: true, ...at }));
	});
	await act(async () => {
		target.dispatchEvent(new MouseEvent('drop', { bubbles: true, cancelable: true, ...at }));
		source.dispatchEvent(new MouseEvent('dragend', { bubbles: true }));
	});
}

async function openHeaderMenu(colKey: string) {
	await press(await waitUntil(() => byLabel<HTMLElement>(`Field options for ${fieldLabel(colKey)}`), `the ${colKey} menu button`));
	return waitUntil(() => byLabel<HTMLElement>(`Options for ${fieldLabel(colKey)}`), `the ${colKey} menu`);
}

function menuItem(menu: HTMLElement, label: string): HTMLElement {
	return Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]')).find((item) => item.textContent?.trim().startsWith(label))!;
}

async function openViews() {
	await click(await waitUntil(() => byLabel<HTMLElement>(/^View: /), 'the view switcher'));
	return waitUntil(() => document.querySelector<HTMLElement>('[data-part-id="sheets-view-list"]'), 'the view list');
}

function switcherLabel(): string {
	return byLabel<HTMLElement>(/^View: /)?.getAttribute('aria-label') ?? '';
}

async function saveAsNewView(name: string) {
	const list = await openViews();
	await click(byText<HTMLElement>('button', 'Save as new view…', list)!);
	await typeText(await waitUntil(() => byLabel<HTMLInputElement>('Name of the new view'), 'the name input'), name);
	await click(byText<HTMLElement>('button', 'Save', list)!);
	await waitUntil(() => switcherLabel() === `View: ${name}`, `the view "${name}" to be active`);
	await closeViews();
}

async function closeViews() {
	await act(async () => byLabel<HTMLElement>(/^View: /)!.click());
	await waitUntil(() => !document.querySelector('[data-part-id="sheets-view-list"]'), 'the view list to close');
}

async function hideWithFields(colKey: string) {
	await openFields();
	await press(byLabel<HTMLElement>(`Show ${fieldLabel(colKey)}`, field(colKey))!);
	await waitUntil(() => !headerKeys().includes(colKey), `${colKey} to be hidden`);
}

describe('column layout', () => {
	it('the Fields control hides, shows and reorders columns, and only shown columns are fetched', async () => {
		const backend = await renderTable('Task');
		expect(await taskHeaders()).toEqual(TASK_COLUMNS);
		// Headers show the readable label and keep the raw name in the title; relation headers too.
		expect(byText<HTMLElement>('span', 'Due on', header('dueOn'))?.getAttribute('title')).toBe('dueOn');
		expect(byText<HTMLElement>('span', 'Warehouse item', header('warehouseItem'))?.getAttribute('title')).toBe('warehouseItem');

		await hideWithFields('priority');
		expect(byLabel(/^Fields/)?.getAttribute('aria-label')).toBe('Fields (1 hidden)');
		await waitUntil(() => !/\bpriority\b/.test(listRequests(backend, 'Task').at(-1)?.source ?? 'priority'), 'a list request without priority');
		expect(listRequests(backend, 'Task').at(-1)?.source).toMatch(/\btitle\b/);
		// A hidden relation is not fetched either.
		expect(listRequests(backend, 'Task').at(-1)?.source).toMatch(/\blabels\b/);
		await press(byLabel<HTMLElement>('Show Labels', field('labels'))!);
		await waitUntil(() => !/\blabels\b/.test(listRequests(backend, 'Task').at(-1)?.source ?? 'labels'), 'a list request without labels');
		await press(byLabel<HTMLElement>('Show Labels', field('labels'))!);

		await click(byLabel<HTMLElement>('Move Due on up', field('dueOn'))!);
		await waitUntil(() => headerKeys().indexOf('dueOn') === headerKeys().indexOf('warehouseItem') - 1, 'dueOn to move up');

		await drag(field('title'), field('id'), { clientY: 0 });
		await waitUntil(() => headerKeys()[0] === 'title', 'title to be dragged first');

		// The list shows the readable label, keeps the raw name in its title, and finds a field by either.
		expect(byText<HTMLElement>('span', 'Review status', field('reviewStatus'))?.getAttribute('title')).toBe('reviewStatus');
		const findField = byLabel<HTMLInputElement>('Find a field')!;
		const listed = () => Array.from(document.querySelectorAll('[data-part-id="sheets-field"]')).map((entry) => entry.getAttribute('data-field')).join();
		await typeText(findField, 'review status');
		await waitUntil(() => listed() === 'reviewStatus', 'the field list to narrow by label');
		await typeText(findField, 'reviewStatus');
		await waitUntil(() => listed() === 'reviewStatus', 'the field list to narrow by raw name');
		await typeText(findField, '');

		await click(byText<HTMLElement>('button', 'Show all')!);
		await waitUntil(() => headerKeys().includes('priority'), 'every column to show');

		await click(byText<HTMLElement>('button', 'Hide all')!);
		await waitUntil(() => headerKeys().length === 1, 'one column to remain');
		const last = byLabel<HTMLElement>(`Show ${fieldLabel(headerKeys()[0]!)}`)!;
		expect(last.getAttribute('title')).toBe('At least one field must stay visible.');
	});

	it('header drag reorders, and the header menu sorts, filters by, freezes and hides a column', async () => {
		const backend = await renderTable('Task');
		await taskHeaders();

		await drag(header('title'), header('id'), { clientX: 0 });
		await waitUntil(() => headerKeys()[0] === 'title', 'title to be dragged first');

		let menu = await openHeaderMenu('title');
		expect(menuItem(menu, 'Move left').getAttribute('title')).toBe('This field is already first.');
		await press(menuItem(menu, 'Sort descending'));
		await sentOrderBy(backend, 'Task', ['TITLE_DESC']);

		menu = await openHeaderMenu('project');
		expect(menuItem(menu, 'Sort ascending').getAttribute('title')).toBe('Linked records cannot be sorted.');
		await press(menuItem(menu, 'Filter by this field'));
		const builder = await waitUntil(() => document.querySelector<HTMLElement>('[data-part-id="sheets-filter-group"]'), 'the filter builder');
		expect(byLabel<HTMLElement>('Field', builder)?.textContent).toContain('Project');
		await act(async () => byLabel<HTMLElement>(/^Filters/)!.click());

		menu = await openHeaderMenu('status');
		await press(menuItem(menu, 'Freeze up to this field'));
		const frozen = () => gridOf().querySelectorAll('[data-part-id="sheets-header-row"] [data-frozen]').length;
		await waitUntil(() => frozen() === headerKeys().indexOf('status') + 1, 'the columns up to status to freeze');

		menu = await openHeaderMenu('status');
		await press(menuItem(menu, 'Unfreeze fields'));
		await waitUntil(() => frozen() === 0, 'no frozen columns');

		menu = await openHeaderMenu('dueOn');
		await press(menuItem(menu, 'Hide field'));
		await waitUntil(() => !headerKeys().includes('dueOn'), 'dueOn to be hidden');
	});

	it('keyboard: Alt+Shift+Arrow moves the active column with the cursor, Alt+ArrowDown opens its menu', async () => {
		await renderTable('Task');
		await taskHeaders();
		const grid = harnessContainer().querySelector<HTMLElement>('[role="grid"]')!;
		const titleIndex = headerKeys().indexOf('title');
		const cell = await waitUntil(() => harnessContainer().querySelector<HTMLElement>(`#sheets-cell-0-${titleIndex}`), 'a title cell');
		await click(cell);

		await key(grid, 'ArrowRight', { altKey: true, shiftKey: true });
		await waitUntil(() => headerKeys().indexOf('title') === titleIndex + 1, 'title to move right');
		expect(grid.getAttribute('aria-activedescendant')).toBe(`sheets-cell-0-${titleIndex + 1}`);

		await key(grid, 'ArrowDown', { altKey: true });
		await waitUntil(() => byLabel('Options for Title'), 'the title menu');
	});

	it('Shift+Space opens the active row as a record and Escape closes it; New record opens the form', async () => {
		await renderTable('Task');
		await taskHeaders();
		const grid = harnessContainer().querySelector<HTMLElement>('[role="grid"]')!;
		await click(await waitUntil(() => harnessContainer().querySelector<HTMLElement>(`#sheets-cell-0-${headerKeys().indexOf('title')}`), 'a title cell'));

		const open = new KeyboardEvent('keydown', { key: ' ', shiftKey: true, bubbles: true, cancelable: true });
		await act(async () => grid.dispatchEvent(open));
		expect(open.defaultPrevented).toBe(true);
		await waitUntil(() => document.querySelector('[data-slot="record-panel"]'), 'the record panel');

		await key(grid, 'Escape');
		await waitUntil(() => !document.querySelector('[data-slot="record-panel"]'), 'the record panel to close');

		await click(byLabel<HTMLElement>('New record')!);
		await waitUntil(() => document.querySelector('[data-slot="record-create"]'), 'the new-record form');
	});

	it('the toolbar offers Import, Export view, and Export selected rows while rows are selected', async () => {
		await renderTable('Task');
		await taskHeaders();
		expect(byText<HTMLElement>('button', 'Import')).toBeTruthy();
		expect(byLabel('Export all rows of this view as CSV')).toBeTruthy();
		expect(byLabel('Export selected rows')).toBeUndefined();

		await click(await waitUntil(() => byLabel<HTMLElement>('Select row 0'), 'the first row checkbox'));
		await click(byLabel<HTMLElement>('Select row 1')!);
		await waitUntil(() => byLabel<HTMLElement>('Export selected rows')?.textContent?.includes('Export selected (2)'), 'the selected-rows export');
	});

	it('row height, widths, order, hidden columns and frozen columns follow a controlled layout', async () => {
		const onColumnsChange = vi.fn();
		const columns: SheetsColumnLayout = {
			order: ['title', 'id'],
			hidden: ['warehouseItem', 'retiredColumn'],
			frozenCount: 2,
			widths: { title: 300 },
			rowHeight: 'short',
		};
		await render([{ name: 'Task', options: { columns, onColumnsChange } }]);
		await waitUntil(() => headerKeys()[0] === 'title', 'the controlled order');
		expect(headerKeys().slice(0, 2)).toEqual(['title', 'id']);
		expect(headerKeys()).not.toContain('warehouseItem');
		const frozen = Array.from(gridOf().querySelectorAll<HTMLElement>('[data-part-id="sheets-header-row"] [data-frozen]'));
		expect(frozen.map((entry) => entry.style.width)).toEqual(['300px', expect.any(String)]);
		const row = await waitUntil(() => gridOf().querySelector<HTMLElement>('[role="row"][data-row]'), 'a row');
		expect(row.style.height).toBe('32px');

		await openFields();
		await choose(byLabel<HTMLElement>('Row height')!, 'Tall');
		expect(onColumnsChange).toHaveBeenLastCalledWith(expect.objectContaining({ rowHeight: 'tall' }));
		// The host owns the layout: nothing changes until it passes a new one.
		expect(gridOf().querySelector<HTMLElement>('[role="row"][data-row]')!.style.height).toBe('32px');
	});
});

describe('saved views', () => {
	it('saves, marks and discards unsaved changes, switches, duplicates, renames and deletes, and restores the active view', async () => {
		const harness = createHarness();
		await harness.mount([{ name: 'Task' }]);
		await taskHeaders();
		expect(switcherLabel()).toBe('View: Default view');

		await saveAsNewView('Mine');
		await hideWithFields('priority');
		await waitUntil(() => switcherLabel() === 'View: Mine (unsaved changes)', 'the unsaved marker');

		let list = await openViews();
		await click(byText<HTMLElement>('button', 'Discard changes', list)!);
		await waitUntil(() => headerKeys().includes('priority') && switcherLabel() === 'View: Mine', 'the discard');

		await hideWithFields('priority');
		list = await openViews();
		await click(byText<HTMLElement>('button', 'Save view', list)!);
		await waitUntil(() => switcherLabel() === 'View: Mine', 'the save');
		const stored = Object.keys(window.localStorage).map((entry) => window.localStorage.getItem(entry) ?? '');
		expect(stored.some((entry) => entry.includes('"hidden":["priority"]'))).toBe(true);

		await click(byLabel<HTMLElement>('Duplicate Mine', list)!);
		await waitUntil(() => switcherLabel() === 'View: Mine copy', 'the copy to be active');

		await click(byLabel<HTMLElement>('Rename Mine copy', list)!);
		const rename = await waitUntil(() => byLabel<HTMLInputElement>('New name for Mine copy'), 'the rename input');
		await typeText(rename, 'mine');
		await click(byText<HTMLElement>('button', 'Rename', list)!);
		expect(list.textContent).toContain('A view with this name already exists.');
		await typeText(rename, 'Review');
		await click(byText<HTMLElement>('button', 'Rename', list)!);
		await waitUntil(() => switcherLabel() === 'View: Review', 'the rename');

		// Unsaved changes ask before a switch.
		await closeViews();
		await click(header('title'));
		await waitUntil(() => switcherLabel() === 'View: Review (unsaved changes)', 'a sort to mark the view');
		list = await openViews();
		await click(byText<HTMLElement>('button', 'Default view', list)!);
		expect(list.textContent).toContain('“Review” has unsaved changes.');
		await click(byText<HTMLElement>('button', 'Discard and switch', list)!);
		await waitUntil(() => switcherLabel() === 'View: Default view', 'the switch');
		// The default view has no filter, sort or search and shows every field.
		await waitUntil(() => header('title').getAttribute('aria-sort') === 'none' && headerKeys().includes('priority'), 'the default view');

		await click(byLabel<HTMLElement>('Delete Review', list)!);
		await click(byText<HTMLElement>('button', 'Delete', list)!);
		await waitUntil(() => !list.textContent?.includes('Review'), 'Review to be deleted');

		// The last selected view comes back with the grid.
		await click(byText<HTMLElement>('button', 'Mine', list)!);
		await waitUntil(() => switcherLabel() === 'View: Mine' && !headerKeys().includes('priority'), 'Mine to be active');
		await harness.unmountGrids();
		await harness.mount([{ name: 'Task' }]);
		await waitUntil(() => switcherLabel() === 'View: Mine' && headerKeys().length > 0 && !headerKeys().includes('priority'), 'Mine to be restored');
	});

	it('Mod+S saves the active view when it has unsaved changes', async () => {
		await renderTable('Task');
		await taskHeaders();
		await saveAsNewView('Sorted');
		await click(header('title'));
		await waitUntil(() => switcherLabel() === 'View: Sorted (unsaved changes)', 'the unsaved marker');
		const grid = harnessContainer().querySelector<HTMLElement>('[role="grid"]')!;
		const save = new KeyboardEvent('keydown', { key: 's', bubbles: true, cancelable: true, ...modKey() });
		await act(async () => grid.dispatchEvent(save));
		expect(save.defaultPrevented).toBe(true);
		await waitUntil(() => switcherLabel() === 'View: Sorted', 'the save');
	});

	it('loads a stored view through host storage, upgrades version 1, and reports what the model no longer has', async () => {
		const stale: SheetsStoredView = {
			id: 'old-view',
			name: 'Old',
			updatedAt: '2026-01-01T00:00:00.000Z',
			state: {
				version: 1,
				filters: {
					kind: 'group',
					id: 'root',
					logic: 'and',
					children: [
						{ kind: 'column', id: 'a', column: 'title', operator: 'includesInsensitive', value: 'the' },
						{ kind: 'column', id: 'b', column: 'droppedColumn', operator: 'equalTo', value: 'x' },
					],
				},
				sort: [{ column: 'title', direction: 'asc' }],
				search: '',
			},
		};
		const memory = createMemoryViewStorage();
		const saved: SheetsStoredView[] = [stale];
		const views: SheetsViewStorage = {
			list: async () => saved,
			save: async (scope, view) => memory.save(scope, view),
			remove: async (scope, viewId) => memory.remove(scope, viewId),
			getActiveViewId: async () => 'old-view',
			setActiveViewId: async () => undefined,
		};
		const harness = createHarness();
		await harness.mount([{ name: 'Task' }], { views });
		await waitUntil(() => switcherLabel() === 'View: Old', 'the stored view to be active');
		await sentWhere(harness.backend, 'Task', { title: { includesInsensitive: 'the' } });
		await sentOrderBy(harness.backend, 'Task', ['TITLE_ASC']);
		expect(headerKeys()).toEqual(TASK_COLUMNS);

		const notice = await waitUntil(() => harnessContainer().querySelector<HTMLElement>('[data-part-id="sheets-model-issues"]'), 'the notice');
		await click(byText<HTMLElement>('button', 'Show details', notice)!);
		expect(byLabel<HTMLElement>('Parts of the view that no longer apply', notice)?.textContent).toContain(
			'A filter on "Dropped column" was removed because the column no longer exists.',
		);
	});

	it('storage that fails says so and can be retried', async () => {
		let failing = true;
		const memory = createMemoryViewStorage();
		const views: SheetsViewStorage = {
			list: async (scope) => {
				if (failing) throw new Error('The views service is offline.');
				return memory.list(scope);
			},
			save: (scope, view) => memory.save(scope, view),
			remove: (scope, viewId) => memory.remove(scope, viewId),
		};
		const harness = createHarness();
		await harness.mount([{ name: 'Task' }], { views });
		await taskHeaders();
		const list = await openViews();
		await waitUntil(() => list.textContent?.includes('Saved views could not be loaded. The views service is offline.'), 'the error');
		failing = false;
		await click(byText<HTMLElement>('button', 'Retry', list)!);
		await waitUntil(() => list.textContent?.includes('No saved views yet.'), 'the empty list');
	});
});

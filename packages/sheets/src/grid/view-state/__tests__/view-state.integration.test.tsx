/* @vitest-environment jsdom */
//
// Filters, sort, search and feedback through the public surface: <Sheets> over
// the captured torture schema (the model backend), driven as a user, with
// assertions on the list variables the backend receives and on the rows shown.
// Everything the controls offer comes from the table model only.
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { createError, createTableModelResolver, metaTablesOf, tableKeyOf } from '@constructive-io/data';

import { createTortureBackend } from '../../../adapter/__tests__/torture-backend';
import { withResponseErrors } from '../../../context/sheets-execute';
import type { SheetsEvent } from '../../sheets.types';
import { validateSheetsViewState } from '../validate-view-state';
import type { SheetsFilterGroup } from '../view-state.types';
import {
	addCondition,
	byLabel,
	byText,
	choose,
	click,
	columnTexts,
	condition,
	createHarness,
	gridOf,
	harnessContainer,
	header,
	key,
	listVariables,
	modKey,
	openFilters,
	pickValue,
	render,
	renderTable,
	rowsShown,
	sentOrderBy,
	sentWhere,
	settle,
	typeText,
	typeValue,
	useSheetsHarness,
	waitUntil,
} from './sheets-harness';

vi.mock('@constructive-io/ui/toast', () => ({
	toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Each test mounts the grid, resolves table models over the captured schema and drives
// popovers; give it room when the suite runs files in parallel.
vi.setConfig({ testTimeout: 30_000 });

useSheetsHarness();

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

describe('filters from the table model', () => {
	it.each([
		{
			title: 'text contains',
			table: 'ScalarKind',
			field: 'textValue',
			operator: 'contains',
			value: typeValue('WORLD'),
			where: { textValue: { includesInsensitive: 'WORLD' } },
			rows: ['typical'],
		},
		{
			title: 'exact big whole number equals (sent as text, never a float)',
			table: 'ScalarKind',
			field: 'bigintValue',
			operator: '=',
			value: typeValue('9007199254740993'),
			where: { bigintValue: { equalTo: '9007199254740993' } },
			rows: ['typical'],
		},
		{
			title: 'decimal greater than',
			table: 'ScalarKind',
			field: 'numericBounded',
			operator: '>',
			value: typeValue('0.5'),
			where: { numericBounded: { greaterThan: '0.5' } },
			rows: ['typical'],
		},
		{
			title: 'date before',
			table: 'ScalarKind',
			field: 'dateValue',
			operator: 'is before',
			value: typeValue('2024-03-01'),
			where: { dateValue: { lessThan: '2024-03-01' } },
			rows: ['typical', 'extremes'],
		},
		{
			title: 'datetime on or after (local time, sent as an ISO timestamp)',
			table: 'ScalarKind',
			field: 'timestamptzValue',
			operator: 'is on or after',
			value: typeValue('2024-02-01T09:30'),
			where: { timestamptzValue: { greaterThanOrEqualTo: new Date('2024-02-01T09:30').toISOString() } },
			rows: ['typical', 'extremes'],
		},
		{
			title: 'time before',
			table: 'ScalarKind',
			field: 'timeValue',
			operator: 'is before',
			value: typeValue('14:00'),
			where: { timeValue: { lessThan: '14:00:00' } },
			rows: ['typical', 'extremes'],
		},
		{
			title: 'boolean is empty (no value control)',
			table: 'ScalarKind',
			field: 'boolNullable',
			operator: 'is empty',
			where: { boolNullable: { isNull: true } },
			rows: ['nulls'],
		},
		{
			title: 'enum is any of (toggles labelled from the model, sent as wire values)',
			table: 'Task',
			field: 'status',
			operator: null,
			value: async (row: HTMLElement) => {
				const group = await waitUntil(() => byLabel<HTMLElement>('Value for Status', row), 'the option toggles');
				await click(byText<HTMLElement>('button', 'in_progress', group)!);
				await click(byText<HTMLElement>('button', 'done', group)!);
			},
			where: { status: { in: ['IN_PROGRESS', 'DONE'] } },
			rows: ['Design the mill', 'Merge the patches'],
			rowKey: 'title',
		},
		{
			title: 'enum label with a space is any of (sent as its wire value)',
			table: 'Task',
			field: 'status',
			operator: null,
			value: async (row: HTMLElement) => {
				const group = await waitUntil(() => byLabel<HTMLElement>('Value for Status', row), 'the option toggles');
				await click(byText<HTMLElement>('button', 'on hold', group)!);
			},
			where: { status: { in: ['ON_HOLD'] } },
			rows: ['Wait for the merge window'],
			rowKey: 'title',
		},
		{
			title: 'enum label with a dash is any of (sent as its wire value)',
			table: 'Task',
			field: 'reviewStatus',
			operator: null,
			value: async (row: HTMLElement) => {
				const group = await waitUntil(() => byLabel<HTMLElement>('Value for Review status', row), 'the option toggles');
				await click(byText<HTMLElement>('button', 'needs-review', group)!);
			},
			where: { reviewStatus: { in: ['NEEDS_REVIEW'] } },
			rows: ['Wait for the merge window'],
			rowKey: 'title',
		},
		{
			title: 'array has all of (typed items)',
			table: 'ArrayKind',
			field: 'textList',
			operator: null,
			value: async (row: HTMLElement) => {
				const input = await waitUntil(() => byLabel<HTMLInputElement>('Add to Value for Text list', row), 'the item input');
				await typeText(input, 'one');
				await key(input, 'Enter');
			},
			where: { textList: { contains: ['one'] } },
			rows: ['1'],
			rowKey: 'id',
		},
	])('$title', async ({ table, field, operator, value, where, rows, rowKey }) => {
		const backend = await renderTable(table);
		await waitUntil(() => columnTexts(rowKey ?? 'label').length > 0, 'the first rows');
		const builder = await openFilters();
		const row = await addCondition(builder);
		await condition(row, field, operator, value);
		await sentWhere(backend, table, where);
		if (rows) await rowsShown(rowKey ?? 'label', rows);
		expect(byLabel(/^Filters \(1 applied\)/)).toBeTruthy();
	});

	it('offers only the operators the column filter really has, with readable names for unknown ones', async () => {
		await renderTable('StructuredKind');
		const builder = await openFilters();
		const row = await addCondition(builder);
		await choose(byLabel<HTMLElement>('Field', row)!, 'Any shape');
		await act(async () => byLabel<HTMLElement>('Condition for Any shape', row)!.click());
		const labels = await waitUntil(() => {
			const options = Array.from(document.querySelectorAll('[role="option"]')).map((option) => option.textContent?.trim());
			return options.length > 0 ? options : null;
		}, 'the operator list');
		// GeometryInterfaceFilter: named operators keep their plain label, the rest read from their field name.
		expect(labels).toContain('is');
		expect(labels).toContain('is empty');
		expect(labels).toContain('bbox intersects 2D');
		expect(labels).toContain('covered by');
		expect(labels).not.toContain('starts with');
	});

	it('builds a nested and/or group and combines it with the root group', async () => {
		const backend = await renderTable('Task');
		// Five tasks: the fixture's fifth ("Wait for the merge window", on hold) also contains "the" but is filtered out by its status.
		await waitUntil(() => columnTexts('title').length === 5, 'the tasks');
		const builder = await openFilters();
		await condition(await addCondition(builder), 'title', 'contains', typeValue('the'));

		const addGroup = Array.from(builder.querySelectorAll<HTMLElement>(':scope > div > button')).find(
			(candidate) => candidate.textContent?.trim() === 'Add group',
		)!;
		await click(addGroup);
		const nested = await waitUntil(
			() => builder.querySelector<HTMLElement>('[data-part-id="sheets-filter-group"]'),
			'the nested group',
		);
		await condition(await addCondition(nested), 'status', 'is', pickValue('done'));
		await condition(await addCondition(nested), 'status', 'is', pickValue('in_progress'));

		await sentWhere(backend, 'Task', {
			and: [
				{ title: { includesInsensitive: 'the' } },
				{ or: [{ status: { equalTo: 'DONE' } }, { status: { equalTo: 'IN_PROGRESS' } }] },
			],
		});
		await rowsShown('title', ['Design the mill', 'Merge the patches']);
		await waitUntil(
			() => harnessContainer().querySelector('[data-part-id="sheets-row-count"]')?.textContent?.includes('2 matching rows'),
			'the filtered row count',
		);
	});

	it('filters by a relation: has no linked record, and linked record contains', async () => {
		const harness = await render([{ name: 'Project' }, { name: 'Task' }]);
		await waitUntil(() => columnTexts('name', 'Project').length === 3, 'the projects');

		const projectFilters = await openFilters('Project');
		await condition(await addCondition(projectFilters), 'reviewer', 'has no linked record');
		await sentWhere(harness.backend, 'Project', { reviewerExists: false });
		await rowsShown('name', ['Compiler'], 'Project');
		await act(async () => byLabel<HTMLElement>(/^Filters/, gridOf('Project'))!.click());
		await waitUntil(() => !document.querySelector('[data-part-id="sheets-filter-group"]'), 'the Project filters to close');

		const taskFilters = await openFilters('Task');
		await condition(await addCondition(taskFilters), 'project', 'linked record contains', typeValue('KERNEL'));
		await sentWhere(harness.backend, 'Task', { project: { name: { includesInsensitive: 'KERNEL' } } });
		// Both tasks of the Kernel project, including the fixture's fifth task.
		await rowsShown('title', ['Merge the patches', 'Wait for the merge window'], 'Task');
	});
});

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

describe('search', () => {
	it('uses the combined search field when the table has one, and Escape clears it', async () => {
		const backend = await renderTable('ScalarKind');
		const everyLabel = await waitUntil(() => {
			const labels = columnTexts('label');
			return labels.length > 1 ? labels : null;
		}, 'the rows');
		const box = await waitUntil(() => byLabel<HTMLInputElement>('Search rows'), 'the search box');
		await waitUntil(() => !box.disabled, 'the search box to enable');
		const scope = document.getElementById(box.getAttribute('aria-describedby') ?? '')?.textContent ?? '';
		expect(scope).toContain("Searches the table's search fields");

		await typeText(box, 'typical');
		await settle();
		await sentWhere(backend, 'ScalarKind', { unifiedSearch: 'typical' });
		await rowsShown('label', ['typical']);

		await key(box, 'Escape');
		expect(box.value).toBe('');
		await rowsShown('label', everyLabel);
	});

	it('without a combined field, matches the text columns with "or" and combines with filters by "and"', async () => {
		const backend = await renderTable('Task');
		const box = await waitUntil(() => byLabel<HTMLInputElement>('Search rows'), 'the search box');
		await waitUntil(() => !box.disabled, 'the search box to enable');
		const scope = document.getElementById(box.getAttribute('aria-describedby') ?? '')?.textContent ?? '';
		expect(scope).toBe('Searches Title, Priority, Assignee email, Warehouse code, Sku');

		await typeText(box, 'the');
		await settle();
		const search = {
			or: ['title', 'priority', 'assigneeEmail', 'warehouseCode', 'sku'].map((field) => ({ [field]: { includesInsensitive: 'the' } })),
		};
		await sentWhere(backend, 'Task', search);

		const builder = await openFilters();
		await condition(await addCondition(builder), 'priority', 'is', pickValue('low'));
		await sentWhere(backend, 'Task', { and: [{ priority: { equalTo: 'low' } }, search] });
		await rowsShown('title', ['Write the linker']);
	});
});

// ---------------------------------------------------------------------------
// Sort
// ---------------------------------------------------------------------------

describe('sort', () => {
	it('sorts by two columns with Shift+click, shows priority, and reorders from the sort control', async () => {
		const events: SheetsEvent[] = [];
		const backend = await renderTable('Task', { onEvent: (event) => events.push(event) });
		await waitUntil(() => header('priority'), 'the headers');

		await click(header('priority'));
		await sentOrderBy(backend, 'Task', ['PRIORITY_ASC']);
		await click(header('dueOn'), { shiftKey: true });
		await sentOrderBy(backend, 'Task', ['PRIORITY_ASC', 'DUE_ON_ASC']);
		expect(header('priority').querySelector('[data-part-id="sheets-sort-priority"]')?.textContent).toBe('1');
		expect(header('dueOn').querySelector('[data-part-id="sheets-sort-priority"]')?.textContent).toBe('2');
		await click(header('dueOn'), { shiftKey: true });
		await sentOrderBy(backend, 'Task', ['PRIORITY_ASC', 'DUE_ON_DESC']);
		expect(header('dueOn').getAttribute('aria-sort')).toBe('descending');

		await click(byLabel<HTMLElement>(/^Sort/)!);
		const moveUp = await waitUntil(() => byLabel<HTMLElement>('Move Due on up'), 'the sort control');
		await click(moveUp);
		await sentOrderBy(backend, 'Task', ['DUE_ON_DESC', 'PRIORITY_ASC']);
		expect(Array.from(document.querySelectorAll('[data-part-id="sheets-sort-key"]')).map((entry) => entry.textContent)).toEqual([
			expect.stringContaining('Due on'),
			expect.stringContaining('Priority'),
		]);
		expect(events.filter((event) => event.type === 'sort:change').at(-1)?.meta?.sort).toEqual([
			{ column: 'dueOn', direction: 'desc' },
			{ column: 'priority', direction: 'asc' },
		]);

		// A plain click replaces the multi-column sort with that one column.
		await click(header('title'));
		await sentOrderBy(backend, 'Task', ['TITLE_ASC']);
	});

	it('an unsortable column says why and a click sends no sort', async () => {
		const backend = await renderTable('Task');
		const project = await waitUntil(() => header('project'), 'the project column');
		expect(project.getAttribute('data-sortable')).toBe('false');
		expect(project.getAttribute('title')).toBe('Linked records cannot be sorted.');
		const before = listVariables(backend, 'Task').length;
		await click(project);
		await settle(100);
		expect(listVariables(backend, 'Task').slice(before).some((variables) => variables.orderBy)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Saved state
// ---------------------------------------------------------------------------

describe('a stale saved view', () => {
	const stale = {
		kind: 'group',
		id: 'root',
		logic: 'and',
		children: [
			{ kind: 'column', id: 'a', column: 'textValue', operator: 'includesInsensitive', value: 'Hello' },
			{ kind: 'column', id: 'b', column: 'droppedColumn', operator: 'equalTo', value: 'x' },
			{ kind: 'column', id: 'c', column: 'integerValue', operator: 'fuzzyMatch', value: '4' },
		],
	} as unknown as SheetsFilterGroup;
	const staleSort = [
		{ column: 'label', direction: 'desc' },
		{ column: 'retiredColumn', direction: 'asc' },
	] as const;

	it('is validated: only what the model has reaches the server, and the notice says what was dropped', async () => {
		const backend = await renderTable('ScalarKind', { filters: stale, sort: staleSort });
		await sentWhere(backend, 'ScalarKind', { textValue: { includesInsensitive: 'Hello' } });
		await sentOrderBy(backend, 'ScalarKind', ['LABEL_DESC']);
		await rowsShown('label', ['typical']);

		const notice = await waitUntil(() => harnessContainer().querySelector<HTMLElement>('[data-part-id="sheets-model-issues"]'), 'the notice');
		await click(byText<HTMLElement>('button', 'Show details', notice)!);
		const view = byLabel<HTMLElement>('Parts of the view that no longer apply', notice)!;
		expect(view.textContent).toContain('A filter on "Dropped column" was removed because the column no longer exists.');
		expect(view.textContent).toContain('A filter on "Integer value" was removed because "fuzzy match" is no longer available for it.');
		expect(view.textContent).toContain('The sort by "Retired column" was removed because the column no longer exists.');

		await click(byLabel<HTMLElement>('Dismiss table notices', notice)!);
		expect(harnessContainer().querySelector('[data-part-id="sheets-model-issues"]')).toBeNull();
	});

	it('validates without rendering through the exported validator', async () => {
		const backend = createTortureBackend({ server: 'v2' });
		const resolver = createTableModelResolver(backend.meta);
		const table = metaTablesOf(backend.meta).find((entry) => entry.name === 'Task')!;
		const model = await resolver.resolve(backend.execute, tableKeyOf(table));

		const { state, dropped } = validateSheetsViewState(
			{
				filters: {
					kind: 'group',
					logic: 'and',
					children: [
						{ kind: 'column', column: 'status', operator: 'in', value: ['DONE', 'ARCHIVED'] },
						{ kind: 'relation', relation: 'labels', test: 'any', value: null },
					],
				},
				sort: [{ column: 'title', direction: 'up' }],
				search: 42,
			},
			model,
		);
		expect(state.filters.children).toEqual([expect.objectContaining({ column: 'status', value: ['DONE'] })]);
		expect(state.sort).toEqual([]);
		expect(state.search).toBe('');
		expect(dropped.map((entry) => entry.reason)).toEqual(['unknown-option', 'relation-test-unavailable', 'invalid-shape', 'invalid-shape']);
	});
});

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------

describe('feedback', () => {
	it('one table failing to load shows its own error with retry while another table works', async () => {
		const harness = createHarness();
		const failure = harness.failWhen(
			(source) => source.includes('query ModelList_Label'),
			() => createError.graphql('The labels could not be read right now.'),
		);
		await harness.mount([{ name: 'Label' }, { name: 'Country' }]);
		const labelGrid = gridOf('Label');
		await waitUntil(() => labelGrid.textContent?.includes('The labels could not be read right now.'), 'the Label error');
		expect(labelGrid.textContent).toContain('The table “Label” could not be loaded.');
		await rowsShown('name', ['France', 'Japan', 'United States'], 'Country');

		failure.heal();
		await click(byText<HTMLElement>('button', 'Retry', labelGrid)!);
		await rowsShown('name', ['urgent', 'backend', 'docs'], 'Label');
	});

	it('a failed write shows every message the server returned, and a refusal reads as a permission problem', async () => {
		const harness = await render([{ name: 'Label' }]);
		await rowsShown('name', ['urgent', 'backend', 'docs']);
		const failure = harness.failWhen(
			(source) => /^\s*mutation\b/.test(source),
			() =>
				withResponseErrors(createError.graphql('Name is too long.'), { updateLabel: null }, [
					{ message: 'Name is too long.', path: ['updateLabel'] },
					{ message: 'Name must be unique.', path: ['updateLabel'] },
				]),
		);

		const editName = async (text: string) => {
			const names = columnTexts('name');
			const column = Array.from(harnessContainer().querySelectorAll('[role="columnheader"][data-col-key]')).findIndex(
				(entry) => entry.getAttribute('data-col-key') === 'name',
			);
			const index = names.indexOf('docs');
			const target = harnessContainer().querySelector<HTMLElement>(`#sheets-cell-${index}-${column}`)!;
			await act(async () => {
				target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
				target.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
			});
			const input = await waitUntil(() => target.querySelector<HTMLInputElement>('input'), 'the inline editor');
			await typeText(input, text);
			await key(input, 'Enter');
		};

		await editName('documentation');
		const report = await waitUntil(() => harnessContainer().querySelector<HTMLElement>('[data-part-id="sheets-write-error"]'), 'the write error');
		expect(Array.from(report.querySelectorAll('li')).map((item) => item.textContent)).toEqual([
			'Name is too long.',
			'Name must be unique.',
		]);
		await click(byLabel<HTMLElement>('Dismiss', report)!);
		failure.heal();

		const refusal = harness.failWhen(
			(source) => /^\s*mutation\b/.test(source),
			() =>
				withResponseErrors(createError.forbidden('permission denied for table labels'), { updateLabel: null }, [
					{ message: 'permission denied for table labels', path: ['updateLabel'], extensions: { code: 'FORBIDDEN' } },
				]),
		);
		await editName('handbook');
		const denied = await waitUntil(() => harnessContainer().querySelector<HTMLElement>('[data-part-id="sheets-write-error"]'), 'the refusal');
		expect(denied.textContent).toContain('You do not have permission to change this record.');
		expect(denied.textContent).not.toMatch(/sign in|log in/i);
		refusal.heal();
	});

	it('a table with model issues shows a dismissible grouped notice and keeps the grid usable', async () => {
		await renderTable('AuditEvent');
		const notice = await waitUntil(() => harnessContainer().querySelector<HTMLElement>('[data-part-id="sheets-model-issues"]'), 'the notice');
		expect(notice.textContent).toContain('Read-only table (3)');
		await click(byText<HTMLElement>('button', 'Show details', notice)!);
		expect(byLabel<HTMLElement>('Read-only table', notice)?.textContent).toContain(
			'This table has no primary key, so its records are read-only.',
		);
		await waitUntil(() => columnTexts('actor').length > 0, 'the audit rows');
	});
});

// ---------------------------------------------------------------------------
// Commands and keyboard
// ---------------------------------------------------------------------------

describe('commands', () => {
	it('Mod+F focuses search, Mod+Shift+F opens the filters, and Mod+R never reaches the browser', async () => {
		await renderTable('Task');
		const grid = await waitUntil(() => harnessContainer().querySelector<HTMLElement>('[role="grid"]'), 'the grid');
		await waitUntil(() => !byLabel<HTMLInputElement>('Search rows')?.disabled, 'the search box to enable');
		const mod = modKey();

		const find = new KeyboardEvent('keydown', { key: 'f', bubbles: true, cancelable: true, ...mod });
		await act(async () => grid.dispatchEvent(find));
		expect(find.defaultPrevented).toBe(true);
		expect(document.activeElement).toBe(byLabel('Search rows'));

		await act(async () => grid.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true, cancelable: true, shiftKey: true, ...mod })));
		await waitUntil(() => document.querySelector('[data-part-id="sheets-filter-group"]'), 'the filter builder');

		// No range is selected, so fill right cannot run, and still the reload chord is claimed.
		const reload = new KeyboardEvent('keydown', { key: 'r', bubbles: true, cancelable: true, ...mod });
		await act(async () => grid.dispatchEvent(reload));
		expect(reload.defaultPrevented).toBe(true);
	});
});

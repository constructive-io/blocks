/* @vitest-environment jsdom */
//
// The record panel's relation section through its public surface: the
// exported <RelationSection> inside a <SheetsProvider> over the captured
// torture schema, driven as a user, with assertions on what it shows, the
// mutations the backend receives and the requests it raises (open a linked
// record, hand a draft choice back). The record panel itself is the record
// lane's; this covers the contract it embeds.
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { QueryClient } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTortureBackend, type TortureBackend } from '../../adapter/__tests__/torture-backend';
import { SheetsProvider } from '../../context/sheets-provider';
import { useTableModel } from '../../hooks/use-table-model';
import { SheetsOpenRecordContext, type SheetsOpenRecordRequest } from '../relation-navigation';
import { RelationSection, type RelationSectionProps } from '../relation-section';

vi.mock('@constructive-io/ui/toast', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
vi.setConfig({ testTimeout: 20_000 });

const ADA = '00000000-0000-4000-8000-0000000000a1';
const GRACE = '00000000-0000-4000-8000-0000000000a2';

let root: Root;
let container: HTMLDivElement;
let queryClient: QueryClient;

beforeEach(() => {
	queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
});

afterEach(async () => {
	await act(async () => root.unmount());
	queryClient.clear();
	container.remove();
});

async function waitUntil<T>(read: () => T | null | undefined | false, what: string): Promise<T> {
	for (let attempt = 0; attempt < 200; attempt++) {
		const found = read();
		if (found) return found;
		await act(async () => {
			await new Promise((resolve) => setTimeout(resolve, 20));
		});
	}
	throw new Error(`Timed out waiting for ${what} :: ${container.textContent}`);
}

type SectionOverrides = Partial<Pick<RelationSectionProps, 'onCommitPatch' | 'onInvalidateData' | 'readOnlyReason' | 'onOpenRecord'>>;
type SectionInput = { table: string; field: string; record: Record<string, unknown>; recordKey: RelationSectionProps['rowIdentifier'] } & SectionOverrides;

function Section({ table, field, record, recordKey, ...rest }: SectionInput) {
	const { model } = useTableModel(table);
	const relation = model?.relations.find((candidate) => candidate.fieldName === field);
	if (!model || !relation) return null;
	return <RelationSection table={model} relation={relation} row={record} rowIdentifier={recordKey} isDraft={recordKey == null} {...rest} />;
}

async function render(
	props: SectionInput,
	onOpenRecord?: (request: SheetsOpenRecordRequest) => void,
): Promise<{ backend: TortureBackend; section: HTMLElement }> {
	const backend = createTortureBackend({ server: 'v2' });
	await act(async () =>
		root.render(
			<SheetsProvider
				config={{ endpoint: 'mock://sheets', auth: { mode: 'embedded', getToken: () => 'test' }, execute: backend.execute, queryClient }}
			>
				<SheetsOpenRecordContext.Provider value={onOpenRecord ?? null}>
					<Section {...props} />
				</SheetsOpenRecordContext.Provider>
			</SheetsProvider>,
		),
	);
	const section = await waitUntil(() => container.querySelector<HTMLElement>('[data-slot="relation-section"]'), 'the section');
	return { backend, section };
}

const linked = (section: HTMLElement) =>
	Array.from(section.querySelectorAll('[data-testid="relation-links"] li[data-state]'))
		.filter((item) => item.getAttribute('data-state') !== 'removed')
		.map((item) => item.querySelector('[title]')?.getAttribute('title') ?? '');

const button = (scope: ParentNode, label: string) =>
	Array.from(scope.querySelectorAll<HTMLButtonElement>('button')).find((entry) => entry.textContent?.trim() === label);

/** A button with this label once it is usable (actions wait for the related table to load). */
function usable(scope: ParentNode, label: string): Promise<HTMLButtonElement> {
	return waitUntil(() => {
		const found = button(scope, label);
		return found && !found.disabled ? found : null;
	}, `a usable "${label}" button`);
}

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

async function option(section: HTMLElement, label: string): Promise<HTMLElement> {
	return waitUntil(
		() => Array.from(section.querySelectorAll<HTMLElement>('[role="option"]')).find((entry) => entry.textContent?.includes(label)),
		`the option "${label}"`,
	);
}

const ADA_ROW = { id: ADA, email: 'ada@example.com', fullName: 'Ada Lovelace', managerId: null };

describe('RelationSection', () => {
	it('adds a link behind "Add link" and writes it on "Save links"', async () => {
		const onInvalidateData = vi.fn();
		const { backend, section } = await render({ table: 'Person', field: 'reviewedProjects', record: ADA_ROW, recordKey: ADA, onInvalidateData });
		expect(section.querySelector('input[role="combobox"]')).toBeNull();

		await click(await usable(section, 'Add link'));
		await click(await option(section, 'Compiler'));
		await click(await waitUntil(() => button(section, 'Save links'), 'the save button'));

		await waitUntil(() => onInvalidateData.mock.calls.length === 1, 'the save');
		expect(backend.mutations.map(({ op, tableName, variables }) => ({ op, tableName, variables }))).toEqual([
			{ op: 'update', tableName: 'Project', variables: { input: { id: 2, projectPatch: { reviewerId: ADA } } } },
		]);
		await waitUntil(() => linked(section).includes('Compiler'), 'the refetched link');
		expect(button(section, 'Save links')).toBeUndefined();
	});

	it('moves focus into the search box when the picker opens, and back to its button on Escape, after Discard and after a save', async () => {
		const { section } = await render({ table: 'Person', field: 'reviewedProjects', record: ADA_ROW, recordKey: ADA });
		const toggle = await usable(section, 'Add link');

		await click(toggle);
		const search = await waitUntil(() => section.querySelector<HTMLInputElement>('input[role="combobox"]'), 'the search box');
		expect(document.activeElement).toBe(search);
		await act(async () => {
			search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
		});
		expect(section.querySelector('input[role="combobox"]')).toBeNull();
		expect(document.activeElement).toBe(button(section, 'Add link'));

		await click(button(section, 'Add link')!);
		await click(await option(section, 'Compiler'));
		await click(button(section, 'Discard')!);
		expect(document.activeElement).toBe(button(section, 'Add link'));

		await click(button(section, 'Add link')!);
		await click(await option(section, 'Compiler'));
		await click(button(section, 'Save links')!);
		await waitUntil(() => linked(section).includes('Compiler') && !button(section, 'Save links'), 'the save');
		await waitUntil(() => document.activeElement === button(section, 'Add link'), 'focus back on the add link button');
	});

	it('discards pending choices without writing', async () => {
		const { backend, section } = await render({ table: 'Person', field: 'reviewedProjects', record: ADA_ROW, recordKey: ADA });
		await click(await usable(section, 'Add link'));
		await click(await option(section, 'Compiler'));
		expect(linked(section)).toContain('Compiler');
		await click(button(section, 'Discard')!);
		expect(linked(section)).not.toContain('Compiler');
		expect(backend.mutations).toEqual([]);
	});

	it('opens a linked record through the host handler with its key and label', async () => {
		const requests: SheetsOpenRecordRequest[] = [];
		const { section } = await render(
			{ table: 'Person', field: 'ownedProjects', record: ADA_ROW, recordKey: ADA },
			(request) => requests.push(request),
		);
		await click(await enabled(section, 'button[aria-label="Open Analytical Engine"]'));
		expect(requests).toEqual([{ tableKey: 'sheets_torture.Project', tableName: 'Project', key: { id: 1 }, label: 'Analytical Engine' }]);
	});

	it('prefers the onOpenRecord prop over the context handler', async () => {
		const fromContext = vi.fn();
		const fromProp = vi.fn();
		const { section } = await render({ table: 'Person', field: 'ownedProjects', record: ADA_ROW, recordKey: ADA, onOpenRecord: fromProp }, fromContext);
		await click(await enabled(section, 'button[aria-label="Open Analytical Engine"]'));
		expect(fromProp).toHaveBeenCalledWith({ tableKey: 'sheets_torture.Project', tableName: 'Project', key: { id: 1 }, label: 'Analytical Engine' });
		expect(fromContext).not.toHaveBeenCalled();
	});

	it('keeps the relation read-only with a reason the host passes', async () => {
		const { section } = await render({
			table: 'Person',
			field: 'reviewedProjects',
			record: ADA_ROW,
			recordKey: ADA,
			readOnlyReason: 'You can view this record but not change it.',
		});
		await waitUntil(() => section.textContent?.includes('You can view this record but not change it.'), 'the reason');
		expect(button(section, 'Add link')).toBeUndefined();
		expect(button(section, 'Create new')).toBeUndefined();
	});

	it('offers "Change link" for a to-one relation that has a link and "Add link" when it has none', async () => {
		const linus = { id: '00000000-0000-4000-8000-0000000000a3', email: 'linus@example.com', fullName: 'Linus Torvalds', managerId: ADA };
		const first = await render({ table: 'Person', field: 'manager', record: linus, recordKey: linus.id });
		await waitUntil(() => button(first.section, 'Change link'), 'the change link button');
		expect(button(first.section, 'Add link')).toBeUndefined();
		await act(async () => root.unmount());
		root = createRoot(container);

		const second = await render({ table: 'Person', field: 'manager', record: ADA_ROW, recordKey: ADA });
		await waitUntil(() => button(second.section, 'Add link'), 'the add link button');
	});

	it('shows no remove control for a required link, only the reason', async () => {
		const { section } = await render({
			table: 'Project',
			field: 'owner',
			record: { id: 2, name: 'Compiler', ownerId: GRACE, reviewerId: null, countryCode: null, owner: { id: GRACE, fullName: 'Grace Hopper', email: 'grace@example.com' } },
			recordKey: 2,
		});
		await waitUntil(() => section.textContent?.includes('This link is required, so it cannot be removed.'), 'the reason');
		expect(linked(section)).toEqual(['Grace Hopper']);
		expect(section.querySelector('button[aria-label="Remove Grace Hopper"]')).toBeNull();
		expect(button(section, 'Clear link')).toBeUndefined();
	});

	it('cannot replace a hasOne link that must stay, and says why', async () => {
		const { section } = await render({ table: 'Person', field: 'personProfile', record: ADA_ROW, recordKey: ADA });
		const change = await waitUntil(() => button(section, 'Change link'), 'the change link button');
		await waitUntil(() => change.title === 'Each linked record must keep this link, so it cannot be removed.', 'the reason');
		expect(change.disabled).toBe(true);
	});

	it('hides the open control when the host has no handler', async () => {
		const { section } = await render({ table: 'Person', field: 'ownedProjects', record: ADA_ROW, recordKey: ADA });
		await waitUntil(() => linked(section).includes('Analytical Engine'), 'the links');
		expect(section.querySelector('button[aria-label="Open Analytical Engine"]')).toBeNull();
	});

	it('hands a belongsTo choice on a new record back instead of writing it', async () => {
		const onCommitPatch = vi.fn();
		const { backend, section } = await render({ table: 'Person', field: 'manager', record: {}, recordKey: null, onCommitPatch });
		await click(await usable(section, 'Add link'));
		await click(await option(section, 'Grace Hopper'));
		await click(await waitUntil(() => button(section, 'Apply'), 'the apply button'));

		expect(onCommitPatch).toHaveBeenCalledTimes(1);
		const patch = onCommitPatch.mock.calls[0]![0] as Record<string, unknown>;
		expect(patch.managerId).toBe(GRACE);
		expect(patch.manager).toMatchObject({ id: GRACE, fullName: 'Grace Hopper' });
		expect(backend.mutations).toEqual([]);
	});

	it('asks to save a new record before linking list relations', async () => {
		const { section } = await render({ table: 'Person', field: 'reviewedProjects', record: {}, recordKey: null });
		await waitUntil(() => section.textContent?.includes('Save this record first, then link records to it.'), 'the reason');
		expect(button(section, 'Add link')).toBeUndefined();
	});

	it('creates a related record with the record form and links it (hasMany links on create)', async () => {
		const { backend, section } = await render({ table: 'Person', field: 'peopleByManagerId', record: ADA_ROW, recordKey: ADA });
		const createButton = await waitUntil(() => {
			const found = button(section, 'Create new');
			return found && !found.disabled ? found : null;
		}, 'an enabled Create new');
		await click(createButton);
		const form = await waitUntil(() => section.querySelector<HTMLFormElement>('form[aria-label="New Person"]'), 'the form');
		const labels = Array.from(form.querySelectorAll('label')).map((label) => label.textContent?.replace('*', '').trim());
		// The required and label fields come first; the link fills managerId, so the form does not ask for it.
		expect(labels).toEqual(['Email', 'Full name']);
		expect(form.textContent).toContain('More fields (1)');

		const [email, fullName] = Array.from(form.querySelectorAll<HTMLInputElement>('input'));
		await click(button(form, 'Create')!);
		expect(form.textContent).toContain('Email is required');
		expect(backend.mutations).toEqual([]);

		for (const [input, text] of [[email!, 'alan@example.com'], [fullName!, 'Alan Turing']] as const) {
			await act(async () => {
				Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, text);
				input.dispatchEvent(new Event('input', { bubbles: true }));
			});
		}
		await click(button(form, 'Create')!);
		await waitUntil(() => section.textContent?.includes('Created and linked "Alan Turing".'), 'the notice');
		expect(backend.mutations.map(({ op, tableName, variables }) => ({ op, tableName, variables }))).toEqual([
			{
				op: 'create',
				tableName: 'Person',
				variables: { input: { person: { email: 'alan@example.com', fullName: 'Alan Turing', managerId: ADA } } },
			},
		]);
		await waitUntil(() => linked(section).includes('Alan Turing'), 'the new link');
	});
});

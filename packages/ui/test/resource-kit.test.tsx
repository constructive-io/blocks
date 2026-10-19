import { QueryClient } from '@tanstack/react-query';
import * as React from 'react';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
	createMemoryJunction,
	createMemorySource,
	defineResource,
	EntityFormSheet,
	RecordDetail,
	ResourceKitProvider,
	ResourcePage,
	type ResourceRouter,
	type ResourceSource,
} from '../src/components/resource-kit';

// Flow tests render whole screens; a cold transform on a loaded machine can pass the 5s default.
vi.setConfig({ testTimeout: 30_000 });

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.PointerEvent ??= MouseEvent as unknown as typeof PointerEvent;

class NoopObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
}

let root: Root | undefined;
let container: HTMLDivElement | undefined;

beforeEach(() => {
	vi.stubGlobal('ResizeObserver', NoopObserver);
	vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query, addEventListener() {}, removeEventListener() {} }) as unknown as MediaQueryList);
});

afterEach(async () => {
	await act(async () => root?.unmount());
	container?.remove();
	document.body.replaceChildren();
	root = undefined;
	vi.unstubAllGlobals();
});

/** Records every call a host's source receives, while the memory source answers them. */
function spied(source: ResourceSource): ResourceSource & { [K in keyof ResourceSource]-?: ReturnType<typeof vi.fn> } {
	return {
		list: vi.fn(source.list),
		get: vi.fn(source.get),
		create: vi.fn(source.create),
		update: vi.fn(source.update),
		remove: vi.fn(source.remove),
		link: vi.fn(source.link!),
		linked: vi.fn(source.linked!),
	} as never;
}

/** Projects with members (many-to-many) and tasks that belong to a project. */
function workspace() {
	const members = createMemoryJunction([
		['p1', 'ada'],
		['p1', 'lin'],
	]);
	let next = 0;
	const projects = spied(createMemorySource([{ id: 'p1', name: 'Launch', budget: 1200, dueOn: '2026-11-30' }], { links: { members: members.left } }));
	const people = spied(
		createMemorySource(
			[
				{ id: 'ada', name: 'Ada' },
				{ id: 'lin', name: 'Lin' },
			],
			{ links: { projects: members.right } },
		),
	);
	const tasks = spied(createMemorySource([{ id: 't1', title: 'Write the brief', projectId: 'p1', done: false, estimate: 2 }], { createId: () => `t-new-${++next}` }));
	// Only relations and no text column: the generator titles it by its first relation.
	const assignments = spied(createMemorySource([{ id: '4c1e9a20-0b7d-4a5e-9c6f-2d8e1f3a7b90', taskId: 't1', personId: 'ada' }]));
	// One relation and a short kind: the kind tells the task's notes apart.
	const notes = spied(createMemorySource([{ id: '9b2f6c1d-3e4a-4b5c-8d7e-1f2a3b4c5d6e', taskId: 't1', kind: 'blocker' }]));
	const resources = [
		defineResource({
			name: 'projects',
			label: 'Projects',
			singular: 'Project',
			primaryKey: 'id',
			titleField: 'name',
			columns: ['name', 'budget', 'dueOn'],
			formFields: ['name', 'budget', 'dueOn', 'members'],
			fields: {
				id: { name: 'id', label: 'ID', input: 'uuid', hidden: true },
				name: { name: 'name', label: 'Name', input: 'text', required: true },
				budget: { name: 'budget', label: 'Budget', input: 'currency' },
				dueOn: { name: 'dueOn', label: 'Due', input: 'date' },
				members: { name: 'members', label: 'Members', input: 'relation', relation: { resource: 'people', many: true } },
			},
			source: projects,
		}),
		defineResource({
			name: 'people',
			label: 'People',
			singular: 'Person',
			primaryKey: 'id',
			titleField: 'name',
			columns: ['name'],
			formFields: ['name', 'projects'],
			fields: {
				id: { name: 'id', label: 'ID', input: 'uuid', hidden: true },
				name: { name: 'name', label: 'Name', input: 'text', required: true },
				projects: { name: 'projects', label: 'Projects', input: 'relation', relation: { resource: 'projects', many: true } },
			},
			source: people,
		}),
		defineResource({
			name: 'tasks',
			label: 'Tasks',
			singular: 'Task',
			primaryKey: 'id',
			titleField: 'title',
			columns: ['title', 'projectId', 'done', 'estimate'],
			searchFields: ['title'],
			formFields: ['title', 'projectId', 'done', 'estimate'],
			fields: {
				id: { name: 'id', label: 'ID', input: 'uuid', hidden: true },
				title: { name: 'title', label: 'Title', input: 'text', required: true },
				projectId: { name: 'projectId', label: 'Project', input: 'relation', required: true, relation: { resource: 'projects' } },
				done: { name: 'done', label: 'Done', input: 'boolean' },
				estimate: { name: 'estimate', label: 'Estimate', input: 'integer' },
			},
			source: tasks,
		}),
		defineResource({
			name: 'assignments',
			label: 'Assignments',
			singular: 'Assignment',
			primaryKey: 'id',
			titleField: 'taskId',
			columns: ['taskId', 'personId'],
			formFields: ['taskId', 'personId'],
			fields: {
				id: { name: 'id', label: 'ID', input: 'uuid', hidden: true },
				taskId: { name: 'taskId', label: 'Task', input: 'relation', required: true, relation: { resource: 'tasks' } },
				personId: { name: 'personId', label: 'Person', input: 'relation', required: true, relation: { resource: 'people' } },
			},
			source: assignments,
		}),
		defineResource({
			name: 'notes',
			label: 'Notes',
			singular: 'Note',
			primaryKey: 'id',
			titleField: 'taskId',
			columns: ['taskId', 'kind'],
			formFields: ['taskId', 'kind'],
			fields: {
				id: { name: 'id', label: 'ID', input: 'uuid', hidden: true },
				taskId: { name: 'taskId', label: 'Task', input: 'relation', required: true, relation: { resource: 'tasks' } },
				kind: { name: 'kind', label: 'Kind', input: 'select', options: [{ value: 'blocker', label: 'Blocker', tone: 'danger' }] },
			},
			source: notes,
		}),
	];
	return { resources, projects, people, tasks, assignments };
}

const router: ResourceRouter = {
	Link: ({ href, className, children }) => (
		<a href={href} className={className}>
			{children}
		</a>
	),
	navigate: () => {},
	listHref: (resource) => `/${resource}`,
	detailHref: (resource, id) => `/${resource}/${id}`,
};

async function render(element: React.ReactElement, resources: ReturnType<typeof workspace>['resources'], retry: number | false = false) {
	container = document.createElement('div');
	document.body.appendChild(container);
	root = createRoot(container);
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry } } });
	await act(async () =>
		root!.render(
			<ResourceKitProvider router={router} resources={resources} queryClient={queryClient}>
				{element}
			</ResourceKitProvider>,
		),
	);
}

const text = (element: Element | null | undefined) => (element?.textContent ?? '').replace(/\s+/g, ' ').trim();

/** Lets queued source calls and the renders they cause settle. */
async function settle() {
	for (let index = 0; index < 5; index++) await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
}

/** The control a visible label names; sheets render in a portal, so this searches the whole document. */
function field(label: string) {
	const element = [...document.querySelectorAll('label')].find((candidate) => text(candidate).replace(/\s*\*$/, '') === label);
	const control = element?.htmlFor ? document.getElementById(element.htmlFor) : null;
	if (!control) throw new Error(`No control labelled ${label}`);
	return control as HTMLInputElement;
}

function button(name: string) {
	const match = [...document.querySelectorAll('button')].find((candidate) => (candidate.getAttribute('aria-label') ?? text(candidate)) === name);
	if (!match) throw new Error(`No button named ${name}`);
	return match;
}

async function type(input: HTMLInputElement, value: string) {
	await act(async () => {
		Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
		input.dispatchEvent(new Event('input', { bubbles: true }));
	});
}

async function click(element: HTMLElement) {
	await act(async () => {
		element.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
		element.dispatchEvent(new MouseEvent('pointerup', { bubbles: true }));
		element.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
		element.click();
	});
	await settle();
}

async function submit() {
	const form = document.querySelector('form')!;
	await act(async () => form.requestSubmit());
	await settle();
}

describe('Resource Kit', () => {
	it('creates a related record from a detail view with the parent filled in, mapped values, and a refreshed list', async () => {
		const { resources, tasks } = workspace();
		await render(<RecordDetail resource="projects" id="p1" />, resources);
		await settle();

		const related = () => [...document.querySelectorAll('section')].find((section) => section.querySelector('h2')?.textContent?.startsWith('Tasks'));
		expect(text(related())).toContain('Write the brief');
		expect(text(related())).not.toContain('Project'); // the parent column is left out of its own related list

		await click(button('New task'));
		await type(field('Title'), '  Book the venue  ');
		await type(field('Estimate'), '2.5');
		await submit();

		// A fraction in a whole-number field stops the save and says why.
		expect(tasks.create).not.toHaveBeenCalled();
		expect(field('Estimate').getAttribute('aria-invalid')).toBe('true');
		expect(text(document.body)).toContain('Enter a whole number.');

		await type(field('Estimate'), '1,200');
		await submit();

		expect(tasks.create).toHaveBeenCalledTimes(1);
		expect(tasks.create).toHaveBeenCalledWith({ title: 'Book the venue', projectId: 'p1', done: false, estimate: 1200 });
		// The related list refetched after the write, so the new task shows without a reload.
		expect(text(related())).toContain('Book the venue');
		expect(text(related())).toMatch(/Tasks\s*2/);
	});

	it('requires a title before anything is written', async () => {
		const { resources, tasks } = workspace();
		await render(<EntityFormSheet resource="tasks" open onOpenChange={() => {}} defaultValues={{ projectId: 'p1' }} />, resources);
		await settle();

		await submit();

		expect(tasks.create).not.toHaveBeenCalled();
		expect(field('Title').getAttribute('aria-invalid')).toBe('true');
		expect(document.activeElement).toBe(field('Title'));
	});

	it('edits only the fields that changed and re-links a many-to-many set only when its members change', async () => {
		const { resources, projects } = workspace();
		const project = (await projects.get('p1')) as Record<string, unknown>;
		const onOpenChange = vi.fn();
		await render(<EntityFormSheet resource="projects" record={project} open onOpenChange={onOpenChange} />, resources);
		await settle();

		// The saved members load before the form starts.
		expect([...document.querySelectorAll('[data-slot="combobox-chip"]')].map(text)).toEqual(['Ada', 'Lin']);

		await type(field('Name'), 'Launch v2');
		await submit();

		expect(projects.update).toHaveBeenCalledWith('p1', { name: 'Launch v2' });
		expect(projects.link).not.toHaveBeenCalled();
		expect(onOpenChange).toHaveBeenLastCalledWith(false);

		await act(async () => root!.unmount());
		const updated = (await projects.get('p1')) as Record<string, unknown>;
		root = createRoot(container!);
		await act(async () =>
			root!.render(
				<ResourceKitProvider router={router} resources={resources} queryClient={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
					<EntityFormSheet resource="projects" record={updated} open onOpenChange={() => {}} />
				</ResourceKitProvider>,
			),
		);
		await settle();
		projects.update.mockClear();

		const lin = [...document.querySelectorAll('[data-slot="combobox-chip"]')].find((chip) => text(chip) === 'Lin');
		await click(lin!.querySelector<HTMLElement>('[data-slot="combobox-chip-remove"]')!);
		await submit();

		expect(projects.update).not.toHaveBeenCalled();
		expect(projects.link).toHaveBeenCalledWith('p1', 'members', ['ada']);
		expect(await projects.linked!('p1', 'members')).toEqual(['ada']);
	});

	it('says why a list failed instead of showing an empty table', async () => {
		const { resources, tasks } = workspace();
		const list = tasks.list.getMockImplementation()!;
		tasks.list.mockImplementation((query) => (query.search ? Promise.reject(new Error('Field "nmae" is not defined by type "TaskFilter".')) : list(query)));
		// Hosts usually retry failed reads; the failure must show on the first one, not after the retries.
		await render(<ResourcePage resource="tasks" />, resources, 3);
		await settle();
		expect(text(document.querySelector('tbody'))).toContain('Write the brief');

		const search = document.querySelector<HTMLInputElement>('input[type="search"]')!;
		await type(search, 'brief');
		await act(async () => new Promise((resolve) => setTimeout(resolve, 300)));
		await settle();

		expect(text(document.body)).toContain('Couldn’t load tasks');
		expect(text(document.body)).toContain('Field "nmae" is not defined by type "TaskFilter".');
		expect(text(document.body)).not.toContain('Write the brief');
	});

	it('names a record titled by a relation after the related records, not its id', async () => {
		const { resources } = workspace();
		await render(<ResourcePage resource="assignments" />, resources);
		await settle();

		const link = [...document.querySelectorAll('tbody a')].find((anchor) => anchor.getAttribute('href') === '/assignments/4c1e9a20-0b7d-4a5e-9c6f-2d8e1f3a7b90');
		expect(text(link)).toBe('Write the brief · Ada');
		expect(document.querySelector('[aria-label="Actions for Write the brief · Ada"]')).not.toBeNull();
		expect(text(document.body)).not.toContain('4c1e9a20');

		// With no second relation, the next short column tells records apart.
		await act(async () => root!.unmount());
		await render(<ResourcePage resource="notes" />, resources);
		await settle();
		expect(text(document.querySelector('a[href="/notes/9b2f6c1d-3e4a-4b5c-8d7e-1f2a3b4c5d6e"]'))).toBe('Write the brief · Blocker');
	});

	it('never unlinks a many-to-many set it could not read', async () => {
		const { resources, projects } = workspace();
		projects.linked.mockImplementation(() => Promise.reject(new Error('permission denied for table project_members')));
		const project = (await projects.get('p1')) as Record<string, unknown>;
		await render(<EntityFormSheet resource="projects" record={project} open onOpenChange={() => {}} />, resources);
		await settle();

		expect(text(document.body)).toContain('Couldn’t load the linked members');
		expect(field('Members').disabled).toBe(true);

		await type(field('Name'), 'Launch v2');
		await submit();

		expect(projects.update).toHaveBeenCalledWith('p1', { name: 'Launch v2' });
		expect(projects.link).not.toHaveBeenCalled();
	});

	it('reopens a create whose links failed as an edit, so saving again never creates a second record', async () => {
		const { resources, projects } = workspace();
		projects.link.mockRejectedValueOnce(new Error('connection reset'));
		await render(<EntityFormSheet resource="projects" open onOpenChange={() => {}} defaultValues={{ members: ['ada'] }} />, resources);
		await settle();

		await type(field('Name'), 'Q4 plan');
		await submit();

		expect(projects.create).toHaveBeenCalledTimes(1);
		const created = (await projects.create.mock.results[0]!.value) as { id: string };
		expect(text(document.body)).toContain('Edit project');
		expect(text(document.body)).toContain('The project was saved, but its members were not.');

		await submit();

		expect(projects.create).toHaveBeenCalledTimes(1);
		expect(projects.update).not.toHaveBeenCalled();
		expect(projects.link).toHaveBeenLastCalledWith(created.id, 'members', ['ada']);
	});

	it('keeps a default the form does not show, such as the parent of a related list', async () => {
		const { resources, tasks } = workspace();
		const withoutParent = resources.map((resource) => (resource.name === 'tasks' ? { ...resource, formFields: ['title', 'done', 'estimate'] } : resource));
		await render(<EntityFormSheet resource="tasks" open onOpenChange={() => {}} defaultValues={{ projectId: 'p1' }} />, withoutParent);
		await settle();

		await type(field('Title'), 'Book the venue');
		await submit();

		expect(tasks.create).toHaveBeenCalledWith({ title: 'Book the venue', done: false, projectId: 'p1' });
	});

	it('puts a source’s field messages under their inputs and leads with a plain sentence, not server internals', async () => {
		const { resources, tasks } = workspace();
		tasks.create
			.mockRejectedValueOnce(Object.assign(new Error('duplicate key value violates unique constraint "tasks_title_key"'), { fields: { title: 'A task with this title already exists.' } }))
			.mockRejectedValueOnce(new Error('ERROR: deadlock detected (SQLSTATE 40P01)'));
		await render(<EntityFormSheet resource="tasks" open onOpenChange={() => {}} defaultValues={{ projectId: 'p1' }} />, resources);
		await settle();

		await type(field('Title'), 'Write the brief');
		await submit();

		expect(field('Title').getAttribute('aria-invalid')).toBe('true');
		expect(text(document.body)).toContain('A task with this title already exists.');
		expect(text(document.body)).toContain('Check the highlighted fields.');
		expect(text(document.body)).not.toContain('duplicate key');

		await submit();

		const alert = document.querySelector('form [role="alert"]')!;
		expect(text(alert.querySelector('span'))).toBe('The task could not be saved. Try again.');
		expect(alert.querySelector('details')?.open).toBe(false);
	});
});

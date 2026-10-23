import type { Meta, StoryObj } from '@storybook/react-vite';
import * as React from 'react';

import {
	type AnyResource,
	createCrmDemo,
	createMemorySource,
	defineResource,
	crmDemoData,
	CRM_DEMO_ICONS,
	CRM_DEMO_NOW,
	DeleteDialog,
	EntityFormSheet,
	ResourceKitProvider,
	type ResourceSource,
	useMemoryRouter,
} from '../components/resource-kit';
import { StoryApp } from './resource-kit/story-app';

const meta: Meta = {
	title: 'App Kit/Resource Kit',
	parameters: {
		layout: 'fullscreen',
		docs: {
			description: {
				component:
					'List, detail, and form screens generated from resource definitions. Each resource names its fields, how they read and edit, and a source with list, get, create, update, remove, and optional many-to-many link calls. These stories run a small CRM over in-memory sources: companies, contacts that belong to a company and carry tags, deals that belong to a company and a contact, and tags.',
			},
		},
	},
};
export default meta;
type Story = StoryObj;

type AppProps = {
	path: string;
	width?: number;
	latency?: number;
	/** Builds the resources in place of the plain CRM, e.g. with a failing source. */
	build?: () => AnyResource[];
};

/** One CRM per story mount, so edits in one story never leak into another. */
function App({ path, width, latency, build }: AppProps) {
	const [resources] = React.useState(() => build?.() ?? createCrmDemo({ latency }));
	return <StoryApp resources={resources} initialPath={path} width={width} />;
}

export const Contacts: Story = { render: () => <App path="/contacts" latency={250} /> };

export const CompanyDetail: Story = {
	name: 'Company detail with related lists',
	render: () => <App path="/companies/co-2" latency={250} />,
};

export const ContactDetail: Story = { name: 'Contact detail (many-to-many tags)', render: () => <App path="/contacts/ct-1" latency={250} /> };

export const Deals: Story = { name: 'Deals (currency, dates, two relations)', render: () => <App path="/deals" latency={250} /> };

export const Tags: Story = { name: 'Tags (linked contacts column)', render: () => <App path="/tags" latency={250} /> };

export const NarrowPane: Story = {
	name: 'Narrow pane (700px)',
	render: () => <App path="/contacts" width={700} latency={250} />,
};

export const Loading: Story = { name: 'Slow source', render: () => <App path="/deals" latency={2500} /> };

/** Wraps a source so its reads or writes fail with a given message. */
function failing(source: ResourceSource, methods: (keyof ResourceSource)[], message: string): ResourceSource {
	const reject = () => Promise.reject(Object.assign(new Error(message), { fields: { email: 'This address is already on another contact.' } }));
	return Object.fromEntries(Object.entries(source).map(([key, value]) => [key, methods.includes(key as keyof ResourceSource) ? reject : value])) as unknown as ResourceSource;
}

function withSource(resources: AnyResource[], name: string, wrap: (source: ResourceSource) => ResourceSource) {
	return resources.map((resource) => (resource.name === name ? { ...resource, source: wrap(resource.source) } : resource));
}

export const LoadError: Story = {
	name: 'List fails to load',
	render: () => <App path="/deals" build={() => withSource(createCrmDemo(), 'deals', (source) => failing(source, ['list'], 'permission denied for table deals'))} />,
};

export const Empty: Story = {
	name: 'No records yet',
	render: () => <App path="/deals" build={() => createCrmDemo({ data: { ...crmDemoData(), deals: [] } })} />,
};

function FormStory({ mode, rejectSave }: { mode: 'create' | 'edit'; rejectSave?: boolean }) {
	const { router } = useMemoryRouter('/contacts');
	const [resources] = React.useState(() => {
		const all = createCrmDemo();
		return rejectSave ? withSource(all, 'contacts', (source) => failing(source, ['create', 'update'], 'A contact with this email already exists.')) : all;
	});
	const [open, setOpen] = React.useState(true);
	const [record, setRecord] = React.useState<Record<string, unknown> | null>(null);
	React.useEffect(() => {
		if (mode === 'edit') void resources.find((resource) => resource.name === 'contacts')!.source.get('ct-1').then(setRecord);
	}, [mode, resources]);
	return (
		<ResourceKitProvider router={router} resources={resources} icons={CRM_DEMO_ICONS} now={CRM_DEMO_NOW}>
			<div className="grid h-dvh place-items-center p-6">
				<button type="button" className="rounded-md border border-border px-3 py-1.5 text-sm" onClick={() => setOpen(true)}>
					Open the form
				</button>
			</div>
			{mode === 'create' || record ? <EntityFormSheet resource="contacts" record={mode === 'edit' ? record : null} open={open} onOpenChange={setOpen} /> : null}
		</ResourceKitProvider>
	);
}

export const CreateForm: Story = { name: 'Form: new contact', render: () => <FormStory mode="create" /> };
export const EditForm: Story = { name: 'Form: edit contact', render: () => <FormStory mode="edit" /> };
export const SaveRejected: Story = { name: 'Form: save rejected by the source', render: () => <FormStory mode="create" rejectSave /> };

export const DeleteConfirm: Story = {
	name: 'Delete confirmation',
	render: () => {
		const Story = () => {
			const { router } = useMemoryRouter('/contacts');
			const [resources] = React.useState(() => createCrmDemo());
			const [record, setRecord] = React.useState<Record<string, unknown> | null>(null);
			React.useEffect(() => {
				void resources[1]!.source.get('ct-2').then(setRecord);
			}, [resources]);
			return (
				<ResourceKitProvider router={router} resources={resources} now={CRM_DEMO_NOW}>
					<DeleteDialog resource="contacts" record={record} open={Boolean(record)} onOpenChange={() => {}} />
				</ResourceKitProvider>
			);
		};
		return <Story />;
	},
};

/** Rejects `list` calls that search, the way an API refuses a filter on a field it does not have. */
function failingSearch(source: ResourceSource): ResourceSource {
	return {
		...source,
		list: (query) => (query.search ? Promise.reject(new Error('Field "nmae" is not defined by type "ContactFilter".')) : source.list(query)),
	};
}

export const SearchFails: Story = {
	name: 'Search fails',
	parameters: { docs: { description: { story: 'Type in the search box: the source rejects every search, and the page says why instead of showing an empty table.' } } },
	render: () => <App path="/contacts" build={() => withSource(createCrmDemo({ latency: 200 }), 'contacts', failingSearch)} />,
};

export const PickerSearchFails: Story = {
	name: 'Form: relation search fails',
	parameters: { docs: { description: { story: 'Open the Contact picker and type: the picker shows the source’s message rather than “no matches”.' } } },
	render: () => {
		const Story = () => {
			const { router } = useMemoryRouter('/deals');
			const [resources] = React.useState(() => withSource(createCrmDemo({ latency: 200 }), 'contacts', failingSearch));
			return (
				<ResourceKitProvider router={router} resources={resources} icons={CRM_DEMO_ICONS} now={CRM_DEMO_NOW}>
					<EntityFormSheet resource="deals" open onOpenChange={() => {}} defaultValues={{ companyId: 'co-1', status: 'open' }} />
				</ResourceKitProvider>
			);
		};
		return <Story />;
	},
};

type Stakeholder = { id: string; dealId: string; contactId: string; role: string };

/** The CRM plus deal stakeholders, a resource titled by a relation. */
function withStakeholders(): AnyResource[] {
	const crm = createCrmDemo({ latency: 150 });
	const stakeholders = defineResource<Stakeholder>({
		name: 'stakeholders',
		label: 'Stakeholders',
		singular: 'Stakeholder',
		icon: 'users',
		primaryKey: 'id',
		titleField: 'dealId',
		columns: ['dealId', 'contactId', 'role'],
		formFields: ['dealId', 'contactId', 'role'],
		fields: {
			id: { name: 'id', label: 'ID', input: 'uuid', hidden: true },
			dealId: { name: 'dealId', label: 'Deal', input: 'relation', required: true, relation: { resource: 'deals' } },
			contactId: { name: 'contactId', label: 'Contact', input: 'relation', required: true, relation: { resource: 'contacts' } },
			role: {
				name: 'role',
				label: 'Role',
				input: 'select',
				options: [
					{ value: 'champion', label: 'Champion', tone: 'success' },
					{ value: 'approver', label: 'Approver', tone: 'info' },
					{ value: 'blocker', label: 'Blocker', tone: 'danger' },
				],
			},
		},
		source: createMemorySource<Stakeholder>([
			{ id: '01a1529c-7d2e-4f0b-9a63-5be0c4d1e8f2', dealId: 'dl-1', contactId: 'ct-6', role: 'champion' },
			{ id: '7f3c9e14-2b8a-4c55-8d01-a9e6f2b3c470', dealId: 'dl-2', contactId: 'ct-11', role: 'approver' },
			{ id: 'c2d4e6f8-1a3b-4c5d-8e9f-0a1b2c3d4e5f', dealId: 'dl-3', contactId: 'ct-16', role: 'blocker' },
		]),
	});
	return [...crm, stakeholders];
}

export const TitledByRelations: Story = {
	name: 'Titled by relations',
	parameters: {
		docs: {
			description: {
				story: 'Deal stakeholders have no text column, so the definition titles them by `dealId`. Rows, breadcrumbs, menus, and pickers name each one by its deal and contact instead of its id.',
			},
		},
	},
	render: () => <App path="/stakeholders" build={withStakeholders} />,
};

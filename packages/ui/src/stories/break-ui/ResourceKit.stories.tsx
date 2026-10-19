import type { Meta, StoryObj } from '@storybook/react-vite';
import * as React from 'react';

import { createCrmDemo, crmDemoData, CRM_DEMO_ICONS, CRM_DEMO_NOW, type CrmDemoData, EntityFormSheet, ResourceKitProvider } from '../../components/resource-kit';
import { StoryApp, useMemoryRouter } from '../resource-kit/story-app';
import { type Dataset, getDataset } from './dataset';
import { emptyCrm, hugeCrm, oneCrm, worstCrm } from './resource-worst-case';

const meta: Meta = {
	title: 'Break UI/Resource Kit',
	parameters: {
		layout: 'fullscreen',
		breakUi: { states: ['demo', 'worst', 'empty', 'one', 'huge'] },
	},
};
export default meta;

const DATA: Record<Dataset, () => CrmDemoData> = {
	demo: crmDemoData,
	worst: () => worstCrm,
	empty: () => emptyCrm,
	one: () => oneCrm,
	huge: () => hugeCrm,
};

/** Rebuilds the CRM whenever the dataset switches, so every state starts clean. */
function Frame({ dataset, path, width }: { dataset: Dataset; path: string; width?: number }) {
	const resources = React.useMemo(() => createCrmDemo({ data: DATA[dataset](), latency: 150 }), [dataset]);
	return <StoryApp key={dataset} resources={resources} initialPath={path} width={width} brand={dataset === 'worst' ? 'Northwind Industries Holdings International Group' : 'Acme CRM'} />;
}

const story = (path: string, width?: number): StoryObj => ({
	render: (_args, context) => <Frame dataset={getDataset(context)} path={path} width={width} />,
});

export const Contacts: StoryObj = story('/contacts');
export const ContactsNarrow: StoryObj = { name: 'Contacts at 700px', ...story('/contacts', 700) };
export const ContactsPhone: StoryObj = { name: 'Contacts at 375px', ...story('/contacts', 375) };
export const Companies: StoryObj = story('/companies');
export const CompanyDetail: StoryObj = { name: 'Company detail', ...story('/companies/co-1') };
export const ContactDetail: StoryObj = { name: 'Contact detail', ...story('/contacts/ct-1') };
export const Deals: StoryObj = story('/deals');
export const Tags: StoryObj = story('/tags');

function EditWorst({ dataset }: { dataset: Dataset }) {
	const { router } = useMemoryRouter('/contacts');
	const resources = React.useMemo(() => createCrmDemo({ data: DATA[dataset]() }), [dataset]);
	const [record, setRecord] = React.useState<Record<string, unknown> | null>(null);
	const [open, setOpen] = React.useState(true);
	React.useEffect(() => {
		void resources[1]!.source.get('ct-1').then(setRecord);
	}, [resources]);
	return (
		<ResourceKitProvider router={router} resources={resources} icons={CRM_DEMO_ICONS} now={CRM_DEMO_NOW}>
			<div className="grid h-dvh place-items-center">
				<button type="button" className="rounded-md border border-border px-3 py-1.5 text-sm" onClick={() => setOpen(true)}>
					Open the form
				</button>
			</div>
			<EntityFormSheet key={dataset} resource="contacts" record={record} open={open} onOpenChange={setOpen} />
		</ResourceKitProvider>
	);
}

export const EditForm: StoryObj = {
	name: 'Form: edit the first contact',
	render: (_args, context) => <EditWorst dataset={getDataset(context)} />,
};

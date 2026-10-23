import type { Meta, StoryObj } from '@storybook/react-vite';
import * as React from 'react';

import { LayoutDashboard } from 'lucide-react';

import { DashboardGrid, RecentRecords, ResourceCountTile, StatTile } from '../components/dashboard-tiles';
import { ViewFrame } from '../components/workspace-kit';
import { createCrmDemo } from '../components/resource-kit';
import { DemoDashboard } from './resource-kit/demo-dashboard';
import { StoryApp } from './resource-kit/story-app';

const NEWEST = { field: 'createdAt', direction: 'desc' } as const;

const meta: Meta = {
	title: 'App Kit/Dashboard Tiles',
	parameters: {
		layout: 'fullscreen',
		docs: {
			description: {
				component:
					'Dashboard pieces for a generated app: a stat tile on its own card, a count tile that reads a resource’s total (optionally filtered) and links to its list, the latest records of a resource, and a grid that lays them out by its own width.',
			},
		},
	},
};
export default meta;
type Story = StoryObj;

function App({ width, latency = 300 }: { width?: number; latency?: number }) {
	const [resources] = React.useState(() => createCrmDemo({ latency }));
	return <StoryApp resources={resources} initialPath="/" home={<DemoDashboard />} width={width} />;
}

export const Dashboard: Story = { render: () => <App /> };
export const NarrowPane: Story = { name: 'Narrow pane (700px)', render: () => <App width={700} /> };
export const Phone: Story = { name: 'Phone (375px)', render: () => <App width={375} /> };
export const Loading: Story = { name: 'Slow source', render: () => <App latency={4000} /> };

/** Count tiles share a row with a taller list and keep their own height. */
function MixedRow() {
	const [resources] = React.useState(() => createCrmDemo({ latency: 300 }));
	const home = (
		<div className="@container/view flex min-h-0 min-w-0 flex-1 flex-col">
			<ViewFrame icon={LayoutDashboard} title="Overview">
				<DashboardGrid>
					<ResourceCountTile resource="companies" />
					<ResourceCountTile resource="deals" label="Open deals" filters={{ status: 'open' }} hint="Across every company" />
					<RecentRecords resource="deals" title="Latest deals" sort={NEWEST} />
				</DashboardGrid>
			</ViewFrame>
		</div>
	);
	return <StoryApp resources={resources} initialPath="/" home={home} />;
}

export const TilesBesideList: Story = { name: 'Tiles beside a list', render: () => <MixedRow /> };

export const Tiles: Story = {
	name: 'Stat tiles on their own',
	render: () => (
		<div className="grid max-w-3xl grid-cols-2 gap-3 p-6">
			<StatTile label="Revenue this month" value="$48,210" hint="+12% vs last month" />
			<StatTile label="Linked tile" value="128" hint="Opens its list" href="#contacts" />
			<StatTile label="Loading" value="0" loading />
			<StatTile label="Nothing yet" value="—" hint="No data this period" />
		</div>
	),
};

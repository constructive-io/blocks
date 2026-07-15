import type { Meta, StoryObj } from '@storybook/react-vite';

import { useState } from 'react';

import { OrgChart, type OrgChartEdge } from '../components/org-chart';

const meta: Meta = {
	title: 'Blocks/OrgChart',
	component: OrgChart,
	parameters: {
		layout: 'fullscreen',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj;

const initialEdges: OrgChartEdge[] = [
	{ id: 'u1', parentId: null, displayName: 'Alice Chen', avatarUrl: null, positionTitle: 'CEO' },
	{ id: 'u2', parentId: 'u1', displayName: 'Bob Martinez', avatarUrl: null, positionTitle: 'VP Engineering' },
	{ id: 'u3', parentId: 'u1', displayName: 'Carol Kim', avatarUrl: null, positionTitle: 'VP Design' },
	{ id: 'u4', parentId: 'u2', displayName: 'Dave Wilson', avatarUrl: null, positionTitle: 'Senior Engineer' },
	{ id: 'u5', parentId: 'u2', displayName: 'Eve Johnson', avatarUrl: null, positionTitle: 'Senior Engineer' },
	{ id: 'u6', parentId: 'u3', displayName: 'Frank Lee', avatarUrl: null, positionTitle: 'UX Designer' },
];

export const Default: Story = {
	render: () => {
		const [edges, setEdges] = useState<OrgChartEdge[]>(initialEdges);

		return (
			<div style={{ width: '100vw', height: '100vh' }}>
				<OrgChart
					edges={edges}
					editable
					onReparent={(childId, newParentId) => {
						setEdges((prev) =>
							prev.map((e) => (e.id === childId ? { ...e, parentId: newParentId } : e)),
						);
					}}
					onEditNode={(nodeData) => {
						console.log('edit', nodeData.id, nodeData.displayName);
					}}
					onRemoveNode={(nodeData) => {
						setEdges((prev) =>
							prev.filter((e) => e.id !== nodeData.id && e.parentId !== nodeData.id),
						);
					}}
				/>
			</div>
		);
	},
};

export const ReadOnly: Story = {
	render: () => (
		<div style={{ width: '100vw', height: '100vh' }}>
			<OrgChart edges={initialEdges} />
		</div>
	),
};

export const Loading: Story = {
	render: () => (
		<div style={{ width: '100vw', height: '100vh' }}>
			<OrgChart edges={[]} isLoading />
		</div>
	),
};

export const Empty: Story = {
	render: () => (
		<div style={{ width: '100vw', height: '100vh' }}>
			<OrgChart
				edges={[]}
				editable
				onAddToChart={() => {
					console.log('add to chart clicked');
				}}
			/>
		</div>
	),
};

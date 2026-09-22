import type { Meta, StoryObj } from '@storybook/react-vite';

import { OrgChart, type OrgChartEdge } from '../components/org-chart';

const meta: Meta = {
	title: 'UI/OrgChart',
	component: OrgChart,
	parameters: {
		layout: 'padded',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const EDGES: OrgChartEdge[] = [
	{ id: 'alex', parentId: null, displayName: 'Alex Morgan', positionTitle: 'Chief Executive Officer', avatarUrl: null },
	{ id: 'maya', parentId: 'alex', displayName: 'Maya Chen', positionTitle: 'VP of Product', avatarUrl: null },
	{ id: 'theo', parentId: 'alex', displayName: 'Theo Brooks', positionTitle: 'VP of Engineering', avatarUrl: null },
	{ id: 'jordan', parentId: 'maya', displayName: 'Jordan Lee', positionTitle: 'Design Lead', avatarUrl: null },
	{ id: 'cass', parentId: 'theo', displayName: 'Cass Taylor', positionTitle: 'Platform Lead', avatarUrl: null },
];

export const Default: Story = {
	render: () => (
		<div className='h-[560px] w-[800px]'>
			<OrgChart className='h-full' defaultEdges={EDGES} />
		</div>
	),
};

export const ReadOnly: Story = {
	render: () => (
		<div className='h-[560px] w-[800px]'>
			<OrgChart className='h-full' defaultEdges={EDGES} editable={false} />
		</div>
	),
};

export const Loading: Story = {
	render: () => (
		<div className='h-[560px] w-[800px]'>
			<OrgChart className='h-full' defaultEdges={[]} isLoading />
		</div>
	),
};

export const Empty: Story = {
	render: () => (
		<div className='h-[560px] w-[800px]'>
			<OrgChart className='h-full' defaultEdges={[]} onAddToChart={() => {}} />
		</div>
	),
};

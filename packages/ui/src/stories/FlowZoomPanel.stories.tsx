import type { Meta, StoryObj } from '@storybook/react-vite';
import { ReactFlow, Background, type Node, type Edge } from '@xyflow/react';

import '@xyflow/react/dist/style.css';

import { FlowZoomPanel } from '../components/flow-zoom-panel';

const meta: Meta<typeof FlowZoomPanel> = {
	title: 'UI/FlowZoomPanel',
	component: FlowZoomPanel,
	parameters: {
		layout: 'fullscreen',
	},
	tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

const NODES: Node[] = [
	{ id: 'a', position: { x: 60, y: 80 }, data: { label: 'users' } },
	{ id: 'b', position: { x: 320, y: 40 }, data: { label: 'orders' } },
	{ id: 'c', position: { x: 320, y: 160 }, data: { label: 'products' } },
];

const EDGES: Edge[] = [
	{ id: 'a-b', source: 'a', target: 'b' },
	{ id: 'b-c', source: 'b', target: 'c' },
];

function Canvas({ position }: { position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }) {
	return (
		<div className='h-[420px] w-full'>
			<ReactFlow nodes={NODES} edges={EDGES} fitView proOptions={{ hideAttribution: true }}>
				<Background gap={16} />
				<FlowZoomPanel position={position} />
			</ReactFlow>
		</div>
	);
}

export const Default: Story = {
	render: () => <Canvas />,
};

export const TopLeft: Story = {
	render: () => <Canvas position='top-left' />,
};

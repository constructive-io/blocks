import type { Meta, StoryObj } from '@storybook/react-vite';
import { Background, ReactFlow, type Edge, type Node } from '@xyflow/react';
import { pickDataset } from './dataset';
import { emails, identifiers, labels, manyRows, names } from './worst-case';
import { FlowZoomPanel } from '../../components/flow-zoom-panel';

import '@xyflow/react/dist/style.css';

const meta: Meta = {
	title: 'Break UI/FlowZoomPanel',
	parameters: { layout: 'padded', breakUi: { states: ['demo', 'worst', 'empty', 'one', 'huge'] } },
};
export default meta;

const node = (id: string, label: string, x: number, y: number): Node => ({ id, position: { x, y }, data: { label } });

const demo: Node[] = [node('a', 'users', 40, 40), node('b', 'orders', 260, 20), node('c', 'products', 260, 120)];

// Labels are table and column names, which are the longest identifiers a schema view shows.
const worstLabels = [identifiers.snakeIdentifier, emails.long, labels.german, names.cjk, identifiers.cameraFile, names.rtl];
const worst: Node[] = manyRows(12, (index) => node(`w${index}`, worstLabels[index % worstLabels.length], (index % 4) * 280, Math.floor(index / 4) * 90));
const huge: Node[] = manyRows(1500, (index) => node(`h${index}`, `table_${index}`, (index % 40) * 180, Math.floor(index / 40) * 70));

const edgesFor = (nodes: Node[]): Edge[] => nodes.slice(1).map((target, index) => ({ id: `e${index}`, source: nodes[index].id, target: target.id }));

function Canvas({ nodes, width, height, position }: { nodes: Node[]; width: number; height: number; position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' }) {
	return (
		<div style={{ width, height, maxWidth: '100%' }} className="rounded-md border" data-testid={`canvas-${width}x${height}-${position ?? 'default'}`}>
			<ReactFlow nodes={nodes} edges={edgesFor(nodes)} fitView proOptions={{ hideAttribution: true }}>
				<Background gap={16} />
				<FlowZoomPanel position={position} />
			</ReactFlow>
		</div>
	);
}

/** The zoom panel on a normal canvas, a tiny one, and in each corner. */
export const Stress: StoryObj = {
	render: (_args, context) => {
		const nodes = pickDataset<Node[]>(context, { demo, worst, empty: [], one: [demo[0]], huge });
		return (
			<div className="flex flex-wrap items-start gap-6">
				<Canvas nodes={nodes} width={480} height={260} />
				<Canvas nodes={nodes} width={120} height={90} />
				<Canvas nodes={nodes} width={280} height={160} position="top-left" />
				<Canvas nodes={nodes} width={280} height={160} position="top-right" />
				<Canvas nodes={nodes} width={280} height={160} position="bottom-left" />
			</div>
		);
	},
};

import { Suspense, act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { OrgChartEdge } from '../src/components/org-chart/org-chart.types';
import { OrgChart } from '../src/components/org-chart/org-chart';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const flowHarness = vi.hoisted(() => ({
	currentFitView: vi.fn(),
	getIntersectingNodes: vi.fn(() => []),
	onEdgesChange: vi.fn(),
	onNodesChange: vi.fn(),
	setEdges: vi.fn(),
	setNodes: vi.fn(),
	suspend: false,
	suspension: new Promise<never>(() => {}),
}));

const contextHarness = vi.hoisted(() => ({
	clearSelection: vi.fn(),
	selectNode: vi.fn(),
	setDraggedNodeId: vi.fn(),
	setDropTargetNodeId: vi.fn(),
}));

vi.mock('@xyflow/react', async () => {
	const React = await import('react');

	return {
		Background: () => null,
		BackgroundVariant: { Dots: 'dots' },
		ReactFlow: ({ children }: { children?: React.ReactNode }) => {
			if (flowHarness.suspend) throw flowHarness.suspension;
			return React.createElement('div', { 'data-react-flow': true }, children);
		},
		ReactFlowProvider: ({ children }: { children?: React.ReactNode }) => children,
		useEdgesState: () => [[], flowHarness.setEdges, flowHarness.onEdgesChange],
		useNodesState: () => [[], flowHarness.setNodes, flowHarness.onNodesChange],
		useReactFlow: () => ({
			fitView: flowHarness.currentFitView,
			getIntersectingNodes: flowHarness.getIntersectingNodes,
		}),
	};
});

vi.mock('../src/components/org-chart/layout', () => ({
	computeLayout: (edges: OrgChartEdge[]) => ({
		edges: edges
			.filter((edge) => edge.parentId !== null)
			.map((edge) => ({ id: `edge-${edge.id}`, source: edge.parentId, target: edge.id })),
		nodes: edges.map((edge, index) => ({
			id: edge.id,
			data: { ...edge, isRoot: edge.parentId === null },
			position: { x: index * 100, y: index * 100 },
			type: 'orgChartNode',
		})),
	}),
}));

vi.mock('../src/components/org-chart/org-chart-context', () => ({
	NodeActionsProvider: ({ children }: { children?: React.ReactNode }) => children,
	OrgChartProvider: ({ children }: { children?: React.ReactNode }) => children,
	useOrgChartContext: () => contextHarness,
}));

vi.mock('../src/components/org-chart/org-chart-edge', () => ({ OrgChartEdge: () => null }));
vi.mock('../src/components/org-chart/org-chart-empty', () => ({ OrgChartEmpty: () => null }));
vi.mock('../src/components/org-chart/org-chart-node', () => ({ OrgChartNodeMemo: () => null }));
vi.mock('../src/components/flow-zoom-panel', () => ({ FlowZoomPanel: () => null }));
vi.mock('../src/components/tooltip', () => ({
	TooltipProvider: ({ children }: { children?: React.ReactNode }) => children,
}));

const ROOT_EDGES: OrgChartEdge[] = [
	{ id: 'root', parentId: null, displayName: 'Root' },
];

const activeRoots = new Set<Root>();
let pendingFrames: Map<number, FrameRequestCallback>;
let nextFrameId: number;
let cancelAnimationFrameMock: ReturnType<typeof vi.fn>;

function createTestRoot() {
	const container = document.createElement('div');
	document.body.appendChild(container);
	const root = createRoot(container);
	activeRoots.add(root);
	return root;
}

function flushFrames() {
	for (const [id, callback] of [...pendingFrames]) {
		pendingFrames.delete(id);
		callback(performance.now());
	}
}

beforeEach(() => {
	flowHarness.currentFitView = vi.fn();
	flowHarness.suspend = false;
	pendingFrames = new Map();
	nextFrameId = 1;
	cancelAnimationFrameMock = vi.fn((id: number) => pendingFrames.delete(id));
	vi.stubGlobal('requestAnimationFrame', vi.fn((callback: FrameRequestCallback) => {
		const id = nextFrameId++;
		pendingFrames.set(id, callback);
		return id;
	}));
	vi.stubGlobal('cancelAnimationFrame', cancelAnimationFrameMock);
});

afterEach(async () => {
	flowHarness.suspend = false;
	for (const root of activeRoots) {
		await act(async () => root.unmount());
	}
	activeRoots.clear();
	document.body.replaceChildren();
	vi.unstubAllGlobals();
	vi.clearAllMocks();
});

describe('OrgChart fit-view scheduling', () => {
	it('uses the latest committed Flow callback for an already pending frame', async () => {
		const firstFitView = vi.fn();
		const latestFitView = vi.fn();
		const root = createTestRoot();

		flowHarness.currentFitView = firstFitView;
		await act(async () => root.render(<OrgChart edges={ROOT_EDGES} />));
		expect(pendingFrames.size).toBe(1);

		flowHarness.currentFitView = latestFitView;
		await act(async () => root.render(<OrgChart edges={ROOT_EDGES} />));
		expect(pendingFrames.size).toBe(1);

		await act(async () => flushFrames());

		expect(firstFitView).not.toHaveBeenCalled();
		expect(latestFitView).toHaveBeenCalledOnce();
		expect(latestFitView).toHaveBeenCalledWith({ padding: 0.12 });
	});

	it('cancels superseded layouts and fits only the latest one', async () => {
		const fitView = vi.fn();
		const root = createTestRoot();
		flowHarness.currentFitView = fitView;

		await act(async () => root.render(<OrgChart edges={ROOT_EDGES} />));
		await act(async () => root.render(
			<OrgChart
				edges={[...ROOT_EDGES, { id: 'child-a', parentId: 'root', displayName: 'Child A' }]}
			/>,
		));
		await act(async () => root.render(
			<OrgChart
				edges={[...ROOT_EDGES, { id: 'child-b', parentId: 'root', displayName: 'Child B' }]}
			/>,
		));

		expect(cancelAnimationFrameMock).toHaveBeenCalledTimes(2);
		expect(pendingFrames.size).toBe(1);
		await act(async () => flushFrames());
		expect(fitView).toHaveBeenCalledOnce();
	});

	it('cancels the pending frame on unmount', async () => {
		const fitView = vi.fn();
		const root = createTestRoot();
		flowHarness.currentFitView = fitView;

		await act(async () => root.render(<OrgChart edges={ROOT_EDGES} />));
		expect(pendingFrames.size).toBe(1);

		await act(async () => root.unmount());
		activeRoots.delete(root);

		expect(cancelAnimationFrameMock).toHaveBeenCalledOnce();
		expect(pendingFrames.size).toBe(0);
		flushFrames();
		expect(fitView).not.toHaveBeenCalled();
	});

	it('does not expose a fit-view callback from an abandoned suspended render', async () => {
		const committedFitView = vi.fn();
		const abandonedFitView = vi.fn();
		const root = createTestRoot();

		flowHarness.currentFitView = committedFitView;
		await act(async () => root.render(
			<Suspense fallback={<span>Suspended chart</span>}>
				<OrgChart edges={ROOT_EDGES} />
			</Suspense>,
		));
		expect(pendingFrames.size).toBe(1);

		flowHarness.currentFitView = abandonedFitView;
		flowHarness.suspend = true;
		await act(async () => root.render(
			<Suspense fallback={<span>Suspended chart</span>}>
				<OrgChart edges={ROOT_EDGES} />
			</Suspense>,
		));

		expect(pendingFrames.size).toBe(1);
		await act(async () => flushFrames());

		expect(committedFitView).toHaveBeenCalledOnce();
		expect(abandonedFitView).not.toHaveBeenCalled();
	});
});

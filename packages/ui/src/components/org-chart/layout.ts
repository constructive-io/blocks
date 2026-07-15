import type { Edge } from '@xyflow/react';
import type { OrgChartEdge, OrgChartNode } from './org-chart.types';

export const NODE_WIDTH = 260;
export const NODE_HEIGHT = 100;
const RANK_SEP = 80;
const NODE_SEP = 40;
const ROOT_KEY = '__root__';

export interface LayoutResult {
	nodes: OrgChartNode[];
	edges: Edge[];
}

export function computeLayout(edges: OrgChartEdge[]): LayoutResult {
	// Single pass builds edgeById, childCountMap, and childrenMap.
	const edgeById = new Map<string, OrgChartEdge>();
	const childCountMap = new Map<string, number>();
	const childrenMap = new Map<string, string[]>();
	for (const e of edges) {
		edgeById.set(e.id, e);
		if (e.parentId) {
			childCountMap.set(e.parentId, (childCountMap.get(e.parentId) ?? 0) + 1);
		}
		const parent = e.parentId ?? ROOT_KEY;
		const bucket = childrenMap.get(parent);
		if (bucket) bucket.push(e.id);
		else childrenMap.set(parent, [e.id]);
	}
	for (const children of childrenMap.values()) {
		children.sort((a, b) => {
			const nameA = edgeById.get(a)?.displayName?.toLowerCase() ?? '';
			const nameB = edgeById.get(b)?.displayName?.toLowerCase() ?? '';
			return nameA.localeCompare(nameB);
		});
	}

	const widthCache = new Map<string, number>();
	const subtreeWidth = (nodeId: string): number => {
		if (widthCache.has(nodeId)) return widthCache.get(nodeId)!;
		const children = childrenMap.get(nodeId);
		if (!children || children.length === 0) {
			widthCache.set(nodeId, NODE_WIDTH);
			return NODE_WIDTH;
		}
		const totalChildWidth = children.reduce((sum, c) => sum + subtreeWidth(c), 0);
		const gaps = (children.length - 1) * NODE_SEP;
		const w = Math.max(NODE_WIDTH, totalChildWidth + gaps);
		widthCache.set(nodeId, w);
		return w;
	};

	const positions = new Map<string, { x: number; y: number }>();

	const positionSubtree = (nodeId: string, centerX: number, y: number) => {
		positions.set(nodeId, { x: centerX, y });
		const children = childrenMap.get(nodeId);
		if (!children || children.length === 0) return;

		const totalWidth = children.reduce((sum, c) => sum + subtreeWidth(c), 0) + (children.length - 1) * NODE_SEP;
		let currentX = centerX - totalWidth / 2;

		for (const childId of children) {
			const childW = subtreeWidth(childId);
			positionSubtree(childId, currentX + childW / 2, y + NODE_HEIGHT + RANK_SEP);
			currentX += childW + NODE_SEP;
		}
	};

	const roots = childrenMap.get(ROOT_KEY) ?? [];
	if (roots.length === 1) {
		positionSubtree(roots[0], 0, 0);
	} else {
		const totalWidth = roots.reduce((sum, r) => sum + subtreeWidth(r), 0) + (roots.length - 1) * NODE_SEP;
		let currentX = -totalWidth / 2;
		for (const rootId of roots) {
			const w = subtreeWidth(rootId);
			positionSubtree(rootId, currentX + w / 2, 0);
			currentX += w + NODE_SEP;
		}
	}

	const nodes: OrgChartNode[] = edges.map((e) => {
		const pos = positions.get(e.id)!;
		return {
			id: e.id,
			type: 'orgChartNode' as const,
			width: NODE_WIDTH,
			height: NODE_HEIGHT,
			position: {
				x: pos.x - NODE_WIDTH / 2,
				y: pos.y,
			},
			data: {
				id: e.id,
				displayName: e.displayName,
				avatarUrl: e.avatarUrl,
				positionTitle: e.positionTitle,
				parentId: e.parentId,
				childCount: childCountMap.get(e.id) ?? 0,
				isRoot: !e.parentId,
			},
		};
	});

	const flowEdges: Edge[] = edges
		.filter((e) => e.parentId)
		.map((e) => ({
			id: `edge-${e.parentId}-${e.id}`,
			source: e.parentId!,
			target: e.id,
			type: 'orgChartEdge',
		}));

	return { nodes, edges: flowEdges };
}

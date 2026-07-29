import type { Node } from '@xyflow/react';

/** A single edge in the org chart — represents a person and their reporting relationship */
export interface OrgChartEdge {
	/** Person ID (used as the React Flow node id) */
	id: string;
	/** ID of the person this edge reports to (null = root) */
	parentId: string | null;
	displayName: string | null;
	avatarUrl: string | null;
	positionTitle: string | null;
}

/** Data carried by each React Flow node */
export interface OrgChartNodeData extends OrgChartEdge {
	childCount: number;
	isRoot: boolean;
	[key: string]: unknown;
}

export type OrgChartNode = Node<OrgChartNodeData, 'orgChartNode'>;

/** A single edge in the org chart: one person and who they report to. */
export interface OrgChartEdge {
	/** Person ID. */
	id: string;
	/** ID of the person this edge reports to (null = root). */
	parentId: string | null;
	displayName: string | null;
	avatarUrl: string | null;
	positionTitle: string | null;
}

/** A person as the chart shows them, passed to node callbacks. */
export interface OrgChartNodeData extends OrgChartEdge {
	/** Direct reports, including any hidden while the node is collapsed. */
	childCount: number;
	isRoot: boolean;
	/** True while the chart is narrow enough to use compact cards. */
	isCompact: boolean;
}

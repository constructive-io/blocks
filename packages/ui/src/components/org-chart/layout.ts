import type { OrgChartEdge, OrgChartNodeData } from './org-chart.types';

type Metrics = { width: number; header: number; footer: number; nodeGap: number; rankGap: number; treeGap: number };

const REGULAR: Metrics = { width: 232, header: 52, footer: 28, nodeGap: 24, rankGap: 72, treeGap: 56 };
const COMPACT: Metrics = { width: 184, header: 44, footer: 26, nodeGap: 12, rankGap: 56, treeGap: 32 };

/** Shell border (1) and bezel (3) on each side. */
const CHROME = 8;

export function metricsFor(compact: boolean) {
	return compact ? COMPACT : REGULAR;
}

/** Everyone indexed once: children sorted by name, roots in input order. */
export type OrgIndex = {
	edges: ReadonlyMap<string, OrgChartEdge>;
	children: ReadonlyMap<string, readonly string[]>;
	roots: readonly string[];
};

function byName(edges: ReadonlyMap<string, OrgChartEdge>) {
	return (a: string, b: string) => (edges.get(a)?.displayName ?? '').localeCompare(edges.get(b)?.displayName ?? '', undefined, { sensitivity: 'base' });
}

/**
 * Indexes flat edges into a forest. Anyone whose manager is missing (or is
 * themselves) becomes a root, and a cycle is broken at its first member, so
 * bad data still renders every person exactly once.
 */
export function indexEdges(list: readonly OrgChartEdge[]): OrgIndex {
	const edges = new Map(list.map((edge) => [edge.id, edge]));
	const children = new Map<string, string[]>();
	const roots: string[] = [];
	for (const edge of edges.values()) {
		const parent = edge.parentId && edge.parentId !== edge.id && edges.has(edge.parentId) ? edge.parentId : null;
		if (!parent) {
			roots.push(edge.id);
			continue;
		}
		const siblings = children.get(parent);
		if (siblings) siblings.push(edge.id);
		else children.set(parent, [edge.id]);
	}
	const compare = byName(edges);
	for (const siblings of children.values()) siblings.sort(compare);

	const reached = new Set<string>();
	const walk = (id: string) => {
		if (reached.has(id)) return;
		reached.add(id);
		for (const child of children.get(id) ?? []) walk(child);
	};
	roots.forEach(walk);
	for (const id of edges.keys()) {
		if (reached.has(id)) continue;
		roots.push(id);
		walk(id);
	}
	return { edges, children, roots };
}

/** Everyone below `id`, however deep. */
export function descendantsOf(index: OrgIndex, id: string): Set<string> {
	const found = new Set<string>();
	const stack = [...(index.children.get(id) ?? [])];
	while (stack.length > 0) {
		const next = stack.pop()!;
		if (found.has(next) || next === id) continue;
		found.add(next);
		stack.push(...(index.children.get(next) ?? []));
	}
	return found;
}

/** The chain of managers above `id`, nearest first. */
export function managersOf(index: OrgIndex, id: string): string[] {
	const chain: string[] = [];
	const seen = new Set([id]);
	let parent = effectiveParent(index, id);
	while (parent && !seen.has(parent)) {
		chain.push(parent);
		seen.add(parent);
		parent = effectiveParent(index, parent);
	}
	return chain;
}

export function effectiveParent(index: OrgIndex, id: string): string | null {
	const parentId = index.edges.get(id)?.parentId;
	return parentId && index.children.get(parentId)?.includes(id) ? parentId : null;
}

/** A person's node data straight from the index, whether or not they are on screen. */
export function nodeDataFor(index: OrgIndex, id: string, compact: boolean): OrgChartNodeData | undefined {
	const edge = index.edges.get(id);
	if (!edge) return undefined;
	return { ...edge, childCount: index.children.get(id)?.length ?? 0, isRoot: effectiveParent(index, id) === null, isCompact: compact };
}

export type PlacedPerson = {
	data: OrgChartNodeData;
	x: number;
	y: number;
	width: number;
	height: number;
	/** 0 for roots. */
	depth: number;
	/** Visible parent; null for roots. */
	parentId: string | null;
	/** Visible direct reports, left to right. */
	childIds: readonly string[];
	collapsed: boolean;
	/** Everyone hidden under a collapsed node. */
	hiddenCount: number;
	/** 1-based position among siblings, and the sibling count, for the tree's ARIA attributes. */
	position: number;
	siblings: number;
};

export type OrgLayout = {
	people: readonly PlacedPerson[];
	byId: ReadonlyMap<string, PlacedPerson>;
	width: number;
	height: number;
	nodeWidth: number;
};

/**
 * Tidy top-down tree: each subtree is as wide as its children (or one card),
 * parents centre over their children, and each rank sits one step lower.
 * Collapsed nodes keep their card but hide everyone below. Coordinates start
 * at 0, so the content box is `width` by `height`.
 */
export function computeLayout(index: OrgIndex, compact: boolean, collapsed: ReadonlySet<string>): OrgLayout {
	const metrics = metricsFor(compact);
	const step = CHROME + metrics.header + metrics.footer + metrics.rankGap;
	const visibleChildren = (id: string) => (collapsed.has(id) ? [] : (index.children.get(id) ?? []));

	const widths = new Map<string, number>();
	const subtreeWidth = (id: string, trail: Set<string>): number => {
		const cached = widths.get(id);
		if (cached !== undefined) return cached;
		trail.add(id);
		const kids = visibleChildren(id).filter((child) => !trail.has(child));
		const span = kids.reduce((sum, child) => sum + subtreeWidth(child, trail), 0) + Math.max(0, kids.length - 1) * metrics.nodeGap;
		trail.delete(id);
		const width = Math.max(metrics.width, span);
		widths.set(id, width);
		return width;
	};

	const people: PlacedPerson[] = [];
	const byId = new Map<string, PlacedPerson>();
	let height = 0;

	const place = (id: string, left: number, depth: number, parentId: string | null, position: number, siblings: number) => {
		const edge = index.edges.get(id);
		if (!edge || byId.has(id)) return;
		const allChildren = index.children.get(id) ?? [];
		const isCollapsed = collapsed.has(id) && allChildren.length > 0;
		const kids = isCollapsed ? [] : allChildren.filter((child) => !byId.has(child) && child !== id);
		const width = subtreeWidth(id, new Set());
		const nodeHeight = CHROME + metrics.header + (allChildren.length > 0 ? metrics.footer : 0);
		const person: PlacedPerson = {
			data: {
				...edge,
				childCount: allChildren.length,
				isRoot: parentId === null,
				isCompact: compact,
			},
			x: left + (width - metrics.width) / 2,
			y: depth * step,
			width: metrics.width,
			height: nodeHeight,
			depth,
			parentId,
			childIds: kids,
			collapsed: isCollapsed,
			hiddenCount: isCollapsed ? descendantsOf(index, id).size : 0,
			position,
			siblings,
		};
		people.push(person);
		byId.set(id, person);
		height = Math.max(height, person.y + nodeHeight);

		const span = kids.reduce((sum, child) => sum + (widths.get(child) ?? metrics.width), 0) + Math.max(0, kids.length - 1) * metrics.nodeGap;
		let cursor = left + (width - span) / 2;
		kids.forEach((child, childIndex) => {
			place(child, cursor, depth + 1, id, childIndex + 1, kids.length);
			cursor += (widths.get(child) ?? metrics.width) + metrics.nodeGap;
		});
	};

	let cursor = 0;
	index.roots.forEach((root, rootIndex) => {
		if (byId.has(root)) return;
		place(root, cursor, 0, null, rootIndex + 1, index.roots.length);
		cursor += subtreeWidth(root, new Set()) + metrics.treeGap;
	});

	return { people, byId, width: Math.max(0, cursor - metrics.treeGap), height, nodeWidth: metrics.width };
}

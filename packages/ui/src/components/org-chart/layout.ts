import type { WirePoint } from '../workspace-kit/canvas';
import type { OrgChartEdge, OrgChartNodeData } from './org-chart.types';

type Metrics = { width: number; header: number; footer: number; nodeGap: number; rankGap: number; treeGap: number; stackInset: number; stackGap: number };

const REGULAR: Metrics = { width: 232, header: 52, footer: 28, nodeGap: 24, rankGap: 72, treeGap: 56, stackInset: 20, stackGap: 12 };
const COMPACT: Metrics = { width: 184, header: 44, footer: 26, nodeGap: 12, rankGap: 56, treeGap: 32, stackInset: 16, stackGap: 8 };

/** More reports than this without a team of their own stack in columns under their manager instead of running in one row. */
const STACK_AFTER = 8;
/** Cards in a full stack column; a longer run gets more columns. */
const STACK_ROWS = 8;
/** Radius of the corners in a stacked report's line, which the lines of neighbouring reports overlap by so no corner leaves a gap. */
export const STACK_CORNER = 8;

/** Shell border (1) and bezel (3) on each side. */
const CHROME = 8;

/**
 * Card geometry in px at the default 16px root font size. `scale` is the user's root font size over 16, so
 * cards (whose avatar, name and footer are sized in rem) keep room for their content at larger text settings.
 */
export function metricsFor(compact: boolean, scale = 1): Metrics {
	const base = compact ? COMPACT : REGULAR;
	if (scale === 1) return base;
	const fit = (value: number) => Math.round(value * scale);
	return {
		width: fit(base.width),
		header: fit(base.header),
		footer: fit(base.footer),
		nodeGap: fit(base.nodeGap),
		rankGap: fit(base.rankGap),
		treeGap: fit(base.treeGap),
		stackInset: fit(base.stackInset),
		stackGap: fit(base.stackGap),
	};
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

/** Where a stacked report sits in its manager's columns, for the arrow keys, and the line that reaches it. */
export type StackSlot = {
	/** The report above and below in the same column, and in the same row of the columns either side. */
	up?: string;
	down?: string;
	left?: string;
	right?: string;
	/** From the manager's card, along a bus and down this column's spine, into the left edge of the card. */
	route: readonly WirePoint[];
};

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
	/** Visible direct reports, left to right; reports without a team who fill columns come last, column by column. */
	childIds: readonly string[];
	/** Set for a report in a stack of columns under the manager. */
	stack?: StackSlot;
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
 * Reports without a team of their own stack in columns once there are too
 * many for a row (see `STACK_AFTER`). Collapsed nodes keep their card but hide
 * everyone below. Coordinates start at 0, so the content box is `width` by `height`.
 */
export function computeLayout(index: OrgIndex, compact: boolean, collapsed: ReadonlySet<string>, scale = 1): OrgLayout {
	const metrics = metricsFor(compact, scale);
	const step = CHROME + metrics.header + metrics.footer + metrics.rankGap;
	const leafHeight = CHROME + metrics.header;
	const visibleChildren = (id: string) => (collapsed.has(id) ? [] : (index.children.get(id) ?? []));

	/**
	 * The reports without a team of their own, when there are too many for one row: they fill columns under their
	 * manager (a row of 40 is 10,000px wide) while reports with a team stay in the row.
	 */
	const stackPlan = (kids: readonly string[]) => {
		const leaves = kids.filter((kid) => !index.children.get(kid)?.length);
		if (leaves.length <= STACK_AFTER) return null;
		const rows = Math.ceil(leaves.length / Math.ceil(leaves.length / STACK_ROWS));
		const columns = Math.ceil(leaves.length / rows);
		return { leaves, members: new Set(leaves), rows, columns, width: columns * (metrics.stackInset + metrics.width) + (columns - 1) * metrics.nodeGap };
	};
	type StackPlan = NonNullable<ReturnType<typeof stackPlan>>;

	const widths = new Map<string, number>();
	const subtreeWidth = (id: string, trail: Set<string>): number => {
		const cached = widths.get(id);
		if (cached !== undefined) return cached;
		trail.add(id);
		const kids = visibleChildren(id).filter((child) => !trail.has(child));
		const plan = stackPlan(kids);
		const blocks = (plan ? kids.filter((kid) => !plan.members.has(kid)) : kids).map((child) => subtreeWidth(child, trail));
		if (plan) blocks.push(plan.width);
		const span = blocks.reduce((sum, block) => sum + block, 0) + Math.max(0, blocks.length - 1) * metrics.nodeGap;
		trail.delete(id);
		const width = Math.max(metrics.width, span);
		widths.set(id, width);
		return width;
	};

	const people: PlacedPerson[] = [];
	const byId = new Map<string, PlacedPerson>();
	let height = 0;

	const place = (id: string, left: number, depth: number, parentId: string | null, position: number, siblings: number, stacked?: { x: number; y: number; slot: StackSlot }) => {
		const edge = index.edges.get(id);
		if (!edge || byId.has(id)) return;
		const allChildren = index.children.get(id) ?? [];
		const isCollapsed = collapsed.has(id) && allChildren.length > 0;
		const kids = isCollapsed ? [] : allChildren.filter((child) => !byId.has(child) && child !== id);
		const plan = stackPlan(kids);
		const lead = plan ? kids.filter((kid) => !plan.members.has(kid)) : kids;
		const width = subtreeWidth(id, new Set());
		const nodeHeight = CHROME + metrics.header + (allChildren.length > 0 ? metrics.footer : 0);
		const person: PlacedPerson = {
			data: {
				...edge,
				childCount: allChildren.length,
				isRoot: parentId === null,
				isCompact: compact,
			},
			x: stacked ? stacked.x : left + (width - metrics.width) / 2,
			y: stacked ? stacked.y : depth * step,
			width: metrics.width,
			height: nodeHeight,
			depth,
			parentId,
			childIds: plan ? [...lead, ...plan.leaves] : kids,
			stack: stacked?.slot,
			collapsed: isCollapsed,
			hiddenCount: isCollapsed ? descendantsOf(index, id).size : 0,
			position,
			siblings,
		};
		people.push(person);
		byId.set(id, person);
		height = Math.max(height, person.y + nodeHeight);

		const blocks = lead.map((child) => widths.get(child) ?? metrics.width);
		if (plan) blocks.push(plan.width);
		const span = blocks.reduce((sum, block) => sum + block, 0) + Math.max(0, blocks.length - 1) * metrics.nodeGap;
		const reports = lead.length + (plan ? plan.leaves.length : 0);
		let cursor = left + (width - span) / 2;
		lead.forEach((child, childIndex) => {
			place(child, cursor, depth + 1, id, childIndex + 1, reports);
			cursor += (widths.get(child) ?? metrics.width) + metrics.nodeGap;
		});
		if (plan) placeStack(plan, person, cursor, lead.length, reports);
	};

	/**
	 * Lays a manager's stacked reports out column by column, top to bottom, left to right. Each report's line is
	 * its own piece of the whole (trunk, bus, column spine, stub), so pieces never overlap and darken where they would.
	 */
	const placeStack = (plan: StackPlan, manager: PlacedPerson, left: number, before: number, siblings: number) => {
		const pitch = leafHeight + metrics.stackGap;
		const columnPitch = metrics.stackInset + metrics.width + metrics.nodeGap;
		const top = (manager.depth + 1) * step;
		const trunk: WirePoint = [manager.x + metrics.width / 2, manager.y + manager.height];
		const bus = trunk[1] + metrics.rankGap / 2;
		const total = plan.leaves.length;
		const columnLength = (column: number) => Math.min(plan.rows, total - column * plan.rows);
		plan.leaves.forEach((id, position) => {
			const column = Math.floor(position / plan.rows);
			const row = position % plan.rows;
			const x = left + column * columnPitch + metrics.stackInset;
			const y = top + row * pitch;
			const mid = y + leafHeight / 2;
			const spine = x - metrics.stackInset / 2;
			const route: WirePoint[] =
				row > 0
					? [[spine, mid - pitch - STACK_CORNER], [spine, mid], [x, mid]]
					: column > 0
						? [[spine - columnPitch - STACK_CORNER, bus], [spine, bus], [spine, mid], [x, mid]]
						: [trunk, [trunk[0], bus], [spine, bus], [spine, mid], [x, mid]];
			const slot: StackSlot = {
				up: row > 0 ? plan.leaves[position - 1] : undefined,
				down: row < columnLength(column) - 1 ? plan.leaves[position + 1] : undefined,
				left: column > 0 ? plan.leaves[(column - 1) * plan.rows + Math.min(row, columnLength(column - 1) - 1)] : undefined,
				right: column < plan.columns - 1 ? plan.leaves[(column + 1) * plan.rows + Math.min(row, columnLength(column + 1) - 1)] : undefined,
				route,
			};
			place(id, x, manager.depth + 1, manager.data.id, before + position + 1, siblings, { x, y, slot });
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

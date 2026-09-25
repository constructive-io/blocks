'use client';

import * as React from 'react';

import { cn } from '../../lib/utils';
import { TooltipProvider } from '../tooltip';
import { CanvasSurface, CanvasWire, CanvasZoomControls, useCanvasViewport, WIRE_STROKE, WireDot, type WirePoint, type WireTone } from '../workspace-kit/canvas';
import { useReducedMotion } from '../workspace-kit/reduced-motion';
import { useLatest } from '../workspace-kit/use-latest';
import { computeLayout, descendantsOf, effectiveParent, indexEdges, managersOf, nodeDataFor, type OrgLayout, type PlacedPerson } from './layout';
import { OrgChartDetails } from './org-chart-details';
import { OrgChartMoveDialog } from './org-chart-move-dialog';
import { OrgChartNode, type NodeHandlers } from './org-chart-node';
import { OrgChartEmpty, OrgChartLoading } from './org-chart-states';
import type { OrgChartEdge, OrgChartNodeData } from './org-chart.types';
import { personName } from './org-chart-utils';

/** Container width at or below which cards switch to their compact size. */
const COMPACT_MAX_WIDTH = 639;
/** Pointer travel, in screen pixels, before a press on a card becomes a drag. */
const DRAG_THRESHOLD = 4;
const CANVAS_INSET = { side: 24, top: 24, bottom: 64 };
const EMPTY_SET: ReadonlySet<string> = new Set();

interface OrgChartPropsBase {
	/** Additional classes for the chart container (e.g. `"h-full"` to fill parent). Default height: 600px. */
	className?: string;
	/** Whether data is still loading */
	isLoading?: boolean;
	/** Whether the current user can manage the chart (drag, edit, remove) */
	editable?: boolean;
	/** Called when a node is dragged onto a new parent. In uncontrolled mode, the component updates visually first — if this throws, it reverts. */
	onReparent?: (childId: string, newParentId: string, preserve: { positionTitle?: string | null }) => void | Promise<void>;
	/** Called when the "Add first person" button is clicked (empty state) */
	onAddToChart?: () => void;
	/** Called when "Edit position" is selected from the node menu or details panel */
	onEditNode?: (nodeData: OrgChartNodeData) => void;
	/** Called when "Remove from chart" is selected from the node menu or details panel */
	onRemoveNode?: (nodeData: OrgChartNodeData) => void;
	/** Toast handler for reparent success/error messages. If not provided, no toasts are shown. */
	onReparentSuccess?: (childName: string, parentName: string) => void;
	onReparentError?: (message: string) => void;
	/** Show a panel for the selected person with their manager, reports, and actions. Default: true. */
	showDetails?: boolean;
	/** Called when the selected person changes; `null` when the selection clears. */
	onSelectNode?: (nodeData: OrgChartNodeData | null) => void;
	/** People whose reports start folded away, e.g. every manager below the second level in a large org. */
	defaultCollapsedIds?: readonly string[];
}

/** Controlled mode — consumer owns edge state */
interface OrgChartControlledProps extends OrgChartPropsBase {
	edges: OrgChartEdge[];
	defaultEdges?: never;
}

/** Uncontrolled mode — component manages edge state internally with optimistic reparent */
interface OrgChartUncontrolledProps extends OrgChartPropsBase {
	edges?: never;
	defaultEdges: OrgChartEdge[];
}

export type OrgChartProps = OrgChartControlledProps | OrgChartUncontrolledProps;

type DragState = { id: string; dx: number; dy: number; targetId: string | null; blocked: ReadonlySet<string> };
type Press = { id: string; pointerId: number; x: number; y: number; moved: boolean; blocked: ReadonlySet<string> };

function edgesKey(edges: readonly OrgChartEdge[] | undefined) {
	return edges?.map((edge) => `${edge.id}:${edge.parentId}:${edge.positionTitle ?? ''}:${edge.displayName ?? ''}:${edge.avatarUrl ?? ''}`).join('|') ?? '';
}

function findNode(layer: HTMLElement | null, id: string) {
	if (!layer) return null;
	for (const node of layer.querySelectorAll<HTMLElement>('[data-node-id]')) if (node.dataset.nodeId === id) return node;
	return null;
}

/** The neighbour at the same depth, left (-1) or right (+1), across subtrees. */
function sideNeighbour(layout: OrgLayout, person: PlacedPerson, direction: -1 | 1) {
	const row = layout.people.filter((candidate) => candidate.depth === person.depth).sort((a, b) => a.x - b.x);
	return row[row.indexOf(person) + direction];
}

type Wire = { id: string; start: WirePoint; end: WirePoint; tone: WireTone; animated: boolean };

function useWires(layout: OrgLayout, highlighted: ReadonlySet<string>, drag: DragState | null, animate: boolean) {
	return React.useMemo(() => {
		const offset = (id: string) => (drag?.id === id ? drag : { dx: 0, dy: 0 });
		const top = (person: PlacedPerson): WirePoint => {
			const { dx, dy } = offset(person.data.id);
			return [person.x + person.width / 2 + dx, person.y + dy];
		};
		const bottom = (person: PlacedPerson): WirePoint => {
			const { dx, dy } = offset(person.data.id);
			return [person.x + person.width / 2 + dx, person.y + person.height + dy];
		};
		const wires: Wire[] = [];
		const anchors = new Map<string, { point: WirePoint; live: boolean }>();
		for (const person of layout.people) {
			if (!person.parentId) continue;
			const parent = layout.byId.get(person.parentId);
			if (!parent) continue;
			const id = person.data.id;
			if (drag?.id === id && drag.targetId) continue;
			const live = highlighted.has(id);
			wires.push({ id, start: bottom(parent), end: top(person), tone: live ? 'live' : 'rest', animated: false });
			const anchor = anchors.get(parent.data.id);
			anchors.set(parent.data.id, { point: bottom(parent), live: live || Boolean(anchor?.live) });
		}
		const target = drag?.targetId ? layout.byId.get(drag.targetId) : undefined;
		const dragged = drag ? layout.byId.get(drag.id) : undefined;
		if (target && dragged) {
			wires.push({ id: `preview-${dragged.data.id}`, start: bottom(target), end: top(dragged), tone: 'live', animated: animate });
			anchors.set(target.data.id, { point: bottom(target), live: true });
		}
		// Live wires paint last so they sit above the rest.
		wires.sort((a, b) => Number(a.tone === 'live') - Number(b.tone === 'live'));
		return { wires, anchors: [...anchors.entries()] };
	}, [animate, drag, highlighted, layout]);
}

function OrgChartInner(props: OrgChartProps) {
	const {
		className,
		edges: controlledEdges,
		defaultEdges,
		isLoading = false,
		editable = true,
		showDetails = true,
		onAddToChart,
		onEditNode,
		onRemoveNode,
	} = props;
	const isControlled = controlledEdges !== undefined;
	const [internalEdges, setInternalEdges] = React.useState<readonly OrgChartEdge[]>(defaultEdges ?? []);
	// New defaultEdges content (not just a new array) resets the uncontrolled chart.
	const defaultKey = React.useMemo(() => edgesKey(defaultEdges), [defaultEdges]);
	const [syncedKey, setSyncedKey] = React.useState(defaultKey);
	if (!isControlled && defaultKey !== syncedKey) {
		setSyncedKey(defaultKey);
		setInternalEdges(defaultEdges ?? []);
	}
	const edges = controlledEdges ?? internalEdges;

	const containerRef = React.useRef<HTMLDivElement>(null);
	const layerRef = React.useRef<HTMLDivElement>(null);
	const [compact, setCompact] = React.useState(false);
	const [collapsed, setCollapsed] = React.useState<ReadonlySet<string>>(() => new Set(props.defaultCollapsedIds));
	const [selectedId, setSelectedId] = React.useState<string | null>(null);
	const [activeId, setActiveId] = React.useState<string | null>(null);
	const [moveId, setMoveId] = React.useState<string | null>(null);
	const [drag, setDrag] = React.useState<DragState | null>(null);
	const [revealRequest, setRevealRequest] = React.useState<{ id: string } | null>(null);
	const [announcement, setAnnouncement] = React.useState('');
	const press = React.useRef<Press | null>(null);
	const animate = !useReducedMotion();

	const index = React.useMemo(() => indexEdges(edges), [edges]);
	const layout = React.useMemo(() => computeLayout(index, compact, collapsed), [index, compact, collapsed]);
	const selected = selectedId ? layout.byId.get(selectedId) : undefined;
	const tabStopId = activeId && layout.byId.has(activeId) ? activeId : (layout.people[0]?.data.id ?? null);

	const viewport = useCanvasViewport(layout.width, {
		fit: 'contain',
		contentHeight: layout.height,
		minZoom: 0.3,
		maxZoom: 1.5,
		// Past this the names are unreadable; frame the top of the tree instead of all of it.
		minFitZoom: compact ? 0.7 : 0.5,
		inset: CANVAS_INSET,
	});

	const highlighted = React.useMemo<ReadonlySet<string>>(() => {
		if (!selected) return EMPTY_SET;
		const id = selected.data.id;
		return new Set([id, ...managersOf(index, id).slice(0, -1), ...selected.childIds]);
	}, [index, selected]);
	const { wires, anchors } = useWires(layout, highlighted, drag, animate);

	React.useEffect(() => {
		const container = containerRef.current;
		if (!container || typeof ResizeObserver === 'undefined') return;
		const measure = () => setCompact(container.clientWidth <= COMPACT_MAX_WIDTH);
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(container);
		return () => observer.disconnect();
	}, []);

	// Ease a person into view once they are laid out (after unfolding their managers).
	const { reveal, viewportRef } = viewport;
	React.useEffect(() => {
		if (!revealRequest) return;
		const node = findNode(layerRef.current, revealRequest.id);
		if (node) reveal(node);
	}, [layout, reveal, revealRequest]);

	const latest = useLatest({ props, index, layout, compact, view: viewport.view, drag, isControlled });

	const select = React.useCallback(
		(id: string | null, andReveal = false) => {
			const { index, props, compact } = latest.current;
			setSelectedId(id);
			props.onSelectNode?.(id ? (nodeDataFor(index, id, compact) ?? null) : null);
			if (!id) return;
			// Unfold anyone above the person so they are on the chart.
			const above = new Set(managersOf(index, id));
			setCollapsed((current) => ([...above].some((manager) => current.has(manager)) ? new Set([...current].filter((manager) => !above.has(manager))) : current));
			setActiveId(id);
			if (andReveal) setRevealRequest({ id });
		},
		[latest],
	);

	const toggle = React.useCallback((id: string) => {
		setCollapsed((current) => {
			const next = new Set(current);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}, []);

	const reparent = React.useCallback(
		async (childId: string, parentId: string) => {
			const { index, props, isControlled } = latest.current;
			const child = index.edges.get(childId);
			const parent = index.edges.get(parentId);
			if (!child || !parent || childId === parentId || effectiveParent(index, childId) === parentId) return;
			if (descendantsOf(index, childId).has(parentId)) {
				props.onReparentError?.('Cannot create circular reporting chain');
				setAnnouncement(`${personName(parent)} reports to ${personName(child)}, so they can't be their manager.`);
				return;
			}
			const preserve = { positionTitle: child.positionTitle };
			const previousParentId = child.parentId;
			setCollapsed((current) => (current.has(parentId) ? new Set([...current].filter((id) => id !== parentId)) : current));
			if (!isControlled) setInternalEdges((current) => current.map((edge) => (edge.id === childId ? { ...edge, parentId } : edge)));
			try {
				await props.onReparent?.(childId, parentId, preserve);
				props.onReparentSuccess?.(child.displayName ?? 'Member', parent.displayName ?? 'new manager');
				setAnnouncement(`${personName(child)} now reports to ${personName(parent)}.`);
			} catch (error) {
				console.error('[OrgChart] reparent failed', error);
				if (!isControlled) {
					setInternalEdges((current) => current.map((edge) => (edge.id === childId && edge.parentId === parentId ? { ...edge, parentId: previousParentId } : edge)));
				}
				props.onReparentError?.('Failed to update reporting line');
				setAnnouncement(`${personName(child)}'s reporting line could not be changed.`);
			}
		},
		[latest],
	);

	const focusPerson = React.useCallback(
		(id: string | undefined) => {
			if (!id) return;
			const node = findNode(layerRef.current, id);
			if (!node) return;
			node.focus({ preventScroll: true });
			reveal(node);
		},
		[reveal],
	);

	const canEdit = Boolean(onEditNode);
	const canRemove = Boolean(onRemoveNode);
	const edit = React.useMemo(
		() =>
			canEdit
				? (id: string) => {
						const data = latest.current.layout.byId.get(id)?.data;
						if (data) latest.current.props.onEditNode?.(data);
					}
				: undefined,
		[canEdit, latest],
	);
	const remove = React.useMemo(
		() =>
			canRemove
				? (id: string) => {
						const data = latest.current.layout.byId.get(id)?.data;
						if (data) latest.current.props.onRemoveNode?.(data);
					}
				: undefined,
		[canRemove, latest],
	);

	const handlers = React.useMemo<NodeHandlers>(
		() => ({
			pointerDown(id, event) {
				if (event.button !== 0 || (event.target as Element).closest('button, a, [role="menuitem"], [role="menu"]')) return;
				event.currentTarget.setPointerCapture(event.pointerId);
				press.current = { id, pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false, blocked: EMPTY_SET };
			},
			pointerMove(id, event) {
				const current = press.current;
				if (!current || current.pointerId !== event.pointerId) return;
				const { props, layout, view, index } = latest.current;
				if (props.editable === false) return;
				const dx = event.clientX - current.x;
				const dy = event.clientY - current.y;
				if (!current.moved) {
					if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
					current.moved = true;
					current.blocked = new Set([id, ...descendantsOf(index, id)]);
				}
				const frame = viewportRef.current?.getBoundingClientRect();
				if (!frame) return;
				const x = (event.clientX - frame.left - view.x) / view.zoom;
				const y = (event.clientY - frame.top - view.y) / view.zoom;
				const hit = layout.people.find(
					(person) => !current.blocked.has(person.data.id) && x >= person.x && x <= person.x + person.width && y >= person.y && y <= person.y + person.height,
				);
				const targetId = hit && hit.data.id !== layout.byId.get(id)?.parentId ? hit.data.id : null;
				setDrag({ id, dx: dx / view.zoom, dy: dy / view.zoom, targetId, blocked: current.blocked });
			},
			pointerUp(id, event) {
				const current = press.current;
				if (!current || current.pointerId !== event.pointerId) return;
				press.current = null;
				const targetId = latest.current.drag?.targetId;
				setDrag(null);
				if (!current.moved) select(id);
				else if (targetId) void reparent(id, targetId);
			},
			pointerCancel() {
				press.current = null;
				setDrag(null);
			},
			keyDown(id, event) {
				if (event.target !== event.currentTarget) return;
				const { layout } = latest.current;
				const person = layout.byId.get(id);
				if (!person) return;
				const go = (next: string | undefined) => {
					event.preventDefault();
					focusPerson(next);
				};
				switch (event.key) {
					case 'ArrowUp':
						return go(person.parentId ?? undefined);
					case 'ArrowDown':
						if (person.collapsed) {
							event.preventDefault();
							return toggle(id);
						}
						return go(person.childIds[0]);
					case 'ArrowLeft':
						return go(sideNeighbour(layout, person, -1)?.data.id);
					case 'ArrowRight':
						return go(sideNeighbour(layout, person, 1)?.data.id);
					case 'Home':
						return go(layout.people[0]?.data.id);
					case 'Enter':
					case ' ':
						event.preventDefault();
						return select(id);
					case 'Escape':
						if (latest.current.drag) {
							press.current = null;
							setDrag(null);
						} else select(null);
						return;
				}
			},
			focus(id, event) {
				if (event.target !== event.currentTarget) return;
				setActiveId(id);
				// Keyboard focus (Tab into the tree) brings the card into view; a press on it does not.
				if (!press.current) reveal(event.currentTarget);
			},
			toggle,
			openMove: setMoveId,
			edit,
			remove,
		}),
		[edit, focusPerson, latest, remove, reparent, reveal, select, toggle, viewportRef],
	);

	const manager = selected?.parentId ? index.edges.get(selected.parentId) : undefined;
	const reports = selected
		? (index.children.get(selected.data.id) ?? []).flatMap((id): OrgChartEdge[] => {
				const report = index.edges.get(id);
				return report ? [report] : [];
			})
		: [];

	// One container for every state, so the width observer keeps watching it when data arrives.
	return (
		<div ref={containerRef} className={cn('@container/chart relative h-[600px]', className)}>
			{isLoading ? (
				<OrgChartLoading />
			) : edges.length === 0 ? (
				<OrgChartEmpty editable={editable} onAddRoot={onAddToChart} />
			) : (
				<>
					<CanvasSurface
						viewport={viewport}
						layerRef={layerRef}
						className="absolute inset-0 h-auto"
						label="Organization chart. Drag or use arrow keys to pan, plus and minus to zoom. Tab into the chart to move between people with the arrow keys."
						onPaneClick={() => select(null)}
						overlay={
							<>
								{showDetails && selected ? (
									<OrgChartDetails
										key={selected.data.id}
										person={selected}
										manager={manager}
										reports={reports}
										editable={editable}
										onSelect={(id) => select(id, true)}
										onClose={() => {
											select(null);
											focusPerson(selected.data.id);
										}}
										onToggle={toggle}
										onMove={setMoveId}
										onEdit={handlers.edit}
										onRemove={handlers.remove}
									/>
								) : null}
								<CanvasZoomControls viewport={viewport} fit />
							</>
						}
					>
						<svg aria-hidden="true" className="pointer-events-none absolute top-0 left-0 overflow-visible" width={Math.max(1, layout.width)} height={Math.max(1, layout.height)}>
							{wires.map((wire) => (
								<CanvasWire
									key={wire.id}
									start={wire.start}
									end={wire.end}
									tone={wire.tone}
									axis="vertical"
									animated={wire.animated}
									startDot={false}
									glide={animate && !drag}
								/>
							))}
							{anchors.map(([id, anchor]) => (
								<WireDot key={id} at={anchor.point} glide={animate && !drag} stroke={WIRE_STROKE[anchor.live ? 'live' : 'rest']} />
							))}
						</svg>
						<div role="tree" aria-label="Reporting lines">
							{layout.people.map((person) => {
								const id = person.data.id;
								const target = drag?.id === id && drag.targetId ? layout.byId.get(drag.targetId) : undefined;
								return (
									<OrgChartNode
										key={id}
										person={person}
										selected={id === selectedId}
										tabStop={id === tabStopId}
										editable={editable}
										dragOffset={drag?.id === id ? drag : null}
										dropTarget={drag?.targetId === id}
										blocked={Boolean(drag?.blocked.has(id))}
										dropHint={target ? `Reports to ${personName(target.data)}` : undefined}
										handlers={handlers}
									/>
								);
							})}
						</div>
					</CanvasSurface>
					<p role="status" aria-live="polite" className="sr-only">
						{announcement}
					</p>
					<OrgChartMoveDialog
						index={index}
						personId={moveId}
						onOpenChange={(open) => {
							if (!open) setMoveId(null);
						}}
						onMove={(personId, managerId) => {
							setMoveId(null);
							void reparent(personId, managerId);
						}}
					/>
				</>
			)}
		</div>
	);
}

export function OrgChart(props: OrgChartProps) {
	return (
		<TooltipProvider>
			<OrgChartInner {...props} />
		</TooltipProvider>
	);
}

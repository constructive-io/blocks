'use client';

import * as React from 'react';

import { cn } from '../../lib/utils';
import { TooltipProvider } from '../tooltip';
import { CanvasSurface, CanvasZoomControls, useCanvasViewport } from '../workspace-kit/canvas';
import { useReducedMotion } from '../workspace-kit/reduced-motion';
import { useLatest } from '../workspace-kit/use-latest';
import { computeLayout, descendantsOf, effectiveParent, indexEdges, managersOf, nodeDataFor, type OrgLayout, type PlacedPerson } from './layout';
import { OrgChartDetails } from './org-chart-details';
import { OrgChartMoveDialog } from './org-chart-move-dialog';
import { OrgChartNode, type NodeHandlers } from './org-chart-node';
import { useScene, type DragState } from './org-chart-scene';
import { CHART_SPRING_STYLE } from './org-chart-spring';
import { OrgChartEmpty, OrgChartLoading } from './org-chart-states';
import type { OrgChartEdge, OrgChartNodeData } from './org-chart.types';
import { personName } from './org-chart-utils';
import { OrgChartWires } from './org-chart-wires';

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

/** A press on a card, from pointer down until it ends; `stopListening` removes its window listeners. */
type Press = {
	id: string;
	pointerId: number;
	x: number;
	y: number;
	moved: boolean;
	blocked: ReadonlySet<string>;
	targetId: string | null;
	stopListening: () => void;
};

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
	/** The person the chart was last changed through (a fold, a drop); their card holds still as the layout reflows. */
	const [anchorId, setAnchorId] = React.useState<string | null>(null);
	const [announcement, setAnnouncement] = React.useState('');
	const press = React.useRef<Press | null>(null);
	const animate = !useReducedMotion();

	const index = React.useMemo(() => indexEdges(edges), [edges]);
	const layout = React.useMemo(() => computeLayout(index, compact, collapsed), [index, compact, collapsed]);
	const selected = selectedId ? layout.byId.get(selectedId) : undefined;
	const tabStopId = activeId && layout.byId.has(activeId) ? activeId : (layout.people[0]?.data.id ?? null);

	const highlighted = React.useMemo<ReadonlySet<string>>(() => {
		if (!selected) return EMPTY_SET;
		const id = selected.data.id;
		return new Set([id, ...managersOf(index, id).slice(0, -1), ...selected.childIds]);
	}, [index, selected]);
	const scene = useScene(layout, anchorId, drag, highlighted, animate);
	const { shift } = scene;

	const viewport = useCanvasViewport(layout.width, {
		fit: 'contain',
		contentHeight: layout.height,
		contentOrigin: shift,
		minZoom: 0.3,
		maxZoom: 1.5,
		// Past this the names are unreadable; frame the top of the tree instead of all of it.
		minFitZoom: compact ? 0.7 : 0.5,
		inset: CANVAS_INSET,
	});

	React.useEffect(() => {
		const container = containerRef.current;
		if (!container || typeof ResizeObserver === 'undefined') return;
		const measure = () => setCompact(container.clientWidth <= COMPACT_MAX_WIDTH);
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(container);
		return () => observer.disconnect();
	}, []);

	// Ease a person into view once they are laid out (after unfolding their managers), framing
	// where their card will settle rather than where it is mid-spring.
	const { reveal, viewportRef, hold } = viewport;
	React.useEffect(() => {
		const person = revealRequest ? layout.byId.get(revealRequest.id) : undefined;
		if (person) reveal({ ...person, x: person.x + shift.x, y: person.y + shift.y });
	}, [layout, reveal, revealRequest, shift]);

	const latest = useLatest({ props, index, layout, shift, compact, view: viewport.view, isControlled });

	// A press still running when the chart unmounts must not leave window listeners behind.
	React.useEffect(() => () => press.current?.stopListening(), []);

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

	// Folding a team keeps the person's card (and the pointer on its footer) where it is, and the view
	// stops auto-fitting: the chart reflows around the card instead of the camera jumping.
	const toggle = React.useCallback(
		(id: string) => {
			hold();
			setAnchorId(id);
			setCollapsed((current) => {
				const next = new Set(current);
				if (next.has(id)) next.delete(id);
				else next.add(id);
				return next;
			});
		},
		[hold],
	);

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
			// The new manager holds still while their team makes room.
			hold();
			setAnchorId(parentId);
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
		[hold, latest],
	);

	/** Brings a person's settled slot into view, even while their card is still springing there. */
	const revealPerson = React.useCallback(
		(id: string) => {
			const { layout, shift } = latest.current;
			const person = layout.byId.get(id);
			if (person) reveal({ ...person, x: person.x + shift.x, y: person.y + shift.y });
		},
		[latest, reveal],
	);

	const focusPerson = React.useCallback(
		(id: string | undefined) => {
			if (!id) return;
			const node = findNode(layerRef.current, id);
			if (!node) return;
			node.focus({ preventScroll: true });
			revealPerson(id);
		},
		[revealPerson],
	);

	/** Ends a press: a click selects, a drop on a manager reparents, and a dragged card springs back to its slot. */
	const endPress = React.useCallback(
		(drop: boolean) => {
			const current = press.current;
			if (!current) return;
			press.current = null;
			current.stopListening();
			if (!current.moved) {
				if (drop) select(current.id);
				return;
			}
			setDrag(null);
			if (drop && current.targetId) void reparent(current.id, current.targetId);
		},
		[reparent, select],
	);

	/** Past the drag threshold the pressed card follows the pointer, and the manager under it becomes the target. */
	const dragTo = React.useCallback(
		(event: PointerEvent) => {
			const current = press.current;
			if (!current) return;
			// No button held: the release happened somewhere we never heard about (a context menu, another
			// window). End the drag instead of letting the card follow the cursor.
			if ((event.buttons & 1) === 0) return endPress(false);
			const { props, layout, shift, view, index } = latest.current;
			if (props.editable === false) return;
			if (!current.moved) {
				if (Math.hypot(event.clientX - current.x, event.clientY - current.y) < DRAG_THRESHOLD) return;
				current.moved = true;
				current.blocked = new Set([current.id, ...descendantsOf(index, current.id)]);
			}
			const frame = viewportRef.current?.getBoundingClientRect();
			if (!frame) return;
			// Pointer in layout coordinates: canvas units, minus the shift that keeps the anchor still.
			const x = (event.clientX - frame.left - view.x) / view.zoom - shift.x;
			const y = (event.clientY - frame.top - view.y) / view.zoom - shift.y;
			const hit = layout.people.find(
				(person) => !current.blocked.has(person.data.id) && x >= person.x && x <= person.x + person.width && y >= person.y && y <= person.y + person.height,
			);
			current.targetId = hit && hit.data.id !== layout.byId.get(current.id)?.parentId ? hit.data.id : null;
			setDrag({
				id: current.id,
				dx: (event.clientX - current.x) / view.zoom,
				dy: (event.clientY - current.y) / view.zoom,
				targetId: current.targetId,
				blocked: current.blocked,
			});
		},
		[endPress, latest, viewportRef],
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
				// One press at a time: a second finger or button never steals the card from the first.
				if (press.current || event.button !== 0 || (event.target as Element).closest('button, a, [role="menuitem"], [role="menu"]')) return;
				const { pointerId } = event;
				try {
					event.currentTarget.setPointerCapture(pointerId);
				} catch {
					// Capture is only a nicety here; the window listeners below see the whole press.
				}
				// Listen on the window, not the card: capture is lost if the card is re-inserted into
				// the DOM mid-drag (a host saving an earlier move), and the release must still end the press.
				const listeners = new AbortController();
				const options = { signal: listeners.signal };
				const own = (handler: (event: PointerEvent) => void) => (event: PointerEvent) => {
					if (event.pointerId === pointerId) handler(event);
				};
				window.addEventListener('pointermove', own(dragTo), options);
				window.addEventListener('pointerup', own(() => endPress(true)), options);
				window.addEventListener('pointercancel', own(() => endPress(false)), options);
				window.addEventListener('blur', () => endPress(false), options);
				window.addEventListener(
					'keydown',
					(keyEvent) => {
						if (keyEvent.key !== 'Escape') return;
						keyEvent.preventDefault();
						endPress(false);
					},
					options,
				);
				press.current = {
					id,
					pointerId,
					x: event.clientX,
					y: event.clientY,
					moved: false,
					blocked: EMPTY_SET,
					targetId: null,
					stopListening: () => listeners.abort(),
				};
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
						// During a press, Escape cancels the drag (the window listener); otherwise it clears the selection.
						if (!press.current) select(null);
						return;
				}
			},
			focus(id, event) {
				if (event.target !== event.currentTarget) return;
				setActiveId(id);
				// Keyboard focus (Tab into the tree) brings the card into view; a press on it does not.
				if (!press.current) revealPerson(id);
			},
			toggle,
			openMove: setMoveId,
			edit,
			remove,
		}),
		[dragTo, edit, endPress, focusPerson, latest, remove, revealPerson, select, toggle],
	);

	const manager = selected?.parentId ? index.edges.get(selected.parentId) : undefined;
	const reports = selected
		? (index.children.get(selected.data.id) ?? []).flatMap((id): OrgChartEdge[] => {
				const report = index.edges.get(id);
				return report ? [report] : [];
			})
		: [];

	// Built once per change to the chart itself, so a pan (which re-renders this component every
	// frame) never walks hundreds of cards.
	const content = React.useMemo(
		() => (
			<>
				<OrgChartWires wires={scene.wires} anchors={scene.anchors} width={layout.width} height={layout.height} />
				<div role="tree" aria-label="Reporting lines">
					{scene.cards.map(({ person, x, y, enterFrom, leaving }) => {
						const id = person.data.id;
						const dragged = drag?.id === id ? drag : undefined;
						const target = dragged?.targetId ? layout.byId.get(dragged.targetId) : undefined;
						return (
							<OrgChartNode
								key={id}
								person={person}
								x={x}
								y={y}
								enterFrom={enterFrom}
								leaving={leaving}
								selected={id === selectedId}
								tabStop={id === tabStopId}
								editable={editable}
								drag={dragged ? { dx: dragged.dx, dy: dragged.dy, overTarget: Boolean(target) } : null}
								dropTarget={drag?.targetId === id}
								blocked={Boolean(drag?.blocked.has(id))}
								dropHint={target ? `Reports to ${personName(target.data)}` : undefined}
								handlers={handlers}
							/>
						);
					})}
				</div>
			</>
		),
		[drag, editable, handlers, layout, scene, selectedId, tabStopId],
	);

	// One container for every state, so the width observer keeps watching it when data arrives.
	return (
		<div ref={containerRef} style={CHART_SPRING_STYLE} className={cn('@container/chart relative h-[600px]', className)}>
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
						{content}
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

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
	Background,
	BackgroundVariant,
	ReactFlow,
	ReactFlowProvider,
	useEdgesState,
	useNodesState,
	useReactFlow,
	type Edge,
	type EdgeTypes,
	type Node,
	type NodeTypes,
	type OnNodeDrag,
} from '@xyflow/react';

import { Loader2 } from 'lucide-react';

import { cn } from '../../lib/utils';
import { TooltipProvider } from '../tooltip';
import { FlowZoomPanel } from '../flow-zoom-panel';

import { computeLayout } from './layout';
import { NodeActionsProvider, OrgChartProvider, useOrgChartContext } from './org-chart-context';
import { OrgChartEdge as OrgChartEdgeComponent } from './org-chart-edge';
import { OrgChartEmpty } from './org-chart-empty';
import { OrgChartNodeMemo } from './org-chart-node';
import type { OrgChartEdge, OrgChartNodeData, OrgChartNode as OrgChartNodeType } from './org-chart.types';

const FIT_VIEW_OPTIONS = { padding: 0.12 } as const;

/** Walk parent→child graph to collect all descendant IDs (cycle-check on drag drop). */
function getDescendantIds(nodeId: string, nodes: { id: string; data: { parentId: string | null } }[]): Set<string> {
	const descendants = new Set<string>();
	const queue = [nodeId];
	while (queue.length > 0) {
		const current = queue.pop()!;
		for (const n of nodes) {
			if (n.data.parentId === current && !descendants.has(n.id)) {
				descendants.add(n.id);
				queue.push(n.id);
			}
		}
	}
	return descendants;
}

/** Merge layout nodes into RF state, preserving measured dimensions from previous nodes. */
function mergeWithMeasured(prev: OrgChartNodeType[], layoutNodes: OrgChartNodeType[]): OrgChartNodeType[] {
	const prevMap = new Map(prev.map((n) => [n.id, n]));
	return layoutNodes.map((n) => {
		const existing = prevMap.get(n.id);
		if (!existing) return n;
		return existing.data.isRoot !== n.data.isRoot ? n : { ...n, measured: existing.measured };
	});
}

interface OrgChartPropsBase {
	/** Additional classes for the chart container (e.g. `"h-full"` to fill parent). Default height: 600px. */
	className?: string;
	/** Whether data is still loading */
	isLoading?: boolean;
	/** Whether the current user can manage the chart (drag, edit, remove) */
	editable?: boolean;
	/** Called when a node is dragged onto a new parent. In uncontrolled mode, the component updates visually first — if this throws, it reverts. */
	onReparent?: (childId: string, newParentId: string, preserve: { positionTitle?: string | null }) => void | Promise<void>;
	/** Called when the "Add to Chart" button is clicked (empty state) */
	onAddToChart?: () => void;
	/** Called when "Edit Position" is selected from the node menu */
	onEditNode?: (nodeData: OrgChartNodeData) => void;
	/** Called when "Remove from Chart" is selected from the node menu */
	onRemoveNode?: (nodeData: OrgChartNodeData) => void;
	/** Toast handler for reparent success/error messages. If not provided, no toasts are shown. */
	onReparentSuccess?: (childName: string, parentName: string) => void;
	onReparentError?: (message: string) => void;
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

function OrgChartInner({
	className,
	edges: controlledEdges,
	defaultEdges,
	isLoading = false,
	editable = true,
	onReparent,
	onAddToChart,
	onEditNode,
	onRemoveNode,
	onReparentSuccess,
	onReparentError,
}: OrgChartProps) {
	const isControlled = controlledEdges !== undefined;
	const {
		selectNode,
		clearSelection,
		setDraggedNodeId,
		setDropTargetNodeId,
	} = useOrgChartContext();

	const [internalEdges, setInternalEdges] = useState<OrgChartEdge[]>(defaultEdges ?? []);

	const defaultEdgesHash = useMemo(
		() => defaultEdges?.map((e) => `${e.id}:${e.parentId}:${e.positionTitle ?? ''}:${e.displayName ?? ''}`).join(',') ?? '',
		[defaultEdges],
	);
	useEffect(() => {
		if (!isControlled && defaultEdges) {
			setInternalEdges(defaultEdges);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [defaultEdgesHash]);

	const apiEdges = controlledEdges ?? internalEdges;

	const layout = useMemo(() => (apiEdges.length > 0 ? computeLayout(apiEdges) : null), [apiEdges]);
	const layoutNodes = layout?.nodes ?? [];
	const layoutEdges = layout?.edges ?? [];
	const isEmpty = apiEdges.length === 0 && !isLoading;

	const { fitView, getIntersectingNodes } = useReactFlow();

	const [nodes, setNodes, onNodesChange] = useNodesState<OrgChartNodeType>([]);
	const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);

	const nodesHash = useMemo(
		() => layoutNodes.map((n) => `${n.id}:${n.data.parentId ?? ''}:${n.data.positionTitle ?? ''}:${n.data.displayName ?? ''}`).join(','),
		[layoutNodes],
	);
	const edgesHash = useMemo(() => layoutEdges.map((e) => `${e.id}:${e.source}:${e.target}`).join(','), [layoutEdges]);
	const fitViewRef = useRef(fitView);

	useEffect(() => {
		fitViewRef.current = fitView;
	}, [fitView]);

	useEffect(() => {
		setNodes((prev) => mergeWithMeasured(prev, layoutNodes));
		setRfEdges(layoutEdges);
		const raf = requestAnimationFrame(() => fitViewRef.current(FIT_VIEW_OPTIONS));
		return () => cancelAnimationFrame(raf);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [nodesHash, edgesHash]);

	const draggedNodeRef = useRef<string | null>(null);
	const dropTargetIdRef = useRef<string | null>(null);

	const nodeTypes: NodeTypes = useMemo(() => ({ orgChartNode: OrgChartNodeMemo }), []);
	const edgeTypes: EdgeTypes = useMemo(() => ({ orgChartEdge: OrgChartEdgeComponent }), []);

	const onNodeDragStart = useCallback<OnNodeDrag<OrgChartNodeType>>(
		(_, node) => {
			if (!editable) return;
			draggedNodeRef.current = node.id;
			setDraggedNodeId(node.id);
		},
		[editable, setDraggedNodeId],
	);

	const onNodeDrag = useCallback<OnNodeDrag<OrgChartNodeType>>(
		(_, node) => {
			if (!editable || !draggedNodeRef.current) return;
			const intersecting = getIntersectingNodes(node);
			const target = intersecting.find((n) => n.id !== node.id);
			const targetId = target?.id ?? null;
			if (targetId === dropTargetIdRef.current) return; // avoid no-op re-render cascade
			dropTargetIdRef.current = targetId;
			setDropTargetNodeId(targetId);
		},
		[editable, getIntersectingNodes, setDropTargetNodeId],
	);

	const applyOptimisticReparent = useCallback((childId: string, newParentId: string) => {
		setInternalEdges((prev) =>
			prev.map((e) => (e.id === childId ? { ...e, parentId: newParentId } : e)),
		);
	}, []);

	const snapBack = useCallback(() => {
		setNodes((prev) => mergeWithMeasured(prev, layoutNodes));
	}, [layoutNodes, setNodes]);

	const onNodeDragStop = useCallback<OnNodeDrag<OrgChartNodeType>>(
		async () => {
			if (!editable || !draggedNodeRef.current) return;
			const childId = draggedNodeRef.current;
			const newParentId = dropTargetIdRef.current;

			draggedNodeRef.current = null;
			dropTargetIdRef.current = null;
			setDraggedNodeId(null);
			setDropTargetNodeId(null);

			if (!newParentId || newParentId === childId) {
				snapBack();
				return;
			}

			// Derive descendants at drop time instead of carrying a ref through the drag
			if (getDescendantIds(childId, layoutNodes).has(newParentId)) {
				onReparentError?.('Cannot create circular reporting chain');
				snapBack();
				return;
			}

			const draggedData = layoutNodes.find((n) => n.id === childId)?.data;
			if (!draggedData || newParentId === draggedData.parentId) {
				snapBack();
				return;
			}

			const targetName = layoutNodes.find((n) => n.id === newParentId)?.data.displayName;
			const preserve = { positionTitle: draggedData.positionTitle };

			if (!isControlled) {
				// Uncontrolled: optimistic update, then notify consumer
				const snapshotEdges = internalEdges;
				applyOptimisticReparent(childId, newParentId);
				try {
					await onReparent?.(childId, newParentId, preserve);
					onReparentSuccess?.(draggedData.displayName ?? 'Member', targetName ?? 'new manager');
				} catch (err) {
					console.error('[OrgChart] reparent failed', err);
					setInternalEdges(snapshotEdges);
					onReparentError?.('Failed to update reporting line');
				}
			} else {
				// Controlled: snap back, let consumer update edges
				snapBack();
				try {
					await onReparent?.(childId, newParentId, preserve);
					onReparentSuccess?.(draggedData.displayName ?? 'Member', targetName ?? 'new manager');
				} catch (err) {
					console.error('[OrgChart] reparent failed', err);
					onReparentError?.('Failed to update reporting line');
				}
			}
		},
		[editable, isControlled, internalEdges, layoutNodes, onReparent, onReparentSuccess, onReparentError, applyOptimisticReparent, snapBack, setDraggedNodeId, setDropTargetNodeId],
	);

	const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => selectNode(node.id), [selectNode]);
	const onPaneClick = useCallback(() => clearSelection(), [clearSelection]);

	const handleEditNode = useCallback(
		(nodeData: OrgChartNodeData) => onEditNode?.(nodeData),
		[onEditNode],
	);
	const handleRemoveNode = useCallback(
		(nodeData: OrgChartNodeData) => onRemoveNode?.(nodeData),
		[onRemoveNode],
	);

	if (isLoading) {
		return (
			<div className='bg-card border-border/60 flex items-center justify-center rounded-xl border p-16'>
				<Loader2 className='text-muted-foreground size-6 animate-spin' />
			</div>
		);
	}

	if (isEmpty) {
		return <OrgChartEmpty editable={editable} onAddRoot={onAddToChart ?? (() => {})} />;
	}

	return (
		<NodeActionsProvider onEditNode={handleEditNode} onRemoveNode={handleRemoveNode}>
			<div className={cn('border-border/60 h-[600px] overflow-hidden rounded-xl border', className)}>
				<ReactFlow
					nodes={nodes}
					edges={rfEdges}
					onNodesChange={onNodesChange}
					onEdgesChange={onEdgesChange}
					onNodeClick={onNodeClick}
					proOptions={{ hideAttribution: true }}
					onPaneClick={onPaneClick}
					onNodeDragStart={onNodeDragStart}
					onNodeDrag={onNodeDrag}
					onNodeDragStop={onNodeDragStop}
					nodeTypes={nodeTypes}
					edgeTypes={edgeTypes}
					fitView
					fitViewOptions={FIT_VIEW_OPTIONS}
					minZoom={0.3}
					maxZoom={1.5}
					nodesDraggable={editable}
					nodesConnectable={false}
					elementsSelectable
					selectNodesOnDrag={false}
					panOnDrag
					zoomOnScroll
					preventScrolling
					style={
						{
							'--xy-background-pattern-dots-color-default': 'var(--color-border)',
							'--xy-edge-stroke-width-default': 2,
							'--xy-edge-stroke-default': 'var(--color-border)',
							'--xy-edge-stroke-selected-default': 'var(--color-foreground)',
							'--xy-attribution-background-color-default': 'transparent',
						} as React.CSSProperties
					}
					attributionPosition='bottom-left'
				>
					<Background variant={BackgroundVariant.Dots} gap={20} size={2} />

					<FlowZoomPanel fitViewOptions={FIT_VIEW_OPTIONS} />
				</ReactFlow>
			</div>
		</NodeActionsProvider>
	);
}

export function OrgChart(props: OrgChartProps) {
	return (
		<ReactFlowProvider>
			<OrgChartProvider editable={props.editable ?? true}>
				<TooltipProvider>
					<OrgChartInner {...props} />
				</TooltipProvider>
			</OrgChartProvider>
		</ReactFlowProvider>
	);
}

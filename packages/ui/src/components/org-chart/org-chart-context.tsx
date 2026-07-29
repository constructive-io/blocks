'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { OrgChartNodeData } from './org-chart.types';

export interface OrgChartContextValue {
	selectedNodeId: string | null;
	selectNode: (nodeId: string | null) => void;
	clearSelection: () => void;
	editable: boolean;
	draggedNodeId: string | null;
	setDraggedNodeId: (id: string | null) => void;
	dropTargetNodeId: string | null;
	setDropTargetNodeId: (id: string | null) => void;
}

// Separate context for node action callbacks (provided by the inner component which has access to mutations)
export interface NodeActionsValue {
	onEditNode: (data: OrgChartNodeData) => void;
	onRemoveNode: (data: OrgChartNodeData) => void;
}

const NodeActionsContext = createContext<NodeActionsValue | null>(null);

const OrgChartContext = createContext<OrgChartContextValue | null>(null);

interface OrgChartProviderProps {
	children: ReactNode;
	editable: boolean;
}

export function OrgChartProvider({ children, editable }: OrgChartProviderProps) {
	const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
	const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
	const [dropTargetNodeId, setDropTargetNodeId] = useState<string | null>(null);

	const selectNode = useCallback((nodeId: string | null) => setSelectedNodeId(nodeId), []);
	const clearSelection = useCallback(() => setSelectedNodeId(null), []);

	const value = useMemo<OrgChartContextValue>(
		() => ({
			selectedNodeId,
			selectNode,
			clearSelection,
			editable,
			draggedNodeId,
			setDraggedNodeId,
			dropTargetNodeId,
			setDropTargetNodeId,
		}),
		[selectedNodeId, selectNode, clearSelection, editable, draggedNodeId, dropTargetNodeId],
	);

	return <OrgChartContext.Provider value={value}>{children}</OrgChartContext.Provider>;
}

export function useOrgChartContext() {
	const ctx = useContext(OrgChartContext);
	if (!ctx) throw new Error('useOrgChartContext must be used within OrgChartProvider');
	return ctx;
}

export function NodeActionsProvider({
	children,
	onEditNode,
	onRemoveNode,
}: NodeActionsValue & { children: ReactNode }) {
	const value = useMemo(() => ({ onEditNode, onRemoveNode }), [onEditNode, onRemoveNode]);
	return <NodeActionsContext.Provider value={value}>{children}</NodeActionsContext.Provider>;
}

export function useNodeActions() {
	const ctx = useContext(NodeActionsContext);
	if (!ctx) throw new Error('useNodeActions must be used within NodeActionsProvider');
	return ctx;
}

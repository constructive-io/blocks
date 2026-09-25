'use client';

import * as React from 'react';

import { CanvasWire, type WirePoint, type WireTone } from '../workspace-kit/canvas';
import { NODE_ANCHOR_Y as ANCHOR_Y } from './canvas-nodes';
import type { AgentRunState } from './use-agent-run';

/** Inputs wire from their right edge into the agent. */
const INPUTS: { id: string; tone: WireTone }[] = [
	{ id: 'schedule', tone: 'rest' },
	{ id: 'triggers', tone: 'live' },
	{ id: 'channels', tone: 'warn' },
	{ id: 'memory', tone: 'live' },
];
/** Outputs wire from the agent into their left edge; they glow while their stage loads. */
const OUTPUTS = ['tools', 'subagents', 'skills'] as const;

type Wire = { id: string; tone: WireTone; animated: boolean; start: WirePoint; end: WirePoint };

/** Offset of `node` within `layer`, ignoring transforms (so pan and zoom never skew it). */
function layerBox(layer: HTMLElement, node: HTMLElement) {
	let left = 0;
	let top = 0;
	for (let element: HTMLElement | null = node; element && element !== layer; element = element.offsetParent as HTMLElement | null) {
		left += element.offsetLeft;
		top += element.offsetTop;
	}
	return { left, right: left + node.offsetWidth, top };
}

type CanvasWiresProps = {
	stages: AgentRunState['nodes'];
	/** Changes whenever node sizes may change (collapse, "show more"), prompting a re-measure. */
	layoutKey: string;
	animate: boolean;
};

/**
 * Bezier wires between the agent and its inputs and outputs, measured from the
 * rendered nodes in untransformed layer coordinates. Render it as a direct
 * child of the transformed layer: the layer is found through the SVG's own
 * parent, which (unlike a parent ref) is available in the first layout effect.
 */
function CanvasWires({ stages, layoutKey, animate }: CanvasWiresProps) {
	const svgRef = React.useRef<SVGSVGElement>(null);
	const [wires, setWires] = React.useState<Wire[]>([]);

	React.useLayoutEffect(() => {
		const layer = svgRef.current?.parentElement;
		if (!layer) return;
		const measure = () => {
			const box = (id: string) => {
				const node = layer.querySelector<HTMLElement>(`[data-node-id="${id}"]`);
				return node && layerBox(layer, node);
			};
			const agent = box('agent');
			if (!agent) return setWires([]);
			const next: Wire[] = [];
			for (const { id, tone } of INPUTS) {
				const node = box(id);
				if (node) next.push({ id, tone, animated: false, start: [node.right, node.top + ANCHOR_Y], end: [agent.left, agent.top + ANCHOR_Y] });
			}
			for (const id of OUTPUTS) {
				const node = box(id);
				const loading = stages[id] === 'loading';
				if (node) next.push({ id, tone: loading ? 'live' : 'rest', animated: loading, start: [agent.right, agent.top + ANCHOR_Y], end: [node.left, node.top + ANCHOR_Y] });
			}
			setWires(next);
		};
		measure();
		const observer = new ResizeObserver(measure);
		layer.querySelectorAll('[data-node-id]').forEach((node) => observer.observe(node));
		return () => observer.disconnect();
	}, [layoutKey, stages]);

	return (
		<svg ref={svgRef} aria-hidden="true" className="pointer-events-none absolute top-0 left-0 overflow-visible" width="1" height="1">
			{wires.map((wire) => (
				<CanvasWire key={wire.id} start={wire.start} end={wire.end} tone={wire.tone} animated={wire.animated && animate} />
			))}
		</svg>
	);
}

export { CanvasWires };

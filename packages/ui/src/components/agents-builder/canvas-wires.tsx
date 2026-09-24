'use client';

import * as React from 'react';

import { NODE_ANCHOR_Y as ANCHOR_Y } from './canvas-nodes';
import type { AgentRunState } from './use-agent-run';

type WireTone = 'rest' | 'live' | 'warn';

/** Inputs wire from their right edge into the agent. */
const INPUTS: { id: string; tone: WireTone }[] = [
	{ id: 'schedule', tone: 'rest' },
	{ id: 'triggers', tone: 'live' },
	{ id: 'channels', tone: 'warn' },
	{ id: 'memory', tone: 'live' },
];
/** Outputs wire from the agent into their left edge; they glow while their stage loads. */
const OUTPUTS = ['tools', 'subagents', 'skills'] as const;

const STROKE: Record<WireTone, string> = {
	rest: 'color-mix(in oklab, var(--foreground) 20%, transparent)',
	live: 'color-mix(in oklab, var(--primary) 55%, transparent)',
	warn: 'color-mix(in oklab, var(--warning) 70%, transparent)',
};

type Point = [number, number];
type Wire = { id: string; tone: WireTone; animated: boolean; start: Point; end: Point };

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

function curve([x1, y1]: Point, [x2, y2]: Point) {
	const dx = Math.max(40, (x2 - x1) / 2);
	return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
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
				<g key={wire.id} stroke={STROKE[wire.tone]} strokeWidth={1}>
					<path d={curve(wire.start, wire.end)} fill="none" strokeDasharray={wire.tone === 'rest' ? undefined : '4 4'} strokeLinecap="round">
						{wire.animated && animate ? <animate attributeName="stroke-dashoffset" from="8" to="0" dur="0.5s" repeatCount="indefinite" /> : null}
					</path>
					<circle cx={wire.start[0]} cy={wire.start[1]} r={3} fill="var(--card)" />
					<circle cx={wire.end[0]} cy={wire.end[1]} r={3} fill="var(--card)" />
				</g>
			))}
		</svg>
	);
}

export { CanvasWires };

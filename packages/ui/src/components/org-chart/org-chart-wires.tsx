'use client';

import * as React from 'react';

import { cn } from '../../lib/utils';
import { WIRE_STROKE, wirePath, type WirePoint, type WireTone } from '../workspace-kit/canvas';
import { STACK_CORNER } from './layout';
import { springTransition } from './org-chart-spring';

/**
 * A reporting line from the bottom centre of a manager's card to the top centre of a report's. A report in a
 * stack of columns has a routed line instead: square bends through `via`, ending at the left edge of its card.
 */
export type WireSpec = {
	id: string;
	start: WirePoint;
	end: WirePoint;
	via?: readonly WirePoint[];
	tone: WireTone;
	/** Marching dashes, for the drag preview. */
	marching: boolean;
	/** Follows a dragged card 1:1 instead of springing. */
	instant: boolean;
	/** Where a newly shown wire grows from: collapsed under its manager. */
	enter?: { start: WirePoint; end: WirePoint; via?: readonly WirePoint[] };
};

/** The dot under a manager where their reporting lines leave. */
export type AnchorSpec = { id: string; at: WirePoint; live: boolean; instant: boolean; enter?: WirePoint };

const samePoint = (a: WirePoint | undefined, b: WirePoint | undefined) => a === b || (a !== undefined && b !== undefined && a[0] === b[0] && a[1] === b[1]);
const samePoints = (a: readonly WirePoint[] | undefined, b: readonly WirePoint[] | undefined) =>
	a === b || (a !== undefined && b !== undefined && a.length === b.length && a.every((point, i) => samePoint(point, b[i])));

/** Points arrive as fresh arrays on every change, so compare them by value; `enter` only matters on the first render. */
function sameShape<T extends object>(a: T, b: T) {
	for (const key of Object.keys(b) as (keyof T)[]) {
		const [x, y] = [a[key], b[key]];
		if (key === 'enter' ? Boolean(x) !== Boolean(y) : key === 'via' ? !samePoints(x as WirePoint[] | undefined, y as WirePoint[] | undefined) : Array.isArray(x) ? !samePoint(x as WirePoint, y as WirePoint) : x !== y) return false;
	}
	return true;
}

const tenth = (value: number) => Math.round(value * 10) / 10;

/**
 * Square bends through the points, each softened by an arc of up to `STACK_CORNER`. A path with n points always has the
 * same commands, even when points coincide, so the browser can morph one into another (a line retracting into its manager).
 */
function routedPath(points: readonly WirePoint[]) {
	let d = `M ${tenth(points[0][0])} ${tenth(points[0][1])}`;
	for (let i = 1; i < points.length - 1; i += 1) {
		const [px, py] = points[i - 1];
		const [cx, cy] = points[i];
		const [nx, ny] = points[i + 1];
		const before = Math.hypot(cx - px, cy - py);
		const after = Math.hypot(nx - cx, ny - cy);
		const radius = Math.min(STACK_CORNER, before / 2, after / 2);
		const enter = before > 0 ? [cx - ((cx - px) / before) * radius, cy - ((cy - py) / before) * radius] : [cx, cy];
		const leave = after > 0 ? [cx + ((nx - cx) / after) * radius, cy + ((ny - cy) / after) * radius] : [cx, cy];
		d += ` L ${tenth(enter[0])} ${tenth(enter[1])} Q ${tenth(cx)} ${tenth(cy)}, ${tenth(leave[0])} ${tenth(leave[1])}`;
	}
	const last = points[points.length - 1];
	return `${d} L ${tenth(last[0])} ${tenth(last[1])}`;
}

const pathOf = (start: WirePoint, end: WirePoint, via?: readonly WirePoint[]) => (via ? routedPath([start, ...via, end]) : wirePath(start, end, 'vertical'));

const OrgWire = React.memo(function OrgWire({ start, end, via, tone, marching, instant, enter, marker }: Omit<WireSpec, 'id'> & { marker: string }) {
	const d = pathOf(start, end, via);
	const style = { d: `path("${d}")`, ...(enter ? { '--enter-d': `path("${pathOf(enter.start, enter.end, enter.via)}")` } : null) } as React.CSSProperties;
	return (
		<path
			d={d}
			style={style}
			fill="none"
			stroke={WIRE_STROKE[tone]}
			strokeWidth={1}
			strokeDasharray={tone === 'rest' ? undefined : '4 4'}
			strokeLinecap="round"
			markerEnd={`url(#${marker}-${tone === 'rest' ? 'rest' : 'live'})`}
			className={cn(instant ? 'transition-[stroke]' : cn('transition-[d,stroke]', springTransition), enter && 'starting:[d:var(--enter-d)]')}
		>
			{marching ? <animate attributeName="stroke-dashoffset" from="8" to="0" dur="0.5s" repeatCount="indefinite" /> : null}
		</path>
	);
}, sameShape);

const OrgAnchor = React.memo(function OrgAnchor({ at, live, instant, enter }: Omit<AnchorSpec, 'id'>) {
	const style = { cx: at[0], cy: at[1], ...(enter ? { '--enter-cx': `${enter[0]}px`, '--enter-cy': `${enter[1]}px` } : null) } as React.CSSProperties;
	return (
		<circle
			cx={at[0]}
			cy={at[1]}
			r={3}
			style={style}
			fill="var(--card)"
			stroke={WIRE_STROKE[live ? 'live' : 'rest']}
			strokeWidth={1}
			className={cn(
				instant ? 'transition-[stroke]' : cn('transition-[cx,cy,stroke]', springTransition),
				enter && 'starting:[cx:var(--enter-cx)] starting:[cy:var(--enter-cy)]',
			)}
		/>
	);
}, sameShape);

type OrgChartWiresProps = {
	wires: readonly WireSpec[];
	anchors: readonly AnchorSpec[];
	width: number;
	height: number;
};

/**
 * Every reporting line, then every anchor on top. Both lists keep a stable
 * order: moving an element in the DOM would cancel its running transition.
 */
export function OrgChartWires({ wires, anchors, width, height }: OrgChartWiresProps) {
	const marker = `org-wire-${React.useId().replace(/:/g, '')}`;
	return (
		<svg aria-hidden="true" className="pointer-events-none absolute top-0 left-0 overflow-visible" width={Math.max(1, width)} height={Math.max(1, height)}>
			<defs>
				{(['rest', 'live'] as const).map((tone) => (
					<marker key={tone} id={`${marker}-${tone}`} markerUnits="userSpaceOnUse" markerWidth={8} markerHeight={8} refX={4} refY={4} overflow="visible">
						<circle cx={4} cy={4} r={3} fill="var(--card)" stroke={WIRE_STROKE[tone]} strokeWidth={1} />
					</marker>
				))}
			</defs>
			{wires.map(({ id, ...wire }) => (
				<OrgWire key={id} {...wire} marker={marker} />
			))}
			{anchors.map(({ id, ...anchor }) => (
				<OrgAnchor key={id} {...anchor} />
			))}
		</svg>
	);
}

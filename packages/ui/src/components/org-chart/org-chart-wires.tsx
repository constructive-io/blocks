'use client';

import * as React from 'react';

import { cn } from '../../lib/utils';
import { WIRE_STROKE, wirePath, type WirePoint, type WireTone } from '../workspace-kit/canvas';
import { springTransition } from './org-chart-spring';

/** A reporting line from the bottom centre of a manager's card to the top centre of a report's. */
export type WireSpec = {
	id: string;
	start: WirePoint;
	end: WirePoint;
	tone: WireTone;
	/** Marching dashes, for the drag preview. */
	marching: boolean;
	/** Follows a dragged card 1:1 instead of springing. */
	instant: boolean;
	/** Where a newly shown wire grows from: collapsed under its manager. */
	enter?: { start: WirePoint; end: WirePoint };
};

/** The dot under a manager where their reporting lines leave. */
export type AnchorSpec = { id: string; at: WirePoint; live: boolean; instant: boolean; enter?: WirePoint };

const samePoint = (a: WirePoint | undefined, b: WirePoint | undefined) => a === b || (a !== undefined && b !== undefined && a[0] === b[0] && a[1] === b[1]);

/** Points arrive as fresh arrays on every change, so compare them by value; `enter` only matters on the first render. */
function sameShape<T extends object>(a: T, b: T) {
	for (const key of Object.keys(b) as (keyof T)[]) {
		const [x, y] = [a[key], b[key]];
		if (key === 'enter' ? Boolean(x) !== Boolean(y) : Array.isArray(x) ? !samePoint(x as WirePoint, y as WirePoint) : x !== y) return false;
	}
	return true;
}

const OrgWire = React.memo(function OrgWire({ start, end, tone, marching, instant, enter, marker }: Omit<WireSpec, 'id'> & { marker: string }) {
	const d = wirePath(start, end, 'vertical');
	const style = { d: `path("${d}")`, ...(enter ? { '--enter-d': `path("${wirePath(enter.start, enter.end, 'vertical')}")` } : null) } as React.CSSProperties;
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

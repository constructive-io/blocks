'use client';

import * as React from 'react';

import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip';
import type { ContextUsage } from './types';

type ContextRingProps = {
	usage?: ContextUsage | null;
	/** Drawn diameter in px. Default 24. */
	size?: number;
	/**
	 * Kept for API compatibility. Scales bar thickness and length.
	 * Default 2.
	 */
	stroke?: number;
	className?: string;
};

function formatCompact(n: number): string {
	if (n >= 1_000_000) {
		const m = n / 1_000_000;
		return `${Number.isInteger(m) ? m : m.toFixed(m < 10 ? 2 : 1)}M`;
	}
	if (n >= 1_000) {
		const k = n / 1_000;
		return `${Number.isInteger(k) ? k : k.toFixed(k < 10 ? 1 : 0)}K`;
	}
	return String(n);
}

type MeterTone = 'idle' | 'ok' | 'warn' | 'critical' | 'recomputing';

function meterTone(pct: number, recomputing: boolean, hasUsage: boolean): MeterTone {
	if (!hasUsage) return 'idle';
	if (recomputing) return 'recomputing';
	if (pct >= 95) return 'critical';
	if (pct >= 80) return 'warn';
	return 'ok';
}

function toneStroke(tone: MeterTone): string {
	switch (tone) {
		case 'critical':
			return 'var(--destructive)';
		case 'warn':
			return 'var(--warning)';
		case 'recomputing':
			return 'var(--muted-foreground)';
		case 'ok':
			return 'var(--primary)';
		default:
			return 'var(--border)';
	}
}

/**
 * Snap to fixed decimals so SVG attrs match across SSR and client.
 * Raw Math.cos/sin floats can differ by a ULP between Node and the browser,
 * which React reports as a hydration mismatch on line/circle coordinates.
 */
function snap(n: number, digits = 3): number {
	const f = 10 ** digits;
	return Math.round(n * f) / f;
}

/** Polar point; 0% is 12 o'clock, clockwise. */
function polar(cx: number, cy: number, r: number, pct: number) {
	const rad = (pct / 100) * Math.PI * 2 - Math.PI / 2;
	return {
		x: snap(cx + r * Math.cos(rad)),
		y: snap(cy + r * Math.sin(rad)),
	};
}

/**
 * Compact context-window meter: linear segmented bar, bent into a ring.
 * Filled ticks glow; remaining ticks stay quiet.
 */
function ContextRing({ usage, size = 24, stroke = 2, className }: ContextRingProps) {
	const uid = React.useId().replace(/:/g, '');
	const center = size / 2;
	const glowPad = snap(Math.max(4, size * 0.18));
	const recomputing = !!usage && usage.tokens === null;
	const pct = usage && usage.percent != null ? Math.max(0, Math.min(100, usage.percent)) : 0;
	const tone = meterTone(pct, recomputing, !!usage);
	const color = toneStroke(tone);
	const hit = Math.max(size, 32);

	// Dense tick ring — denser at larger sizes, still readable at 24px.
	const tickCount = size >= 36 ? 40 : size >= 28 ? 32 : 28;
	const barLen = snap(Math.max(3.2, size * 0.18));
	const barWidth = snap(Math.max(1.15, Math.min(1.75, stroke * 0.72)));
	const rOuter = snap(size / 2 - glowPad * 0.15);
	const rInner = snap(rOuter - barLen);
	const filledCount = usage ? Math.round((pct / 100) * tickCount) : 0;
	const blurStd = snap(Math.max(1.4, size * 0.06));

	const glowId = `ctx-bar-glow-${uid}`;

	let tooltip: string;
	if (!usage) tooltip = 'No usage yet';
	else if (usage.tokens === null) tooltip = 'Recomputing after compaction…';
	else {
		tooltip = `${Math.round(usage.percent ?? 0)}% used · ${formatCompact(usage.tokens)} / ${formatCompact(usage.contextWindow)}`;
	}

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span
					data-slot="context-ring"
					data-tone={tone}
					aria-label={tooltip}
					className={cn('inline-flex items-center justify-center', className)}
					style={{ width: hit, height: hit }}
				>
					<svg
						width={size}
						height={size}
						viewBox={`${-glowPad} ${-glowPad} ${size + glowPad * 2} ${size + glowPad * 2}`}
						className={cn(recomputing && 'motion-safe:animate-pulse')}
						aria-hidden
					>
						<defs>
							<filter
								id={glowId}
								x="-120%"
								y="-120%"
								width="340%"
								height="340%"
								colorInterpolationFilters="sRGB"
							>
								<feGaussianBlur stdDeviation={blurStd} result="blur" />
								<feColorMatrix
									in="blur"
									type="matrix"
									values="1 0 0 0 0
									        0 1 0 0 0
									        0 0 1 0 0
									        0 0 0 0.75 0"
									result="glow"
								/>
								<feMerge>
									<feMergeNode in="glow" />
									<feMergeNode in="SourceGraphic" />
								</feMerge>
							</filter>
						</defs>

						{Array.from({ length: tickCount }, (_, i) => {
							const t = ((i + 0.5) / tickCount) * 100;
							const filled = i < filledCount;
							const isFrontier = filled && i === filledCount - 1;
							const outer = polar(center, center, rOuter, t);
							const inner = polar(center, center, rInner, t);

							return (
								<line
									key={i}
									x1={inner.x}
									y1={inner.y}
									x2={outer.x}
									y2={outer.y}
									stroke={filled ? color : 'var(--border)'}
									strokeWidth={barWidth}
									strokeLinecap="round"
									opacity={
										filled
											? recomputing
												? 0.55
												: isFrontier
													? 1
													: 0.92
											: usage
												? 0.38
												: 0.28
									}
									filter={filled ? `url(#${glowId})` : undefined}
									className="transition-[stroke,opacity] duration-200 ease-out"
								/>
							);
						})}
					</svg>
				</span>
			</TooltipTrigger>
			<TooltipContent side="top">{tooltip}</TooltipContent>
		</Tooltip>
	);
}

export { ContextRing, formatCompact };
export type { ContextRingProps };

'use client';

import * as React from 'react';

import { cn } from '../../lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '../tooltip';
import type { ContextUsage } from './types';

type ContextRingProps = {
	usage?: ContextUsage | null;
	size?: number;
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

function strokeColor(pct: number): string {
	if (pct >= 95) return 'var(--destructive)';
	if (pct >= 80) return 'var(--warning)';
	return 'var(--primary)';
}

/**
 * Compact context-window usage ring for the composer chrome.
 */
function ContextRing({ usage, size = 24, stroke = 2.5, className }: ContextRingProps) {
	const r = (size - stroke) / 2;
	const c = 2 * Math.PI * r;
	const center = size / 2;
	const recomputing = !!usage && usage.tokens === null;
	const pct = usage && usage.percent != null ? Math.max(0, Math.min(100, usage.percent)) : 0;
	const arcLen = (pct / 100) * c;

	let tooltip: string;
	if (!usage) tooltip = 'No usage yet';
	else if (usage.tokens === null) tooltip = 'Recomputing after compaction…';
	else {
		tooltip = `${Math.round(usage.percent ?? 0)}% used · ${formatCompact(usage.contextWindow)} tokens`;
	}

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<span
					data-slot="context-ring"
					aria-label={tooltip}
					className={cn('inline-flex items-center justify-center', className)}
				>
					<svg
						width={size}
						height={size}
						viewBox={`0 0 ${size} ${size}`}
						className={cn(recomputing && 'animate-pulse motion-reduce:animate-none')}
					>
						<circle
							cx={center}
							cy={center}
							r={r}
							fill="none"
							stroke="var(--border)"
							strokeWidth={stroke}
							strokeDasharray={recomputing ? '2 3' : undefined}
							opacity={usage ? 0.55 : 0.4}
						/>
						{usage && pct > 0 ? (
							<circle
								cx={center}
								cy={center}
								r={r}
								fill="none"
								stroke={strokeColor(pct)}
								strokeWidth={stroke}
								strokeLinecap="round"
								strokeDasharray={`${arcLen} ${c}`}
								transform={`rotate(-90 ${center} ${center})`}
								opacity={recomputing ? 0.5 : 1}
								className="transition-[stroke-dasharray,stroke] duration-200 ease-out"
							/>
						) : null}
					</svg>
				</span>
			</TooltipTrigger>
			<TooltipContent side="top">{tooltip}</TooltipContent>
		</Tooltip>
	);
}

export { ContextRing, formatCompact };
export type { ContextRingProps };

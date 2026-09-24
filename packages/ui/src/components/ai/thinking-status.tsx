'use client';

import * as React from 'react';

import { cn } from '../../lib/utils';
import { formatCompact } from './context-ring';

type ThinkingStatusProps = Omit<React.ComponentProps<'div'>, 'children'> & {
	label?: React.ReactNode;
	/** Seconds already elapsed when the status mounts. */
	elapsedSeconds?: number;
	/** Token count already spent when the status mounts. */
	tokens?: number;
	/**
	 * When true (default), the timer counts up from `elapsedSeconds` every
	 * second. Pass false to render exactly the host's `elapsedSeconds` / `tokens`.
	 */
	live?: boolean;
	/** Simulated token growth per tick for demos; the host normally streams real counts. */
	tokensPerTick?: number;
};

function formatElapsed(totalSeconds: number) {
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
}

function ThinkingGlyph() {
	return (
		<span aria-hidden="true" className="grid size-4 grid-cols-3 place-items-center gap-px p-0.5">
			{Array.from({ length: 9 }, (_, index) => (
				<span
					key={index}
					className="size-[3px] rounded-full bg-muted-foreground animate-[ai-pulse-dot_1.2s_ease-in-out_infinite] motion-reduce:animate-none"
					style={{ animationDelay: `${((index * 5) % 9) * 110}ms` }}
				/>
			))}
		</span>
	);
}

/**
 * Compact in-flight status: pulsing glyph, label, elapsed time, and token
 * spend. Digits are tabular so the row never jitters while it ticks.
 */
function ThinkingStatus({
	label = 'Thinking',
	elapsedSeconds = 0,
	tokens,
	live = true,
	tokensPerTick = 0,
	className,
	...props
}: ThinkingStatusProps) {
	// Only the growth since mount lives in state; the host's values stay the source of truth.
	const [ticks, setTicks] = React.useState({ seconds: 0, tokens: 0 });

	React.useEffect(() => {
		if (!live) return;
		const id = window.setInterval(() => {
			setTicks((current) => ({
				seconds: current.seconds + 1,
				tokens: current.tokens + (tokensPerTick ? Math.round(tokensPerTick * (0.6 + Math.random() * 0.8)) : 0),
			}));
		}, 1000);
		return () => window.clearInterval(id);
	}, [live, tokensPerTick]);

	const seconds = elapsedSeconds + (live ? ticks.seconds : 0);
	const spent = (tokens ?? 0) + (live ? ticks.tokens : 0);

	return (
		<div
			role="status"
			aria-live="polite"
			data-slot="thinking-status"
			className={cn('flex h-7 items-center gap-2 text-[13px]', className)}
			{...props}
		>
			<ThinkingGlyph />
			<span className="text-muted-foreground">{label}</span>
			<span aria-hidden="true" className="flex items-center gap-1.5 text-subtle-foreground tabular-nums">
				<span>{formatElapsed(seconds)}</span>
				{tokens !== undefined ? (
					<>
						<span aria-hidden="true" className="size-0.5 rounded-full bg-current" />
						<span>{formatCompact(spent)} tokens</span>
					</>
				) : null}
			</span>
		</div>
	);
}

export { ThinkingStatus, formatElapsed };
export type { ThinkingStatusProps };

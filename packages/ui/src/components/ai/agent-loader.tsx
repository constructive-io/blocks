'use client';

import * as React from 'react';

import { cn } from '../../lib/utils';
import { TextShimmer } from './text-shimmer';

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeToReducedMotion(onStoreChange: () => void) {
	if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
		return () => undefined;
	}
	const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
	mediaQuery.addEventListener('change', onStoreChange);
	return () => mediaQuery.removeEventListener('change', onStoreChange);
}

function getReducedMotionSnapshot() {
	return typeof window === 'undefined' || typeof window.matchMedia !== 'function'
		? true
		: window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** Chevron wavefront across a 3×3 grid (Drive / Dots). */
const chevronDelays = Array.from({ length: 9 }, (_, i) => {
	const r = Math.floor(i / 3);
	const c = i % 3;
	return (c + Math.abs(r - 1)) * 90;
});

const ORBIT_ORDER = [0, 1, 2, 5, 8, 7, 6, 3];
const orbitDelays = Array.from({ length: 9 }, (_, i) => {
	const k = ORBIT_ORDER.indexOf(i);
	return k === -1 ? null : k * 110;
});

type PixelVariant = 'drive' | 'dots' | 'orbit';

const PIXEL_PATTERNS: Record<
	PixelVariant,
	{ delays: (number | null)[]; durationMs: number; round: boolean }
> = {
	drive: { delays: chevronDelays, durationMs: 650, round: false },
	dots: { delays: chevronDelays, durationMs: 650, round: true },
	orbit: { delays: orbitDelays, durationMs: 950, round: false },
};

type SimpleVariant =
	| 'circular'
	| 'bounce-dots'
	| 'typing'
	| 'wave'
	| 'pulse-dot'
	| 'text-shimmer'
	| 'loading-dots';

type AgentLoaderVariant = PixelVariant | SimpleVariant;

type AgentLoaderProps = {
	variant?: AgentLoaderVariant;
	/** Status label (pixel + text variants). */
	label?: string;
	/** Show a live elapsed timer next to the pixel loader. */
	showElapsed?: boolean;
	/** When provided, use this elapsed ms instead of an internal clock. */
	elapsedMs?: number;
	size?: 'sm' | 'md' | 'lg';
	className?: string;
	text?: string;
};

function formatElapsed(totalSeconds: number): string {
	if (totalSeconds < 60) return `${totalSeconds.toFixed(1)}s`;
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}m ${seconds.toFixed(1)}s`;
}

function useElapsedSeconds(enabled: boolean, controlledMs?: number) {
	const [ticks, setTicks] = React.useState(0);
	React.useEffect(() => {
		if (!enabled || controlledMs !== undefined) return;
		const id = window.setInterval(() => setTicks((value) => value + 1), 100);
		return () => window.clearInterval(id);
	}, [enabled, controlledMs]);
	if (controlledMs !== undefined) return controlledMs / 1000;
	return ticks / 10;
}

function PixelGrid({
	variant,
	reducedMotion,
}: {
	variant: PixelVariant;
	reducedMotion: boolean;
}) {
	const { delays, durationMs, round } = PIXEL_PATTERNS[variant];
	return (
		<span aria-hidden className="grid grid-cols-[repeat(3,4px)] gap-[1.5px]">
			{delays.map((delay, index) => (
				<span
					key={index}
					className={cn(
						'size-1 bg-foreground',
						round ? 'rounded-full' : 'rounded-[1px]',
					)}
					style={{
						opacity: delay === null ? 0.07 : 0.15,
						animation:
							reducedMotion || delay === null
								? 'none'
								: `ai-pixel-on ${durationMs}ms ease-in-out ${delay}ms infinite`,
					}}
				/>
			))}
		</span>
	);
}

function sizeClass(size: 'sm' | 'md' | 'lg') {
	return { sm: 'size-4', md: 'size-5', lg: 'size-6' }[size];
}

function CircularLoader({ size, className }: { size: 'sm' | 'md' | 'lg'; className?: string }) {
	return (
		<span
			className={cn(
				'inline-block animate-spin rounded-full border-2 border-primary border-t-transparent motion-reduce:animate-none',
				sizeClass(size),
				className,
			)}
			aria-hidden
		/>
	);
}

function DotsBounce({ size, className }: { size: 'sm' | 'md' | 'lg'; className?: string }) {
	const dot = { sm: 'size-1.5', md: 'size-2', lg: 'size-2.5' }[size];
	return (
		<span className={cn('inline-flex items-center gap-1', className)} aria-hidden>
			{[0, 1, 2].map((i) => (
				<span
					key={i}
					className={cn(
						'rounded-full bg-primary animate-[ai-bounce-dots_1.4s_ease-in-out_infinite] motion-reduce:animate-none',
						dot,
					)}
					style={{ animationDelay: `${i * 160}ms` }}
				/>
			))}
		</span>
	);
}

function TypingLoader({ size, className }: { size: 'sm' | 'md' | 'lg'; className?: string }) {
	const dot = { sm: 'size-1', md: 'size-1.5', lg: 'size-2' }[size];
	return (
		<span className={cn('inline-flex items-center gap-1', className)} aria-hidden>
			{[0, 1, 2].map((i) => (
				<span
					key={i}
					className={cn(
						'rounded-full bg-primary animate-[ai-typing_1s_infinite] motion-reduce:animate-none',
						dot,
					)}
					style={{ animationDelay: `${i * 250}ms` }}
				/>
			))}
		</span>
	);
}

function WaveLoader({ size, className }: { size: 'sm' | 'md' | 'lg'; className?: string }) {
	const heights = {
		sm: ['6px', '9px', '12px', '9px', '6px'],
		md: ['8px', '12px', '16px', '12px', '8px'],
		lg: ['10px', '15px', '20px', '15px', '10px'],
	}[size];
	return (
		<span className={cn('inline-flex items-center gap-0.5', sizeClass(size), className)} aria-hidden>
			{heights.map((height, i) => (
				<span
					key={i}
					className="w-0.5 rounded-full bg-primary animate-[ai-wave_1s_ease-in-out_infinite] motion-reduce:animate-none"
					style={{ height, animationDelay: `${i * 100}ms` }}
				/>
			))}
		</span>
	);
}

function PulseDot({ size, className }: { size: 'sm' | 'md' | 'lg'; className?: string }) {
	const dot = { sm: 'size-1', md: 'size-2', lg: 'size-3' }[size];
	return (
		<span
			className={cn(
				'inline-block rounded-full bg-primary animate-[ai-pulse-dot_1.2s_ease-in-out_infinite] motion-reduce:animate-none',
				dot,
				className,
			)}
			aria-hidden
		/>
	);
}

/**
 * Agent loading indicator. Pixel variants (drive / dots / orbit) match the
 * Beautiful UI craft; simple variants cover common chat spinners.
 */
function AgentLoader({
	variant = 'drive',
	label = 'Working',
	showElapsed = true,
	elapsedMs,
	size = 'md',
	className,
	text,
}: AgentLoaderProps) {
	const reducedMotion = React.useSyncExternalStore(
		subscribeToReducedMotion,
		getReducedMotionSnapshot,
		() => true,
	);
	const isPixel = variant === 'drive' || variant === 'dots' || variant === 'orbit';
	const elapsed = useElapsedSeconds(isPixel && showElapsed, elapsedMs);
	const statusText = text ?? label;

	if (isPixel) {
		return (
			<span
				data-slot="agent-loader"
				data-variant={variant}
				role="status"
				aria-live="polite"
				className={cn('inline-flex w-fit items-center gap-2.5', className)}
			>
				<PixelGrid variant={variant} reducedMotion={reducedMotion} />
				<TextShimmer className="text-[13px]">{statusText}</TextShimmer>
				{showElapsed ? (
					<span className="font-mono text-xs tabular-nums text-muted-foreground">
						{formatElapsed(elapsed)}
					</span>
				) : null}
				<span className="sr-only">
					{statusText}
					{showElapsed ? `, ${formatElapsed(elapsed)}` : ''}
				</span>
			</span>
		);
	}

	if (variant === 'text-shimmer') {
		return (
			<span data-slot="agent-loader" role="status" className={cn('inline-flex', className)}>
				<TextShimmer className={cn(size === 'sm' && 'text-xs', size === 'lg' && 'text-base')}>
					{statusText}
				</TextShimmer>
			</span>
		);
	}

	if (variant === 'loading-dots') {
		return (
			<span
				data-slot="agent-loader"
				role="status"
				className={cn('inline-flex items-center gap-0.5 font-medium text-primary', className)}
			>
				<span className={cn(size === 'sm' && 'text-xs', size === 'md' && 'text-sm', size === 'lg' && 'text-base')}>
					{statusText}
				</span>
				<span aria-hidden className="inline-flex">
					{[0, 1, 2].map((i) => (
						<span
							key={i}
							className="animate-[ai-loading-dots_1.4s_infinite] motion-reduce:animate-none"
							style={{ animationDelay: `${(i + 1) * 0.2}s` }}
						>
							.
						</span>
					))}
				</span>
			</span>
		);
	}

	const indicator =
		variant === 'circular' ? (
			<CircularLoader size={size} />
		) : variant === 'bounce-dots' ? (
			<DotsBounce size={size} />
		) : variant === 'typing' ? (
			<TypingLoader size={size} />
		) : variant === 'wave' ? (
			<WaveLoader size={size} />
		) : (
			<PulseDot size={size} />
		);

	return (
		<span
			data-slot="agent-loader"
			data-variant={variant}
			role="status"
			aria-live="polite"
			className={cn('inline-flex items-center gap-2', className)}
		>
			{indicator}
			{statusText ? <span className="sr-only">{statusText}</span> : <span className="sr-only">Loading</span>}
		</span>
	);
}

/** @deprecated Prefer AgentLoader — alias kept for prompt-kit familiarity. */
const Loader = AgentLoader;

export { AgentLoader, Loader };
export type { AgentLoaderProps, AgentLoaderVariant, PixelVariant, SimpleVariant };

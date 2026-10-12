'use client';

import * as React from 'react';
import { Progress as ProgressPrimitive } from '@base-ui/react/progress';

import { cn } from '../lib/utils';

type ProgressProps = Omit<React.ComponentProps<typeof ProgressPrimitive.Root>, 'children'> & {
	className?: string;
};

/**
 * Keeps the bar honest for values a calculation can really produce: finite
 * values clamp into `[min, max]`; `null`, `undefined`, `NaN`, `Infinity` and
 * unusable bounds are indeterminate. Without this Base UI drops the indicator
 * width for them and the block fills the track, which reads as 100%.
 */
function normalizeProgressValue(value: number | null | undefined, min: number, max: number): number | null {
	if (value == null || !Number.isFinite(value)) return null;
	if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null;
	return Math.min(Math.max(value, min), max);
}

function Progress({ className, value, min = 0, max = 100, ...props }: ProgressProps) {
	const normalized = normalizeProgressValue(value, min, max);
	// Over the maximum the bar stays full; `data-overflow` lets apps colour it.
	const overflow = normalized !== null && typeof value === 'number' && value > max;
	const overflowAttribute = overflow ? { 'data-overflow': '' } : undefined;

	return (
		<ProgressPrimitive.Root data-slot="progress" value={normalized} min={min} max={max} {...overflowAttribute} {...props}>
			<ProgressPrimitive.Track
				data-slot="progress-track"
				className={cn('bg-primary/20 relative h-2 w-full overflow-hidden rounded-full', className)}
			>
				<ProgressPrimitive.Indicator
					data-slot="progress-indicator"
					{...overflowAttribute}
					className={cn(
						'bg-primary h-full transition-[width] duration-(--duration-slow) ease-out motion-reduce:transition-none',
						// Indeterminate: a band sweeps the track instead of a solid bar that reads as complete.
						'data-indeterminate:bg-transparent data-indeterminate:[background-image:linear-gradient(90deg,transparent_0%,var(--primary)_50%,transparent_100%)] data-indeterminate:bg-[length:200%_100%] data-indeterminate:animate-[shimmer_1.6s_linear_infinite]',
						'motion-reduce:data-indeterminate:animate-none motion-reduce:data-indeterminate:[background-position:50%_0]',
					)}
				/>
			</ProgressPrimitive.Track>
		</ProgressPrimitive.Root>
	);
}

export { Progress };
export type { ProgressProps };

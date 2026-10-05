'use client';

import * as React from 'react';

import { cn } from '../../lib/utils';

type TextShimmerProps = React.ComponentProps<'span'> & {
	/** When false, renders static muted text (useful after a stream settles). */
	active?: boolean;
};

/**
 * Sweeping-gradient status text for in-flight agent states.
 * CSS-only animation so it does not re-render on a timer.
 */
function TextShimmer({ className, active = true, children, ...props }: TextShimmerProps) {
	return (
		<span
			data-slot="text-shimmer"
			data-active={active ? 'true' : 'false'}
			className={cn(
				'inline-block font-medium',
				active
					? [
							// The sweep runs toward the page colour: a light sheen over grey text in light mode, and a bright
							// glint over dim text in dark. Sweeping toward `foreground` in light only darkened the text a step,
							// which next to normal labels read as no motion at all.
							'bg-[linear-gradient(90deg,var(--muted-foreground)_35%,color-mix(in_oklab,var(--muted-foreground),var(--background)_55%)_50%,var(--muted-foreground)_65%)]',
							'dark:bg-[linear-gradient(90deg,var(--muted-foreground)_35%,var(--foreground)_50%,var(--muted-foreground)_65%)]',
							'bg-size-[200%_100%] bg-clip-text text-transparent',
							'animate-[ai-shimmer-text_1.4s_linear_infinite]',
							'motion-reduce:animate-none motion-reduce:bg-none motion-reduce:text-muted-foreground',
						]
					: 'text-muted-foreground',
				className,
			)}
			{...props}
		>
			{children}
		</span>
	);
}

export { TextShimmer };
export type { TextShimmerProps };

'use client';

import * as React from 'react';
import { Progress as ProgressPrimitive } from '@base-ui/react/progress';

import { cn } from '../lib/utils';

type ProgressProps = Omit<React.ComponentProps<typeof ProgressPrimitive.Root>, 'children'> & {
	className?: string;
};

function Progress({ className, value, ...props }: ProgressProps) {
	return (
		<ProgressPrimitive.Root data-slot="progress" value={value} {...props}>
			<ProgressPrimitive.Track
				data-slot="progress-track"
				className={cn('bg-primary/20 relative h-2 w-full overflow-hidden rounded-full', className)}
			>
				<ProgressPrimitive.Indicator
					data-slot="progress-indicator"
					className="bg-primary h-full w-full flex-1 transition-all"
					style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
				/>
			</ProgressPrimitive.Track>
		</ProgressPrimitive.Root>
	);
}

export { Progress };
export type { ProgressProps };

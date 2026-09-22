'use client';

import * as React from 'react';
import { Toggle as TogglePrimitive } from '@base-ui/react/toggle';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/utils';

const toggleVariants = cva(
	`group/toggle inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap
		rounded-md text-sm font-medium outline-none
		transition-[color,background-color,border-color,box-shadow,scale] duration-(--duration-moderate) ease-out
		hover:bg-muted hover:text-foreground
		focus-visible:ring-[3px] focus-visible:ring-ring/50
		disabled:pointer-events-none disabled:opacity-64
		data-[pressed]:text-accent-foreground
		motion-safe:active:scale-[0.96] motion-reduce:transition-none
		[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4`,
	{
		variants: {
			variant: {
				default: 'bg-transparent',
				outline:
					'border border-border bg-transparent bg-clip-padding shadow-xs hover:bg-accent/50 dark:bg-input/32 dark:hover:bg-input/64',
			},
			size: {
				default: 'h-10 min-w-10 px-3 pointer-coarse:min-h-11 pointer-coarse:min-w-11',
				sm: 'h-8 min-w-8 rounded-md px-2 text-[13px] pointer-coarse:min-h-11 pointer-coarse:min-w-11',
				lg: 'h-11 min-w-11 px-4',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	},
);

type ToggleProps = React.ComponentProps<typeof TogglePrimitive> &
	VariantProps<typeof toggleVariants>;

function Toggle({ className, variant, size, ...props }: ToggleProps) {
	return (
		<TogglePrimitive
			data-slot="toggle"
			className={cn(toggleVariants({ variant, size }), 'data-[pressed]:bg-accent', className)}
			{...props}
		/>
	);
}

export { Toggle, toggleVariants };
export type { ToggleProps };

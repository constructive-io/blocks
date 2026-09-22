import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { Separator } from './separator';
import { cn } from '../lib/utils';

const buttonGroupVariants = cva(
	`flex w-fit items-stretch
		[&>*]:focus-visible:relative [&>*]:focus-visible:z-10
		[&>[data-slot=select-trigger]:not([class*='w-'])]:w-fit [&>input]:flex-1`,
	{
		variants: {
			// Only the shared edges square off: the first child keeps its leading
			// corners, the last keeps its trailing ones, and each Button's `before:`
			// overlay follows so its highlight never shows a rounded corner inside a
			// squared one. Works for any child count, separators included.
			orientation: {
				horizontal: `flex-row
					[&>[data-slot]:not(:last-child)]:rounded-r-none [&>[data-slot]:not(:last-child)]:before:rounded-r-none
					[&>[data-slot]:not(:first-child)]:rounded-l-none [&>[data-slot]:not(:first-child)]:before:rounded-l-none
					[&>[data-slot]:not(:first-child)]:border-l-0`,
				vertical: `flex-col
					[&>[data-slot]:not(:last-child)]:rounded-b-none [&>[data-slot]:not(:last-child)]:before:rounded-b-none
					[&>[data-slot]:not(:first-child)]:rounded-t-none [&>[data-slot]:not(:first-child)]:before:rounded-t-none
					[&>[data-slot]:not(:first-child)]:border-t-0`,
			},
		},
		defaultVariants: {
			orientation: 'horizontal',
		},
	},
);

interface ButtonGroupProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof buttonGroupVariants> {}

function ButtonGroup({ className, orientation, ...props }: ButtonGroupProps) {
	return (
		<div
			role="group"
			data-slot="button-group"
			data-orientation={orientation}
			className={cn(buttonGroupVariants({ orientation }), className)}
			{...props}
		/>
	);
}

type ButtonGroupTextProps = React.ComponentProps<'div'>;

function ButtonGroupText({ className, ...props }: ButtonGroupTextProps) {
	return (
		<div
			data-slot="button-group-text"
			className={cn(
				'flex items-center gap-2 rounded-md border border-border bg-muted/60 px-3 text-[13px] font-medium text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-4',
				className,
			)}
			{...props}
		/>
	);
}

type ButtonGroupSeparatorProps = React.ComponentProps<typeof Separator>;

function ButtonGroupSeparator({
	className,
	orientation = 'vertical',
	...props
}: ButtonGroupSeparatorProps) {
	return (
		<Separator
			data-slot="button-group-separator"
			orientation={orientation}
			className={cn(
				// A translucent ink line drawn *over* the preceding button's edge (pulled
				// back by 1px, above it) so it tints the fill it divides — darker blue in a
				// primary group, a hairline between outline buttons — instead of opening a
				// slot that shows the page behind the group.
				'relative z-10 self-stretch bg-black/16 dark:bg-white/16 data-[orientation=vertical]:-ml-px data-[orientation=vertical]:h-auto data-[orientation=horizontal]:-mt-px data-[orientation=horizontal]:w-auto',
				className,
			)}
			{...props}
		/>
	);
}

export { ButtonGroup, ButtonGroupSeparator, ButtonGroupText, buttonGroupVariants };
export type { ButtonGroupProps, ButtonGroupTextProps, ButtonGroupSeparatorProps };

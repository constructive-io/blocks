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
			orientation: {
				horizontal:
					'*:data-[slot]:rounded-r-none [&>[data-slot]~[data-slot]]:rounded-l-none [&>[data-slot]~[data-slot]]:border-l-0',
				vertical:
					'flex-col *:data-[slot]:rounded-b-none [&>[data-slot]~[data-slot]]:rounded-t-none [&>[data-slot]~[data-slot]]:border-t-0',
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
				'relative self-stretch bg-input data-[orientation=horizontal]:mx-px data-[orientation=horizontal]:h-auto data-[orientation=vertical]:my-px data-[orientation=vertical]:w-auto',
				className,
			)}
			{...props}
		/>
	);
}

export { ButtonGroup, ButtonGroupSeparator, ButtonGroupText, buttonGroupVariants };
export type { ButtonGroupProps, ButtonGroupTextProps, ButtonGroupSeparatorProps };

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { Separator } from './separator';
import { Slot } from '../lib/slot';
import { cn } from '../lib/utils';

type ItemGroupProps = React.ComponentProps<'div'>;

function ItemGroup({ className, ...props }: ItemGroupProps) {
	return (
		<div
			role="list"
			data-slot="item-group"
			className={cn('group/item-group flex w-full flex-col gap-2', className)}
			{...props}
		/>
	);
}

type ItemSeparatorProps = React.ComponentProps<typeof Separator>;

function ItemSeparator({ className, ...props }: ItemSeparatorProps) {
	return (
		<Separator
			data-slot="item-separator"
			orientation="horizontal"
			className={cn('bg-border/60', className)}
			{...props}
		/>
	);
}

const itemVariants = cva(
	`group/item flex w-full flex-wrap items-center gap-3 rounded-md outline-none
		transition-[color,background-color,border-color,box-shadow] duration-(--duration-moderate) ease-out
		focus-visible:ring-[3px] focus-visible:ring-ring/50`,
	{
		variants: {
			variant: {
				default: '',
				outline: 'border border-border bg-clip-padding',
				muted: 'bg-muted/60',
			},
			size: {
				default: 'p-3',
				sm: 'gap-2.5 px-3 py-2.5 text-[13px]',
				xs: 'gap-2 px-2.5 py-2 text-[12px]',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	},
);

interface ItemProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof itemVariants> {
	/** When true, merges props onto the child element instead of rendering a div. */
	asChild?: boolean;
}

const Item = React.forwardRef<HTMLDivElement, ItemProps>(
	({ className, variant, size, asChild, children, ...props }, ref) => {
		const classes = cn(itemVariants({ variant, size, className }));
		if (asChild && React.isValidElement(children)) {
			return (
				<Slot ref={ref} className={classes} data-slot="item" {...props}>
					{children}
				</Slot>
			);
		}
		return (
			<div ref={ref} data-slot="item" role="listitem" className={classes} {...props}>
				{children}
			</div>
		);
	},
);
Item.displayName = 'Item';

const itemMediaVariants = cva(
	'flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0',
	{
		variants: {
			variant: {
				default: '',
				icon: 'size-8 rounded-sm bg-muted text-muted-foreground [&_svg]:size-4',
				image:
					'size-10 overflow-hidden rounded-sm outline outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10 [&_img]:size-full [&_img]:object-cover',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	},
);

interface ItemMediaProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof itemMediaVariants> {}

function ItemMedia({ className, variant, ...props }: ItemMediaProps) {
	return (
		<div
			data-slot="item-media"
			data-variant={variant}
			className={cn(itemMediaVariants({ variant, className }))}
			{...props}
		/>
	);
}

type ItemContentProps = React.ComponentProps<'div'>;

function ItemContent({ className, ...props }: ItemContentProps) {
	return (
		<div
			data-slot="item-content"
			className={cn('flex min-w-0 flex-1 flex-col gap-0.5 [&+[data-slot=item-content]]:flex-none', className)}
			{...props}
		/>
	);
}

type ItemTitleProps = React.ComponentProps<'div'>;

function ItemTitle({ className, ...props }: ItemTitleProps) {
	return (
		<div
			data-slot="item-title"
			className={cn('line-clamp-1 flex w-fit items-center gap-1.5 text-[13px] font-medium text-pretty', className)}
			{...props}
		/>
	);
}

type ItemDescriptionProps = React.ComponentProps<'p'>;

function ItemDescription({ className, ...props }: ItemDescriptionProps) {
	return (
		<p
			data-slot="item-description"
			className={cn(
				'line-clamp-2 text-pretty text-[12px] leading-5 text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary',
				className,
			)}
			{...props}
		/>
	);
}

type ItemActionsProps = React.ComponentProps<'div'>;

function ItemActions({ className, ...props }: ItemActionsProps) {
	return (
		<div
			data-slot="item-actions"
			className={cn('flex items-center gap-2', className)}
			{...props}
		/>
	);
}

type ItemHeaderProps = React.ComponentProps<'div'>;

function ItemHeader({ className, ...props }: ItemHeaderProps) {
	return (
		<div
			data-slot="item-header"
			className={cn('flex basis-full items-center justify-between gap-2', className)}
			{...props}
		/>
	);
}

type ItemFooterProps = React.ComponentProps<'div'>;

function ItemFooter({ className, ...props }: ItemFooterProps) {
	return (
		<div
			data-slot="item-footer"
			className={cn('flex basis-full items-center justify-between gap-2', className)}
			{...props}
		/>
	);
}

export {
	Item,
	ItemMedia,
	ItemContent,
	ItemActions,
	ItemGroup,
	ItemSeparator,
	ItemTitle,
	ItemDescription,
	ItemHeader,
	ItemFooter,
	itemVariants,
	itemMediaVariants,
};
export type {
	ItemProps,
	ItemMediaProps,
	ItemContentProps,
	ItemActionsProps,
	ItemGroupProps,
	ItemSeparatorProps,
	ItemTitleProps,
	ItemDescriptionProps,
	ItemHeaderProps,
	ItemFooterProps,
};

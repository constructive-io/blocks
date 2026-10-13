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
		transition-[box-shadow] duration-(--duration-moderate) ease-out
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
				sm: 'gap-2.5 px-3 py-2.5 text-[0.8125rem]',
				xs: 'gap-2 px-2.5 py-2 text-[0.75rem]',
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
			// `basis-32` is the floor: when the actions would squeeze the text below it, the
			// Item wraps them onto their own line instead of crushing the column.
			className={cn('flex min-w-0 flex-1 basis-32 flex-col gap-0.5 [&+[data-slot=item-content]]:max-w-full [&+[data-slot=item-content]]:flex-none', className)}
			{...props}
		/>
	);
}

type ItemTitleProps = React.ComponentProps<'div'>;

function ItemTitle({ className, children, ...props }: ItemTitleProps) {
	return (
		<div
			data-slot="item-title"
			title={typeof children === 'string' ? children : undefined}
			// Text-only titles clamp to two lines with an ellipsis. `line-clamp` needs
			// `display: -webkit-box`, which would stack inline children such as a Badge, so
			// titles that hold elements stay a flex row (their text still wraps).
			className={cn(
				'flex w-fit max-w-full items-center gap-1.5 text-[0.8125rem] font-medium text-pretty [overflow-wrap:anywhere] [&:not(:has(>*))]:line-clamp-2',
				className,
			)}
			{...props}
		>
			{children}
		</div>
	);
}

type ItemDescriptionProps = React.ComponentProps<'p'>;

function ItemDescription({ className, children, ...props }: ItemDescriptionProps) {
	return (
		<p
			data-slot="item-description"
			title={typeof children === 'string' ? children : undefined}
			className={cn(
				'line-clamp-2 text-pretty text-[0.75rem] leading-5 text-muted-foreground [overflow-wrap:anywhere] [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-link',
				className,
			)}
			{...props}
		>
			{children}
		</p>
	);
}

type ItemActionsProps = React.ComponentProps<'div'>;

function ItemActions({ className, ...props }: ItemActionsProps) {
	return (
		<div
			data-slot="item-actions"
			className={cn('flex max-w-full flex-wrap items-center justify-end gap-2 ms-auto', className)}
			{...props}
		/>
	);
}

type ItemHeaderProps = React.ComponentProps<'div'>;

function ItemHeader({ className, ...props }: ItemHeaderProps) {
	return (
		<div
			data-slot="item-header"
			className={cn('flex min-w-0 basis-full items-center justify-between gap-2', className)}
			{...props}
		/>
	);
}

type ItemFooterProps = React.ComponentProps<'div'>;

function ItemFooter({ className, ...props }: ItemFooterProps) {
	return (
		<div
			data-slot="item-footer"
			className={cn('flex min-w-0 basis-full items-center justify-between gap-2', className)}
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

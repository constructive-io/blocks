import * as React from 'react';
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from 'lucide-react';

import { cn } from '../lib/utils';
import { Button, buttonVariants } from './button';

function Pagination({ className, ...props }: React.ComponentProps<'nav'>) {
	return (
		<nav
			role="navigation"
			aria-label="pagination"
			data-slot="pagination"
			className={cn('mx-auto flex w-full justify-center', className)}
			{...props}
		/>
	);
}

function PaginationContent({ className, ...props }: React.ComponentProps<'ul'>) {
	return (
		<ul
			data-slot="pagination-content"
			className={cn(
				// flex-wrap keeps the row usable on narrow viewports instead of overflowing
				'flex flex-row flex-wrap items-center justify-center gap-0.5 sm:gap-1',
				className,
			)}
			{...props}
		/>
	);
}

function PaginationItem({ className, ...props }: React.ComponentProps<'li'>) {
	return (
		<li
			data-slot="pagination-item"
			// inline-flex: one control per item; never stack ellipsis + page vertically
			className={cn('inline-flex', className)}
			{...props}
		/>
	);
}

type PaginationLinkProps = {
	isActive?: boolean;
	isDisabled?: boolean;
} & Pick<React.ComponentProps<typeof Button>, 'size'> &
	React.ComponentProps<'a'>;

function PaginationLink({
	className,
	isActive,
	isDisabled,
	size = 'icon',
	...props
}: PaginationLinkProps) {
	return (
		<a
			aria-current={isActive ? 'page' : undefined}
			aria-disabled={isDisabled || undefined}
			data-slot="pagination-link"
			data-active={isActive || undefined}
			data-disabled={isDisabled || undefined}
			tabIndex={isDisabled ? -1 : props.tabIndex}
			className={cn(
				buttonVariants({
					variant: isActive ? 'outline' : 'ghost',
					size,
				}),
				'tabular-nums',
				isDisabled && 'pointer-events-none opacity-50',
				// Slightly denser on small screens; full hit target from button variants
				size === 'icon' && 'size-8 sm:size-10',
				className,
			)}
			{...props}
		/>
	);
}

function PaginationPrevious({ className, ...props }: React.ComponentProps<typeof PaginationLink>) {
	return (
		<PaginationLink
			aria-label="Go to previous page"
			size="default"
			className={cn(
				'h-8 gap-1 px-2.5 sm:h-10 sm:pe-4',
				// Icon-only on the narrowest widths; label from sm up
				'min-w-8 sm:min-w-10',
				className,
			)}
			{...props}
		>
			<ChevronLeftIcon size={16} />
			<span className="hidden sm:inline">Previous</span>
		</PaginationLink>
	);
}

function PaginationNext({ className, ...props }: React.ComponentProps<typeof PaginationLink>) {
	return (
		<PaginationLink
			aria-label="Go to next page"
			size="default"
			className={cn('h-8 gap-1 px-2.5 sm:h-10 sm:ps-4 min-w-8 sm:min-w-10', className)}
			{...props}
		>
			<span className="hidden sm:inline">Next</span>
			<ChevronRightIcon size={16} />
		</PaginationLink>
	);
}

function PaginationEllipsis({ className, ...props }: React.ComponentProps<'span'>) {
	return (
		<span
			aria-hidden
			data-slot="pagination-ellipsis"
			className={cn(
				'flex size-8 items-center justify-center text-muted-foreground sm:size-10',
				className,
			)}
			{...props}
		>
			<MoreHorizontalIcon size={16} />
			<span className="sr-only">More pages</span>
		</span>
	);
}

export {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
};

import * as React from 'react';

import { cn } from '../lib/utils';

type TableProps = React.ComponentProps<'table'> & {
	/** Classes for the horizontal scroll wrapper around the table */
	containerClassName?: string;
	/** Extra props for the scroll wrapper (e.g. ref, data attributes) */
	containerProps?: Omit<React.ComponentProps<'div'>, 'className' | 'children'>;
};

/**
 * Semantic table primitives. `Table` wraps the native element in an overflow
 * container so wide content scrolls without breaking page layout.
 */
function Table({ className, containerClassName, containerProps, ...props }: TableProps) {
	return (
		<div
			data-slot="table-container"
			{...containerProps}
			className={cn('relative w-full overflow-x-auto', containerClassName)}
		>
			<table
				data-slot="table"
				className={cn('w-full caption-bottom text-sm', className)}
				{...props}
			/>
		</div>
	);
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
	return (
		<thead
			data-slot="table-header"
			className={cn(
				// Quiet band under headers; kill row hover on thead
				'bg-muted/50 [&_tr]:border-b [&_tr]:hover:bg-transparent [&_tr]:data-[state=selected]:bg-transparent',
				className,
			)}
			{...props}
		/>
	);
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
	return (
		<tbody
			data-slot="table-body"
			className={cn('[&_tr:last-child]:border-0', className)}
			{...props}
		/>
	);
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
	return (
		<tfoot
			data-slot="table-footer"
			className={cn(
				'border-t border-border bg-muted/50 font-medium',
				'[&>tr]:border-b-0 [&>tr]:hover:bg-transparent',
				className,
			)}
			{...props}
		/>
	);
}

function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
	return (
		<tr
			data-slot="table-row"
			className={cn(
				'border-b border-border',
				'hover:bg-muted/40 data-[state=selected]:bg-muted',
				className,
			)}
			{...props}
		/>
	);
}

type TableGroupRowProps = React.ComponentProps<'tr'> & {
	/** Columns the group heading spans; usually the table's column count. */
	colSpan: number;
};

/**
 * Heading row for a group of body rows. Put each group in its own `TableBody`
 * and this row first: the tint and `scope="rowgroup"` mark the break, so the
 * hairlines between rows stay the same weight everywhere.
 */
function TableGroupRow({ colSpan, className, children, ...props }: TableGroupRowProps) {
	return (
		<tr
			data-slot="table-group-row"
			className={cn('border-y border-border bg-muted/50', className)}
			{...props}
		>
			<th
				scope="rowgroup"
				colSpan={colSpan}
				className="h-9 px-4 text-left align-middle text-xs font-medium text-muted-foreground"
			>
				{children}
			</th>
		</tr>
	);
}

function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
	return (
		<th
			data-slot="table-head"
			className={cn(
				'h-11 px-4 text-left align-middle text-xs font-medium tracking-wide text-muted-foreground',
				'whitespace-nowrap',
				'[&:has([role=checkbox])]:w-px [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-px',
				className,
			)}
			{...props}
		/>
	);
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
	return (
		<td
			data-slot="table-cell"
			className={cn(
				'px-4 py-3 align-middle whitespace-nowrap',
				'[&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-px',
				className,
			)}
			{...props}
		/>
	);
}

function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
	return (
		<caption
			data-slot="table-caption"
			className={cn('mt-3 text-pretty text-sm text-subtle-foreground', className)}
			{...props}
		/>
	);
}

export {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableFooter,
	TableGroupRow,
	TableHead,
	TableHeader,
	TableRow,
};
export type { TableGroupRowProps, TableProps };

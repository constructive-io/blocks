import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/utils';

const cardVariants = cva(
	// Base styles
		'bg-card text-card-foreground flex flex-col gap-(--card-pad) rounded-lg py-(--card-pad)',
	{
		variants: {
			variant: {
				default: 'shadow-card',
				elevated: 'shadow-card-lg',
				flat: 'border border-border shadow-none',
				ghost: 'bg-transparent shadow-none',
				interactive: [
					'shadow-card',
					'hover:shadow-card-lg motion-safe:hover:-translate-y-0.5',
					'transition-[box-shadow,translate] duration-(--duration-slow) motion-reduce:transition-shadow',
					'cursor-pointer',
				],
			},
			size: {
				default: '[--card-pad:1.5rem]',
				sm: '[--card-pad:1rem]',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	},
);

interface CardProps extends React.ComponentProps<'div'>, VariantProps<typeof cardVariants> {}

function Card({ className, variant, size, ...props }: CardProps) {
	return (
		<div data-slot="card" className={cn(cardVariants({ variant, size }), className)} {...props} />
	);
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-header"
			className={cn(
				// `minmax(0, 1fr)`: an unbroken title wraps instead of widening the column
				// and pushing the action out of the card.
				`@container/card-header grid auto-rows-min grid-cols-[minmax(0,1fr)] grid-rows-[auto_auto] items-start gap-1.5 px-(--card-pad)
				has-data-[slot=card-action]:grid-cols-[minmax(0,1fr)_auto] [.border-b]:pb-(--card-pad)`,
				className,
			)}
			{...props}
		/>
	);
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-title"
			// `leading-tight` keeps wrapped titles legible (stacked diacritics collide at
			// `leading-none`); the negative margin keeps a single line exactly 1em tall.
			className={cn(
				'-my-0.5 min-w-0 text-balance leading-tight font-semibold tracking-tight [overflow-wrap:anywhere]',
				className,
			)}
			{...props}
		/>
	);
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-description"
			className={cn('text-muted-foreground min-w-0 text-pretty text-sm [overflow-wrap:anywhere]', className)}
			{...props}
		/>
	);
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-action"
			className={cn('col-start-2 row-span-2 row-start-1 min-w-0 max-w-full self-start justify-self-end', className)}
			{...props}
		/>
	);
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
	return <div data-slot="card-content" className={cn('px-(--card-pad)', className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-footer"
			className={cn('flex flex-wrap items-center gap-2 px-(--card-pad) [.border-t]:pt-(--card-pad)', className)}
			{...props}
		/>
	);
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent, cardVariants };
export type { CardProps };

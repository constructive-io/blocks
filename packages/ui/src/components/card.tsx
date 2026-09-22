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
				flat: 'border border-border/60 shadow-none',
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
				`@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-(--card-pad)
				has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-(--card-pad)`,
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
			className={cn('text-balance leading-none font-semibold tracking-tight', className)}
			{...props}
		/>
	);
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-description"
			className={cn('text-muted-foreground text-pretty text-sm', className)}
			{...props}
		/>
	);
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="card-action"
			className={cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end', className)}
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
			className={cn('flex items-center px-(--card-pad) [.border-t]:pt-(--card-pad)', className)}
			{...props}
		/>
	);
}

export { Card, CardHeader, CardFooter, CardTitle, CardAction, CardDescription, CardContent, cardVariants };
export type { CardProps };

'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/utils';

/**
 * Soft filled callout. Icon is a direct child SVG; content uses grid columns so
 * title/description stay aligned without absolute positioning.
 */
const alertVariants = cva(
	[
		'group/alert relative w-full rounded-xl border px-4 py-3.5 text-sm',
		'grid grid-cols-[0_minmax(0,1fr)] items-start gap-y-1',
		'has-[>svg]:grid-cols-[1rem_minmax(0,1fr)] has-[>svg]:gap-x-3',
		"[&>svg]:col-start-1 [&>svg]:row-span-full [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-current",
		'[&>svg]:pointer-events-none',
		'shadow-xs',
	].join(' '),
	{
		variants: {
			variant: {
				default:
					'border-border/80 bg-card text-card-foreground [&>svg]:text-foreground',
				destructive:
					'border-destructive/30 bg-destructive/8 text-destructive dark:border-destructive/35 dark:bg-destructive/12 [&>svg]:text-destructive',
				info: 'border-info/30 bg-info/8 text-info-foreground dark:border-info/35 dark:bg-info/12 [&>svg]:text-info',
				success:
					'border-success/30 bg-success/8 text-success-foreground dark:border-success/35 dark:bg-success/12 [&>svg]:text-success',
				warning:
					'border-warning/30 bg-warning/8 text-warning-foreground dark:border-warning/35 dark:bg-warning/12 [&>svg]:text-warning',
			},
		},
		defaultVariants: {
			variant: 'default',
		},
	},
);

type AlertProps = React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>;

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
	({ className, variant, ...props }, ref) => (
		<div
			ref={ref}
			role="alert"
			data-slot="alert"
			data-variant={variant ?? 'default'}
			className={cn(alertVariants({ variant }), className)}
			{...props}
		/>
	),
);
Alert.displayName = 'Alert';

const AlertTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
	({ className, ...props }, ref) => (
		<h5
			ref={ref}
			data-slot="alert-title"
			className={cn(
				'col-start-2 min-h-4 font-medium leading-snug tracking-tight',
				// Keep title on the semantic color; default uses card foreground
				'text-current',
				className,
			)}
			{...props}
		/>
	),
);
AlertTitle.displayName = 'AlertTitle';

const AlertDescription = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => (
		<div
			ref={ref}
			data-slot="alert-description"
			className={cn(
				'col-start-2 text-pretty text-sm leading-relaxed',
				// Default: muted body. Semantic variants: slightly softer than title for hierarchy.
				'text-muted-foreground',
				'group-data-[variant=destructive]/alert:text-destructive/85',
				'group-data-[variant=info]/alert:text-info-foreground/85',
				'group-data-[variant=success]/alert:text-success-foreground/85',
				'group-data-[variant=warning]/alert:text-warning-foreground/85',
				'[&_p]:leading-relaxed',
				// Inline code with spacing that won't glue to neighbors
				'[&_code]:mx-0.5 [&_code]:rounded-md [&_code]:bg-foreground/6 [&_code]:px-1.5 [&_code]:py-0.5',
				'[&_code]:font-mono [&_code]:text-[0.8125em] [&_code]:font-normal [&_code]:text-current',
				className,
			)}
			{...props}
		/>
	),
);
AlertDescription.displayName = 'AlertDescription';

export { Alert, AlertTitle, AlertDescription, alertVariants };
export type { AlertProps };

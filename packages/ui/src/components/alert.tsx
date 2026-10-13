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
		'group/alert relative w-full rounded-md border px-4 py-3.5 text-sm',
		'grid grid-cols-[0_minmax(0,1fr)] items-start gap-y-1',
		'has-[>svg]:grid-cols-[1rem_minmax(0,1fr)] has-[>svg]:gap-x-3',
		"[&>svg]:col-start-1 [&>svg]:row-span-full [&>svg]:mt-0.5 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-current",
		'[&>svg]:pointer-events-none',
		// Anything else (an action, a link row) lines up with the text instead of landing in the icon column.
		'[&>*:not(svg)]:col-start-2 [&>[data-slot=button]]:justify-self-start',
		'shadow-xs',
	].join(' '),
	{
		variants: {
			variant: {
				default:
					'border-border bg-card text-card-foreground [&>svg]:text-foreground',
				destructive:
					'border-[color-mix(in_oklab,var(--destructive)_30%,var(--card))] bg-[color-mix(in_oklab,var(--destructive)_8%,var(--card))] text-destructive dark:border-[color-mix(in_oklab,var(--destructive)_35%,var(--card))] dark:bg-[color-mix(in_oklab,var(--destructive)_12%,var(--card))] [&>svg]:text-destructive',
				info: 'border-[color-mix(in_oklab,var(--info)_30%,var(--card))] bg-[color-mix(in_oklab,var(--info)_8%,var(--card))] text-info-foreground dark:border-[color-mix(in_oklab,var(--info)_35%,var(--card))] dark:bg-[color-mix(in_oklab,var(--info)_12%,var(--card))] [&>svg]:text-info',
				success:
					'border-[color-mix(in_oklab,var(--success)_30%,var(--card))] bg-[color-mix(in_oklab,var(--success)_8%,var(--card))] text-success-foreground dark:border-[color-mix(in_oklab,var(--success)_35%,var(--card))] dark:bg-[color-mix(in_oklab,var(--success)_12%,var(--card))] [&>svg]:text-success',
				warning:
					'border-[color-mix(in_oklab,var(--warning)_30%,var(--card))] bg-[color-mix(in_oklab,var(--warning)_8%,var(--card))] text-warning-foreground dark:border-[color-mix(in_oklab,var(--warning)_35%,var(--card))] dark:bg-[color-mix(in_oklab,var(--warning)_12%,var(--card))] [&>svg]:text-warning',
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
				// `empty:hidden`: a title that came back empty must not reserve a blank row.
				'col-start-2 font-medium leading-snug tracking-tight empty:hidden',
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
				'col-start-2 text-pretty text-sm leading-relaxed [overflow-wrap:anywhere]',
				// Default: muted body. Semantic variants use the full variant colour: the old /85
				// alpha dropped light-theme contrast to about 3.8:1; the weight still sets the hierarchy.
				'text-muted-foreground',
				'group-data-[variant=destructive]/alert:text-destructive',
				'group-data-[variant=info]/alert:text-info-foreground',
				'group-data-[variant=success]/alert:text-success-foreground',
				'group-data-[variant=warning]/alert:text-warning-foreground',
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

/** Row for a button or link under the text, aligned with the title (not the icon). */
const AlertAction = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => (
		<div
			ref={ref}
			data-slot="alert-action"
			className={cn('col-start-2 mt-1 flex flex-wrap items-center gap-2', className)}
			{...props}
		/>
	),
);
AlertAction.displayName = 'AlertAction';

export { Alert, AlertTitle, AlertDescription, AlertAction, alertVariants };
export type { AlertProps };

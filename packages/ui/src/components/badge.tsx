import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/utils';

const badgeVariants = cva(
	"relative inline-flex max-w-full shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-sm border border-transparent font-medium outline-none transition-shadow focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-64 [&_svg:not([class*='size-'])]:size-3 [&_svg]:pointer-events-none [&_svg]:shrink-0 [button,a&]:cursor-pointer [button,a&]:pointer-coarse:min-h-11 [button,a&]:pointer-coarse:min-w-11",
	{
		defaultVariants: {
			size: 'default',
			variant: 'default',
		},
		variants: {
			// The min-width (not for empty dot-style badges) keeps a single character from
			// rendering as a thin sliver.
			size: {
				default: 'px-[calc(--spacing(1)-1px)] text-xs [&:not(:empty)]:min-w-[1.125rem]',
				lg: 'px-[calc(--spacing(1.5)-1px)] text-sm [&:not(:empty)]:min-w-[1.375rem]',
				sm: 'rounded-[calc(var(--radius-sm)-2px)] px-[calc(--spacing(1)-1px)] text-[.625rem] [&:not(:empty)]:min-w-4',
			},
			variant: {
				default: 'bg-primary text-primary-foreground [button,a&]:hover:bg-primary/90',
				destructive: 'bg-destructive text-white [button,a&]:hover:bg-destructive/90',
				error: 'bg-destructive/12 text-destructive dark:bg-destructive/16',
				info: 'bg-info/14 text-info-foreground dark:bg-info/16',
				outline:
					'border-border bg-transparent dark:bg-input/32 [button,a&]:hover:bg-accent/50 dark:[button,a&]:hover:bg-input/48',
				secondary: 'bg-secondary text-secondary-foreground [button,a&]:hover:bg-secondary/90',
				success: 'bg-success/14 text-success-foreground dark:bg-success/16',
				warning: 'bg-warning/14 text-warning-foreground dark:bg-warning/16',
			},
		},
	},
);

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

const LONG_TEXT = 24;

/**
 * Text and numbers are wrapped so a badge wider than its container truncates with an
 * ellipsis (`text-overflow` does not apply to the flex container itself). The padding
 * and negative margin keep tall glyphs (Thai tone marks, stacked Vietnamese) from
 * being clipped by the overflow.
 */
function truncatable(children: React.ReactNode) {
	return React.Children.map(children, (child) =>
		typeof child === 'string' || typeof child === 'number' ? (
			<span className="-my-0.5 min-w-0 truncate py-0.5">{child}</span>
		) : (
			child
		),
	);
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(({ className, variant, size, children, ...props }, ref) => (
	<span
		ref={ref}
		data-slot="badge"
		title={typeof children === 'string' && children.length > LONG_TEXT ? children : undefined}
		className={cn(badgeVariants({ variant, size }), className)}
		{...props}
	>
		{truncatable(children)}
	</span>
));

Badge.displayName = 'Badge';

export { Badge, badgeVariants };
export type { BadgeProps };

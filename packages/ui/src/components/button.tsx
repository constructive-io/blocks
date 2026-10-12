import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { Slot } from '../lib/slot';
import { cn } from '../lib/utils';

const buttonVariants = cva(
	"[&_svg]:-mx-0.5 relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md border font-medium text-sm outline-none transition-[box-shadow,scale] duration-(--duration-moderate) ease-out before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-md)-1px)] focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-64 data-disabled:cursor-not-allowed data-disabled:opacity-64 motion-reduce:transition-shadow [&_svg:not([class*='opacity-'])]:opacity-80 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0",
	{
		defaultVariants: {
			size: 'default',
			static: false,
			variant: 'default',
			wrap: false,
		},
		variants: {
			static: {
				false: 'motion-safe:active:not-disabled:not-data-disabled:scale-[0.96]',
				true: null,
			},
			size: {
				default: 'h-10 min-w-10 px-[calc(--spacing(3)-1px)] pointer-coarse:min-h-11 pointer-coarse:min-w-11',
				icon: 'size-10 pointer-coarse:size-11',
				'icon-lg': 'size-11',
				'icon-sm': 'size-8 pointer-coarse:size-11',
				'icon-xl': 'size-11 [&_svg:not([class*="size-"])]:size-5',
				'icon-xs':
					'size-7 rounded-md before:rounded-[calc(var(--radius-md)-1px)] pointer-coarse:size-11 not-in-data-[slot=input-group]:[&_svg:not([class*="size-"])]:size-4',
				lg: 'h-11 min-w-11 px-[calc(--spacing(3.5)-1px)]',
				sm:
					'h-8 gap-1.5 px-[calc(--spacing(2.5)-1px)] pointer-coarse:min-h-11 pointer-coarse:min-w-11',
				xl: 'h-12 min-w-12 px-[calc(--spacing(4)-1px)] text-lg [&_svg:not([class*="size-"])]:size-5',
				xs:
					'h-7 gap-1 rounded-md px-[calc(--spacing(2)-1px)] text-xs before:rounded-[calc(var(--radius-md)-1px)] pointer-coarse:min-h-11 pointer-coarse:min-w-11 [&_svg:not([class*="size-"])]:size-3.5',
			},
			variant: {
				default:
					'not-disabled:not-data-disabled:inset-shadow-[0_1px_--theme(--color-white/16%)] border-primary bg-primary text-primary-foreground shadow-primary/24 shadow-xs hover:bg-primary/90 [:active,[data-pressed]]:inset-shadow-[0_1px_--theme(--color-black/8%)] [:disabled,[data-disabled],:active,[data-pressed]]:shadow-none data-disabled:hover:bg-primary data-disabled:active:inset-shadow-none',
				destructive:
					'not-disabled:not-data-disabled:inset-shadow-[0_1px_--theme(--color-white/16%)] border-destructive bg-destructive text-white shadow-destructive/24 shadow-xs hover:bg-destructive/90 [:active,[data-pressed]]:inset-shadow-[0_1px_--theme(--color-black/8%)] [:disabled,[data-disabled],:active,[data-pressed]]:shadow-none data-disabled:hover:bg-destructive data-disabled:active:inset-shadow-none',
				'destructive-outline':
					'border-destructive/40 bg-transparent bg-clip-padding text-destructive shadow-xs not-disabled:not-data-disabled:not-active:not-data-pressed:before:shadow-[0_1px_--theme(--color-black/4%)] dark:bg-input/32 dark:not-in-data-[slot=group]:bg-clip-border dark:not-disabled:not-data-disabled:before:shadow-[0_-1px_--theme(--color-white/4%)] dark:not-disabled:not-data-disabled:not-active:not-data-pressed:before:shadow-[0_-1px_--theme(--color-white/8%)] [:disabled,[data-disabled],:active,[data-pressed]]:shadow-none [:hover,[data-pressed]]:border-destructive/60 [:hover,[data-pressed]]:bg-destructive/8 data-disabled:[:hover]:border-destructive/40 data-disabled:[:hover]:bg-transparent dark:data-disabled:[:hover]:bg-input/32',
				ghost: 'border-transparent hover:bg-accent data-pressed:bg-accent data-disabled:hover:bg-transparent',
				link: 'border-transparent underline-offset-4 hover:underline data-disabled:hover:no-underline',
				outline:
					'border-border bg-background bg-clip-padding shadow-xs not-disabled:not-data-disabled:not-active:not-data-pressed:before:shadow-[0_1px_--theme(--color-black/4%)] dark:bg-input/32 dark:not-in-data-[slot=group]:bg-clip-border dark:not-disabled:not-data-disabled:before:shadow-[0_-1px_--theme(--color-white/4%)] dark:not-disabled:not-data-disabled:not-active:not-data-pressed:before:shadow-[0_-1px_--theme(--color-white/8%)] [:disabled,[data-disabled],:active,[data-pressed]]:shadow-none [:hover,[data-pressed]]:bg-accent/50 dark:[:hover,[data-pressed]]:bg-input/64 data-disabled:[:hover]:bg-background dark:data-disabled:[:hover]:bg-input/32',
				secondary:
					'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/90 [:active,[data-pressed]]:bg-secondary/80 data-disabled:hover:bg-secondary data-disabled:active:bg-secondary',
			},
			// Opt-in: long or translated labels wrap onto more lines instead of
			// overflowing. The height becomes a minimum and the button may shrink
			// inside a flex row. Icon sizes ignore it (they have no label).
			wrap: {
				false: null,
				true: 'max-w-full min-w-0 shrink whitespace-normal text-center [overflow-wrap:anywhere]',
			},
		},
		compoundVariants: [
			{ wrap: true, size: 'default', className: 'h-auto min-h-10 py-[calc(--spacing(2)-1px)]' },
			{ wrap: true, size: 'sm', className: 'h-auto min-h-8 py-[calc(--spacing(1.5)-1px)]' },
			{ wrap: true, size: 'xs', className: 'h-auto min-h-7 py-[calc(--spacing(1)-1px)]' },
			{ wrap: true, size: 'lg', className: 'h-auto min-h-11 py-[calc(--spacing(2.5)-1px)]' },
			{ wrap: true, size: 'xl', className: 'h-auto min-h-12 py-[calc(--spacing(3)-1px)]' },
		],
	},
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: VariantProps<typeof buttonVariants>['variant'];
	size?: VariantProps<typeof buttonVariants>['size'];
	/** Disables tactile press scaling when motion would distract from the interaction. */
	static?: boolean;
	/**
	 * Lets the label wrap onto several lines (long or translated copy) instead of
	 * staying on one line and overflowing. The height becomes a minimum and the
	 * button can shrink inside a flex row. Off by default.
	 */
	wrap?: boolean;
	/** When true, merges props onto the child element instead of rendering a button */
	asChild?: boolean;
}

/**
 * `TooltipTrigger` puts this attribute on a disabled child. A natively disabled button gets no pointer or focus
 * events, so a tooltip saying why it is disabled would never open; with the attribute the button stays the same
 * element in the same place and is disabled with `aria-disabled` instead. Keep the name in step with tooltip.tsx.
 */
const FOCUSABLE_WHEN_DISABLED = 'data-focusable-when-disabled';

// What a native disabled button never receives. A button that is disabled but focusable drops them too, so a menu
// or dialog trigger composed onto it cannot open and a consumer's handler cannot run.
const ACTIVATION_HANDLERS = [
	'onClick',
	'onDoubleClick',
	'onMouseDown',
	'onMouseUp',
	'onPointerDown',
	'onPointerUp',
	'onTouchStart',
	'onTouchEnd',
	'onKeyDown',
	'onKeyUp',
] as const;

// Enter and Space on a focused button click it; cancelling that also stops a submit button from submitting.
const preventActivation = (event: React.SyntheticEvent) => event.preventDefault();

function focusableDisabledProps(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
	const rest: Record<string, unknown> = { ...props };
	for (const handler of ACTIVATION_HANDLERS) delete rest[handler];
	return { ...rest, 'aria-disabled': true, 'data-disabled': '', onClick: preventActivation };
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, size, static: isStatic, wrap, asChild, children, type = 'button', disabled, ...props }, ref) => {
		const buttonClasses = cn(buttonVariants({ className, size, static: isStatic, variant, wrap }));
		const Comp = asChild ? Slot : 'button';
		const stateProps = disabled && FOCUSABLE_WHEN_DISABLED in props ? focusableDisabledProps(props) : { ...props, disabled };

		if (asChild) {
			const SlottedComp = Comp as typeof Slot;
			return (
				<SlottedComp
					ref={ref as React.Ref<HTMLElement>}
					className={buttonClasses}
					data-slot="button"
					{...stateProps}
				>
					{children}
				</SlottedComp>
			);
		}

		return (
			<button ref={ref} type={type} className={buttonClasses} data-slot="button" {...stateProps}>
				{children}
			</button>
		);
	},
);
Button.displayName = 'Button';

export { Button, buttonVariants };
export type { ButtonProps };

'use client';

import * as React from 'react';
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';

import { useFloatingOverlayPortalProps } from '@constructive-io/ui/portal';
import { cn } from '../lib/utils';

function Popover({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Root>) {
	return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

type PopoverTriggerProps = React.ComponentProps<typeof PopoverPrimitive.Trigger> & {
	/** When true, merges props onto the child element instead of rendering a button */
	asChild?: boolean;
};

function PopoverTrigger({ asChild, children, render, nativeButton, ...props }: PopoverTriggerProps) {
	const childRender = render === undefined && asChild && React.isValidElement(children) ? children : undefined;

	return (
		<PopoverPrimitive.Trigger
			data-slot="popover-trigger"
			nativeButton={nativeButton ?? (childRender ? true : undefined)}
			render={render ?? childRender}
			{...props}
		>
			{childRender ? undefined : children}
		</PopoverPrimitive.Trigger>
	);
}

type PopoverCloseProps = React.ComponentProps<typeof PopoverPrimitive.Close> & {
	/** When true, merges props onto the child element instead of rendering a button */
	asChild?: boolean;
};

function PopoverClose({ asChild, children, render, nativeButton, ...props }: PopoverCloseProps) {
	const childRender = render === undefined && asChild && React.isValidElement(children) ? children : undefined;

	return (
		<PopoverPrimitive.Close
			data-slot="popover-close"
			nativeButton={nativeButton ?? (childRender ? true : undefined)}
			render={render ?? childRender}
			{...props}
		>
			{childRender ? undefined : children}
		</PopoverPrimitive.Close>
	);
}

type PopoverContentProps = React.ComponentProps<typeof PopoverPrimitive.Popup> & {
	align?: 'start' | 'center' | 'end';
	sideOffset?: number;
	showArrow?: boolean;
	side?: 'top' | 'bottom' | 'left' | 'right';
	/** @deprecated Base UI uses different focus management */
	onOpenAutoFocus?: (e: Event) => void;
	/** @deprecated Base UI uses different focus management */
	onCloseAutoFocus?: (e: Event) => void;
	/** @deprecated Use onOpenChange on Root instead */
	onFocusOutside?: (e: Event) => void;
	/** @deprecated Use onOpenChange on Root instead */
	onEscapeKeyDown?: () => void;
};

function PopoverContent({
	className,
	align = 'center',
	sideOffset = 4,
	showArrow = false,
	side = 'bottom',
	children,
	onOpenAutoFocus: _onOpenAutoFocus,
	onCloseAutoFocus: _onCloseAutoFocus,
	onFocusOutside: _onFocusOutside,
	onEscapeKeyDown: _onEscapeKeyDown,
	...props
}: PopoverContentProps) {
	const { container, zIndexClass } = useFloatingOverlayPortalProps();

	return (
		<PopoverPrimitive.Portal container={container}>
			<PopoverPrimitive.Positioner
				side={side}
				align={align}
				sideOffset={sideOffset}
				className={zIndexClass}
			>
				<PopoverPrimitive.Popup
					data-slot="popover-content"
					className={cn(
						`bg-popover text-popover-foreground origin-(--transform-origin) w-72 rounded-md border p-4 shadow-md outline-hidden
						transition-[scale,opacity,translate] duration-150 ease-out data-starting-style:scale-95
						data-ending-style:scale-95 data-starting-style:opacity-0 data-ending-style:opacity-0
						data-[side=bottom]:data-starting-style:-translate-y-2
						data-[side=left]:data-starting-style:translate-x-2
						data-[side=right]:data-starting-style:-translate-x-2
						data-[side=top]:data-starting-style:translate-y-2 motion-reduce:transition-none`,
						className,
					)}
					{...props}
				>
					{children}
					{showArrow && (
						<PopoverPrimitive.Arrow className='fill-popover -my-px drop-shadow-[0_1px_0_var(--border)]' />
					)}
				</PopoverPrimitive.Popup>
			</PopoverPrimitive.Positioner>
		</PopoverPrimitive.Portal>
	);
}

/**
 * PopoverAnchor - placeholder for positioning anchor.
 * @deprecated Base UI Popover positions relative to Trigger by default.
 * For custom anchoring, use Popover.Positioner with anchor prop.
 */
function PopoverAnchor({ ...props }: React.HTMLAttributes<HTMLDivElement>) {
	return <div data-slot="popover-anchor" {...props} />;
}

function PopoverTitle({ className, ...props }: React.ComponentProps<typeof PopoverPrimitive.Title>) {
	return (
		<PopoverPrimitive.Title
			data-slot="popover-title"
			className={cn('font-medium leading-none', className)}
			{...props}
		/>
	);
}

function PopoverDescription({ className, ...props }: React.ComponentProps<typeof PopoverPrimitive.Description>) {
	return (
		<PopoverPrimitive.Description
			data-slot="popover-description"
			className={cn('text-muted-foreground text-sm', className)}
			{...props}
		/>
	);
}

export {
	Popover,
	PopoverAnchor,
	PopoverClose,
	PopoverContent,
	PopoverDescription,
	PopoverTitle,
	PopoverTrigger,
};

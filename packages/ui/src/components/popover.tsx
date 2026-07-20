'use client';

import * as React from 'react';
import { Popover as PopoverPrimitive } from '@base-ui/react/popover';

import { useFloatingOverlayPortalProps } from './portal';
import { mergePropsWithRef } from '../lib/slot';
import { cn } from '../lib/utils';

function Popover({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Root>) {
	return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

type PopoverTriggerProps = Omit<React.ComponentProps<typeof PopoverPrimitive.Trigger>, 'render' | 'nativeButton'> & {
	/** When true, merges props onto the child element instead of rendering a button */
	asChild?: boolean;
	/** Whether the child renders a native button. Defaults to true when asChild is used. */
	nativeButton?: boolean;
};

function PopoverTrigger({ asChild, nativeButton, children, ...props }: PopoverTriggerProps) {
	if (asChild && React.isValidElement(children)) {
		return (
			<PopoverPrimitive.Trigger
				data-slot="popover-trigger"
				nativeButton={nativeButton ?? true}
				{...props}
			render={(triggerProps) => {
				const { nativeButton: _, ...rest } = triggerProps as Record<string, unknown>;
				return React.cloneElement(
					children as React.ReactElement<Record<string, unknown>>,
					mergePropsWithRef(rest, children as React.ReactElement),
				);
			}}
			/>
		);
	}
	return (
		<PopoverPrimitive.Trigger data-slot="popover-trigger" nativeButton={nativeButton} {...props}>
			{children}
		</PopoverPrimitive.Trigger>
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

export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger };

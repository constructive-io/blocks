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
						`bg-popover text-popover-foreground data-[open]:animate-in data-[closed]:animate-out
						data-[closed]:fade-out-0 data-[open]:fade-in-0 data-[closed]:zoom-out-95
						data-[open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2
						data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 w-72 rounded-md border p-4
						shadow-md outline-hidden`,
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

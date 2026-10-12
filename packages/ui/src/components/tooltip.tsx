'use client';

import * as React from 'react';
import { Tooltip as TooltipPrimitive } from '@base-ui/react/tooltip';

import { useFloatingOverlayPortalProps } from '@constructive-io/ui/portal';
import { cn } from '../lib/utils';

type TooltipProviderProps = React.ComponentProps<typeof TooltipPrimitive.Provider> & {
	/** @deprecated Use delay instead */
	delayDuration?: number;
};

function TooltipProvider({ delay = 600, delayDuration, ...props }: TooltipProviderProps) {
	return <TooltipPrimitive.Provider data-slot="tooltip-provider" delay={delayDuration ?? delay} {...props} />;
}

type TooltipProps = React.ComponentProps<typeof TooltipPrimitive.Root> & {
	/** @deprecated Use delay on Trigger instead */
	delayDuration?: number;
};

function Tooltip({ delayDuration: _delayDuration, ...props }: TooltipProps) {
	return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

type TooltipTriggerProps = React.ComponentProps<typeof TooltipPrimitive.Trigger> & {
	delay?: number;
	/** When true, merges props onto the child element instead of rendering a button */
	asChild?: boolean;
};

/**
 * Read by Button. A natively disabled button gets no pointer or focus events, so a tooltip explaining why it is
 * disabled would never open. Marked, the button stays the same element in the same place, hoverable and focusable,
 * and is disabled with `aria-disabled` instead. Keep the name in step with button.tsx.
 */
const FOCUSABLE_WHEN_DISABLED = 'data-focusable-when-disabled';

function keepFocusableWhenDisabled(element: React.ReactElement) {
	// A DOM element ignores the attribute and stays natively disabled; only components that read it change.
	if (typeof element.type === 'string' || !(element.props as { disabled?: boolean }).disabled) return element;
	return React.cloneElement(element, { [FOCUSABLE_WHEN_DISABLED]: '' } as Record<string, string>);
}

function TooltipTrigger({ delay = 600, asChild, children, render, ...props }: TooltipTriggerProps) {
	// A trigger with its own `disabled` shows no tooltip, so there is nothing for a focusable button to open.
	const focusable = (element: React.ReactElement) => (props.disabled ? element : keepFocusableWhenDisabled(element));
	const childRender = render === undefined && asChild && React.isValidElement(children) ? focusable(children) : undefined;

	return (
		<TooltipPrimitive.Trigger
			data-slot="tooltip-trigger"
			delay={delay}
			render={React.isValidElement(render) ? focusable(render) : (render ?? childRender)}
			{...props}
		>
			{childRender ? undefined : children}
		</TooltipPrimitive.Trigger>
	);
}

type TooltipContentProps = React.ComponentProps<typeof TooltipPrimitive.Popup> & {
	sideOffset?: number;
	showArrow?: boolean;
	side?: 'top' | 'bottom' | 'left' | 'right';
	align?: 'start' | 'center' | 'end';
};

function TooltipContent({
	className,
	sideOffset = 4,
	showArrow = false,
	side = 'top',
	align = 'center',
	children,
	...props
}: TooltipContentProps) {
	const { container, zIndexClass } = useFloatingOverlayPortalProps();

	// Nothing to say: render no bubble rather than an empty 18x10 box.
	const hasContent = React.Children.toArray(children).some((child) =>
		typeof child === 'string' ? child.trim() !== '' : true,
	);
	if (!hasContent) return null;

	return (
		<TooltipPrimitive.Portal container={container}>
			<TooltipPrimitive.Positioner side={side} align={align} sideOffset={sideOffset} className={zIndexClass}>
				<TooltipPrimitive.Popup
					data-slot="tooltip-content"
					className={cn(
						`bg-popover text-popover-foreground origin-(--transform-origin) relative max-w-70 rounded-md border px-2 py-1 shadow-lg
						text-xs [overflow-wrap:anywhere] transition-[scale,opacity,translate] duration-(--duration-moderate) ease-out data-starting-style:scale-95
						data-ending-style:scale-95 data-starting-style:opacity-0 data-ending-style:opacity-0
						data-[side=bottom]:data-starting-style:-translate-y-2
						data-[side=left]:data-starting-style:translate-x-2
						data-[side=right]:data-starting-style:-translate-x-2
						data-[side=top]:data-starting-style:translate-y-2 motion-reduce:transition-none`,
						className,
					)}
					{...props}
					role="tooltip"
				>
					{children}
					{showArrow && (
						<TooltipPrimitive.Arrow className='fill-popover -my-px drop-shadow-[0_1px_0_hsl(var(--border))]' />
					)}
				</TooltipPrimitive.Popup>
			</TooltipPrimitive.Positioner>
		</TooltipPrimitive.Portal>
	);
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };

'use client';

import * as React from 'react';
import { Switch as SwitchPrimitive } from '@base-ui/react/switch';

import { cn } from '../lib/utils';

type SwitchProps = React.ComponentProps<typeof SwitchPrimitive.Root>;

function Switch({ className, ...props }: SwitchProps) {
	return (
		<SwitchPrimitive.Root
			data-slot="switch"
			className={cn(
				// The box is the track itself (so a top-aligned switch lines up with the first label line); the 44x40
				// touch target is the `after` pseudo-element, the way Checkbox and Radio do it with `before`.
				`peer relative inline-flex h-[1.15rem] w-8 shrink-0 items-center outline-none
					after:absolute after:-inset-x-1.5 after:-inset-y-[0.675rem] after:content-[''] pointer-coarse:after:-inset-y-[0.8rem]
					before:pointer-events-none before:absolute before:inset-0 before:rounded-full before:border
					before:border-transparent before:bg-input before:shadow-xs before:transition-[background-color,box-shadow]
					data-[checked]:before:bg-primary dark:data-[unchecked]:before:bg-input/80
					focus-visible:before:border-ring focus-visible:before:ring-[3px] focus-visible:before:ring-ring/50
					transition-transform duration-(--duration-moderate) ease-out motion-safe:active:not-data-disabled:scale-[0.96]
					motion-reduce:transition-none data-[disabled]:cursor-not-allowed data-[disabled]:opacity-64`,
				className,
			)}
			{...props}
		>
			<SwitchPrimitive.Thumb
				data-slot="switch-thumb"
				className={cn(
					`bg-background dark:data-[unchecked]:bg-foreground dark:data-[checked]:bg-primary-foreground
					pointer-events-none absolute left-[calc(50%-1rem)] top-1/2 block size-4 -translate-y-1/2 rounded-full ring-0 transition-transform
					data-[checked]:translate-x-[calc(100%-2px)] data-[unchecked]:translate-x-0`,
				)}
			/>
		</SwitchPrimitive.Root>
	);
}

export { Switch };
export type { SwitchProps };

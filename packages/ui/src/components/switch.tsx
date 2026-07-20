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
				`peer relative inline-flex h-10 w-11 shrink-0 items-center justify-center outline-none
					before:pointer-events-none before:absolute before:left-1/2 before:top-1/2 before:h-[1.15rem]
					before:w-8 before:-translate-x-1/2 before:-translate-y-1/2 before:rounded-full before:border
					before:border-transparent before:bg-input before:shadow-xs before:transition-[background-color,box-shadow]
					data-[checked]:before:bg-primary dark:data-[unchecked]:before:bg-input/80
					focus-visible:before:border-ring focus-visible:before:ring-[3px] focus-visible:before:ring-ring/50
					transition-transform duration-150 ease-out motion-safe:active:not-data-disabled:scale-[0.96]
					motion-reduce:transition-none pointer-coarse:h-11 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50`,
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

'use client';

import { Radio as RadioPrimitive } from '@base-ui/react/radio';
import { RadioGroup as RadioGroupPrimitive } from '@base-ui/react/radio-group';

import { cn } from '../lib/utils';

type RadioGroupProps = RadioGroupPrimitive.Props;
type RadioProps = RadioPrimitive.Root.Props;

function RadioGroup({ className, ...props }: RadioGroupProps) {
	return (
		<RadioGroupPrimitive className={cn('flex flex-col gap-3', className)} data-slot="radio-group" {...props} />
	);
}

function Radio({ className, ...props }: RadioProps) {
	return (
		<RadioPrimitive.Root
			className={cn(
				'relative inline-flex size-10 shrink-0 items-center justify-center outline-none transition-transform duration-150 ease-out motion-safe:active:not-data-disabled:scale-[0.96] motion-reduce:transition-none pointer-coarse:size-11 data-disabled:cursor-not-allowed data-disabled:opacity-64 aria-invalid:[&_[data-slot=radio-control]]:border-destructive/36 focus-visible:[&_[data-slot=radio-control]]:ring-2 focus-visible:[&_[data-slot=radio-control]]:ring-ring focus-visible:[&_[data-slot=radio-control]]:ring-offset-1 focus-visible:[&_[data-slot=radio-control]]:ring-offset-background focus-visible:aria-invalid:[&_[data-slot=radio-control]]:border-destructive/64 focus-visible:aria-invalid:[&_[data-slot=radio-control]]:ring-destructive/48 dark:aria-invalid:[&_[data-slot=radio-control]]:ring-destructive/24',
				className,
			)}
			data-slot="radio"
			{...props}
		>
			<span
				aria-hidden="true"
				className="pointer-events-none absolute size-4.5 rounded-full border border-input bg-background bg-clip-padding shadow-xs sm:size-4 dark:bg-input/32 dark:bg-clip-border"
				data-slot="radio-control"
			/>
			<RadioPrimitive.Indicator
				keepMounted
				className="absolute flex size-4.5 items-center justify-center rounded-full transition-[opacity,scale,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)] before:size-2 before:rounded-full before:bg-primary-foreground data-unchecked:scale-[0.25] data-unchecked:opacity-0 data-unchecked:blur-[4px] data-checked:bg-primary motion-reduce:transition-none sm:size-4 sm:before:size-1.5"
				data-slot="radio-indicator"
			/>
		</RadioPrimitive.Root>
	);
}

export { RadioGroup, Radio, Radio as RadioGroupItem };
export type { RadioGroupProps, RadioProps };

'use client';

import * as React from 'react';
import { Slider as SliderPrimitive } from '@base-ui/react/slider';

import { cn } from '../lib/utils';

type SliderProps = React.ComponentProps<typeof SliderPrimitive.Root>;

function Slider({
	className,
	defaultValue,
	value,
	min = 0,
	max = 100,
	'aria-label': ariaLabel,
	...props
}: SliderProps) {
	const thumbCount = Array.isArray(value)
		? value.length
		: Array.isArray(defaultValue)
			? defaultValue.length
			: 1;
	// Base UI doesn't forward Root `aria-label` to the thumb inputs — route it
	// through `getAriaLabel` so each input gets an accessible name.
	const getAriaLabel = ariaLabel
		? (index: number) => (thumbCount > 1 ? `${ariaLabel} ${index + 1}` : ariaLabel)
		: undefined;

	return (
		<SliderPrimitive.Root
			data-slot="slider"
			className={cn(
				'data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full',
				className,
			)}
			defaultValue={defaultValue}
			value={value}
			min={min}
			max={max}
			thumbAlignment="edge"
			{...props}
		>
			<SliderPrimitive.Control
				className={cn(
					'relative flex w-full touch-none items-center select-none',
					'data-[orientation=vertical]:h-full data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col',
					'data-[disabled]:opacity-64',
				)}
			>
				<SliderPrimitive.Track
					data-slot="slider-track"
					className={cn(
						'relative grow overflow-hidden rounded-full bg-muted select-none',
						'data-[orientation=horizontal]:h-1.5 data-[orientation=vertical]:w-1.5',
					)}
				>
					<SliderPrimitive.Indicator
						data-slot="slider-indicator"
						className={cn(
							'bg-primary select-none',
							'data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full',
						)}
					/>
				</SliderPrimitive.Track>
				{Array.from({ length: thumbCount }, (_, index) => (
					<SliderPrimitive.Thumb
						key={index}
						index={index}
						getAriaLabel={getAriaLabel}
						data-slot="slider-thumb"
						className={cn(
							'block size-4 shrink-0 rounded-full border border-primary bg-background shadow-xs outline-none select-none',
							'transition-[box-shadow,scale] duration-(--duration-fast) ease-out motion-reduce:transition-none',
							'hover:ring-[3px] hover:ring-ring/35',
							'focus-visible:ring-[3px] focus-visible:ring-ring/50',
							'data-[dragging]:scale-110 data-[dragging]:ring-[3px] data-[dragging]:ring-ring/35',
							'data-[disabled]:pointer-events-none',
						)}
					/>
				))}
			</SliderPrimitive.Control>
		</SliderPrimitive.Root>
	);
}

export { Slider };
export type { SliderProps };

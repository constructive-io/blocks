'use client';

import * as React from 'react';
import { Checkbox as CheckboxPrimitive } from '@base-ui/react/checkbox';

import { cn } from '../lib/utils';

type CheckboxProps = CheckboxPrimitive.Root.Props;

const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(({ className, ...props }, ref) => {
	return (
		<CheckboxPrimitive.Root
			ref={ref}
			className={cn(
				'relative inline-flex size-10 shrink-0 items-center justify-center outline-none transition-transform duration-150 ease-out motion-safe:active:not-data-disabled:scale-[0.96] motion-reduce:transition-none pointer-coarse:size-11 data-disabled:cursor-not-allowed data-disabled:opacity-64 aria-invalid:[&_[data-slot=checkbox-control]]:border-destructive/36 focus-visible:[&_[data-slot=checkbox-control]]:ring-2 focus-visible:[&_[data-slot=checkbox-control]]:ring-ring focus-visible:[&_[data-slot=checkbox-control]]:ring-offset-1 focus-visible:[&_[data-slot=checkbox-control]]:ring-offset-background focus-visible:aria-invalid:[&_[data-slot=checkbox-control]]:border-destructive/64 focus-visible:aria-invalid:[&_[data-slot=checkbox-control]]:ring-destructive/48 dark:aria-invalid:[&_[data-slot=checkbox-control]]:ring-destructive/24',
				className,
			)}
			data-slot="checkbox"
			{...props}
		>
			<span
				aria-hidden="true"
				className="pointer-events-none absolute size-4.5 rounded-[4px] border border-input bg-background bg-clip-padding shadow-[0_1px_--theme(--color-black/4%)] sm:size-4 dark:bg-input/32 dark:bg-clip-border dark:shadow-[0_-1px_--theme(--color-white/8%)]"
				data-slot="checkbox-control"
			/>
			<CheckboxPrimitive.Indicator
				keepMounted
				className="absolute flex size-4.5 items-center justify-center rounded-[4px] text-primary-foreground transition-[opacity,scale,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)] data-unchecked:scale-[0.25] data-unchecked:opacity-0 data-unchecked:blur-[4px] data-checked:bg-primary data-indeterminate:text-foreground motion-reduce:transition-none sm:size-4"
				data-slot="checkbox-indicator"
				render={(props, state) => (
					<span {...props}>
						<span
							className={cn(
								'absolute inset-0 flex items-center justify-center transition-[opacity,scale,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none',
								state.indeterminate
									? 'scale-100 opacity-100 blur-0'
									: 'scale-[0.25] opacity-0 blur-[4px]',
							)}
						>
							<svg
								className="size-3.5 sm:size-3"
								fill="none"
								height="24"
								stroke="currentColor"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="3"
								viewBox="0 0 24 24"
								width="24"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path d="M5.252 12h13.496" />
							</svg>
						</span>
						<span
							className={cn(
								'absolute inset-0 flex items-center justify-center transition-[opacity,scale,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none',
								state.indeterminate
									? 'scale-[0.25] opacity-0 blur-[4px]'
									: 'scale-100 opacity-100 blur-0',
							)}
						>
							<svg
								className="size-3.5 sm:size-3"
								fill="none"
								height="24"
								stroke="currentColor"
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth="3"
								viewBox="0 0 24 24"
								width="24"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path d="M5.252 12.7 10.2 18.63 18.748 5.37" />
							</svg>
						</span>
					</span>
				)}
			/>
		</CheckboxPrimitive.Root>
	);
});
Checkbox.displayName = 'Checkbox';

export { Checkbox };
export type { CheckboxProps };

'use client';

import * as React from 'react';
import { Toggle as TogglePrimitive } from '@base-ui/react/toggle';
import { ToggleGroup as ToggleGroupPrimitive } from '@base-ui/react/toggle-group';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '../lib/utils';
import { FluidHighlight } from '../lib/motion/fluid-highlight';
import { toggleVariants } from './toggle';

const ToggleGroupContext = React.createContext<{
	variant: VariantProps<typeof toggleVariants>['variant'];
	size: VariantProps<typeof toggleVariants>['size'];
	spacing: number;
	multiple: boolean;
}>({ variant: 'default', size: 'default', spacing: 0, multiple: false });

/**
 * Toggle group. `spacing={0}` (default) renders an attached group — items share
 * borders and only the outer corners keep the radius. `spacing>0` gaps the
 * items so each keeps full rounding. Single-select mode slides a
 * `FluidHighlight` pill under the pressed item; in `multiple` each item paints
 * its own accent fill.
 */
function ToggleGroup({
	className,
	variant = 'default',
	size = 'default',
	spacing = 0,
	multiple = false,
	children,
	...props
}: React.ComponentProps<typeof ToggleGroupPrimitive> & {
	variant?: VariantProps<typeof toggleVariants>['variant'];
	size?: VariantProps<typeof toggleVariants>['size'];
	spacing?: number;
}) {
	return (
		<ToggleGroupContext.Provider value={{ variant, size, spacing, multiple }}>
			<ToggleGroupPrimitive
				data-slot="toggle-group"
				data-variant={variant}
				data-size={size}
				data-spacing={spacing}
				data-multiple={multiple || undefined}
				multiple={multiple}
				className={cn(
					'group/toggle-group relative inline-flex items-center outline-none',
					'data-[orientation=vertical]:flex-col',
					spacing > 0 && 'data-[orientation=horizontal]:gap-1 data-[orientation=vertical]:gap-1',
					className,
				)}
				{...props}
			>
				{multiple ? null : spacing === 0 ? (
					<FluidHighlight inset={2} className="rounded-sm" />
				) : (
					<FluidHighlight className="rounded-md" />
				)}
				{children}
			</ToggleGroupPrimitive>
		</ToggleGroupContext.Provider>
	);
}

function ToggleGroupItem({
	className,
	variant,
	size,
	...props
}: React.ComponentProps<typeof TogglePrimitive> & {
	variant?: VariantProps<typeof toggleVariants>['variant'];
	size?: VariantProps<typeof toggleVariants>['size'];
}) {
	const context = React.useContext(ToggleGroupContext);
	return (
		<TogglePrimitive
			data-slot="toggle-group-item"
			className={cn(
				toggleVariants({
					variant: variant ?? context.variant,
					size: size ?? context.size,
				}),
				'relative shrink-0',
				// Attached group (spacing 0): collapse shared borders, square the
				// inner corners, keep the outer radius on the first/last item.
				'group-data-[spacing=0]/toggle-group:rounded-none',
				'group-data-[spacing=0]/toggle-group:data-[orientation=horizontal]:-ml-px',
				'group-data-[spacing=0]/toggle-group:data-[orientation=horizontal]:first:ml-0 group-data-[spacing=0]/toggle-group:data-[orientation=horizontal]:first:rounded-l-md group-data-[spacing=0]/toggle-group:data-[orientation=horizontal]:last:rounded-r-md',
				'group-data-[spacing=0]/toggle-group:data-[orientation=vertical]:-mt-px',
				'group-data-[spacing=0]/toggle-group:data-[orientation=vertical]:first:mt-0 group-data-[spacing=0]/toggle-group:data-[orientation=vertical]:first:rounded-t-md group-data-[spacing=0]/toggle-group:data-[orientation=vertical]:last:rounded-b-md',
				'focus-visible:z-10',
				// In single-select the FluidHighlight pill supplies the fill; in
				// multiple each item paints its own pressed background.
				'group-data-[multiple]/toggle-group:data-[pressed]:bg-accent',
				className,
			)}
			{...props}
		/>
	);
}

export { ToggleGroup, ToggleGroupItem };
export type ToggleGroupProps = React.ComponentProps<typeof ToggleGroupPrimitive>;
export type ToggleGroupItemProps = React.ComponentProps<typeof TogglePrimitive>;

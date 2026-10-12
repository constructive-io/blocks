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
					// `max-w-full flex-wrap`: a long row of labels wraps inside its container instead of widening the page.
					'group/toggle-group relative inline-flex max-w-full flex-wrap items-center outline-none',
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

// A run of only whitespace never becomes a flex item in a browser, so it is dropped rather than wrapped (an empty span would add a gap).
const BLANK = /^[ \t\n\f\r]*$/;

/**
 * Wraps each contiguous run of text (strings and numbers) in ONE truncating element and leaves elements alone, so a
 * label longer than the container ends in an ellipsis. A run is wrapped once, not per child: `Likes {count}` is a
 * single flex item, where one item per child would open a gap between them. Same rule as Badge.
 */
function truncatable(children: React.ReactNode) {
	const out: React.ReactNode[] = [];
	let run = '';
	const flush = () => {
		if (!BLANK.test(run)) {
			out.push(
				<span key={`text-${out.length}`} className='min-w-0 truncate' dir='auto'>
					{run}
				</span>,
			);
		}
		run = '';
	};
	for (const child of React.Children.toArray(children)) {
		if (typeof child === 'string' || typeof child === 'number') {
			run += child;
		} else {
			flush();
			out.push(child);
		}
	}
	flush();
	return out;
}

function ToggleGroupItem({
	className,
	variant,
	size,
	children,
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
				// The orientation lives on the group root, not on the items, so these read it from the group. The sliding
				// highlight is the group's first child, which is why the ends are `*-of-type` (the items), not `first`/`last`.
				'group-data-[spacing=0]/toggle-group:rounded-none',
				'group-data-[spacing=0]/toggle-group:group-data-[orientation=horizontal]/toggle-group:-ms-px',
				'group-data-[spacing=0]/toggle-group:group-data-[orientation=horizontal]/toggle-group:first-of-type:ms-0 group-data-[spacing=0]/toggle-group:group-data-[orientation=horizontal]/toggle-group:first-of-type:rounded-s-md group-data-[spacing=0]/toggle-group:group-data-[orientation=horizontal]/toggle-group:last-of-type:rounded-e-md',
				'group-data-[spacing=0]/toggle-group:group-data-[orientation=vertical]/toggle-group:-mt-px',
				'group-data-[spacing=0]/toggle-group:group-data-[orientation=vertical]/toggle-group:first-of-type:mt-0 group-data-[spacing=0]/toggle-group:group-data-[orientation=vertical]/toggle-group:first-of-type:rounded-t-md group-data-[spacing=0]/toggle-group:group-data-[orientation=vertical]/toggle-group:last-of-type:rounded-b-md',
				'focus-visible:z-10',
				// In single-select the FluidHighlight pill supplies the fill; in
				// multiple each item paints its own pressed background.
				'group-data-[multiple]/toggle-group:data-[pressed]:bg-accent',
				className,
			)}
			{...props}
		>
			{truncatable(children)}
		</TogglePrimitive>
	);
}

export { ToggleGroup, ToggleGroupItem };
export type ToggleGroupProps = React.ComponentProps<typeof ToggleGroupPrimitive>;
export type ToggleGroupItemProps = React.ComponentProps<typeof TogglePrimitive>;

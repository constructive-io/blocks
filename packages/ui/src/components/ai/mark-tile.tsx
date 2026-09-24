import * as React from 'react';

import { cn } from '../../lib/utils';

type MarkTileProps = React.ComponentProps<'span'> & {
	/** 16px (trace rows), 24px (lists), or 32px (prompts and dialogs). */
	size?: 'xs' | 'sm' | 'md';
};

const SIZE = {
	xs: 'size-4 rounded-[5px] text-[9px] [&_svg:not([class*=size-])]:size-2.5',
	sm: 'size-6 rounded-md text-[11px] [&_svg:not([class*=size-])]:size-3.5',
	md: 'size-8 rounded-lg text-sm [&_svg:not([class*=size-])]:size-4',
} as const;

/**
 * Square tile that frames an app mark or glyph. The edge is an inset outline
 * rather than a border, so pale marks keep a shape on any surface without the
 * tile growing.
 */
function MarkTile({ size = 'xs', className, children, ...props }: MarkTileProps) {
	return (
		<span
			aria-hidden="true"
			data-slot="mark-tile"
			className={cn(
				'grid shrink-0 place-items-center overflow-hidden bg-card leading-none text-muted-foreground',
				'outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10',
				SIZE[size],
				className,
			)}
			{...props}
		>
			{children}
		</span>
	);
}

/**
 * Enter treatment for icons that appear on a state change (a check replacing a
 * spinner, a settled chip). Uses `@starting-style` so it needs no keyframes.
 */
const iconEnterClass =
	'transition-[opacity,scale,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)] starting:scale-25 starting:opacity-0 starting:blur-[4px] motion-reduce:transition-none';

export { MarkTile, iconEnterClass };
export type { MarkTileProps };

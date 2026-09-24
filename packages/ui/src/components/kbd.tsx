import * as React from 'react';

import { cn } from '../lib/utils';

type KbdProps = React.ComponentProps<'kbd'>;

/**
 * Keycap for a single key. Its fill, edge, and bottom lip are mixed from the
 * inherited text color instead of a fixed surface token, so the key always
 * sits one step off whatever it is placed on: a card, a muted row, a tinted
 * tray, a tooltip, or a primary button. Set the parent's text color (or
 * `className="text-…"`) to change its tone.
 */
function Kbd({ className, ...props }: KbdProps) {
	return (
		<kbd
			data-slot="kbd"
			className={cn(
				'pointer-events-none inline-flex h-5 min-w-5 select-none items-center justify-center gap-0.5 rounded-[5px] px-1 align-middle font-sans text-[11px] font-medium leading-none tabular-nums [&_svg]:size-3',
				'bg-[color-mix(in_oklab,currentColor_9%,transparent)]',
				'shadow-[inset_0_0_0_1px_color-mix(in_oklab,currentColor_16%,transparent),inset_0_-1px_0_color-mix(in_oklab,currentColor_18%,transparent)]',
				className,
			)}
			{...props}
		/>
	);
}

type KbdGroupProps = React.ComponentProps<'kbd'>;

function KbdGroup({ className, ...props }: KbdGroupProps) {
	return (
		<kbd
			data-slot="kbd-group"
			className={cn('inline-flex items-center gap-1 align-middle', className)}
			{...props}
		/>
	);
}

export { Kbd, KbdGroup };
export type { KbdProps, KbdGroupProps };

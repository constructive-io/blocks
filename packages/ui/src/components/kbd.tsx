import * as React from 'react';

import { cn } from '../lib/utils';

type KbdProps = React.ComponentProps<'kbd'>;

function Kbd({ className, ...props }: KbdProps) {
	return (
		<kbd
			data-slot="kbd"
			className={cn(
				'pointer-events-none inline-flex h-5 min-w-5 select-none items-center justify-center rounded-sm bg-muted px-1 font-sans text-[11px] font-medium text-muted-foreground [&_svg]:size-3',
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
			className={cn('inline-flex items-center gap-1', className)}
			{...props}
		/>
	);
}

export { Kbd, KbdGroup };
export type { KbdProps, KbdGroupProps };

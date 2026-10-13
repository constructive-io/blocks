'use client';

import * as React from 'react';
import { Separator as SeparatorPrimitive } from '@base-ui/react/separator';

import { cn } from '../lib/utils';

type SeparatorProps = React.ComponentProps<typeof SeparatorPrimitive> & {
	/** @deprecated Base UI handles accessibility automatically */
	decorative?: boolean;
};

function Separator({ className, orientation = 'horizontal', decorative: _decorative, ...props }: SeparatorProps) {
	return (
		<SeparatorPrimitive
			data-slot="separator-root"
			orientation={orientation}
			className={cn(
				'bg-border shrink-0',
				// A vertical rule fills its parent's height; `min-h-4` keeps it visible when the parent has no height of
				// its own (otherwise it is 0px tall). It does not set `align-self`: with a height of its own (`h-4`) a
				// stretching rule would sit at the top of an `items-center` row instead of being centred by it.
				orientation === 'horizontal' ? 'h-px w-full' : 'h-full min-h-4 w-px',
				className,
			)}
			{...props}
		/>
	);
}

export { Separator };
export type { SeparatorProps };

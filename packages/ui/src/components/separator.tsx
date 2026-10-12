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
				// A vertical rule fills its parent's height and stretches in a flex row; `min-h-4` keeps it
				// visible when the parent has no height of its own (otherwise it is 0px tall).
				orientation === 'horizontal' ? 'h-px w-full' : 'h-full min-h-4 w-px self-stretch',
				className,
			)}
			{...props}
		/>
	);
}

export { Separator };
export type { SeparatorProps };

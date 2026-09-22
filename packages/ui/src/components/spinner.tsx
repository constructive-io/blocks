import * as React from 'react';
import { LoaderCircle } from 'lucide-react';

import { cn } from '../lib/utils';

type SpinnerProps = React.ComponentProps<'svg'>;

function Spinner({ className, ...props }: SpinnerProps) {
	return (
		<LoaderCircle
			data-slot="spinner"
			role="status"
			aria-label="Loading"
			className={cn('size-4 animate-spin motion-reduce:animate-pulse', className)}
			{...props}
		/>
	);
}

export { Spinner };
export type { SpinnerProps };

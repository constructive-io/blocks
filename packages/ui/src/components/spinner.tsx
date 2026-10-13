import * as React from 'react';
import { LoaderCircle } from 'lucide-react';

import { cn } from '../lib/utils';

type SpinnerProps = React.ComponentProps<'svg'> & {
	/** Accessible name announced for the loading state. Defaults to "Loading". */
	label?: string;
	/**
	 * Hides the spinner from assistive tech. Use it when text next to it already says what
	 * is loading (a "Saving…" button), so a page of spinners is not a page of identical
	 * "Loading" announcements.
	 */
	decorative?: boolean;
};

function Spinner({ className, label = 'Loading', decorative = false, ...props }: SpinnerProps) {
	return (
		<LoaderCircle
			data-slot="spinner"
			{...(decorative ? { 'aria-hidden': true } : { role: 'status', 'aria-label': label })}
			className={cn('size-4 animate-spin motion-reduce:animate-pulse', className)}
			{...props}
		/>
	);
}

export { Spinner };
export type { SpinnerProps };

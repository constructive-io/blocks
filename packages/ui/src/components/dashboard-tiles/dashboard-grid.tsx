import * as React from 'react';

import { cn } from '../../lib/utils';

/**
 * The dashboard's layout: two tiles across on a phone or narrow pane, four
 * from a 48rem container. Count tiles take one cell; `RecentRecords` takes two.
 * Sized by its own width, so it works in a split pane as well as a page.
 */
export function DashboardGrid({ className, children, ...props }: React.ComponentProps<'div'>) {
	return (
		<div className="@container/dashboard w-full">
			{/* Items keep their own height, so a count tile beside a tall list does not stretch to match it. */}
			<div className={cn('grid grid-cols-1 items-start gap-3 @xs/dashboard:grid-cols-2 @3xl/dashboard:grid-cols-4', className)} {...props}>
				{children}
			</div>
		</div>
	);
}

'use client';

import * as React from 'react';

import { cn } from '../../lib/utils';
import { Alert, AlertDescription, AlertTitle } from '../alert';

type SystemMessageProps = React.ComponentProps<typeof Alert> & {
	title?: React.ReactNode;
};

/**
 * Banner-style notice for app-injected transcript messages (errors, hints).
 * Not an assistant reply — keep it visually distinct via Alert variants.
 */
function SystemMessage({
	className,
	title,
	variant = 'info',
	children,
	...props
}: SystemMessageProps) {
	return (
		<Alert
			data-slot="system-message"
			variant={variant}
			className={cn('text-left', className)}
			{...props}
		>
			{title ? <AlertTitle>{title}</AlertTitle> : null}
			{children ? <AlertDescription>{children}</AlertDescription> : null}
		</Alert>
	);
}

export { SystemMessage };
export type { SystemMessageProps };

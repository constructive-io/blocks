import { ReactNode } from 'react';

interface PageHeaderProps {
	/** Page title */
	title: string;
	/** Optional description */
	description?: string;
	/** Optional actions to display on the right */
	actions?: ReactNode;
}

/**
 * Consistent page header component
 */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
	return (
		<div className='border-b bg-background px-6 py-5'>
			{/* `basis-60` is the title's floor: actions drop to their own right-aligned line
			    before the title is squeezed, and long unbroken titles wrap instead of
			    pushing the actions out. */}
			<div className='flex flex-wrap items-center justify-between gap-x-4 gap-y-3'>
				<div className='min-w-0 flex-1 basis-60'>
					{title ? <h1 className='text-xl font-semibold [overflow-wrap:anywhere]'>{title}</h1> : null}
					{description && (
						<p className='mt-1 text-sm text-muted-foreground [overflow-wrap:anywhere]'>{description}</p>
					)}
				</div>
				{actions && <div className='ms-auto flex max-w-full flex-wrap items-center justify-end gap-2'>{actions}</div>}
			</div>
		</div>
	);
}

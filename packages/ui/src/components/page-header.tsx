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
			<div className='flex items-center justify-between'>
				<div>
					<h1 className='text-xl font-semibold'>{title}</h1>
					{description && (
						<p className='mt-1 text-sm text-muted-foreground'>{description}</p>
					)}
				</div>
				{actions && <div className='flex items-center gap-2'>{actions}</div>}
			</div>
		</div>
	);
}

import { RiDatabase2Line } from '@remixicon/react';

/** Shown when the configured database has no schemas to display. */
export function NoDatabasesEmptyState() {
	return (
		<div className='flex h-full flex-1 flex-col items-center justify-center gap-3 text-center'>
			<div className='bg-muted flex h-12 w-12 items-center justify-center rounded-full'>
				<RiDatabase2Line className='text-muted-foreground h-6 w-6' />
			</div>
			<div>
				<p className='text-foreground text-sm font-medium'>No database schema found</p>
				<p className='text-muted-foreground text-xs'>This database has no tables yet.</p>
			</div>
		</div>
	);
}

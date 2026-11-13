// "No matching rows": overlays the empty body while a filter or a search narrows the rows
// to none, with a one-click clear back to the unfiltered set.
import { RiFilterOffLine, RiSearchEyeLine } from '@remixicon/react';

import { Button } from '@constructive-io/ui/button';

export interface SheetsFilteredEmptyProps {
	/** Filter conditions in the view. */
	activeFilterCount: number;
	/** A search narrows the rows. */
	searching: boolean;
	/** Clear the filters and the search. */
	onClear: () => void;
}

export function SheetsFilteredEmpty({ activeFilterCount, searching, onClear }: SheetsFilteredEmptyProps) {
	return (
		<div className='bg-background/80 absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center'>
			<RiSearchEyeLine className='text-muted-foreground h-8 w-8' />
			<div className='space-y-1'>
				<p className='text-foreground text-sm font-medium'>No matching rows</p>
				<p className='text-muted-foreground max-w-md text-sm'>
					{activeFilterCount === 0
						? 'No rows match the search.'
						: searching
							? 'No rows match the search and the active filters.'
							: `No rows match the active ${activeFilterCount === 1 ? 'filter' : 'filters'}.`}
				</p>
			</div>
			<Button variant='outline' size='sm' onClick={onClear}>
				<RiFilterOffLine className='h-4 w-4' />
				<span>{activeFilterCount === 0 ? 'Clear search' : searching ? 'Clear filters and search' : 'Clear filters'}</span>
			</Button>
		</div>
	);
}

// "Rows could not be loaded": overlays the empty body when the rows request fails after the
// table's model loaded. The toolbar stays above it, so a search or filter that the server
// refuses can be changed or cleared here; the server's own text stays under "Show details".
import { RiErrorWarningLine, RiFilterOffLine, RiRefreshLine } from '@remixicon/react';

import { Button } from '@constructive-io/ui/button';

export interface SheetsRowsErrorProps {
	error: unknown;
	/** Filter conditions in the view. */
	activeFilterCount: number;
	/** A search narrows the rows. */
	searching: boolean;
	/** Clear the filters and the search. */
	onClear: () => void;
	/** Request the rows again. */
	onRetry: () => void;
	/** A host's own content for the panel (`slots.error`); replaces the default panel. */
	children?: React.ReactNode;
}

function serverText(error: unknown): string | null {
	if (error instanceof Error) return error.message || null;
	return typeof error === 'string' && error ? error : null;
}

function summaryOf(activeFilterCount: number, searching: boolean): string {
	if (searching && activeFilterCount > 0) return 'The search and the filters could not be applied.';
	if (searching) return 'The search could not be applied.';
	if (activeFilterCount > 0) return `The ${activeFilterCount === 1 ? 'filter' : 'filters'} could not be applied.`;
	return 'The rows of this table could not be loaded.';
}

export function SheetsRowsError({ error, activeFilterCount, searching, onClear, onRetry, children }: SheetsRowsErrorProps) {
	const narrowed = searching || activeFilterCount > 0;
	const details = serverText(error);
	return (
		<div
			data-part-id='sheets-rows-error'
			className='bg-background/80 absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center'
		>
			{children ?? (
				<>
					<RiErrorWarningLine className='text-destructive h-8 w-8' aria-hidden='true' />
					<div className='space-y-1' role='alert'>
						<p className='text-foreground text-sm font-medium'>Rows could not be loaded</p>
						<p className='text-muted-foreground max-w-md text-sm'>{summaryOf(activeFilterCount, searching)}</p>
					</div>
					<div className='flex items-center gap-2'>
						{narrowed && (
							<Button variant='outline' size='sm' onClick={onClear}>
								<RiFilterOffLine className='h-4 w-4' aria-hidden='true' />
								<span>{activeFilterCount === 0 ? 'Clear search' : searching ? 'Clear filters and search' : 'Clear filters'}</span>
							</Button>
						)}
						<Button variant={narrowed ? 'ghost' : 'outline'} size='sm' onClick={onRetry}>
							<RiRefreshLine className='h-4 w-4' aria-hidden='true' />
							<span>Try again</span>
						</Button>
					</div>
					{details && (
						<details className='text-muted-foreground max-w-md text-xs'>
							<summary className='hover:text-foreground cursor-pointer select-none'>Show details</summary>
							<p className='mt-1 [overflow-wrap:anywhere]'>{details}</p>
						</details>
					)}
				</>
			)}
		</div>
	);
}

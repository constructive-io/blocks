// A table with no rows yet. The toolbar, the headers and the status bar stay (Import and New
// record are there), and this panel covers the empty body with the two ways to fill it.
import { RiAddLine, RiInboxLine } from '@remixicon/react';

import type { TableModel } from '@constructive-io/data';
import { Button } from '@constructive-io/ui/button';

import { ImportRecordsControl } from '../../import-export/import-records-control';

export interface SheetsEmptyOverlayProps {
	tableName: string;
	/** Why the table's records cannot be changed; it replaces "The table is empty." */
	readOnlyReason: string | null;
	/** Add a row; omit where rows cannot be added. */
	onAddRow?: () => void;
	/** The table to import into; omit where rows cannot be added. */
	importModel?: TableModel | null;
}

export function SheetsEmptyOverlay({ tableName, readOnlyReason, onAddRow, importModel }: SheetsEmptyOverlayProps) {
	return (
		<div
			data-part-id='sheets-empty'
			className='bg-background/80 absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center'
		>
			<RiInboxLine className='text-muted-foreground h-8 w-8' aria-hidden='true' />
			<div className='space-y-1'>
				<p className='text-foreground text-sm font-medium'>No rows yet</p>
				<p className='text-muted-foreground max-w-md text-sm'>{readOnlyReason ?? `The “${tableName}” table is empty.`}</p>
			</div>
			{(onAddRow || importModel) && (
				<div className='flex items-center gap-2'>
					{onAddRow && (
						<Button variant='outline' size='sm' onClick={onAddRow}>
							<RiAddLine className='h-4 w-4' aria-hidden='true' />
							<span>Add row</span>
						</Button>
					)}
					{importModel && <ImportRecordsControl model={importModel} tableLabel={tableName} />}
				</div>
			)}
		</div>
	);
}

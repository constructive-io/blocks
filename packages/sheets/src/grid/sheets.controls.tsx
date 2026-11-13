/**
 * The grid toolbar: search, add row, export, delete, and the sort and filter
 * popovers. Everything about filters, sort and search comes from the view
 * bindings (see `useSheetsView`), which only offer what the table model has.
 */
import { useMemo } from 'react';
import {
	RiAddLine,
	RiArrowUpDownLine,
	RiDeleteBin6Line,
	RiDownloadLine,
	RiFileAddLine,
	RiFilter3Line,
} from '@remixicon/react';

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from '@constructive-io/ui/alert-dialog';
import { Button } from '@constructive-io/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@constructive-io/ui/popover';

import type { SheetsSelection } from '../selection/selection-model';
import { cn } from '../utils/cn';
import { FieldsControl } from './columns/fields-control';
import { FilterBuilder } from './filters/filter-builder';
import { TOOLBAR_POPOVER } from './popup-classes';
import { SearchBox } from './search/search-box';
import { SortControl } from './sort/sort-control';
import { filterConditionsOf } from './view-state/view-state';
import type { SheetsViewBindings } from './view-state/use-sheets-view';
import type { SavedViewsBindings } from './views/use-saved-views';
import { ViewSwitcher } from './views/view-switcher';

export interface SheetsControlsProps {
	/** Filter, sort and search bindings. */
	view: SheetsViewBindings;
	/** Grid columns, in display order. */
	columnKeys: readonly string[];
	showSelection: boolean;
	gridSelection: SheetsSelection | null;
	setGridSelection: (selection: SheetsSelection | null) => void;
	deleteSelected: () => void;
	onAddRow?: () => void;
	/** Download the selected rows as CSV; offered only while rows are selected. */
	onExport?: () => void;
	canDelete?: boolean;
	readOnlyReason?: string | null;
	/** Saved views of the table. Omit to hide the view switcher. */
	savedViews?: SavedViewsBindings;
	/** More toolbar actions (import, export of the whole view), placed before "Export selected rows". */
	tools?: React.ReactNode;
	/** Open the record panel's new-record form; `disabledReason` says why it cannot open. Omit to hide. */
	newRecord?: { open: () => void; disabledReason: string | null };
}

function CountBadge({ count, label }: { count: number; label: string }) {
	if (count === 0) return null;
	return (
		<span
			className='border-border/60 bg-background text-muted-foreground/70 ms-1 -me-1 inline-flex h-5 items-center rounded border px-1 text-[0.625rem] font-medium tabular-nums'
			aria-label={label}
		>
			{count}
		</span>
	);
}

export function SheetsControls(props: SheetsControlsProps) {
	const {
		view,
		columnKeys,
		showSelection,
		gridSelection,
		deleteSelected,
		onAddRow,
		onExport,
		canDelete = true,
		readOnlyReason,
		savedViews,
		tools,
		newRecord,
	} = props;

	const selectedRowCount = gridSelection?.rows.length ?? 0;
	const conditionCount = useMemo(() => filterConditionsOf(view.state.filters).length, [view.state.filters]);
	const waiting = conditionCount - view.appliedCount;
	const sortCount = view.state.sort.length;

	return (
		<div data-part-id='sheets-controls' className='flex shrink-0 flex-wrap items-center justify-between gap-4 py-4'>
			<div className='flex min-w-0 flex-wrap items-center gap-2'>
				{savedViews && <ViewSwitcher views={savedViews} />}
				{readOnlyReason && (
					<span
						className='border-border bg-muted text-muted-foreground inline-flex h-8 items-center rounded-md border px-2.5 text-xs'
						role='status'
						title={readOnlyReason}
					>
						Read-only
					</span>
				)}
				<SearchBox
					plan={view.searchPlan}
					value={view.state.search}
					onChange={view.setSearch}
					columnLabel={view.columnLabel}
					inputRef={view.searchInputRef}
					ready={view.model !== null}
				/>
				{onAddRow && (
					<Button variant='outline' size='sm' aria-label='Add row' onClick={() => onAddRow()}>
						<RiAddLine className='text-muted-foreground/60 -ms-1.5 size-5' aria-hidden='true' />
						Add row
					</Button>
				)}
				{newRecord && (
					// The wrapper carries the reason: a disabled button takes no pointer events.
					<span className='inline-flex' title={newRecord.disabledReason ?? 'Fill in a new record in a form.'}>
						<Button
							variant='outline'
							size='sm'
							aria-label='New record'
							aria-description={newRecord.disabledReason ?? undefined}
							disabled={newRecord.disabledReason !== null}
							onClick={() => newRecord.open()}
						>
							<RiFileAddLine className='text-muted-foreground/60 -ms-1.5 size-5' aria-hidden='true' />
							New record
						</Button>
					</span>
				)}
				{tools}
				{onExport && selectedRowCount > 0 && (
					<Button variant='outline' size='sm' aria-label='Export selected rows' onClick={() => onExport()}>
						<RiDownloadLine className='text-muted-foreground/60 -ms-1.5 size-5' aria-hidden='true' />
						Export selected <span className='tabular-nums'>({selectedRowCount})</span>
					</Button>
				)}
			</div>

			<div className='flex items-center gap-2'>
				{showSelection && (
					<AlertDialog>
						<AlertDialogTrigger asChild>
							<Button
								variant='destructive-outline'
								size='sm'
								disabled={!canDelete || selectedRowCount === 0}
								title={!canDelete ? readOnlyReason ?? 'Delete is unavailable for this table.' : undefined}
							>
								<RiDeleteBin6Line className='-ms-1.5 size-5' aria-hidden='true' />
								Delete
								{selectedRowCount > 0 && <span className='tabular-nums'>({selectedRowCount})</span>}
							</Button>
						</AlertDialogTrigger>
						<AlertDialogContent>
							<AlertDialogHeader>
								<AlertDialogTitle>Delete rows?</AlertDialogTitle>
								<AlertDialogDescription>
									This will permanently delete {selectedRowCount} {selectedRowCount === 1 ? 'row' : 'rows'}. This action
									cannot be undone.
								</AlertDialogDescription>
							</AlertDialogHeader>
							<AlertDialogFooter>
								<AlertDialogCancel>Cancel</AlertDialogCancel>
								<AlertDialogAction
									className='bg-destructive hover:bg-destructive/90 text-white'
									onClick={() => deleteSelected()}
								>
									Delete
								</AlertDialogAction>
							</AlertDialogFooter>
						</AlertDialogContent>
					</AlertDialog>
				)}

				<FieldsControl layout={view.layout} columnLabel={view.columnLabel} ready={view.model !== null} />

				<Popover open={view.sortOpen} onOpenChange={view.setSortOpen}>
					<PopoverTrigger asChild>
						<Button variant='outline' size='sm' aria-label={sortCount > 0 ? `Sort (${sortCount} keys)` : 'Sort'}>
							<RiArrowUpDownLine className='text-muted-foreground/60 -ms-1.5 size-5' aria-hidden='true' />
							Sort
							<CountBadge count={sortCount} label={`${sortCount} sort keys`} />
						</Button>
					</PopoverTrigger>
					<PopoverContent className={cn('w-auto min-w-[24rem]', TOOLBAR_POPOVER)} align='end'>
						<div className='grid gap-3'>
							<h4 className='leading-none font-medium'>Sort</h4>
							<SortControl
								model={view.model}
								sort={view.state.sort}
								onChange={view.setSort}
								columnKeys={columnKeys}
								columnLabel={view.columnLabel}
							/>
						</div>
					</PopoverContent>
				</Popover>

				<Popover open={view.filtersOpen} onOpenChange={view.setFiltersOpen}>
					<PopoverTrigger asChild>
						<Button
							variant='outline'
							size='sm'
							aria-label={view.appliedCount > 0 ? `Filters (${view.appliedCount} applied)` : 'Filters'}
						>
							<RiFilter3Line className='text-muted-foreground/60 -ms-1.5 size-5' aria-hidden='true' />
							Filters
							<CountBadge count={view.appliedCount} label={`${view.appliedCount} filters applied`} />
						</Button>
					</PopoverTrigger>
					<PopoverContent className={cn('max-h-[32rem] w-auto min-w-[28rem] overflow-auto', TOOLBAR_POPOVER)} align='end'>
						<div className='grid gap-4'>
							<h4 className='leading-none font-medium'>Filters</h4>
							<FilterBuilder
								model={view.model}
								filters={view.state.filters}
								onChange={view.setFilters}
								conditions={view.conditions}
								columnLabel={view.columnLabel}
								relatedModel={view.relatedModel}
							/>
							<div className='flex items-center justify-between gap-2 border-t pt-2'>
								<p className='text-muted-foreground text-xs' aria-live='polite'>
									{waiting > 0
										? `${waiting} ${waiting === 1 ? 'condition is' : 'conditions are'} not applied until complete.`
										: ''}
								</p>
								<Button variant='ghost' size='sm' onClick={view.clearFilters} disabled={conditionCount === 0}>
									Clear all
								</Button>
							</div>
						</div>
					</PopoverContent>
				</Popover>
			</div>
		</div>
	);
}

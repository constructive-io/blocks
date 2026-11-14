/**
 * The grid toolbar, in two groups:
 *   - the view, on the left: the saved view, Fields, Filters and Sort (quiet until they
 *     change the view, then tinted with how much they change), and search;
 *   - the actions, on the right: the data tools (import, export of the view) and New
 *     record, or, while rows are selected, what acts on them; then Add row, the one
 *     filled button, which never moves.
 * Labels fold into their icons on a narrow toolbar, so both groups keep one line; every
 * action stays one click away.
 * Everything about filters, sort and search comes from the view bindings (see
 * `useSheetsView`), which only offer what the table model has.
 *
 * Each group is memoized on what it shows: a cursor move (a new selection object, new
 * shell handlers) renders neither.
 */
import { memo, useLayoutEffect, useMemo, useRef } from 'react';
import {
	RiAddLine,
	RiArrowUpDownLine,
	RiCloseLine,
	RiDeleteBin6Line,
	RiDownloadLine,
	RiFileAddLine,
	RiFilter3Line,
	RiLockLine,
} from '@remixicon/react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

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
import { Separator } from '@constructive-io/ui/separator';

import type { SheetsSelection } from '../selection/selection-model';
import { cn } from '../utils/cn';
import { FieldsControl } from './columns/fields-control';
import { FilterBuilder } from './filters/filter-builder';
import { TOOLBAR_POPOVER } from './popup-classes';
import { SearchBox } from './search/search-box';
import { SortControl } from './sort/sort-control';
import { ToolbarLabel, ViewToggleButton } from './toolbar/toolbar-button';
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
	/** More toolbar actions (import, export of the whole view), placed before New record. */
	tools?: React.ReactNode;
	/** Open the record panel's new-record form; `disabledReason` says why it cannot open. Omit to hide. */
	newRecord?: { open: () => void; disabledReason: string | null };
}

const DIVIDER = 'mx-1.5 data-[orientation=vertical]:h-4';

export function SheetsControls(props: SheetsControlsProps) {
	const {
		view,
		columnKeys,
		showSelection,
		gridSelection,
		setGridSelection,
		deleteSelected,
		onAddRow,
		onExport,
		canDelete = true,
		readOnlyReason = null,
		savedViews,
		tools,
		newRecord,
	} = props;
	const selectedRowCount = gridSelection?.rows.length ?? 0;

	// The shell rebuilds these handlers on every selection change, a cursor move included. Read
	// through a latch, the memoized action group keeps its props until what it shows changes.
	const latest = useRef({ setGridSelection, deleteSelected, onAddRow, onExport, openNewRecord: newRecord?.open });
	useLayoutEffect(() => {
		latest.current = { setGridSelection, deleteSelected, onAddRow, onExport, openNewRecord: newRecord?.open };
	});
	const hasAddRow = Boolean(onAddRow);
	const hasExport = Boolean(onExport);
	const hasNewRecord = Boolean(newRecord);
	const handlers = useMemo(
		() => ({
			clearSelection: () => latest.current.setGridSelection(null),
			deleteSelected: () => latest.current.deleteSelected(),
			addRow: hasAddRow ? () => latest.current.onAddRow?.() : undefined,
			exportSelected: hasExport ? () => latest.current.onExport?.() : undefined,
			openNewRecord: hasNewRecord ? () => latest.current.openNewRecord?.() : undefined,
		}),
		[hasAddRow, hasExport, hasNewRecord],
	);

	return (
		<div
			data-part-id='sheets-controls'
			className='@container/sheets-toolbar flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 py-4'
		>
			<ViewGroup view={view} columnKeys={columnKeys} savedViews={savedViews} readOnlyReason={readOnlyReason} />
			<ActionGroup
				selectedRowCount={selectedRowCount}
				showDelete={showSelection}
				canDelete={canDelete}
				readOnlyReason={readOnlyReason}
				newRecordDisabledReason={newRecord?.disabledReason ?? null}
				tools={tools}
				{...handlers}
			/>
		</div>
	);
}

interface ViewGroupProps {
	view: SheetsViewBindings;
	columnKeys: readonly string[];
	savedViews: SavedViewsBindings | undefined;
	readOnlyReason: string | null;
}

/** What the grid shows: the saved view, Fields, Filters, Sort and search. */
const ViewGroup = memo(function ViewGroup({ view, columnKeys, savedViews, readOnlyReason }: ViewGroupProps) {
	const conditionCount = useMemo(() => filterConditionsOf(view.state.filters).length, [view.state.filters]);
	const waiting = conditionCount - view.appliedCount;
	const sortCount = view.state.sort.length;

	return (
		<div role='group' aria-label='View' className='flex min-w-0 flex-wrap items-center gap-1'>
			{savedViews && <ViewSwitcher views={savedViews} />}
			{readOnlyReason && (
				<span
					className='border-border bg-muted text-muted-foreground ms-1 inline-flex h-6 items-center gap-1 rounded-md border px-2 text-xs'
					role='status'
					title={readOnlyReason}
				>
					<RiLockLine className='size-3.5' aria-hidden='true' />
					Read-only
				</span>
			)}
			{savedViews && <Separator orientation='vertical' className={DIVIDER} />}

			<FieldsControl layout={view.layout} columnLabel={view.columnLabel} ready={view.model !== null} />

			<Popover open={view.filtersOpen} onOpenChange={view.setFiltersOpen}>
				<PopoverTrigger asChild>
					<ViewToggleButton
						icon={RiFilter3Line}
						label='Filters'
						count={view.appliedCount}
						aria-label={view.appliedCount > 0 ? `Filters (${view.appliedCount} applied)` : 'Filters'}
					/>
				</PopoverTrigger>
				<PopoverContent className={cn('max-h-[32rem] w-auto min-w-[28rem] overflow-auto', TOOLBAR_POPOVER)} align='start'>
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

			<Popover open={view.sortOpen} onOpenChange={view.setSortOpen}>
				<PopoverTrigger asChild>
					<ViewToggleButton
						icon={RiArrowUpDownLine}
						label='Sort'
						count={sortCount}
						aria-label={sortCount > 0 ? `Sort (${sortCount} keys)` : 'Sort'}
					/>
				</PopoverTrigger>
				<PopoverContent className={cn('w-auto min-w-[24rem]', TOOLBAR_POPOVER)} align='start'>
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

			<div className='ms-2'>
				<SearchBox
					plan={view.searchPlan}
					value={view.state.search}
					onChange={view.setSearch}
					columnLabel={view.columnLabel}
					inputRef={view.searchInputRef}
					ready={view.model !== null}
				/>
			</div>
		</div>
	);
});

interface ActionGroupProps {
	selectedRowCount: number;
	/** Delete is offered with the row checkboxes (`showSelection`). */
	showDelete: boolean;
	canDelete: boolean;
	readOnlyReason: string | null;
	newRecordDisabledReason: string | null;
	tools: React.ReactNode;
	clearSelection: () => void;
	deleteSelected: () => void;
	addRow: (() => void) | undefined;
	exportSelected: (() => void) | undefined;
	openNewRecord: (() => void) | undefined;
}

/** What acts on rows: the data tools and New record, or the selected rows' own actions; then Add row. */
const ActionGroup = memo(function ActionGroup({
	selectedRowCount,
	showDelete,
	canDelete,
	readOnlyReason,
	newRecordDisabledReason,
	tools,
	clearSelection,
	deleteSelected,
	addRow,
	exportSelected,
	openNewRecord,
}: ActionGroupProps) {
	const selecting = selectedRowCount > 0;
	const reduceMotion = useReducedMotion();
	const hidden = reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.96, filter: 'blur(4px)' };
	const transition = reduceMotion ? { duration: 0 } : ({ type: 'spring', duration: 0.3, bounce: 0 } as const);
	// What sits before Add row: the selection's actions while rows are selected, else the tools
	// and New record (the two create actions sit together, after the divider).
	const context = selecting ? (
		<>
			<SelectionActions
				count={selectedRowCount}
				canDelete={canDelete}
				readOnlyReason={readOnlyReason}
				onClear={clearSelection}
				onDelete={showDelete ? deleteSelected : undefined}
				onExport={exportSelected}
			/>
			{addRow && <Separator orientation='vertical' className={DIVIDER} />}
		</>
	) : tools || openNewRecord ? (
		<>
			{tools}
			{tools && (openNewRecord || addRow) && <Separator orientation='vertical' className={DIVIDER} />}
			{openNewRecord && (
				// The wrapper carries the reason: a disabled button takes no pointer events.
				<span className='inline-flex' title={newRecordDisabledReason ?? 'Fill in a new record in a form.'}>
					<Button
						variant='outline'
						size='sm'
						aria-label='New record'
						aria-description={newRecordDisabledReason ?? undefined}
						disabled={newRecordDisabledReason !== null}
						onClick={openNewRecord}
					>
						<RiFileAddLine className='size-4' aria-hidden='true' />
						<ToolbarLabel fold='create'>New record</ToolbarLabel>
					</Button>
				</span>
			)}
		</>
	) : null;
	return (
		// `ms-auto` keeps the group, and Add row, at the right edge when a narrow toolbar wraps it.
		<div role='group' aria-label='Actions' className='ms-auto flex items-center gap-1'>
			<AnimatePresence initial={false} mode='popLayout'>
				{context && (
					<motion.div
						key={selecting ? 'selection' : 'tools'}
						className='flex items-center gap-1'
						initial={hidden}
						animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
						exit={hidden}
						transition={transition}
					>
						{context}
					</motion.div>
				)}
			</AnimatePresence>
			{addRow && (
				<Button size='sm' aria-label='Add row' onClick={addRow}>
					<RiAddLine className='size-4' aria-hidden='true' />
					<ToolbarLabel fold='primary'>Add row</ToolbarLabel>
				</Button>
			)}
		</div>
	);
});

interface SelectionActionsProps {
	count: number;
	canDelete: boolean;
	readOnlyReason: string | null;
	onClear: () => void;
	/** Omitted: no Delete (the grid shows no row checkboxes). */
	onDelete: (() => void) | undefined;
	onExport: (() => void) | undefined;
}

/** The selected rows' own actions, shown only while rows are selected. */
function SelectionActions({ count, canDelete, readOnlyReason, onClear, onDelete, onExport }: SelectionActionsProps) {
	const rows = `${count.toLocaleString()} ${count === 1 ? 'row' : 'rows'}`;
	return (
		<div
			role='group'
			aria-label='Selected rows'
			data-part-id='sheets-selection-actions'
			// The toolbar's 32px line: 28px buttons in 2px padding. Concentric: 8px corners in a 10px group.
			className='bg-primary/10 flex h-8 items-center gap-0.5 rounded-lg p-0.5 ps-2.5'
		>
			<span className='text-foreground me-1 text-sm font-medium tabular-nums' aria-live='polite'>
				{count.toLocaleString()} selected
			</span>
			{onExport && (
				<Button variant='ghost' size='icon-xs' aria-label='Export selected rows' title='Export selected rows as CSV' onClick={onExport}>
					<RiDownloadLine className='size-4' aria-hidden='true' />
				</Button>
			)}
			{onDelete && (
				<AlertDialog>
					<AlertDialogTrigger asChild>
						<Button
							variant='ghost'
							size='xs'
							aria-label='Delete selected rows'
							disabled={!canDelete}
							title={!canDelete ? readOnlyReason ?? 'Delete is unavailable for this table.' : undefined}
							className='text-destructive hover:bg-destructive/10 hover:text-destructive px-2 text-sm'
						>
							<RiDeleteBin6Line className='size-4' aria-hidden='true' />
							<ToolbarLabel fold='view'>Delete</ToolbarLabel>
						</Button>
					</AlertDialogTrigger>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Delete {rows}?</AlertDialogTitle>
							<AlertDialogDescription>This will permanently delete {rows}. This action cannot be undone.</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction className='bg-destructive hover:bg-destructive/90 text-white' onClick={onDelete}>
								Delete
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			)}
			<Button variant='ghost' size='icon-xs' aria-label='Clear selection' title='Clear selection' onClick={onClear}>
				<RiCloseLine className='size-4' aria-hidden='true' />
			</Button>
		</div>
	);
}


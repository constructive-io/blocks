import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiAddLine, RiDatabaseLine, RiSearchLine } from '@remixicon/react';
import { ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { cn } from '../utils/cn';
import { Button } from '@constructive-io/ui/button';
import { Collapsible, CollapsibleTrigger } from '@constructive-io/ui/collapsible';
import { Input } from '@constructive-io/ui/input';
import { Switch } from '@constructive-io/ui/switch';
import { ProgressiveBlur } from '@constructive-io/ui/progressive-blur';
import { ScrollArea } from '@constructive-io/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@constructive-io/ui/tooltip';

import { useShowSystemTables, visibleTables } from './system-tables';

const BLUR_HEIGHT_PERCENT = 0.28;
const BLUR_HEIGHT_MIN_PX = 64;
const BLUR_HEIGHT_MAX_PX = 140;

export type TableWithCategory = {
	/** The value `onTableChange` receives and `activeTable` matches, for example a `TableModel.key`. */
	name: string;
	/** What the list shows. Default: `name`. The search matches both. */
	label?: string;
	category?: string;
	/**
	 * A table a platform module made (see `isSystemTable` in `@constructive-io/data`). System tables
	 * show in their own section, and only while "Show system tables" is on (off by default).
	 */
	system?: boolean;
};

interface TableItemProps {
	table: { value: string; label: string };
	activeTable: string;
	onTableSelect: (tableName: string) => void;
	/** Ref to attach to this item (used for scroll-into-view on active item) */
	itemRef?: React.RefObject<HTMLButtonElement | null>;
}

const TableItem = memo(function TableItem({ table, activeTable, onTableSelect, itemRef }: TableItemProps) {
	const isActive = activeTable === table.value;

	return (
		<Button
			ref={isActive ? itemRef : undefined}
			aria-pressed={isActive}
			data-testid='table-item'
			static
			size='sm'
			type='button'
			variant='ghost'
			className={cn(
				'group relative my-1 flex h-8 w-full shrink items-center justify-between rounded-lg px-2 text-left text-xs font-normal transition-colors duration-(--duration-moderate)',
				isActive
					? 'bg-primary/10 text-foreground ring-primary/30 dark:bg-primary/15 dark:ring-primary/40 ring-1'
					: 'text-muted-foreground hover:text-foreground',
			)}
			onClick={() => onTableSelect(table.value)}
		>
			<span className='flex min-w-0 flex-1 items-center'>
				<Tooltip>
					<TooltipTrigger asChild>
						<span className='truncate text-xs'>{table.label}</span>
					</TooltipTrigger>
					<TooltipContent side='right' align='start'>
						<span className='text-xs font-medium'>{table.label}</span>
					</TooltipContent>
				</Tooltip>
			</span>
		</Button>
	);
});

export interface TableSelectorProps {
	tables: string[] | TableWithCategory[];
	activeTable: string;
	onTableChange: (table: string) => void;
	isLoading?: boolean;
	/** When true, scroll the active table into view and expand its section */
	shouldScrollToActive?: boolean;
	/** Optional callback when user clicks the "New table" button */
	onNewTable?: () => void;
}

export const SheetsTableSelector = memo(function SheetsTableSelector({
	tables,
	activeTable,
	onTableChange,
	isLoading = false,
	shouldScrollToActive = false,
	onNewTable,
}: TableSelectorProps) {
	const [searchQuery, setSearchQuery] = useState('');
	const containerRef = useRef<HTMLDivElement>(null);
	const [_containerHeight, setContainerHeight] = useState(0);

	// Local expand/collapse state (not persisted -- standalone component)
	const [isExpanded, setIsExpanded] = useState(true);
	const [isSystemExpanded, setIsSystemExpanded] = useState(true);
	const [showSystem, setShowSystem] = useShowSystemTables();

	// Transform tables to internal format
	const tableData = useMemo(() => {
		return tables.map((table) =>
			typeof table === 'object'
				? { value: table.name, label: table.label ?? table.name, system: Boolean(table.system) }
				: { value: table, label: table, system: false },
		);
	}, [tables]);
	const systemCount = useMemo(() => tableData.filter((table) => table.system).length, [tableData]);

	// System tables only while shown (the open one always), then the search
	const filteredTables = useMemo(() => {
		const shown = visibleTables(tableData, showSystem, (table) => table.value === activeTable);
		if (!searchQuery) return shown;
		const query = searchQuery.toLowerCase();
		return shown.filter((table) => table.label.toLowerCase().includes(query) || table.value.toLowerCase().includes(query));
	}, [tableData, showSystem, activeTable, searchQuery]);
	const ownTables = useMemo(() => filteredTables.filter((table) => !table.system), [filteredTables]);
	const systemTables = useMemo(() => filteredTables.filter((table) => table.system), [filteredTables]);

	// Measure container height on mount and resize
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const updateHeight = () => {
			setContainerHeight(container.clientHeight);
		};

		updateHeight();

		const resizeObserver = new ResizeObserver(updateHeight);
		resizeObserver.observe(container);

		return () => resizeObserver.disconnect();
	}, []);

	const handleTableSelect = useCallback(
		(tableName: string) => {
			onTableChange(tableName);
		},
		[onTableChange],
	);

	const handleNewTable = useCallback(() => {
		if (onNewTable) {
			onNewTable();
		}
	}, [onNewTable]);

	if (isLoading) {
		return (
			<div data-part-id='sheets-table-selector-loading' className='bg-background flex h-full flex-col'>
				{/* Header skeleton */}
				<div className='border-border/60 flex-shrink-0 border-b p-6'>
					<div className='bg-muted mb-6 h-8 w-32 animate-pulse rounded'></div>

					{/* Schema selector skeleton */}
					<div className='bg-muted mb-4 h-10 w-full animate-pulse rounded-md'></div>

					{/* New table button skeleton */}
					<div className='bg-muted mb-4 h-10 w-full animate-pulse rounded-md'></div>

					{/* Search input skeleton */}
					<div className='bg-muted h-10 w-full animate-pulse rounded-md'></div>
				</div>

				{/* Table list skeleton */}
				<div className='flex-1 space-y-2 p-6'>
					{[1, 2, 3, 4, 5].map((i) => (
						<div key={i} className='flex items-center justify-between rounded-lg border p-3'>
							<div className='flex items-center gap-3'>
								<div className='bg-muted h-4 w-4 animate-pulse rounded'></div>
								<div className='bg-muted h-4 w-24 animate-pulse rounded'></div>
							</div>
							<div className='bg-muted h-6 w-20 animate-pulse rounded-full'></div>
						</div>
					))}
				</div>
			</div>
		);
	}

	return (
		<TooltipProvider delayDuration={150}>
			<div
				data-part-id='sheets-table-selector'
				className='bg-background flex h-full max-h-[calc(100vh-4rem)] flex-col'
			>
				{/* Header */}
				<div className='flex-shrink-0 pt-4 pb-2'>
					<div className='flex flex-col gap-2 pr-2 pb-2'>
						{/* New table button */}
						<Button onClick={handleNewTable} className='h-8 w-full justify-start gap-2' variant='outline'>
							<RiAddLine size={16} />
							New table
						</Button>
					</div>

					{/* Search input */}
					<div className='relative pr-2'>
						<RiSearchLine
							size={16}
							className='text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2 transform'
						/>
						<Input
							size='sm'
							placeholder='Search tables...'
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className='pl-10'
						/>
					</div>

					{/* Only for a database that has system tables; one setting for every table list */}
					{systemCount > 0 && (
						<label
							data-part-id='sheets-system-tables-toggle'
							className='text-muted-foreground mt-2 flex h-8 items-center justify-between gap-2 pr-2 text-xs'
						>
							<span>
								Show system tables <span className='text-muted-foreground/70 tabular-nums'>({systemCount})</span>
							</span>
							<Switch checked={showSystem} onCheckedChange={(checked) => setShowSystem(checked)} />
						</label>
					)}
				</div>

				{/* Table list */}
				<div
					ref={containerRef}
					data-part-id='table-selector-table-list'
					// The sections keep their full height and the list scrolls, so a long list or a second
					// section (system tables) is never cut off below the fold.
					className='mt-2 flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto overscroll-contain pr-2'
				>
					{filteredTables.length === 0 ? (
						<div className='flex flex-col items-center justify-center py-12 text-center'>
							<div className='bg-muted mb-4 flex h-12 w-12 items-center justify-center rounded-full'>
								<RiSearchLine size={20} className='text-muted-foreground' />
							</div>
							<p className='text-muted-foreground mb-1 text-sm font-medium'>No tables found</p>
							<p className='text-muted-foreground/80 text-xs'>
								{searchQuery
									? 'Try adjusting your search terms'
									: systemCount > 0 && !showSystem
										? 'This database has only system tables. Turn on "Show system tables" to see them.'
										: 'No tables available in this schema'}
							</p>
						</div>
					) : (
						<>
							{(ownTables.length > 0 || systemTables.length === 0) && (
								<SheetsTableListByCategory
									title='Tables'
									tables={ownTables}
									activeTable={activeTable}
									isExpanded={isExpanded}
									onToggleExpand={() => setIsExpanded((prev) => !prev)}
									onTableSelect={handleTableSelect}
									emptyMessage='No tables yet'
									hasSearchTerm={searchQuery.length > 0}
									shouldScrollToActive={shouldScrollToActive}
								/>
							)}
							{systemTables.length > 0 && (
								<SheetsTableListByCategory
									title='System tables'
									tables={systemTables}
									activeTable={activeTable}
									isExpanded={isSystemExpanded}
									onToggleExpand={() => setIsSystemExpanded((prev) => !prev)}
									onTableSelect={handleTableSelect}
									hasSearchTerm={searchQuery.length > 0}
									shouldScrollToActive={shouldScrollToActive}
								/>
							)}
						</>
					)}
				</div>
			</div>
		</TooltipProvider>
	);
});

interface TableListByCategoryProps {
	title: string;
	tables: { value: string; label: string }[];
	activeTable: string;
	isExpanded: boolean;
	onToggleExpand: () => void;
	onTableSelect: (tableName: string) => void;
	emptyMessage?: string;
	hasSearchTerm?: boolean;
	maxContentHeight?: number;
	/** When true, scroll the active table into view */
	shouldScrollToActive?: boolean;
}

function SheetsTableListByCategory({
	title,
	tables,
	activeTable,
	isExpanded,
	onToggleExpand,
	onTableSelect,
	emptyMessage = 'No tables',
	hasSearchTerm = false,
	maxContentHeight,
	shouldScrollToActive = false,
}: TableListByCategoryProps) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const activeItemRef = useRef<HTMLButtonElement>(null);
	const [showBottomBlur, setShowBottomBlur] = useState(false);
	const [scrollAreaHeight, setScrollAreaHeight] = useState(0);

	const hasSelectedItem = activeTable ? tables.some((t) => t.value === activeTable) : false;

	// Scroll active item into view when requested
	useEffect(() => {
		if (!shouldScrollToActive || !isExpanded || !activeItemRef.current) return;

		// Wait for animation to complete before scrolling
		const timer = setTimeout(() => {
			activeItemRef.current?.scrollIntoView({
				behavior: 'smooth',
				block: 'center',
			});
		}, 350); // Match the collapsible animation duration

		return () => clearTimeout(timer);
	}, [shouldScrollToActive, isExpanded, activeTable]);

	const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
		const el = event.currentTarget;
		const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
		setShowBottomBlur(!(atBottom || el.scrollHeight <= el.clientHeight));
	}, []);

	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;
		const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
		setShowBottomBlur(!(atBottom || el.scrollHeight <= el.clientHeight));
	}, [tables.length, isExpanded, maxContentHeight]);

	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;

		const update = () => setScrollAreaHeight(el.clientHeight);
		update();

		const ro = new ResizeObserver(update);
		ro.observe(el);
		return () => ro.disconnect();
	}, [isExpanded, maxContentHeight]);

	const blurHeight = useMemo(() => {
		if (!scrollAreaHeight) return '28%';
		const percentPx = scrollAreaHeight * BLUR_HEIGHT_PERCENT;
		const clamped = Math.min(scrollAreaHeight, Math.min(BLUR_HEIGHT_MAX_PX, Math.max(BLUR_HEIGHT_MIN_PX, percentPx)));
		return `${Math.round(clamped)}px`;
	}, [scrollAreaHeight]);

	// Calculate max-height style
	const scrollAreaStyle = maxContentHeight !== undefined ? { maxHeight: `${maxContentHeight}px` } : undefined;

	return (
		<Collapsible open={isExpanded} onOpenChange={onToggleExpand} className='flex min-h-0 shrink-0 flex-col'>
			<CollapsibleTrigger
				className={cn(
					'group flex w-full items-center gap-2 rounded-lg py-1.5 pr-2 pl-1 transition-colors duration-(--duration-moderate)',
					'bg-muted hover:bg-muted/50',
					isExpanded && 'bg-muted/50',
				)}
			>
				<motion.div
					animate={{ rotate: isExpanded ? 90 : 0 }}
					transition={{ type: 'spring', stiffness: 400, damping: 25 }}
					className='flex shrink-0 items-center justify-center'
				>
					<ChevronRight className='text-muted-foreground/60 h-3.5 w-3.5' />
				</motion.div>
				<span className='text-muted-foreground text-xs font-medium'>{title}</span>
				<span className='ml-auto flex items-center gap-1.5'>
					{!isExpanded && hasSelectedItem && (
						<span className='bg-primary/50 h-1.5 w-1.5 rounded-full' aria-label='Contains selected item' />
					)}
					<span className='text-muted-foreground/70 text-[10px] tabular-nums'>{tables.length}</span>
				</span>
			</CollapsibleTrigger>

			<AnimatePresence initial={false}>
				{isExpanded && (
					<motion.div
						data-testid={`collapsible-content-${title}`}
						initial={{ height: 0, opacity: 0 }}
						animate={{
							height: 'auto',
							opacity: 1,
							transition: {
								height: { type: 'spring', stiffness: 500, damping: 40, mass: 0.8 },
								opacity: { duration: 0.2, ease: 'easeOut' },
							},
						}}
						exit={{
							height: 0,
							opacity: 0,
							transition: {
								height: { type: 'spring', stiffness: 500, damping: 40, mass: 0.8 },
								opacity: { duration: 0.15, ease: 'easeIn' },
							},
						}}
						className='min-h-0 overflow-hidden'
					>
						{tables.length > 0 ? (
							<div className='relative mt-2 min-h-0'>
								<ScrollArea
									ref={scrollRef}
									onScroll={handleScroll}
									style={scrollAreaStyle}
									className='scrollbar-neutral-thin min-h-0'
								>
									<div className='space-y-0.5 pr-1 pb-2 pl-1'>
										{tables.map((table) => (
											<TableItem
												key={table.value}
												table={table}
												activeTable={activeTable}
												onTableSelect={onTableSelect}
												itemRef={table.value === activeTable ? activeItemRef : undefined}
											/>
										))}
									</div>
								</ScrollArea>
								{showBottomBlur && tables.length > 3 && (
									<ProgressiveBlur position='bottom' height={blurHeight} surface='background' intensity={0.22} />
								)}
							</div>
						) : (
							<div className='flex flex-col items-center justify-center py-6 text-center'>
								<div className='bg-muted mb-2 flex h-10 w-10 items-center justify-center rounded-full'>
									{hasSearchTerm ? (
										<RiSearchLine className='text-muted-foreground h-5 w-5' />
									) : (
										<RiDatabaseLine className='text-muted-foreground h-5 w-5' />
									)}
								</div>
								<p className='text-muted-foreground text-xs'>{emptyMessage}</p>
							</div>
						)}
					</motion.div>
				)}
			</AnimatePresence>
		</Collapsible>
	);
}

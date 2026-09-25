'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@constructive-io/ui/button';
import { Collapsible, CollapsibleTrigger } from '@constructive-io/ui/collapsible';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@constructive-io/ui/dropdown-menu';
import { ProgressiveBlur } from '@constructive-io/ui/progressive-blur';
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@constructive-io/ui/select';
import { useCardStack } from '@constructive-io/ui/stack';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@constructive-io/ui/tooltip';
import { focusRingClass, TooltipIconButton } from '@constructive-io/ui/workspace-kit';
import { ChevronRight, Database, Eye, EyeOff, MoreHorizontal, PanelLeft, Plus, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { useSchemaBuilderSelectors } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder';
import { durations, easings, springs } from '@/blocks/schema/schema-builder-core/lib/motion/motion-config';
import type { TableDefinition } from '@/blocks/schema/schema-builder-core/lib/schema';
import { CARD_WIDTHS } from '@/blocks/schema/schema-builder-core/lib/stack/card-widths';
import { handleActivationKeyDown } from '@/blocks/schema/schema-builder-core/lib/keyboard-activation';
import { cn } from '@/lib/utils';
import { useSidebarSectionActions, useSidebarSections } from '@/blocks/schema/schema-builder-core/store/app-store';
import { CreateTableCard, DeleteTableDialog } from '../tables';

// Height of each table row plus its gap, in pixels (for height calculations)
const TABLE_ITEM_HEIGHT = 34;
// Height of section header (collapsible trigger)
const SECTION_HEADER_HEIGHT = 28;
// Gap between sections
const SECTION_GAP = 12;
// Empty state height
const EMPTY_STATE_HEIGHT = 72;

const TABLE_NAME_ELLIPSIS = '...';
const SCROLL_AFFORDANCE_THRESHOLD_PX = 8;

export function truncateMiddleToWidth(text: string, maxWidth: number, measure: (value: string) => number): string {
	if (!text) return '';
	if (maxWidth <= 0) return text;
	if (measure(text) <= maxWidth) return text;

	const ellipsisWidth = measure(TABLE_NAME_ELLIPSIS);
	if (ellipsisWidth >= maxWidth) return TABLE_NAME_ELLIPSIS;

	let low = 2;
	let high = text.length;
	let best = 0;

	while (low <= high) {
		const keptChars = Math.floor((low + high) / 2);
		const leftChars = Math.ceil(keptChars / 2);
		const rightChars = Math.floor(keptChars / 2);
		const candidate = `${text.slice(0, leftChars)}${TABLE_NAME_ELLIPSIS}${text.slice(text.length - rightChars)}`;
		const candidateWidth = measure(candidate);

		if (candidateWidth <= maxWidth) {
			best = keptChars;
			low = keptChars + 1;
		} else {
			high = keptChars - 1;
		}
	}

	if (best > 0) {
		const leftChars = Math.ceil(best / 2);
		const rightChars = Math.floor(best / 2);
		return `${text.slice(0, leftChars)}${TABLE_NAME_ELLIPSIS}${text.slice(text.length - rightChars)}`;
	}

	const oneSideCandidate = `${text.slice(0, 1)}${TABLE_NAME_ELLIPSIS}`;
	return measure(oneSideCandidate) <= maxWidth ? oneSideCandidate : TABLE_NAME_ELLIPSIS;
}

export function getTableNameDisplayState(
	name: string,
	maxWidth: number,
	measure: (value: string) => number,
): { displayName: string; isOverflowing: boolean } {
	const displayName = truncateMiddleToWidth(name, maxWidth, measure);
	return {
		displayName,
		isOverflowing: displayName !== name,
	};
}

export function getScrollAffordanceState({
	scrollTop,
	scrollHeight,
	clientHeight,
	threshold = SCROLL_AFFORDANCE_THRESHOLD_PX,
}: {
	scrollTop: number;
	scrollHeight: number;
	clientHeight: number;
	threshold?: number;
}): { hasOverflow: boolean; showTopBlur: boolean; showBottomBlur: boolean } {
	const hasOverflow = scrollHeight - clientHeight > threshold;
	if (!hasOverflow) {
		return { hasOverflow: false, showTopBlur: false, showBottomBlur: false };
	}

	return {
		hasOverflow: true,
		showTopBlur: scrollTop > threshold,
		showBottomBlur: scrollTop + clientHeight < scrollHeight - threshold,
	};
}

interface SchemaBuilderSidebarProps {
	onTableSelect?: (tableId: string) => void;
	showSystemTables?: boolean;
	/** Hides the sidebar; shown as a control in the sidebar header when set. */
	onHide?: () => void;
}

type CreatedTable = { id: string; name: string };

function openCreateTableCard(
	stack: ReturnType<typeof useCardStack>,
	onTableCreated: (table: CreatedTable) => void,
) {
	stack.push({
		id: 'create-table-select-model',
		title: 'Create Table',
		description: 'Securely create a new table based on its access model',
		Component: CreateTableCard,
		props: { onTableCreated },
		width: CARD_WIDTHS.extraWide,
	});
}

export function SchemaBuilderMobileNavigation({
	hasSystemTables = false,
	onShowSystemTablesChange,
	showSystemTables = false,
}: Pick<SchemaBuilderSidebarProps, 'showSystemTables'> & {
	hasSystemTables?: boolean;
	onShowSystemTablesChange: (show: boolean) => void;
}) {
	const stack = useCardStack();
	const { currentSchema, selectedTableId, selectTable } = useSchemaBuilderSelectors();
	const tables = currentSchema?.tables ?? [];
	const selectedTable = tables.find((table) => table.id === selectedTableId) ?? null;
	const visibleTables = tables.filter(
		(table) => showSystemTables || table.category === 'APP' || table.id === selectedTableId,
	);
	const tableOptions = visibleTables.map((table) => ({
		label: table.label ?? table.name,
		value: table.id,
	}));

	function handleTableSelect(tableId: string) {
		const table = tables.find((candidate) => candidate.id === tableId);
		if (table) selectTable(table.id, table.name);
	}

	function handleCreateTable() {
		openCreateTableCard(stack, (table) => {
			selectTable(table.id, table.name);
		});
	}

	return (
		<div
			className='flex items-center gap-1.5 border-b border-dashed border-foreground/10 px-3 py-2 sm:hidden'
			data-chat-component='schema-builder-mobile-navigation'
		>
			<Select items={tableOptions} onValueChange={handleTableSelect} value={selectedTableId ?? ''}>
				<SelectTrigger aria-label='Select table' className='min-w-0 flex-1' size='sm'>
					<SelectValue placeholder='Select a table'>
						{selectedTable ? selectedTable.label ?? selectedTable.name : 'Select a table'}
					</SelectValue>
				</SelectTrigger>
				<SelectContent>
					<SelectGroup>
						{tableOptions.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectGroup>
				</SelectContent>
			</Select>
			<Button aria-label='Create table' onClick={handleCreateTable} size='icon-sm' variant='outline'>
				<Plus aria-hidden />
			</Button>
			{hasSystemTables && (
				<Button
					aria-label={showSystemTables ? 'Hide system tables' : 'Show system tables'}
					aria-pressed={showSystemTables}
					onClick={() => onShowSystemTablesChange(!showSystemTables)}
					size='icon-sm'
					variant='ghost'
				>
					{showSystemTables ? <Eye aria-hidden /> : <EyeOff aria-hidden />}
				</Button>
			)}
		</div>
	);
}

export function SchemaBuilderSidebar({ onTableSelect, showSystemTables = false, onHide }: SchemaBuilderSidebarProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const [containerHeight, setContainerHeight] = useState(0);

	const stack = useCardStack();

	// Delete confirmation dialog state
	const [deleteDialog, setDeleteDialog] = useState<{
		isOpen: boolean;
		tableId: string | null;
		tableName: string | null;
	}>({
		isOpen: false,
		tableId: null,
		tableName: null,
	});

	// Use selectors - currentSchema replaces dbLightSchema, selectedTableId replaces selectedTable
	const { currentSchema, selectedTableId, selectTable } = useSchemaBuilderSelectors();

	// Sidebar section expand/collapse state (persisted)
	const sidebarSections = useSidebarSections();
	const { toggleSidebarSection } = useSidebarSectionActions();

	const tables = useMemo(() => currentSchema?.tables || [], [currentSchema?.tables]);

	// Check if any tables have category data
	const hasCategoryData = useMemo(() => {
		return tables.some((table) => table.category !== undefined);
	}, [tables]);

	// Split tables by category: APP vs CORE + MODULE (system)
	const { appTables, systemTables } = useMemo(() => {
		const app: TableDefinition[] = [];
		const system: TableDefinition[] = [];

		tables.forEach((table) => {
			if (table.category === 'APP') {
				app.push(table);
			} else {
				// CORE + MODULE go to system tables
				system.push(table);
			}
		});

		return { appTables: app, systemTables: system };
	}, [tables]);

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

	// Reveal system tables only on explicit user action
	const hasSystemTables = systemTables.length > 0 && hasCategoryData;
	const showSystemSection = hasSystemTables && showSystemTables;

	// Calculate dynamic heights for sections
	const { topMaxHeight, bottomMaxHeight } = useMemo(() => {
		if (containerHeight === 0) {
			return { topMaxHeight: undefined, bottomMaxHeight: undefined };
		}

		// Available height = container - section headers - gaps
		const headersHeight = SECTION_HEADER_HEIGHT + (showSystemSection ? SECTION_HEADER_HEIGHT + SECTION_GAP : 0);
		const availableHeight = containerHeight - headersHeight;
		const halfAvailable = availableHeight / 2;

		// Calculate natural content heights
		const topContentHeight = appTables.length > 0 ? appTables.length * TABLE_ITEM_HEIGHT : EMPTY_STATE_HEIGHT;
		const bottomContentHeight = showSystemSection
			? systemTables.length > 0
				? systemTables.length * TABLE_ITEM_HEIGHT
				: EMPTY_STATE_HEIGHT
			: 0;

		// Rule: Top list never exceeds 50% of available space
		// Rule: If top is short, bottom takes remaining space
		// Rule: If top is long, it's capped at 50%, bottom gets rest

		let topMax: number;
		let bottomMax: number;

		if (!showSystemSection) {
			// Only top section - it takes all available space
			topMax = availableHeight;
			bottomMax = 0;
		} else if (!sidebarSections.system) {
			// System section is collapsed - top takes all space
			topMax = availableHeight;
			bottomMax = 0;
		} else if (!sidebarSections.app) {
			// App section is collapsed - bottom takes all space
			topMax = 0;
			bottomMax = availableHeight;
		} else {
			// Both sections expanded
			if (topContentHeight <= halfAvailable && bottomContentHeight <= halfAvailable) {
				// Both fit in their half - use natural heights
				topMax = topContentHeight;
				bottomMax = bottomContentHeight;
			} else if (topContentHeight <= halfAvailable) {
				// Top is short, bottom is long - top uses natural, bottom gets rest
				topMax = topContentHeight;
				bottomMax = availableHeight - topContentHeight;
			} else {
				// Top is long - cap at 50%, bottom gets the other 50%
				topMax = halfAvailable;
				bottomMax = halfAvailable;
			}
		}

		return {
			topMaxHeight: Math.max(topMax, 0),
			bottomMaxHeight: Math.max(bottomMax, 0),
		};
	}, [
		containerHeight,
		appTables.length,
		systemTables.length,
		showSystemSection,
		sidebarSections.app,
		sidebarSections.system,
	]);

	const handleTableSelect = (tableId: string) => {
		// Find table by ID to get its name for URL
		const table = tables.find((t) => t.id === tableId);
		if (table) {
			selectTable(table.id, table.name);
		}
		onTableSelect?.(tableId);
	};

	const handleCreateTable = () => {
		openCreateTableCard(stack, (table) => {
			handleTableSelect(table.id);
		});
	};

	const handleDeleteTable = (tableId: string, tableName: string) => {
		setDeleteDialog({
			isOpen: true,
			tableId,
			tableName,
		});
	};

	const handleTableDeleted = (_tableId: string) => {
		setDeleteDialog({
			isOpen: false,
			tableId: null,
			tableName: null,
		});
	};

	// NOTE: No need to manually load schema - currentSchema is derived automatically
	// from selectedSchemaKey via useSchemaBuilderSelectors

	return (
		<TooltipProvider delayDuration={150}>
			<div
				data-chat-component='schema-builder-sidebar'
				data-chat-table-count={String(tables.length)}
				className='border-sidebar-border bg-sidebar hidden h-full w-60 shrink-0 flex-col overflow-hidden border-r sm:flex 2xl:w-64'
			>
				<h1 className='sr-only'>Schema Builder</h1>

				{/* Schema name, with the hide control */}
				<div className='flex h-12 shrink-0 items-center gap-2 px-2.5'>
					<span aria-hidden='true' className='bg-foreground text-background grid size-5 shrink-0 place-items-center rounded-md'>
						<Database className='size-3' strokeWidth={2.25} />
					</span>
					<span className='text-foreground min-w-0 flex-1 truncate text-sm font-medium'>{currentSchema?.name ?? 'Schema'}</span>
					{onHide ? (
						<TooltipIconButton label='Hide table sidebar' onClick={onHide}>
							<PanelLeft aria-hidden='true' className='size-3.5' />
						</TooltipIconButton>
					) : null}
				</div>

				{/* Scrollable sections container - takes remaining space */}
				<div ref={containerRef} className='flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-2.5 pb-3'>
					{/* Your Tables Section - APP tables, expanded by default */}
					<TableListByCategory
						title='Your Tables'
						tables={appTables}
						selectedTableId={selectedTableId}
						isExpanded={sidebarSections.app}
						onToggleExpand={() => toggleSidebarSection('app')}
						onTableSelect={handleTableSelect}
						onTableDelete={handleDeleteTable}
						emptyMessage='No tables yet'
						maxContentHeight={topMaxHeight}
						onCreate={handleCreateTable}
					/>

					{/* System Tables Section - CORE + MODULE tables, collapsed by default */}
					{showSystemSection && (
						<TableListByCategory
							title='System Tables'
							tables={systemTables}
							selectedTableId={selectedTableId}
							isExpanded={sidebarSections.system}
							onToggleExpand={() => toggleSidebarSection('system')}
							onTableSelect={handleTableSelect}
							onTableDelete={handleDeleteTable}
							emptyMessage='No system tables'
							maxContentHeight={bottomMaxHeight}
						/>
					)}
				</div>

				<DeleteTableDialog
					isOpen={deleteDialog.isOpen}
					onOpenChange={(open) => !open && setDeleteDialog({ isOpen: false, tableId: null, tableName: null })}
					tableId={deleteDialog.tableId}
					tableName={deleteDialog.tableName}
					onTableDeleted={handleTableDeleted}
				/>
			</div>
		</TooltipProvider>
	);
}

interface TableListByCategoryProps {
	title: string;
	tables: TableDefinition[];
	selectedTableId: string | null;
	isExpanded: boolean;
	onToggleExpand: () => void;
	onTableSelect: (tableId: string) => void;
	onTableDelete: (tableId: string, tableName: string) => void;
	emptyMessage?: string;
	maxContentHeight?: number;
	/** Adds a create control beside the section heading. */
	onCreate?: () => void;
}

function TableListByCategory({
	title,
	tables,
	selectedTableId,
	isExpanded,
	onToggleExpand,
	onTableSelect,
	onTableDelete,
	emptyMessage = 'No tables',
	maxContentHeight,
	onCreate,
}: TableListByCategoryProps) {
	// Check if this section contains the selected item
	const hasSelectedItem = selectedTableId ? tables.some((t) => t.id === selectedTableId) : false;
	const scrollViewportRef = useRef<HTMLDivElement>(null);
	const [affordanceState, setAffordanceState] = useState({
		hasOverflow: false,
		showTopBlur: false,
		showBottomBlur: false,
	});

	const scrollViewportStyle = maxContentHeight !== undefined ? { maxHeight: `${maxContentHeight}px` } : undefined;

	const recomputeAffordanceState = useCallback(() => {
		const viewport = scrollViewportRef.current;
		if (!viewport) return;

		const nextState = getScrollAffordanceState({
			scrollTop: viewport.scrollTop,
			scrollHeight: viewport.scrollHeight,
			clientHeight: viewport.clientHeight,
		});
		setAffordanceState((prevState) =>
			prevState.hasOverflow === nextState.hasOverflow &&
			prevState.showTopBlur === nextState.showTopBlur &&
			prevState.showBottomBlur === nextState.showBottomBlur
				? prevState
				: nextState,
		);
	}, []);

	useEffect(() => {
		if (!isExpanded || tables.length === 0) return;

		const viewport = scrollViewportRef.current;
		if (!viewport) return;

		const handleScroll = () => {
			recomputeAffordanceState();
		};

		viewport.addEventListener('scroll', handleScroll, { passive: true });
		const resizeObserver =
			typeof ResizeObserver !== 'undefined'
				? new ResizeObserver(() => {
						recomputeAffordanceState();
					})
				: null;
		resizeObserver?.observe(viewport);

		const rafId = requestAnimationFrame(() => {
			recomputeAffordanceState();
		});
		const timeoutId = window.setTimeout(() => {
			recomputeAffordanceState();
		}, 220);

		return () => {
			viewport.removeEventListener('scroll', handleScroll);
			resizeObserver?.disconnect();
			cancelAnimationFrame(rafId);
			window.clearTimeout(timeoutId);
		};
	}, [isExpanded, tables.length, maxContentHeight, recomputeAffordanceState]);

	return (
		<Collapsible open={isExpanded} onOpenChange={onToggleExpand} className='flex min-h-0 shrink-0 flex-col'>
			<div className='flex h-7 items-center gap-1'>
				<CollapsibleTrigger
					className={cn(
						'group text-muted-foreground hover:text-foreground flex h-7 min-w-0 flex-1 cursor-pointer items-center gap-1.5 rounded-md px-1.5 text-xs transition-colors duration-(--duration-fast)',
						focusRingClass,
					)}
				>
					<motion.div
						animate={{ rotate: isExpanded ? 90 : 0 }}
						transition={{ type: 'spring', stiffness: 400, damping: 25 }}
						className='flex shrink-0 items-center justify-center'
					>
						<ChevronRight className='size-3 opacity-70' />
					</motion.div>
					<span className='truncate'>{title}</span>
					<span className='text-subtle-foreground ml-auto flex items-center gap-1.5 tabular-nums'>
						{/* When collapsed over the selected table, the heading carries the selection. */}
						{!isExpanded && hasSelectedItem ? <span className='sr-only'>Contains the selected table</span> : null}
						<span className={cn(!isExpanded && hasSelectedItem && 'text-foreground font-medium')}>{tables.length}</span>
					</span>
				</CollapsibleTrigger>
				{onCreate ? (
					<TooltipIconButton extendHitArea={false} label='Create table' onClick={onCreate} size='sm'>
						<Plus aria-hidden='true' className='size-3.5' />
					</TooltipIconButton>
				) : null}
			</div>

			<AnimatePresence initial={false}>
				{isExpanded && (
					<motion.div
						data-testid={`collapsible-content-${title}`}
						initial={{ opacity: 0, y: -4 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -4 }}
						transition={{
							...springs.stiff,
							opacity: { duration: durations.fast, ease: easings.easeOut },
						}}
						className='min-h-0 overflow-hidden'
					>
						{tables.length > 0 ? (
							<div className='relative mt-0.5 min-h-0'>
								<div
									ref={scrollViewportRef}
									style={scrollViewportStyle}
									className='scrollbar-neutral-thin min-h-0 overflow-x-hidden overflow-y-auto'
								>
									{/* One guide line down the list; the current table is a blue segment on it. */}
									<div className='border-sidebar-border ml-[11px] flex flex-col gap-0.5 border-l py-0.5 pl-1.5'>
										{tables.map((table) => (
											<TableItem
												key={table.id}
												table={table}
												isSelected={selectedTableId === table.id}
												onSelect={onTableSelect}
												onDelete={onTableDelete}
											/>
										))}
									</div>
								</div>
								{affordanceState.showTopBlur && (
									<ProgressiveBlur position='top' height='14%' blurPx={4} surface='sidebar' intensity={0.1} />
								)}
								{affordanceState.showBottomBlur && (
									<ProgressiveBlur position='bottom' height='16%' blurPx={4} surface='sidebar' intensity={0.12} />
								)}
							</div>
						) : (
							<div className='flex flex-col items-start gap-1.5 px-2 py-3'>
								<p className='text-muted-foreground text-xs'>{emptyMessage}</p>
								{onCreate ? (
									<button
										className={cn('text-primary cursor-pointer rounded text-xs font-medium hover:underline', focusRingClass)}
										onClick={onCreate}
										type='button'
									>
										Create a table
									</button>
								) : null}
							</div>
						)}
					</motion.div>
				)}
			</AnimatePresence>
		</Collapsible>
	);
}

interface TableItemProps {
	table: TableDefinition;
	isSelected: boolean;
	onSelect: (tableId: string) => void;
	onDelete: (tableId: string, tableName: string) => void;
}

function TableItem({ table, isSelected, onSelect, onDelete }: TableItemProps) {
	const [isMenuOpen, setIsMenuOpen] = useState(false);
	const fieldCount = table.fields.length;

	return (
		<div
			data-testid='table-item'
			role='button'
			tabIndex={0}
			aria-current={isSelected ? 'page' : undefined}
			aria-label={table.name}
			className={cn(
				'group relative flex h-8 shrink-0 cursor-pointer items-center gap-2 rounded-md pr-1 pl-2 text-[13px] pointer-coarse:h-10',
				'transition-[background-color,color] duration-(--duration-fast)',
				focusRingClass,
				isSelected
					? 'bg-sidebar-accent text-foreground font-medium'
					: 'text-sidebar-foreground hover:bg-overlay-hover',
			)}
			onClick={() => onSelect(table.id)}
			onKeyDown={(event) => {
				handleActivationKeyDown(event, () => onSelect(table.id));
			}}
		>
			<span
				aria-hidden='true'
				className={cn('absolute inset-y-1.5 -left-[7.5px] w-0.5 rounded-full', isSelected ? 'bg-primary' : 'bg-transparent')}
			/>
			<div className='flex min-w-0 flex-1 items-center'>
				<OverflowAwareTableName name={table.name} />
			</div>
			{/* Field count at rest; the actions menu takes its place on hover or focus. */}
			<span
				aria-hidden='true'
				className={cn(
					'text-subtle-foreground shrink-0 pr-1.5 text-xs tabular-nums',
					'group-hover:hidden group-focus-within:hidden pointer-coarse:hidden',
					isMenuOpen && 'hidden',
				)}
			>
				{fieldCount}
			</span>
			<DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
				<DropdownMenuTrigger asChild>
					<Button
						variant='ghost'
						size='sm'
						aria-label={`Actions for ${table.name}`}
						className={cn(
							'text-muted-foreground hover:text-foreground hover:bg-overlay-hover size-6 shrink-0 rounded-md p-0',
							'hidden group-hover:inline-flex group-focus-within:inline-flex pointer-coarse:inline-flex',
							isMenuOpen && 'bg-overlay-hover inline-flex',
						)}
						onClick={(e) => e.stopPropagation()}
					>
						<MoreHorizontal className='size-3.5' />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align='start' className='w-40'>
					<DropdownMenuItem
						className='text-destructive hover:bg-destructive/10 focus:bg-destructive/10 hover:text-destructive
							focus:text-destructive data-[disabled=true]:text-muted-foreground gap-2 [&_svg]:size-3.5'
						onClick={(e) => {
							e.stopPropagation();
							onDelete(table.id, table.name);
						}}
					>
						<Trash2 />
						Delete table
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	);
}

interface OverflowAwareTableNameProps {
	name: string;
}

function OverflowAwareTableName({ name }: OverflowAwareTableNameProps) {
	const containerRef = useRef<HTMLSpanElement>(null);
	const measureRef = useRef<HTMLSpanElement>(null);
	const [displayName, setDisplayName] = useState(name);
	const [isOverflowing, setIsOverflowing] = useState(false);

	const recompute = useCallback(() => {
		const container = containerRef.current;
		const measureElement = measureRef.current;
		if (!container || !measureElement) return;

		const maxWidth = container.clientWidth;
		if (maxWidth <= 0) {
			setDisplayName(name);
			setIsOverflowing(false);
			return;
		}

		const measure = (value: string) => {
			measureElement.textContent = value;
			return measureElement.scrollWidth;
		};
		const next = getTableNameDisplayState(name, maxWidth, measure);

		setDisplayName((prev) => (prev === next.displayName ? prev : next.displayName));
		setIsOverflowing((prev) => (prev === next.isOverflowing ? prev : next.isOverflowing));
	}, [name]);

	useLayoutEffect(() => {
		recompute();
	}, [recompute]);

	useEffect(() => {
		const element = containerRef.current;
		if (!element || typeof ResizeObserver === 'undefined') return;

		const observer = new ResizeObserver(() => {
			recompute();
		});
		observer.observe(element);

		return () => observer.disconnect();
	}, [recompute]);

	const triggerLabel = (
		<span
			ref={containerRef}
			className='relative block max-w-full min-w-0'
			aria-label={isOverflowing ? name : undefined}
		>
			<span className='block max-w-full min-w-0 truncate'>{displayName}</span>
			<span
				ref={measureRef}
				aria-hidden='true'
				className='pointer-events-none invisible absolute top-0 left-0 whitespace-nowrap'
			/>
		</span>
	);

	if (!isOverflowing) {
		return triggerLabel;
	}

	return (
		<Tooltip>
			<TooltipTrigger asChild>{triggerLabel}</TooltipTrigger>
			<TooltipContent side='right' align='start'>
				<span className='text-xs font-medium'>{name}</span>
			</TooltipContent>
		</Tooltip>
	);
}

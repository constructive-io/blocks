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
import { useCardStack } from '@constructive-io/ui/stack';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@constructive-io/ui/tooltip';
import { RiDatabaseLine } from '@remixicon/react';
import { ChevronRight, MoreVertical, Plus, Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { useSchemaBuilderSelectors } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder';
import { durations, easings, springs } from '@/blocks/schema/schema-builder-core/lib/motion/motion-config';
import type { TableDefinition } from '@/blocks/schema/schema-builder-core/lib/schema';
import { CARD_WIDTHS } from '@/blocks/schema/schema-builder-core/lib/stack/card-widths';
import { handleActivationKeyDown } from '@/blocks/schema/schema-builder-core/lib/keyboard-activation';
import { cn } from '@/lib/utils';
import { useSidebarSectionActions, useSidebarSections } from '@/blocks/schema/schema-builder-core/store/app-store';
import { CreateTableCard, DeleteTableDialog } from '../tables';

// Height of each table item in pixels (for height calculations)
const TABLE_ITEM_HEIGHT = 32;
// Height of section header (collapsible trigger)
const SECTION_HEADER_HEIGHT = 32;
// Gap between sections
const SECTION_GAP = 8;
// Empty state height
const EMPTY_STATE_HEIGHT = 100;

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
}

export function SchemaBuilderSidebar({ onTableSelect, showSystemTables = false }: SchemaBuilderSidebarProps) {
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
		stack.push({
			id: 'create-table-select-model',
			title: 'Create Table',
			description: 'Securely create a new table based on its access model',
			Component: CreateTableCard,
			props: {
				onTableCreated: (table: { id: string; name: string }) => {
					handleTableSelect(table.id);
				},
			},
			width: CARD_WIDTHS.extraWide,
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
				className={cn(
					'border-sidebar-border flex h-full w-64 flex-col overflow-hidden border-r bg-transparent',
					'px-2 pt-2 2xl:w-72',
				)}
			>
				<h1 className='sr-only'>Schema Builder</h1>

				{/* Fixed header section - create button only */}
				<div className='shrink-0 p-1'>
					<Button variant='outline' size='sm' className='w-full' onClick={handleCreateTable}>
						<Plus className='h-4 w-4' />
						<span className='text-xs font-medium'>Create Table</span>
					</Button>
				</div>

				{/* Scrollable sections container - takes remaining space */}
				<div ref={containerRef} className='mt-4 flex min-h-0 flex-1 flex-col gap-2 overflow-hidden'>
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
			<CollapsibleTrigger
				className={cn(
					'group flex w-full items-center gap-2 rounded-lg py-1.5 pr-2 pl-1 transition-colors duration-150',
					'bg-card hover:bg-muted/50',
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
					{/* Subtle indicator when collapsed and contains selected item */}
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
							<div className='relative mt-2 min-h-0'>
								<div
									ref={scrollViewportRef}
									style={scrollViewportStyle}
									className='scrollbar-neutral-thin min-h-0 overflow-x-hidden overflow-y-auto'
								>
									<div className='space-y-0.5 px-1 py-2'>
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
									<ProgressiveBlur position='top' height='14%' blurPx={4} surface='background' intensity={0.1} />
								)}
								{affordanceState.showBottomBlur && (
									<ProgressiveBlur position='bottom' height='16%' blurPx={4} surface='background' intensity={0.12} />
								)}
							</div>
						) : (
							<div className='flex flex-col items-center justify-center py-6 text-center'>
								<div className='bg-muted mb-2 flex h-10 w-10 items-center justify-center rounded-full'>
									<RiDatabaseLine className='text-muted-foreground h-5 w-5' />
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

interface TableItemProps {
	table: TableDefinition;
	isSelected: boolean;
	onSelect: (tableId: string) => void;
	onDelete: (tableId: string, tableName: string) => void;
}

function TableItem({ table, isSelected, onSelect, onDelete }: TableItemProps) {
	const [isMenuOpen, setIsMenuOpen] = useState(false);

	return (
		<div
			data-testid='table-item'
			role='button'
			tabIndex={0}
			className={cn(
				`group relative my-1 flex min-h-10 cursor-pointer items-center justify-between rounded-lg px-2
				transition-[background-color,color,box-shadow,scale] duration-150 ease-out motion-safe:active:scale-[0.96]`,
				isSelected
					? 'bg-primary/10 text-foreground ring-primary/30 dark:bg-primary/15 dark:ring-primary/40 ring-1'
					: 'text-muted-foreground hover:text-foreground',
			)}
			onClick={() => onSelect(table.id)}
			onKeyDown={(event) => {
				handleActivationKeyDown(event, () => onSelect(table.id));
			}}
		>
			<div className='flex min-w-0 flex-1 items-center'>
				<OverflowAwareTableName name={table.name} />
			</div>
			<DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
				<DropdownMenuTrigger asChild>
					<Button
						variant='ghost'
						size='sm'
						aria-label={`Actions for ${table.name}`}
						className={cn(
							`size-8 rounded-md p-0 transition-[background-color,opacity,scale] duration-150 ease-out
							motion-safe:active:scale-[0.96]`,
							'opacity-0 group-hover:opacity-100',
							'hover:bg-muted-foreground/10',
							isMenuOpen && 'bg-muted-foreground/10 opacity-100',
						)}
						onClick={(e) => e.stopPropagation()}
					>
						<MoreVertical className='h-3 w-3' />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align='end'>
					<DropdownMenuItem
						className='text-destructive hover:bg-destructive/10 focus:bg-destructive/10 hover:text-destructive
							focus:text-destructive data-[disabled=true]:text-muted-foreground'
						onClick={(e) => {
							e.stopPropagation();
							onDelete(table.id, table.name);
						}}
					>
						<Trash2 className='mr-2 h-4 w-4' />
						Delete
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
			className='relative block max-w-full min-w-0 text-xs'
			aria-label={isOverflowing ? name : undefined}
		>
			<span className='block max-w-full min-w-0 truncate'>{displayName}</span>
			<span
				ref={measureRef}
				aria-hidden='true'
				className='pointer-events-none invisible absolute top-0 left-0 text-xs whitespace-nowrap'
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

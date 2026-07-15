'use client';

import { Button } from '@constructive-io/ui/button';
import { TooltipProvider } from '@constructive-io/ui/tooltip';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { useSchemaBuilderSelectors } from '@/blocks/schema/schema-builder-core/lib/gql/hooks/schema-builder';
import { durations, easings, springs } from '@/blocks/schema/schema-builder-core/lib/motion/motion-config';
import type { TableDefinition } from '@/blocks/schema/schema-builder-core/lib/schema';
import { FIELD_TYPE_CATEGORIES } from '@/blocks/schema/schema-builder-core/lib/schema';
import { cn } from '@/lib/utils';
import { useToggleTypesLibraryExpanded, useTypesLibraryExpanded } from '@/blocks/schema/schema-builder-core/store/app-store';

import { DraggableFieldType } from './draggable-field-type';
import { DraggableFieldTypeIcon } from './draggable-field-type-icon';
import { FieldsSection } from './fields-section';
import { NoTableSelectedView } from '@/blocks/schema/schema-builder-tables/components/table-editor/no-table-selected-view';
import { TableMetadataSection } from '@/blocks/schema/schema-builder-tables/components/table-editor/table-metadata-section';
import { TypesLibrary } from './types-library';
import { TypesLibraryRail } from './types-library-rail';
import { DEFAULT_DROP_ANIMATION, useFieldDnD } from './use-field-dnd';

// Constants for panel widths
const PANEL_WIDTH_EXPANDED = 380;
const PANEL_WIDTH_COLLAPSED = 56;

// Shared tween config for synchronized content crossfades
const tweenConfig = {
	duration: durations.normal,
	ease: easings.easeOut,
};

// Get total count of available field types
const totalTypesCount = FIELD_TYPE_CATEGORIES.reduce((sum, cat) => sum + cat.types.length, 0);

interface TypesLibraryHeaderProps {
	isExpanded: boolean;
	onToggle: () => void;
}

function TypesLibraryHeader({ isExpanded, onToggle }: TypesLibraryHeaderProps) {
	return (
		<div className='flex items-center justify-between border-b px-3 py-2'>
			<div className='flex items-center gap-2'>
				<h3 className='text-sm font-medium'>Types Library</h3>
				<span className='text-muted-foreground bg-muted rounded-md px-1.5 py-0.5 text-xs tabular-nums'>
					{totalTypesCount}
				</span>
			</div>
			<Button
				variant='ghost'
				size='sm'
				onClick={onToggle}
				className='h-7 w-7 p-0'
				aria-label={isExpanded ? 'Collapse panel' : 'Expand panel'}
			>
				{isExpanded ? <ChevronRight className='h-4 w-4' /> : <ChevronLeft className='h-4 w-4' />}
			</Button>
		</div>
	);
}

interface CollapsedHeaderProps {
	onToggle: () => void;
}

function CollapsedHeader({ onToggle }: CollapsedHeaderProps) {
	return (
		<div className='flex items-center justify-center border-b py-2'>
			<Button variant='ghost' size='sm' onClick={onToggle} className='h-7 w-7 p-0' aria-label='Expand panel'>
				<ChevronLeft className='h-4 w-4' />
			</Button>
		</div>
	);
}

export function TableEditor() {
	const { currentTable } = useSchemaBuilderSelectors();

	// Drag and drop state
	const {
		sensors,
		customCollisionDetection,
		handleDragStart,
		handleDragEnd,
		handleDragCancel,
		handleAddFieldRef,
		activeId,
		draggedType,
		dragSource,
	} = useFieldDnD(currentTable as TableDefinition | null);

	// Panel state: expanded (full panel) or collapsed (icon rail) - persisted via zustand
	const panelExpanded = useTypesLibraryExpanded();
	const togglePanel = useToggleTypesLibraryExpanded();

	return (
		<TooltipProvider delayDuration={300}>
			<DndContext
				sensors={sensors}
				collisionDetection={customCollisionDetection}
				onDragStart={handleDragStart}
				onDragEnd={handleDragEnd}
				onDragCancel={handleDragCancel}
			>
				{/* Container with relative positioning for the absolute panel */}
				<div
					data-chat-component='table-editor'
					data-chat-table-name={currentTable?.name ?? ''}
					className='relative flex min-h-0 min-w-0 flex-1 overflow-hidden'
				>
					{/* Main content area - add right padding to make room for collapsed panel */}
					<div
						className={cn('scrollbar-neutral-thin relative min-h-0 w-full min-w-0 flex-1 overflow-auto')}
						style={{
							paddingRight: currentTable ? (panelExpanded ? PANEL_WIDTH_EXPANDED : PANEL_WIDTH_COLLAPSED) : 0,
						}}
					>
						{currentTable ? (
							<div className='min-h-full min-w-full space-y-8 p-6 pb-12'>
								<TableMetadataSection />
								<FieldsSection onAddFieldRef={handleAddFieldRef} />
							</div>
						) : (
							<div className='flex min-h-full min-w-full items-start justify-center p-6 pb-12'>
								<NoTableSelectedView className='mt-20' />
							</div>
						)}
					</div>

					{/* Right panel - Types Library - hidden when no table selected */}
					{currentTable && (
						<div
							data-state={panelExpanded ? 'expanded' : 'collapsed'}
							className='bg-background border-border/60 absolute top-0 right-0 z-10 flex h-full flex-col border-l'
							style={{
								width: panelExpanded ? PANEL_WIDTH_EXPANDED : PANEL_WIDTH_COLLAPSED,
							}}
						>
							{/* Panel content - both layers always mounted, crossfade via opacity */}
							<div className='relative flex h-full min-h-0 flex-1 flex-col overflow-hidden'>
								{/* Collapsed layer: Icon rail with header - always rendered */}
								<motion.div
									className='absolute inset-0 flex h-full flex-col'
									style={{ pointerEvents: panelExpanded ? 'none' : 'auto' }}
									initial={false}
									animate={{
										opacity: panelExpanded ? 0 : 1,
									}}
									transition={tweenConfig}
								>
									<CollapsedHeader onToggle={togglePanel} />
									<TypesLibraryRail className='min-h-0 flex-1 py-2' />
								</motion.div>

								{/* Expanded layer: Full Types Library panel - always rendered */}
								<motion.div
									className='absolute inset-0 flex h-full flex-col overflow-hidden'
									style={{ pointerEvents: panelExpanded ? 'auto' : 'none' }}
									initial={false}
									animate={{
										opacity: panelExpanded ? 1 : 0,
									}}
									transition={tweenConfig}
								>
									<TypesLibraryHeader isExpanded={panelExpanded} onToggle={togglePanel} />
									<div className='min-h-0 flex-1 overflow-hidden'>
										<TypesLibrary />
									</div>
								</motion.div>
							</div>
						</div>
					)}
				</div>

				{/* Drag Overlay */}
				<DragOverlay dropAnimation={DEFAULT_DROP_ANIMATION}>
					<AnimatePresence>
						{activeId && draggedType && (
							<motion.div
								key={activeId}
								className='rotate-3 transform'
								initial={{ opacity: 0, scale: 0.9, y: 4 }}
								animate={{ opacity: 1, scale: 1, y: 0 }}
								exit={{ opacity: 0 }}
								transition={{
									...springs.stiff,
									opacity: { duration: durations.instant, ease: easings.easeOut },
								}}
							>
								{dragSource === 'rail' ? (
									<DraggableFieldTypeIcon
										typeInfo={draggedType}
										isDragging
										className='border-primary/50 bg-background border-2 shadow-2xl'
									/>
								) : (
									<DraggableFieldType
										typeInfo={draggedType}
										isDragging
										className='border-primary/50 bg-background border-2 shadow-2xl'
									/>
								)}
							</motion.div>
						)}
					</AnimatePresence>
				</DragOverlay>
			</DndContext>
		</TooltipProvider>
	);
}

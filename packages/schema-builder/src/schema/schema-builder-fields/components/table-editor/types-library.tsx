'use client';

import { memo, startTransition, useMemo, useState } from 'react';
import { RiDragDropLine, RiSearchLine } from '@remixicon/react';
import { ChevronRight } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

import { Collapsible, CollapsibleTrigger } from '@constructive-io/ui/collapsible';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@constructive-io/ui/input-group';

import { durations, easings, springs } from '@/blocks/schema/schema-builder-core/lib/motion/motion-config';
import type { FieldTypeInfo } from '@/blocks/schema/schema-builder-core/lib/schema';
import { getAdvancedFieldTypes, getBasicFieldTypes, searchFieldTypes } from '@/blocks/schema/schema-builder-core/lib/schema';
import { DraggableFieldType } from './draggable-field-type';

const basicTypes = getBasicFieldTypes();
const advancedTypes = getAdvancedFieldTypes();
const allTypes = [...basicTypes, ...advancedTypes];

export function TypesLibrary() {
	const [searchQuery, setSearchQuery] = useState('');

	// Section expand/collapse state (local, not persisted) - lazy init
	const [sectionsExpanded, setSectionsExpanded] = useState(() => ({ basic: true, advanced: false }));
	const toggleSection = (section: 'basic' | 'advanced') =>
		setSectionsExpanded((prev) => ({ ...prev, [section]: !prev[section] }));

	// Filter types based on search query
	const { filteredBasicTypes, filteredAdvancedTypes } = useMemo(() => {
		if (!searchQuery.trim()) {
			return { filteredBasicTypes: basicTypes, filteredAdvancedTypes: advancedTypes };
		}

		const searchResults = searchFieldTypes(searchQuery);
		const matchingTypes = new Set(searchResults.map((r) => r.type));

		return {
			filteredBasicTypes: basicTypes.filter((type) => matchingTypes.has(type.type)),
			filteredAdvancedTypes: advancedTypes.filter((type) => matchingTypes.has(type.type)),
		};
	}, [searchQuery]);

	const totalFilteredCount = filteredBasicTypes.length + filteredAdvancedTypes.length;
	const totalTypesCount = allTypes.length;

	return (
		<div className='flex h-full min-h-0 flex-col'>
			{/* Search */}
			<div className='px-3 pt-3 pb-2'>
				<InputGroup>
					<InputGroupAddon>
						<RiSearchLine />
					</InputGroupAddon>
					<InputGroupInput
						placeholder='Search types...'
						value={searchQuery}
						onChange={(e) => {
							const value = e.target.value;
							startTransition(() => setSearchQuery(value));
						}}
						size='sm'
					/>
				</InputGroup>
				{searchQuery && (
					<p className='text-muted-foreground mt-1.5 text-xs'>
						{totalFilteredCount} of {totalTypesCount} types
					</p>
				)}
			</div>

			{/* Types sections */}
			<div className='scrollbar-neutral-thin min-h-0 flex-1 space-y-2 overflow-auto px-2 pb-2'>
				{totalFilteredCount === 0 ? (
					<div className='text-muted-foreground p-4 text-center text-sm'>
						<p>No types found for &ldquo;{searchQuery}&rdquo;</p>
					</div>
				) : (
					<>
						{/* Basic Types Section */}
						{filteredBasicTypes.length > 0 && (
							<TypesSection
								title='Basic'
								types={filteredBasicTypes}
								isExpanded={sectionsExpanded.basic}
								onToggleExpand={() => toggleSection('basic')}
							/>
						)}

						{/* Advanced Types Section */}
						{filteredAdvancedTypes.length > 0 && (
							<TypesSection
								title='Advanced'
								types={filteredAdvancedTypes}
								isExpanded={sectionsExpanded.advanced}
								onToggleExpand={() => toggleSection('advanced')}
							/>
						)}
					</>
				)}
			</div>

			{/* Footer hint */}
			<div className='text-muted-foreground/70 flex items-center gap-1.5 border-t px-3 py-2 text-xs'>
				<RiDragDropLine className='h-3 w-3' />
				<span>Drag or use the keyboard to add fields.</span>
			</div>
		</div>
	);
}

interface TypesSectionProps {
	title: string;
	types: FieldTypeInfo[];
	isExpanded: boolean;
	onToggleExpand: () => void;
}

function TypesSection({ title, types, isExpanded, onToggleExpand }: TypesSectionProps) {
	return (
		<Collapsible open={isExpanded} onOpenChange={onToggleExpand} className='flex min-h-0 shrink-0 flex-col'>
			<CollapsibleTrigger
				className='group flex w-full cursor-pointer items-center gap-2 rounded-lg py-1.5 pr-2 pl-1 transition-colors
					duration-150 bg-card hover:bg-muted/50 data-[state=open]:bg-muted/50'
			>
				<motion.div
					animate={{ rotate: isExpanded ? 90 : 0 }}
					transition={{ type: 'spring', stiffness: 400, damping: 25 }}
					className='flex shrink-0 items-center justify-center'
				>
					<ChevronRight className='text-muted-foreground/60 h-3.5 w-3.5' />
				</motion.div>
				<span className='text-muted-foreground text-xs font-medium'>{title}</span>
				<span className='text-muted-foreground/70 ml-auto text-[10px] tabular-nums'>{types.length}</span>
			</CollapsibleTrigger>

			<AnimatePresence initial={false}>
				{isExpanded && (
					<motion.div
						initial={{ opacity: 0, y: -4 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -4 }}
						transition={{
							...springs.stiff,
							opacity: { duration: durations.fast, ease: easings.easeOut },
						}}
						className='min-h-0 overflow-hidden'
					>
						<div className='mt-1.5 space-y-1'>
							{types.map((typeInfo) => (
								<DraggableFieldType key={typeInfo.type} typeInfo={typeInfo} className='w-full' />
							))}
						</div>
					</motion.div>
				)}
			</AnimatePresence>
		</Collapsible>
	);
}

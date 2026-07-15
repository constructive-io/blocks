'use client';

import { memo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { RiDragDropLine } from '@remixicon/react';

import { cn } from '@/lib/utils';

import type { FieldTypeInfo } from '@/blocks/schema/schema-builder-core/lib/schema';

interface DraggableFieldTypeProps {
	typeInfo: FieldTypeInfo;
	isDragging?: boolean;
	className?: string;
}

// Memoized to prevent re-renders when parent search state changes
export const DraggableFieldType = memo(function DraggableFieldType({ typeInfo, isDragging = false, className }: DraggableFieldTypeProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		isDragging: isBeingDragged,
	} = useDraggable({
		id: `field-type-${typeInfo.type}`,
		data: {
			typeInfo,
		},
	});

	const style = {
		transform: CSS.Translate.toString(transform),
	};

	const IconComponent = typeInfo.icon;

	return (
		<div
			ref={setNodeRef}
			style={style}
			{...listeners}
			{...attributes}
			className={cn(
				`group hover:bg-accent flex cursor-grab items-center gap-3 rounded-lg border border-transparent px-2.5 py-2
				transition-all active:cursor-grabbing`,
				'touch-none select-none',
				'hover:border-border/60 hover:shadow-sm',
				{
					'opacity-50': isBeingDragged && !isDragging,
					'border-primary/30 bg-primary/5 shadow-md': isDragging,
				},
				className,
			)}
		>
			{/* Type Icon */}
			<div
				className='bg-muted/60 text-muted-foreground flex h-8 w-8 flex-shrink-0 items-center justify-center
					rounded-md'
			>
				{IconComponent ? (
					<IconComponent className='h-4 w-4' />
				) : (
					<span className='font-mono text-xs font-medium'>{typeInfo.type.charAt(0).toUpperCase()}</span>
				)}
			</div>

			{/* Type Info */}
			<div className='min-w-0 flex-1'>
				<span className='text-foreground block truncate text-sm font-medium'>{typeInfo.label}</span>
				<p className='text-muted-foreground truncate text-xs'>{typeInfo.description}</p>
			</div>

			{/* Drag Handle */}
			<div className='flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100'>
				<RiDragDropLine className='text-muted-foreground h-4 w-4' />
			</div>
		</div>
	);
});

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
			title={typeInfo.description}
			className={cn(
				'group flex h-9 cursor-grab items-center gap-2.5 rounded-lg px-2 active:cursor-grabbing',
				'touch-none select-none hover:bg-overlay-hover outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
				{
					'opacity-50': isBeingDragged && !isDragging,
					'bg-card shadow-card-lg': isDragging,
				},
				className,
			)}
		>
			<span className='bg-muted text-muted-foreground group-hover:text-foreground grid size-6 shrink-0 place-items-center rounded-md'>
				{IconComponent ? (
					<IconComponent className='size-3.5' />
				) : (
					<span className='font-mono text-[11px] font-medium'>{typeInfo.type.charAt(0).toUpperCase()}</span>
				)}
			</span>

			<span className='flex min-w-0 flex-1 items-baseline gap-2'>
				<span className='text-foreground shrink-0 text-[13px]'>{typeInfo.label}</span>
				<span className='text-muted-foreground min-w-0 truncate text-xs'>{typeInfo.description}</span>
			</span>

			<RiDragDropLine aria-hidden='true' className='text-muted-foreground size-3.5 shrink-0 opacity-0 group-hover:opacity-100' />
		</div>
	);
});

'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@constructive-io/ui/tooltip';

import type { FieldTypeInfo } from '@/blocks/schema/schema-builder-core/lib/schema';

interface DraggableFieldTypeIconProps {
	typeInfo: FieldTypeInfo;
	isDragging?: boolean;
	className?: string;
}

export function DraggableFieldTypeIcon({ typeInfo, isDragging = false, className }: DraggableFieldTypeIconProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		isDragging: isBeingDragged,
	} = useDraggable({
		id: `field-type-rail-${typeInfo.type}`,
		data: {
			typeInfo,
			source: 'rail' as const,
		},
	});

	const style = {
		transform: CSS.Translate.toString(transform),
	};

	const IconComponent = typeInfo.icon;
	const badge = typeInfo.badge;

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<button
					ref={setNodeRef}
					style={style}
					{...listeners}
					{...attributes}
					className={cn(
						// Uniform square buttons - fixed aspect ratio for clean grid
						'group bg-background hover:bg-accent relative aspect-square w-8 cursor-grab rounded-md border transition-all active:cursor-grabbing',
            'flex items-center justify-center',
						'touch-none select-none',
						{
							'opacity-50': isBeingDragged && !isDragging,
							'border-primary/30 bg-primary/5 shadow-lg': isDragging,
							'hover:border-primary/40 hover:shadow-sm': !isBeingDragged,
						},
						className,
					)}
					type='button'
				>
					{/* Icon centered, badge absolutely positioned at bottom */}
					{IconComponent ? (
						<IconComponent
							className={cn(
								'text-muted-foreground h-4 w-4 transition-colors',
								'group-hover:text-foreground',
							)}
						/>
					) : (
						<span className='text-muted-foreground group-hover:text-foreground font-mono text-xs font-medium'>
							{typeInfo.type.charAt(0).toUpperCase()}
						</span>
					)}

					{/* Badge - absolutely positioned at bottom center */}
					{badge && (
						<span
							className={cn(
								'absolute inset-x-0 bottom-0.5',
								'flex items-center justify-center',
								'text-muted-foreground/60 group-hover:text-muted-foreground',
								'font-mono text-[7px] font-medium uppercase leading-none tracking-wide',
								'transition-colors',
							)}
						>
							{badge}
						</span>
					)}
				</button>
			</TooltipTrigger>
			<TooltipContent side='left' align='center' className='max-w-[200px]'>
				<div className='space-y-1'>
					<p className='font-medium'>{typeInfo.label}</p>
					<p className='text-muted-foreground text-xs'>{typeInfo.description}</p>
					<p className='text-muted-foreground/70 text-xs'>Drag to add to table</p>
				</div>
			</TooltipContent>
		</Tooltip>
	);
}

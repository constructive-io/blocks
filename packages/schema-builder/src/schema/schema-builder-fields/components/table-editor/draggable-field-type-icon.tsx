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
					aria-label={`Drag ${typeInfo.label} field type`}
					className={cn(
						// Raised square tiles, the same surface as the Agents Builder app picker, so they read on the rail in both themes.
						'group bg-card shadow-card hover:bg-muted relative flex aspect-square w-10 cursor-grab items-center justify-center rounded-lg active:cursor-grabbing',
						'touch-none select-none outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50',
						{
							'opacity-50': isBeingDragged && !isDragging,
							'shadow-card-lg': isDragging,
						},
						className,
					)}
					type='button'
				>
					{/* Icon centered, badge absolutely positioned at bottom */}
					{IconComponent ? (
						<IconComponent
							className={cn(
								'text-foreground/70 size-4',
								'group-hover:text-foreground',
							)}
						/>
					) : (
						<span className='text-foreground/70 group-hover:text-foreground font-mono text-xs font-medium'>
							{typeInfo.type.charAt(0).toUpperCase()}
						</span>
					)}

					{/* Badge - absolutely positioned at bottom center */}
					{badge && (
						<span
							className={cn(
								'absolute inset-x-0 bottom-0.5',
								'flex items-center justify-center',
								'text-muted-foreground group-hover:text-foreground/70',
								'font-mono text-[7px] font-medium uppercase leading-none tracking-wide',
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

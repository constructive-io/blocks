'use client';

import { getBasicFieldTypes } from '@/blocks/schema/schema-builder-core/lib/schema';
import { DraggableFieldTypeIcon } from './draggable-field-type-icon';

const basicTypes = getBasicFieldTypes();

interface TypesLibraryRailProps {
	className?: string;
}

export function TypesLibraryRail({ className }: TypesLibraryRailProps) {
	return (
		<div className={className}>
			<div className='scrollbar-neutral-thin flex h-full flex-col items-center gap-1.5 overflow-y-auto py-1.5'>
				{basicTypes.map((typeInfo) => (
					<DraggableFieldTypeIcon key={typeInfo.type} typeInfo={typeInfo} />
				))}
			</div>
		</div>
	);
}

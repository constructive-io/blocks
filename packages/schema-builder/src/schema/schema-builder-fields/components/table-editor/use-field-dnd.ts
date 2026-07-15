import { useCallback, useState } from 'react';
import {
	defaultDropAnimationSideEffects,
	DragEndEvent,
	DragStartEvent,
	KeyboardSensor,
	PointerSensor,
	rectIntersection,
	useSensor,
	useSensors,
	type CollisionDetection,
	type DropAnimation,
} from '@dnd-kit/core';

import type { FieldDefinition, FieldTypeInfo, TableDefinition } from '@/blocks/schema/schema-builder-core/lib/schema';
import { getDefaultConstraintsForType } from '../../../schema-builder-core/lib/schema';

export const COLUMN_EDITOR_DROPZONE_ID = 'column-editor-dropzone' as const;

export type DragSource = 'rail' | 'panel';

export interface FieldDragData {
	typeInfo?: FieldTypeInfo;
	source?: DragSource;
}

export const DEFAULT_DROP_ANIMATION: DropAnimation = {
	sideEffects: defaultDropAnimationSideEffects({
		styles: {
			active: {
				opacity: '0.5',
			},
		},
	}),
};

export function useFieldDnD(currentTable: TableDefinition | null) {
	const [activeId, setActiveId] = useState<string | null>(null);
	const [draggedType, setDraggedType] = useState<FieldTypeInfo | null>(null);
	const [dragSource, setDragSource] = useState<DragSource | null>(null);
	const [addFieldFn, setAddFieldFn] = useState<((field: FieldDefinition) => void) | null>(null);

	const sensors = useSensors(
		useSensor(KeyboardSensor),
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8,
			},
		}),
	);

	const handleDragStart = (event: DragStartEvent) => {
		const { active } = event;
		setActiveId(active.id as string);

		// Check if it's a field type
		const data = active.data.current as FieldDragData | null;

		if (data?.typeInfo) {
			setDraggedType(data.typeInfo);
			setDragSource(data.source ?? 'panel');
		}
	};

	// Custom collision detection that filters out invalid drop targets
	const customCollisionDetection: CollisionDetection = (args) => {
		const collisions = rectIntersection(args);

		// Field types can only be dropped on the main drop zone
		return collisions.filter((collision) => collision.id === COLUMN_EDITOR_DROPZONE_ID);
	};

	const handleDragEnd = (event: DragEndEvent) => {
		const { over } = event;

		if (!over) {
			setActiveId(null);
			setDraggedType(null);
			setDragSource(null);
			return;
		}

		// Validate drop zone
		const isValidDrop = over.id === COLUMN_EDITOR_DROPZONE_ID;

		if (!isValidDrop || !draggedType || !addFieldFn || !currentTable) {
			setActiveId(null);
			setDraggedType(null);
			setDragSource(null);
			return;
		}

		// Handle field type drops
		if (over.id === COLUMN_EDITOR_DROPZONE_ID) {
			// Create new field
			const newField: FieldDefinition = {
				id: `temp-field-${Date.now()}`,
				name: '',
				type: draggedType.type,
				constraints: getDefaultConstraintsForType(draggedType.type),
				fieldOrder: 1000, // Temporary order
			};

			// Add field via callback from FieldsSection
			addFieldFn(newField);
		}

		// Reset state
		setActiveId(null);
		setDraggedType(null);
		setDragSource(null);
	};

	const handleDragCancel = () => {
		setActiveId(null);
		setDraggedType(null);
		setDragSource(null);
	};

	const handleAddFieldRef = useCallback((fn: (field: FieldDefinition) => void) => {
		setAddFieldFn(() => fn);
	}, []);

	return {
		sensors,
		customCollisionDetection,
		handleDragStart,
		handleDragEnd,
		handleDragCancel,
		handleAddFieldRef,
		activeId,
		draggedType,
		dragSource,
	};
}
